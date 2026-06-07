import { Router } from 'express';
import { CoachPayrollStatus, CoachWorkStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';
import { normalizeDateOnly } from '../../utils/code.js';

export const coachPayrollRoutes = Router();
coachPayrollRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const money = z.union([z.number(), z.string()]).transform((value) => Number(value || 0));

function normalizeMonth(month?: string) {
  const input = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  return input;
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));
  return { start, end };
}

function calculateWorkAmount(status: CoachWorkStatus, sessionCount: number, rate: number, amount?: number) {
  if (status !== CoachWorkStatus.PRESENT) return 0;
  if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) return amount;
  return Math.max(0, sessionCount) * Math.max(0, rate);
}

const workLogSchema = z.object({
  coachId: z.string(),
  classId: z.string().optional().nullable(),
  date: z.string(),
  status: z.nativeEnum(CoachWorkStatus).default(CoachWorkStatus.PRESENT),
  sessionCount: z.coerce.number().int().min(0).default(1),
  hours: money.default(1.5),
  rate: money.default(100000),
  amount: money.optional(),
  note: z.string().optional(),
});

coachPayrollRoutes.get('/coaches', async (req, res, next) => {
  try {
    if (req.user?.role === Role.COACH) {
      const coach = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, fullName: true, email: true, phone: true } });
      return res.json(coach ? [coach] : []);
    }
    const coaches = await prisma.user.findMany({
      where: { role: Role.COACH, status: 'ACTIVE' },
      select: { id: true, fullName: true, email: true, phone: true, _count: { select: { coachClasses: true } } },
      orderBy: { fullName: 'asc' },
    });
    res.json(coaches);
  } catch (error) { next(error); }
});

coachPayrollRoutes.get('/work-logs', async (req, res, next) => {
  try {
    const month = normalizeMonth(typeof req.query.month === 'string' ? req.query.month : undefined);
    const { start, end } = monthRange(month);
    const coachId = typeof req.query.coachId === 'string' ? req.query.coachId : undefined;

    const where: any = {
      date: { gte: start, lt: end },
      coachId: req.user?.role === Role.COACH ? req.user.id : coachId || undefined,
    };

    const records = await prisma.coachWorkLog.findMany({
      where,
      include: {
        coach: { select: { id: true, fullName: true, email: true } },
        class: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
    });

    const summary = records.reduce((result, item) => {
      result.totalLogs += 1;
      if (item.status === CoachWorkStatus.PRESENT) result.present += 1;
      if (item.status === CoachWorkStatus.ABSENT) result.absent += 1;
      if (item.status === CoachWorkStatus.EXCUSED) result.excused += 1;
      result.sessions += item.status === CoachWorkStatus.PRESENT ? item.sessionCount : 0;
      result.amount += Number(item.amount || 0);
      return result;
    }, { totalLogs: 0, present: 0, absent: 0, excused: 0, sessions: 0, amount: 0 });

    res.json({ month, records, summary });
  } catch (error) { next(error); }
});

coachPayrollRoutes.post('/work-logs', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = workLogSchema.parse(req.body);
    const coach = await prisma.user.findFirst({ where: { id: body.coachId, role: Role.COACH } });
    if (!coach) return res.status(400).json({ message: 'Không tìm thấy Huấn luyện viên hợp lệ' });

    if (body.classId) {
      const klass = await prisma.class.findUnique({ where: { id: body.classId } });
      if (!klass) return res.status(400).json({ message: 'Lớp học không tồn tại' });
    }

    const amount = calculateWorkAmount(body.status, body.sessionCount, body.rate, body.amount);
    const created = await prisma.coachWorkLog.create({
      data: {
        coachId: body.coachId,
        classId: body.classId || null,
        date: normalizeDateOnly(body.date),
        status: body.status,
        sessionCount: body.sessionCount,
        hours: body.hours,
        rate: body.rate,
        amount,
        note: body.note,
        createdById: req.user?.id,
      },
      include: { coach: { select: { id: true, fullName: true } }, class: { select: { id: true, name: true } } },
    });
    res.status(201).json(created);
  } catch (error) { next(error); }
});

