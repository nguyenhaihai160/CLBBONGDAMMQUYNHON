import { Router } from 'express';
import { FeeType, PaymentStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';
import { buildPaymentQrPayload } from '../../utils/code.js';
import { env } from '../../config/env.js';
import { emitRealtime } from '../../socket.js';

export const paymentRoutes = Router();
paymentRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const createPaymentSchema = z.object({
  studentId: z.string(),
  amount: z.number().positive(),
  paidAmount: z.number().nonnegative().default(0),
  feeType: z.nativeEnum(FeeType),
  packageSessions: z.number().int().positive().optional(),
  month: z.string().optional(),
});

function isPackagePayment(feeType: FeeType, packageSessions?: number | null) {
  return feeType === FeeType.PACKAGE && !!packageSessions && packageSessions > 0;
}

async function getBankSettings() {
  const rows = await prisma.academySetting.findMany({
    where: { key: { in: ['bankBin', 'bankName', 'bankAccountNumber', 'bankAccountName', 'paymentNotePrefix'] } },
  });
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    bankBin: String(settings.bankBin || env.bankBin || '').trim(),
    bankName: String(settings.bankName || '').trim(),
    bankAccount: String(settings.bankAccountNumber || env.bankAccount || '').trim(),
    bankAccountName: String(settings.bankAccountName || env.bankAccountName || '').trim(),
    paymentNotePrefix: String(settings.paymentNotePrefix || 'HP').trim(),
  };
}

function buildTransferContent(prefix: string, studentCode: string, fullName: string, month?: string) {
  const raw = [prefix || 'HP', studentCode, month, fullName].filter(Boolean).join(' ');
  return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 80);
}

paymentRoutes.get('/', async (req, res, next) => {
  try {
    const where: any = {};
    if (req.user?.role === Role.COACH) where.student = { class: { coachId: req.user.id } };
    const payments = await prisma.payment.findMany({ where, include: { student: { include: { class: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(payments);
  } catch (error) { next(error); }
});

paymentRoutes.get('/overdue', async (req, res, next) => {
  try {
    const where: any = { tuitionStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] } };
    if (req.user?.role === Role.COACH) where.class = { coachId: req.user.id };
    const students = await prisma.student.findMany({ where, include: { class: true, paymentHistories: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    res.json(students);
  } catch (error) { next(error); }
});

paymentRoutes.post('/qr-preview', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = z.object({
      studentId: z.string().optional(),
      amount: z.number().positive(),
      content: z.string().max(80).optional(),
      month: z.string().optional(),
    }).parse(req.body);

    const bank = await getBankSettings();
    const student = body.studentId ? await prisma.student.findUnique({ where: { id: body.studentId } }) : null;
    const transferContent = body.content?.trim() || (student ? buildTransferContent(bank.paymentNotePrefix, student.studentCode, student.fullName, body.month) : `${bank.paymentNotePrefix} HOC PHI`);
    const qrPayload = buildPaymentQrPayload({
      bankBin: bank.bankBin,
      bankAccount: bank.bankAccount,
      bankAccountName: bank.bankAccountName,
      amount: body.amount,
      content: transferContent,
    });

    res.json({
      bankBin: bank.bankBin,
      bankName: bank.bankName,
      bankAccount: bank.bankAccount,
      bankAccountName: bank.bankAccountName,
      amount: body.amount,
      transferContent,
      qrPayload,
      ready: Boolean(qrPayload),
    });
  } catch (error) { next(error); }
});

paymentRoutes.post('/', async (req, res, next) => {
  try {
    const body = createPaymentSchema.parse(req.body);
    const student = await prisma.student.findUnique({ where: { id: body.studentId }, include: { class: true } });
    if (!student) return res.status(404).json({ message: 'Không tìm thấy học viên' });
    if (req.user?.role === Role.COACH && student.class?.coachId !== req.user.id) return res.status(403).json({ message: 'Không đủ quyền' });
    if (body.feeType === FeeType.PACKAGE && !body.packageSessions) return res.status(400).json({ message: 'Gói buổi học cần nhập số buổi' });

    const debtAmount = body.amount - body.paidAmount;
    const status = debtAmount <= 0 ? PaymentStatus.PAID : body.paidAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;
    const bank = await getBankSettings();
    const transferContent = buildTransferContent(bank.paymentNotePrefix, student.studentCode, student.fullName, body.month);
    const qrAmount = Math.max(debtAmount, 0) || body.amount;
    const qrPayload = buildPaymentQrPayload({
      bankBin: bank.bankBin,
      bankAccount: bank.bankAccount,
      bankAccountName: bank.bankAccountName,
      amount: qrAmount,
      content: transferContent,
    });

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          studentId: body.studentId,
          amount: body.amount,
          paidAmount: body.paidAmount,
          debtAmount,
          feeType: body.feeType,
          packageSessions: body.packageSessions,
          month: body.month,
          status,
          confirmedById: status === PaymentStatus.PAID && req.user?.role === Role.ADMIN ? req.user.id : undefined,
          confirmedAt: status === PaymentStatus.PAID && req.user?.role === Role.ADMIN ? new Date() : undefined,
          sessionsApplied: status === PaymentStatus.PAID && req.user?.role === Role.ADMIN && isPackagePayment(body.feeType, body.packageSessions),
          transferContent,
          qrPayload,
          bankCode: bank.bankBin,
        },
      });

      const studentUpdate: any = { tuitionStatus: created.status };
      if (created.sessionsApplied && created.packageSessions) {
        studentUpdate.sessionTotal = { increment: created.packageSessions };
        studentUpdate.sessionRemaining = { increment: created.packageSessions };
      }

      await tx.student.update({ where: { id: body.studentId }, data: studentUpdate });
      return created;
    });

    res.status(201).json(payment);
  } catch (error) { next(error); }
});

paymentRoutes.patch('/:id/confirm', async (req, res, next) => {
  try {
    if (req.user?.role !== Role.ADMIN) return res.status(403).json({ message: 'Chỉ Admin được xác nhận thanh toán' });
    const paidAmount = z.number().positive().optional().parse(req.body.paidAmount);
    const old = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!old) return res.status(404).json({ message: 'Không tìm thấy thanh toán' });

    const finalPaid = paidAmount ?? Number(old.amount);
    const debt = Number(old.amount) - finalPaid;
    const status = debt <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
    const shouldApplySessions = status === PaymentStatus.PAID && !old.sessionsApplied && isPackagePayment(old.feeType, old.packageSessions);

    const payment = await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: req.params.id },
        data: {
          paidAmount: finalPaid,
          debtAmount: debt,
          status,
          confirmedById: req.user?.id,
          confirmedAt: new Date(),
          sessionsApplied: old.sessionsApplied || shouldApplySessions,
        },
      });

      const studentUpdate: any = { tuitionStatus: status };
      if (shouldApplySessions && old.packageSessions) {
        studentUpdate.sessionTotal = { increment: old.packageSessions };
        studentUpdate.sessionRemaining = { increment: old.packageSessions };
      }

      await tx.student.update({ where: { id: updated.studentId }, data: studentUpdate });
      return updated;
    });

    emitRealtime('payment.confirmed', { paymentId: payment.id, studentId: payment.studentId, status });
    res.json(payment);
  } catch (error) { next(error); }
});
