import { Router } from 'express';
import { Prisma, Role, StudentStatus } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const studentRoutes = Router();
studentRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const studentSchema = z.object({
  fullName: z.string().min(2),
  dateOfBirth: z.string().optional().nullable(),
  parentPhone: z.string().min(8),
  address: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  classId: z.string().optional().nullable(),
  sessionTotal: z.number().int().nonnegative().default(0),
});


async function generateUniqueStudentCode(offset = 0) {
  const year = new Date().getFullYear();
  const prefix = `FA${year}`;

  const latest = await prisma.student.findFirst({
    where: { studentCode: { startsWith: prefix } },
    orderBy: { studentCode: 'desc' },
    select: { studentCode: true },
  });

  const latestNumber = latest?.studentCode
    ? Number.parseInt(latest.studentCode.replace(prefix, ''), 10)
    : 0;

  const start = Number.isFinite(latestNumber) ? latestNumber + 1 + offset : 1 + offset;

  for (let next = start; next < start + 100; next += 1) {
    const candidate = `${prefix}${String(next).padStart(4, '0')}`;
    const exists = await prisma.student.findUnique({ where: { studentCode: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }

  throw Object.assign(new Error('Không thể tạo mã học viên tự động. Vui lòng thử lại.'), { statusCode: 500 });
}

async function assertCoachOwnsClass(userId: string, classId?: string | null) {
  if (!classId) return;
  const klass = await prisma.class.findFirst({ where: { id: classId, coachId: userId } });
  if (!klass) throw Object.assign(new Error('HLV chỉ được thao tác trong lớp của mình'), { statusCode: 403 });
}

async function assertCoachCanAccessStudent(userId: string, studentId: string) {
  const student = await prisma.student.findFirst({ where: { id: studentId, class: { coachId: userId } } });
  if (!student) throw Object.assign(new Error('HLV chỉ được thao tác học viên trong lớp của mình'), { statusCode: 403 });
}

studentRoutes.get('/', async (req, res, next) => {
  try {
    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const where: any = {};
    if (classId) where.classId = classId;
    if (req.user?.role === Role.COACH) where.class = { coachId: req.user.id };

    const students = await prisma.student.findMany({
      where,
      include: { class: { select: { id: true, name: true, ageGroup: true, coachId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(students);
  } catch (error) { next(error); }
});

studentRoutes.get('/:id', async (req, res, next) => {
  try {
    if (req.user?.role === Role.COACH) await assertCoachCanAccessStudent(req.user.id, req.params.id);
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        class: true,
        attendanceHistories: { orderBy: { date: 'desc' }, take: 20 },
        paymentHistories: { orderBy: { createdAt: 'desc' }, take: 20 },
        uniformOrders: { orderBy: { createdAt: 'desc' }, take: 20, include: { items: { include: { product: true } } } },
        notes: { orderBy: { createdAt: 'desc' }, take: 20, include: { createdBy: { select: { fullName: true } } } },
      },
    });
    if (!student) return res.status(404).json({ message: 'Không tìm thấy học viên' });
    res.json(student);
  } catch (error) { next(error); }
});

studentRoutes.post('/', async (req, res, next) => {
  try {
    const body = studentSchema.parse(req.body);
    if (req.user?.role === Role.COACH) await assertCoachOwnsClass(req.user.id, body.classId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const studentCode = await generateUniqueStudentCode(attempt);
      try {
        const created = await prisma.student.create({
          data: {
            studentCode,
            fullName: body.fullName,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
            parentPhone: body.parentPhone,
            address: body.address,
            avatarUrl: body.avatarUrl,
            classId: body.classId,
            sessionTotal: body.sessionTotal,
            sessionRemaining: body.sessionTotal,
            createdById: req.user?.id,
          },
          include: { class: true },
        });
        return res.status(201).json(created);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
          if (target.includes('studentCode')) continue;
        }
        throw error;
      }
    }

    throw Object.assign(new Error('Mã học viên bị trùng nhiều lần. Vui lòng thử lại.'), { statusCode: 409 });
  } catch (error) { next(error); }
});

studentRoutes.put('/:id', async (req, res, next) => {
  try {
    const body = studentSchema.partial().extend({ status: z.nativeEnum(StudentStatus).optional() }).parse(req.body);
    if (req.user?.role === Role.COACH) {
      await assertCoachCanAccessStudent(req.user.id, req.params.id);
      if (body.classId) await assertCoachOwnsClass(req.user.id, body.classId);
    }

    const current = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy học viên' });

    const nextTotal = body.sessionTotal ?? current.sessionTotal;
    const nextRemaining = Math.max(0, nextTotal - current.sessionUsed);

    const updated = await prisma.student.update({
      where: { id: req.params.id },
      data: {
        ...body,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : body.dateOfBirth === null ? null : undefined,
        sessionRemaining: body.sessionTotal !== undefined ? nextRemaining : undefined,
      },
      include: { class: true },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

studentRoutes.delete('/:id', async (req, res, next) => {
  try {
    if (req.user?.role !== Role.ADMIN) return res.status(403).json({ message: 'Chỉ Admin được xóa học viên' });
    await prisma.student.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});