coachPayrollRoutes.patch('/work-logs/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const existing = await prisma.coachWorkLog.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy dòng chấm công' });
    const body = workLogSchema.partial().parse(req.body);
    const status = body.status || existing.status;
    const sessionCount = body.sessionCount ?? existing.sessionCount;
    const rate = body.rate ?? Number(existing.rate || 0);
    const amount = calculateWorkAmount(status, sessionCount, rate, body.amount);

    const updated = await prisma.coachWorkLog.update({
      where: { id: req.params.id },
      data: {
        coachId: body.coachId,
        classId: body.classId === undefined ? undefined : body.classId || null,
        date: body.date ? normalizeDateOnly(body.date) : undefined,
        status,
        sessionCount,
        hours: body.hours,
        rate,
        amount,
        note: body.note,
      },
      include: { coach: { select: { id: true, fullName: true } }, class: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

coachPayrollRoutes.delete('/work-logs/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    await prisma.coachWorkLog.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

const generatePayrollSchema = z.object({
  coachId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  baseSalary: money.default(0),
  sessionRate: money.default(100000),
  bonus: money.default(0),
  deduction: money.default(0),
  note: z.string().optional(),
});

coachPayrollRoutes.post('/payrolls/generate', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = generatePayrollSchema.parse(req.body);
    const coach = await prisma.user.findFirst({ where: { id: body.coachId, role: Role.COACH } });
    if (!coach) return res.status(400).json({ message: 'Không tìm thấy Huấn luyện viên hợp lệ' });
    const { start, end } = monthRange(body.month);

    const workLogs = await prisma.coachWorkLog.findMany({ where: { coachId: body.coachId, date: { gte: start, lt: end }, status: CoachWorkStatus.PRESENT } });
    const sessionCount = workLogs.reduce((sum, item) => sum + item.sessionCount, 0);
    const sessionAmount = workLogs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalAmount = body.baseSalary + sessionAmount + body.bonus - body.deduction;

    const payroll = await prisma.coachPayroll.upsert({
      where: { coachId_month: { coachId: body.coachId, month: body.month } },
      update: {
        baseSalary: body.baseSalary,
        sessionRate: body.sessionRate,
        sessionCount,
        sessionAmount,
        bonus: body.bonus,
        deduction: body.deduction,
        totalAmount,
        note: body.note,
        status: CoachPayrollStatus.DRAFT,
        confirmedById: null,
        confirmedAt: null,
        paidAt: null,
      },
      create: {
        coachId: body.coachId,
        month: body.month,
        baseSalary: body.baseSalary,
        sessionRate: body.sessionRate,
        sessionCount,
        sessionAmount,
        bonus: body.bonus,
        deduction: body.deduction,
        totalAmount,
        note: body.note,
      },
      include: { coach: { select: { id: true, fullName: true, email: true, phone: true } }, confirmedBy: { select: { id: true, fullName: true } } },
    });
    res.json(payroll);
  } catch (error) { next(error); }
});

coachPayrollRoutes.get('/payrolls', async (req, res, next) => {
  try {
    const month = normalizeMonth(typeof req.query.month === 'string' ? req.query.month : undefined);
    const coachId = typeof req.query.coachId === 'string' ? req.query.coachId : undefined;
    const where: any = {
      month,
      coachId: req.user?.role === Role.COACH ? req.user.id : coachId || undefined,
    };
    const payrolls = await prisma.coachPayroll.findMany({
      where,
      include: { coach: { select: { id: true, fullName: true, email: true, phone: true } }, confirmedBy: { select: { id: true, fullName: true } } },
      orderBy: [{ month: 'desc' }, { updatedAt: 'desc' }],
    });
    const summary = payrolls.reduce((result, item) => {
      result.total += Number(item.totalAmount || 0);
      result.sessions += item.sessionCount;
      if (item.status === CoachPayrollStatus.PAID) result.paid += Number(item.totalAmount || 0);
      return result;
    }, { total: 0, paid: 0, sessions: 0 });
    res.json({ month, payrolls, summary });
  } catch (error) { next(error); }
});

coachPayrollRoutes.get('/me', authorize(Role.COACH), async (req, res, next) => {
  try {
    const month = normalizeMonth(typeof req.query.month === 'string' ? req.query.month : undefined);
    const { start, end } = monthRange(month);
    const [workLogs, payroll] = await Promise.all([
      prisma.coachWorkLog.findMany({
        where: { coachId: req.user!.id, date: { gte: start, lt: end } },
        include: { class: { select: { id: true, name: true } }, createdBy: { select: { id: true, fullName: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.coachPayroll.findUnique({ where: { coachId_month: { coachId: req.user!.id, month } } }),
    ]);
    const summary = workLogs.reduce((result, item) => {
      result.sessions += item.status === CoachWorkStatus.PRESENT ? item.sessionCount : 0;
      result.amount += Number(item.amount || 0);
      result.logs += 1;
      return result;
    }, { sessions: 0, amount: 0, logs: 0 });
    res.json({ month, workLogs, payroll, summary });
  } catch (error) { next(error); }
});

const updatePayrollStatusSchema = z.object({
  status: z.nativeEnum(CoachPayrollStatus),
});

coachPayrollRoutes.patch('/payrolls/:id/status', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = updatePayrollStatusSchema.parse(req.body);
    const updated = await prisma.coachPayroll.update({
      where: { id: req.params.id },
      data: {
        status: body.status,
        confirmedById: body.status === CoachPayrollStatus.CONFIRMED || body.status === CoachPayrollStatus.PAID ? req.user?.id : undefined,
        confirmedAt: body.status === CoachPayrollStatus.CONFIRMED || body.status === CoachPayrollStatus.PAID ? new Date() : undefined,
        paidAt: body.status === CoachPayrollStatus.PAID ? new Date() : null,
      },
      include: { coach: { select: { id: true, fullName: true, email: true, phone: true } }, confirmedBy: { select: { id: true, fullName: true } } },
    });
    res.json(updated);
  } catch (error) { next(error); }
});
