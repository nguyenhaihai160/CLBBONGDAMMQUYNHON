import { Router } from 'express';
import { FeeType, Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const classRoutes = Router();
classRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const classSchema = z.object({
  name: z.string().min(2, 'Tên lớp phải có ít nhất 2 ký tự'),
  ageGroup: z.string().min(1, 'Vui lòng nhập nhóm tuổi'),
  feeAmount: z.number().nonnegative(),
  feeType: z.nativeEnum(FeeType),
  totalSessions: z.number().int().positive(),
  coachId: z.string().optional().nullable(),
});

classRoutes.get('/', async (req, res, next) => {
  try {
    const where = req.user?.role === Role.COACH ? { coachId: req.user.id } : {};
    const classes = await prisma.class.findMany({
      where,
      include: {
        coach: { select: { id: true, fullName: true, phone: true } },
        schedules: { include: { field: true } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(classes);
  } catch (error) { next(error); }
});

classRoutes.post('/', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = classSchema.parse(req.body);
    const created = await prisma.class.create({
      data: body,
      include: { coach: { select: { id: true, fullName: true } }, _count: { select: { students: true } } },
    });
    res.status(201).json(created);
  } catch (error) { next(error); }
});

classRoutes.put('/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = classSchema.partial().parse(req.body);
    const exists = await prisma.class.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ message: 'Không tìm thấy lớp học' });

    const updated = await prisma.class.update({
      where: { id: req.params.id },
      data: body,
      include: { coach: { select: { id: true, fullName: true } }, _count: { select: { students: true } } },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

classRoutes.delete('/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const klass = await prisma.class.findUnique({ where: { id: req.params.id }, include: { _count: { select: { students: true } } } });
    if (!klass) return res.status(404).json({ message: 'Không tìm thấy lớp học' });

    await prisma.$transaction(async (tx) => {
      await tx.student.updateMany({ where: { classId: klass.id }, data: { classId: null } });
      await tx.class.delete({ where: { id: klass.id } });
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'DELETE_CLASS',
          entity: 'Class',
          entityId: klass.id,
          metadata: { name: klass.name, studentCountMovedToUnassigned: klass._count.students },
        },
      });
    });

    res.status(204).send();
  } catch (error) { next(error); }
});
