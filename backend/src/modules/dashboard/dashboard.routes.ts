import { Router } from 'express';
import { AttendanceStatus, PaymentStatus, Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate);

dashboardRoutes.get('/admin', authorize(Role.ADMIN), async (_req, res, next) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalStudents, activeStudents, debtStudents, activeClasses, revenueAgg, attendanceStats] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.student.count({ where: { tuitionStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] } } }),
      prisma.class.count({ where: { isActive: true } }),
      prisma.payment.aggregate({ _sum: { paidAmount: true }, where: { status: PaymentStatus.PAID, confirmedAt: { gte: startOfMonth } } }),
      prisma.attendance.groupBy({ by: ['status'], _count: { status: true }, where: { date: { gte: startOfMonth } } }),
    ]);

    res.json({
      totalStudents,
      activeStudents,
      debtStudents,
      activeClasses,
      monthRevenue: Number(revenueAgg._sum.paidAmount || 0),
      attendanceStats,
    });
  } catch (error) { next(error); }
});

dashboardRoutes.get('/coach', authorize(Role.COACH), async (req, res, next) => {
  try {
    const today = new Date();
    const jsDay = today.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    today.setHours(0, 0, 0, 0);

    const [myClasses, todaySchedules, absentToday] = await Promise.all([
      prisma.class.findMany({ where: { coachId: req.user?.id }, include: { _count: { select: { students: true } } } }),
      prisma.trainingSchedule.findMany({ where: { dayOfWeek, class: { coachId: req.user?.id } }, include: { class: true, field: true } }),
      prisma.attendance.count({ where: { date: today, status: AttendanceStatus.ABSENT, class: { coachId: req.user?.id } } }),
    ]);

    res.json({ myClasses, todaySchedules, absentToday });
  } catch (error) { next(error); }
});
