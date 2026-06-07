// @ts-nocheck
import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';
import { emitRealtime } from '../../socket.js';

export const scheduleRoutes = Router();
scheduleRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const scheduleSchema = z.object({
  classId: z.string().min(1, 'Vui lòng chọn lớp'),
  fieldId: z.string().optional().nullable(),
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ bắt đầu phải có dạng HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ kết thúc phải có dạng HH:mm'),
  note: z.string().optional().nullable(),
});

const fieldSchema = z.object({
  name: z.string().min(2, 'Tên sân phải có ít nhất 2 ký tự'),
  address: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function isOverlap(startA: string, endA: string, startB: string, endB: string) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA);
}

type AuthUser = { id: string; role: Role };

async function ensureScheduleAccess(user: AuthUser, classId?: string) {
  if (user.role === Role.ADMIN) return;
  if (!classId) return;
  const klass = await prisma.class.findFirst({ where: { id: classId, coachId: user.id, isActive: true } });
  if (!klass) throw Object.assign(new Error('HLV chỉ được xem lịch của lớp được Admin gán'), { statusCode: 403 });
}

async function validateScheduleConflict(input: z.infer<typeof scheduleSchema>, ignoreId?: string) {
  const klass = await prisma.class.findUnique({
    where: { id: input.classId },
    include: { coach: { select: { id: true, fullName: true } } },
  });
  if (!klass) throw Object.assign(new Error('Không tìm thấy lớp học'), { statusCode: 404 });

  if (toMinutes(input.startTime) >= toMinutes(input.endTime)) {
    throw Object.assign(new Error('Giờ kết thúc phải lớn hơn giờ bắt đầu'), { statusCode: 400 });
  }

  const sameDaySchedules = await prisma.trainingSchedule.findMany({
    where: {
      dayOfWeek: input.dayOfWeek,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    include: {
      class: { include: { coach: { select: { id: true, fullName: true } } } },
      field: true,
    },
  });

  const overlapping = sameDaySchedules.filter((schedule) => isOverlap(input.startTime, input.endTime, schedule.startTime, schedule.endTime));

  if (input.fieldId) {
    const fieldConflict = overlapping.find((schedule) => schedule.fieldId && schedule.fieldId === input.fieldId);
    if (fieldConflict) {
      throw Object.assign(new Error(`Sân ${fieldConflict.field?.name || ''} đã có lớp ${fieldConflict.class.name} trong khung giờ này`), { statusCode: 409 });
    }
  }

  if (klass.coachId) {
    const coachConflict = overlapping.find((schedule) => schedule.class.coachId && schedule.class.coachId === klass.coachId);
    if (coachConflict) {
      throw Object.assign(new Error(`HLV ${klass.coach?.fullName || ''} đã có lớp ${coachConflict.class.name} trong khung giờ này`), { statusCode: 409 });
    }
  }
}

scheduleRoutes.get('/', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Chưa đăng nhập' });

    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    await ensureScheduleAccess(req.user, classId);

    const where: any = {};
    if (classId) where.classId = classId;
    if (req.user.role === Role.COACH) where.class = { coachId: req.user.id, isActive: true };

    const schedules = await prisma.trainingSchedule.findMany({
      where,
      include: {
        field: true,
        class: { include: { coach: { select: { id: true, fullName: true, phone: true, email: true } }, _count: { select: { students: true } } } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json(schedules);
  } catch (error) { next(error); }
});

scheduleRoutes.post('/', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = scheduleSchema.parse(req.body);
    await validateScheduleConflict(body);

    const created = await prisma.trainingSchedule.create({
      data: {
        classId: body.classId,
        fieldId: body.fieldId || null,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        note: body.note || null,
      },
      include: { field: true, class: { include: { coach: { select: { id: true, fullName: true } } } } },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE_TRAINING_SCHEDULE', entity: 'TrainingSchedule', entityId: created.id, metadata: { classId: body.classId, dayOfWeek: body.dayOfWeek, startTime: body.startTime, endTime: body.endTime } },
    });
    emitRealtime('schedule.changed', { action: 'created', scheduleId: created.id, classId: created.classId });
    res.status(201).json(created);
  } catch (error) { next(error); }
});

scheduleRoutes.put('/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const exists = await prisma.trainingSchedule.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ message: 'Không tìm thấy lịch tập' });

    const body = scheduleSchema.parse({ ...exists, ...req.body });
    await validateScheduleConflict(body, req.params.id);

    const updated = await prisma.trainingSchedule.update({
      where: { id: req.params.id },
      data: {
        classId: body.classId,
        fieldId: body.fieldId || null,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        note: body.note || null,
      },
      include: { field: true, class: { include: { coach: { select: { id: true, fullName: true } } } } },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE_TRAINING_SCHEDULE', entity: 'TrainingSchedule', entityId: updated.id, metadata: { classId: updated.classId, dayOfWeek: updated.dayOfWeek, startTime: updated.startTime, endTime: updated.endTime } },
    });
    emitRealtime('schedule.changed', { action: 'updated', scheduleId: updated.id, classId: updated.classId });
    res.json(updated);
  } catch (error) { next(error); }
});

