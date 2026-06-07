// @ts-nocheck
import { Router } from 'express';
import { AttendanceStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';
import { normalizeDateOnly } from '../../utils/code.js';
import { emitRealtime } from '../../socket.js';

export const attendanceRoutes = Router();
attendanceRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const bulkSchema = z.object({
  classId: z.string(),
  date: z.string(),
  records: z.array(z.object({
    studentId: z.string(),
    status: z.nativeEnum(AttendanceStatus),
    note: z.string().optional(),
  })).min(1),
});

attendanceRoutes.post('/bulk', async (req, res, next) => {
  try {
    const body = bulkSchema.parse(req.body);
    const date = normalizeDateOnly(body.date);

    if (req.user?.role === Role.COACH) {
      const klass = await prisma.class.findFirst({ where: { id: body.classId, coachId: req.user.id } });
      if (!klass) return res.status(403).json({ message: 'HLV chỉ được điểm danh lớp của mình' });
    }

    const studentIds = body.records.map((item) => item.studentId);
    const validStudentCount = await prisma.student.count({ where: { id: { in: studentIds }, classId: body.classId } });
    if (validStudentCount !== new Set(studentIds).size) {
      return res.status(400).json({ message: 'Danh sách điểm danh có học viên không thuộc lớp đã chọn' });
    }

    const results = await prisma.$transaction(async (tx) => {
      const output = [];
      for (const item of body.records) {
        const existing = await tx.attendance.findUnique({
          where: { studentId_classId_date: { studentId: item.studentId, classId: body.classId, date } },
        });

        const becamePresent = existing?.status !== 'PRESENT' && item.status === 'PRESENT';
        const removedPresent = existing?.status === 'PRESENT' && item.status !== 'PRESENT';

        if (becamePresent) {
          await tx.student.update({
            where: { id: item.studentId },
            data: { sessionUsed: { increment: 1 }, sessionRemaining: { decrement: 1 } },
          });
        }

        if (removedPresent) {
          await tx.student.update({
            where: { id: item.studentId },
            data: { sessionUsed: { decrement: 1 }, sessionRemaining: { increment: 1 } },
          });
        }

        const attendance = await tx.attendance.upsert({
          where: { studentId_classId_date: { studentId: item.studentId, classId: body.classId, date } },
          update: { status: item.status, note: item.note, markedById: req.user?.id },
          create: { studentId: item.studentId, classId: body.classId, date, status: item.status, note: item.note, markedById: req.user?.id },
        });
        output.push(attendance);
      }
      return output;
    });

    emitRealtime('attendance.marked', { classId: body.classId, date, count: results.length });
    res.json(results);
  } catch (error) { next(error); }
});

const historyQuerySchema = z.object({
  classId: z.string().optional(),
  studentId: z.string().optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Admin xem lại lịch sử điểm danh toàn hệ thống theo khoảng ngày/lớp/trạng thái/học viên.
attendanceRoutes.get('/history', async (req, res, next) => {
  try {
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ message: 'Chỉ Admin được xem lịch sử điểm danh toàn hệ thống' });
    }

    const query = historyQuerySchema.parse(req.query);
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (query.dateFrom) dateFilter.gte = normalizeDateOnly(query.dateFrom);
    if (query.dateTo) {
      const endExclusive = normalizeDateOnly(query.dateTo);
      endExclusive.setDate(endExclusive.getDate() + 1);
      dateFilter.lt = endExclusive;
    }

    const where: any = {
      classId: query.classId || undefined,
      studentId: query.studentId || undefined,
      status: query.status || undefined,
      date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      student: query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { studentCode: { contains: query.search, mode: 'insensitive' } },
              { parentPhone: { contains: query.search } },
            ],
          }
        : undefined,
    };

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, studentCode: true, fullName: true, parentPhone: true, sessionRemaining: true } },
        class: { select: { id: true, name: true, coach: { select: { id: true, fullName: true } } } },
        markedBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
      take: 1000,
    });

    const summary = records.reduce(
      (result, item) => {
        result.total += 1;
        if (item.status === AttendanceStatus.PRESENT) result.present += 1;
        if (item.status === AttendanceStatus.ABSENT) result.absent += 1;
        if (item.status === AttendanceStatus.EXCUSED) result.excused += 1;
        return result;
      },
      { total: 0, present: 0, absent: 0, excused: 0 },
    );

    res.json({ records, summary, limit: 1000 });
  } catch (error) { next(error); }
});

attendanceRoutes.get('/', async (req, res, next) => {
  try {
    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const date = typeof req.query.date === 'string' ? normalizeDateOnly(req.query.date) : undefined;
    const where: any = { classId, date };
    if (req.user?.role === Role.COACH) where.class = { coachId: req.user.id };

    const attendances = await prisma.attendance.findMany({
      where,
      include: { student: true, class: { include: { coach: { select: { id: true, fullName: true } } } }, markedBy: { select: { id: true, fullName: true, role: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(attendances);
  } catch (error) { next(error); }
});
