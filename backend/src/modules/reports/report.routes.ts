import { Router } from 'express';
import { PaymentStatus, Role, UniformOrderStatus } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const reportRoutes = Router();
reportRoutes.use(authenticate);
reportRoutes.use(authorize(Role.ADMIN));

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-');
  return `Tháng ${Number(month)}/${year}`;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function getMonthRange(months: number) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  return { start, end };
}

reportRoutes.get('/revenue-monthly', async (req, res, next) => {
  try {
    const months = Math.min(Math.max(Number(req.query.months || 12), 1), 36);
    const { start, end } = getMonthRange(months);

    const [payments, uniformOrders, debtAgg, debtStudents] = await Promise.all([
      prisma.payment.findMany({
        where: { status: PaymentStatus.PAID, confirmedAt: { gte: start, lt: end } },
        include: { student: { select: { studentCode: true, fullName: true, class: { select: { name: true } } } } },
        orderBy: { confirmedAt: 'asc' },
      }),
      prisma.uniformOrder.findMany({
        where: { status: UniformOrderStatus.PAID, paidAt: { gte: start, lt: end } },
        include: { student: { select: { studentCode: true, fullName: true, class: { select: { name: true } } } } },
        orderBy: { paidAt: 'asc' },
      }),
      prisma.payment.aggregate({
        _sum: { debtAmount: true },
        where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] } },
      }),
      prisma.student.count({ where: { tuitionStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] } } }),
    ]);

    const rows = Array.from({ length: months }, (_, index) => {
      const key = monthKey(addMonths(start, index));
      return {
        month: key,
        label: monthLabel(key),
        tuitionRevenue: 0,
        uniformRevenue: 0,
        totalRevenue: 0,
        paidPayments: 0,
        paidUniformOrders: 0,
      };
    });

    const rowMap = new Map(rows.map((row) => [row.month, row]));

    for (const payment of payments) {
      if (!payment.confirmedAt) continue;
      const row = rowMap.get(monthKey(payment.confirmedAt));
      if (!row) continue;
      row.tuitionRevenue += Number(payment.paidAmount || 0);
      row.totalRevenue += Number(payment.paidAmount || 0);
      row.paidPayments += 1;
    }

    for (const order of uniformOrders) {
      if (!order.paidAt) continue;
      const row = rowMap.get(monthKey(order.paidAt));
      if (!row) continue;
      row.uniformRevenue += Number(order.totalAmount || 0);
      row.totalRevenue += Number(order.totalAmount || 0);
      row.paidUniformOrders += 1;
    }

    const totalRevenue = rows.reduce((sum, row) => sum + row.totalRevenue, 0);
    const totalTuitionRevenue = rows.reduce((sum, row) => sum + row.tuitionRevenue, 0);
    const totalUniformRevenue = rows.reduce((sum, row) => sum + row.uniformRevenue, 0);
    const bestMonth = rows.reduce((best, row) => row.totalRevenue > best.totalRevenue ? row : best, rows[0]);

    res.json({
      months,
      rows,
      summary: {
        totalRevenue,
        totalTuitionRevenue,
        totalUniformRevenue,
        totalDebt: Number(debtAgg._sum.debtAmount || 0),
        debtStudents,
        bestMonth,
      },
    });
  } catch (error) { next(error); }
});