scheduleRoutes.delete('/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const exists = await prisma.trainingSchedule.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ message: 'Không tìm thấy lịch tập' });

    await prisma.$transaction(async (tx) => {
      await tx.trainingSchedule.delete({ where: { id: req.params.id } });
      await tx.auditLog.create({ data: { userId: req.user?.id, action: 'DELETE_TRAINING_SCHEDULE', entity: 'TrainingSchedule', entityId: req.params.id, metadata: { classId: exists.classId, fieldId: exists.fieldId, dayOfWeek: exists.dayOfWeek, startTime: exists.startTime, endTime: exists.endTime, note: exists.note } } });
    });
    emitRealtime('schedule.changed', { action: 'deleted', scheduleId: req.params.id, classId: exists.classId });
    res.status(204).send();
  } catch (error) { next(error); }
});

scheduleRoutes.get('/fields/list', async (_req, res, next) => {
  try {
    const fields = await prisma.trainingField.findMany({ orderBy: { name: 'asc' } });
    res.json(fields);
  } catch (error) { next(error); }
});

scheduleRoutes.post('/fields', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = fieldSchema.parse(req.body);
    const created = await prisma.trainingField.create({ data: body });
    await prisma.auditLog.create({ data: { userId: req.user?.id, action: 'CREATE_TRAINING_FIELD', entity: 'TrainingField', entityId: created.id, metadata: body } });
    res.status(201).json(created);
  } catch (error) { next(error); }
});

scheduleRoutes.put('/fields/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = fieldSchema.partial().parse(req.body);
    const updated = await prisma.trainingField.update({ where: { id: req.params.id }, data: body });
    const metadata = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
    await prisma.auditLog.create({ data: { userId: req.user?.id, action: 'UPDATE_TRAINING_FIELD', entity: 'TrainingField', entityId: updated.id, metadata } });
    res.json(updated);
  } catch (error) { next(error); }
});

scheduleRoutes.delete('/fields/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const exists = await prisma.trainingField.findUnique({ where: { id: req.params.id }, include: { _count: { select: { schedules: true } } } });
    if (!exists) return res.status(404).json({ message: 'Không tìm thấy sân tập' });
    if (exists._count.schedules > 0) {
      await prisma.trainingSchedule.updateMany({ where: { fieldId: exists.id }, data: { fieldId: null } });
    }
    await prisma.trainingField.delete({ where: { id: exists.id } });
    await prisma.auditLog.create({ data: { userId: req.user?.id, action: 'DELETE_TRAINING_FIELD', entity: 'TrainingField', entityId: exists.id, metadata: { name: exists.name, schedulesDetached: exists._count.schedules } } });
    res.status(204).send();
  } catch (error) { next(error); }
});
