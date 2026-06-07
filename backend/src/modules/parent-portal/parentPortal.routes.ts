import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const parentPortalRoutes = Router();
parentPortalRoutes.use(authenticate, authorize(Role.PARENT));

async function assertOwnChild(parentId: string, studentId: string) {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (!link) {
    throw Object.assign(new Error('Phụ huynh chỉ được xem hồ sơ của con mình'), { statusCode: 403 });
  }
}

parentPortalRoutes.get('/children', async (req, res, next) => {
  try {
    const links = await prisma.parentStudent.findMany({
      where: { parentId: req.user!.id },
      include: {
        student: {
          include: {
            class: { include: { schedules: { include: { field: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } } },
            paymentHistories: { orderBy: { createdAt: 'desc' }, take: 3 },
            attendanceHistories: { orderBy: { date: 'desc' }, take: 5 },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(links.map((link) => link.student));
  } catch (error) { next(error); }
});

parentPortalRoutes.get('/children/:studentId', async (req, res, next) => {
  try {
    await assertOwnChild(req.user!.id, req.params.studentId);
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      include: {
        class: {
          include: {
            coach: { select: { fullName: true, phone: true } },
            schedules: { include: { field: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
          },
        },
        attendanceHistories: { orderBy: { date: 'desc' }, take: 30 },
        paymentHistories: { orderBy: { createdAt: 'desc' }, take: 20 },
        uniformOrders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!student) return res.status(404).json({ message: 'Không tìm thấy học viên' });
    res.json(student);
  } catch (error) { next(error); }
});
