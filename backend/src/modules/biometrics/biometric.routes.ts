// @ts-nocheck
import { Router } from 'express';
import { AttendanceStatus, BiometricAttendanceResult, BiometricFactor, Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';
import { normalizeDateOnly } from '../../utils/code.js';
import { emitRealtime } from '../../socket.js';

export const biometricRoutes = Router();
biometricRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const signatureSchema = z.string().min(20).max(2000);

const enrollSchema = z.object({
  studentId: z.string(),
  faceSignature: signatureSchema.optional(),
  irisSignature: signatureSchema.optional(),
  faceSnapshotUrl: z.string().optional(),
  irisSnapshotUrl: z.string().optional(),
  consentNote: z.string().optional(),
});

const recognizeSchema = z.object({
  classId: z.string().optional(),
  factor: z.nativeEnum(BiometricFactor).default(BiometricFactor.FACE),
  faceSignature: signatureSchema.optional(),
  irisSignature: signatureSchema.optional(),
  snapshotUrl: z.string().optional(),
  livenessPassed: z.boolean().default(false),
  antiSpoofPassed: z.boolean().default(false),
  autoMark: z.boolean().default(false),
  date: z.string().optional(),
  threshold: z.number().min(40).max(99).default(72),
});

function parseSignature(signature?: string) {
  if (!signature) return [] as number[];
  return signature
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x));
}

function scoreSignature(input?: string, stored?: string | null) {
  const a = parseSignature(input);
  const b = parseSignature(stored || undefined);
  if (!a.length || !b.length || a.length !== b.length) return 0;
  const averageDiff = a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / a.length;
  const score = Math.max(0, Math.min(100, 100 - (averageDiff / 255) * 100));
  return Math.round(score * 10) / 10;
}

async function assertCanAccessStudent(studentId: string, userId: string | undefined, role: Role | undefined) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { class: true } });
  if (!student) return null;
  if (role === Role.COACH && student.class?.coachId !== userId) return null;
  return student;
}

biometricRoutes.get('/profiles', async (req, res, next) => {
  try {
    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const where: any = { classId };
    if (req.user?.role === Role.COACH) where.class = { coachId: req.user.id };

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, coachId: true } },
        biometricProfile: { select: { id: true, isEnabled: true, consentAt: true, faceSignature: true, irisSignature: true, updatedAt: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json(students.map((student) => ({
      ...student,
      biometricProfile: student.biometricProfile
        ? {
            id: student.biometricProfile.id,
            isEnabled: student.biometricProfile.isEnabled,
            consentAt: student.biometricProfile.consentAt,
            hasFace: Boolean(student.biometricProfile.faceSignature),
            hasIris: Boolean(student.biometricProfile.irisSignature),
            updatedAt: student.biometricProfile.updatedAt,
          }
        : null,
    })));
  } catch (error) { next(error); }
});

biometricRoutes.post('/enroll', async (req, res, next) => {
  try {
    const body = enrollSchema.parse(req.body);
    const student = await assertCanAccessStudent(body.studentId, req.user?.id, req.user?.role);
    if (!student) return res.status(403).json({ message: 'Không có quyền đăng ký sinh trắc học cho học viên này' });
    if (!body.faceSignature && !body.irisSignature) return res.status(400).json({ message: 'Cần ít nhất một mẫu khuôn mặt hoặc mống mắt' });

    const profile = await prisma.studentBiometricProfile.upsert({
      where: { studentId: body.studentId },
      update: {
        faceSignature: body.faceSignature || undefined,
        irisSignature: body.irisSignature || undefined,
        faceSnapshotUrl: body.faceSnapshotUrl || undefined,
        irisSnapshotUrl: body.irisSnapshotUrl || undefined,
        consentAt: new Date(),
        consentNote: body.consentNote,
        isEnabled: true,
        enrolledById: req.user?.id,
      },
      create: {
        studentId: body.studentId,
        faceSignature: body.faceSignature,
        irisSignature: body.irisSignature,
        faceSnapshotUrl: body.faceSnapshotUrl,
        irisSnapshotUrl: body.irisSnapshotUrl,
        consentAt: new Date(),
        consentNote: body.consentNote,
        isEnabled: true,
        enrolledById: req.user?.id,
      },
      include: { student: { select: { id: true, fullName: true, studentCode: true } } },
    });

    res.json({
      id: profile.id,
      student: profile.student,
      hasFace: Boolean(profile.faceSignature),
      hasIris: Boolean(profile.irisSignature),
      consentAt: profile.consentAt,
      message: 'Đã đăng ký/cập nhật mẫu sinh trắc học cho học viên',
    });
  } catch (error) { next(error); }
});

biometricRoutes.post('/recognize', async (req, res, next) => {
  try {
    const body = recognizeSchema.parse(req.body);
    if ((body.factor === BiometricFactor.FACE || body.factor === BiometricFactor.FACE_AND_IRIS) && !body.faceSignature) {
      return res.status(400).json({ message: 'Thiếu mẫu khuôn mặt từ camera' });
    }
    if ((body.factor === BiometricFactor.IRIS || body.factor === BiometricFactor.FACE_AND_IRIS) && !body.irisSignature) {
      return res.status(400).json({ message: 'Thiếu mẫu mống mắt từ camera' });
    }
    if (req.user?.role === Role.COACH && body.classId) {
      const klass = await prisma.class.findFirst({ where: { id: body.classId, coachId: req.user.id } });
      if (!klass) return res.status(403).json({ message: 'HLV chỉ được nhận diện học viên trong lớp của mình' });
    }

    const candidates = await prisma.studentBiometricProfile.findMany({
      where: {
        isEnabled: true,
        student: {
          classId: body.classId || undefined,
          class: req.user?.role === Role.COACH ? { coachId: req.user.id } : undefined,
        },
      },
      include: { student: { include: { class: { select: { id: true, name: true, coachId: true } } } } },
      take: 500,
    });

    let best: any = null;
    for (const profile of candidates) {
      const faceScore = body.factor !== BiometricFactor.IRIS ? scoreSignature(body.faceSignature, profile.faceSignature) : undefined;
      const irisScore = body.factor !== BiometricFactor.FACE ? scoreSignature(body.irisSignature, profile.irisSignature) : undefined;
      let confidence = 0;
      if (body.factor === BiometricFactor.FACE) confidence = faceScore || 0;
      if (body.factor === BiometricFactor.IRIS) confidence = irisScore || 0;
      if (body.factor === BiometricFactor.FACE_AND_IRIS) confidence = Math.round((((faceScore || 0) * 0.6 + (irisScore || 0) * 0.4)) * 10) / 10;
      if (!best || confidence > best.confidence) best = { profile, faceScore, irisScore, confidence };
    }

    const safetyPassed = body.livenessPassed && body.antiSpoofPassed;
    const matched = Boolean(best && best.confidence >= body.threshold && safetyPassed);
    const lowConfidence = Boolean(best && best.confidence > 0 && best.confidence < body.threshold);
    let attendanceId: string | null = null;

    const log = await prisma.biometricAttendanceLog.create({
      data: {
        studentId: matched ? best.profile.studentId : best?.profile.studentId,
        classId: body.classId || best?.profile.student.classId,
        factor: body.factor,
        result: matched ? BiometricAttendanceResult.MATCHED : lowConfidence ? BiometricAttendanceResult.LOW_CONFIDENCE : BiometricAttendanceResult.UNKNOWN,
        confidence: best?.confidence || 0,
        faceScore: best?.faceScore,
        irisScore: best?.irisScore,
        snapshotUrl: body.snapshotUrl,
        livenessPassed: body.livenessPassed,
        antiSpoofPassed: body.antiSpoofPassed,
        note: safetyPassed ? undefined : 'Không đạt điều kiện liveness/anti-spoof',
        markedById: req.user?.id,
      },
    });

    if (matched && body.autoMark) {
      const student = best.profile.student;
      const classId = body.classId || student.classId;
      if (!classId) return res.status(400).json({ message: 'Học viên chưa có lớp nên không thể tự động điểm danh' });
      const date = normalizeDateOnly(body.date || new Date().toISOString().slice(0, 10));
      const existing = await prisma.attendance.findUnique({ where: { studentId_classId_date: { studentId: student.id, classId, date } } });
      const attendance = await prisma.attendance.upsert({
        where: { studentId_classId_date: { studentId: student.id, classId, date } },
        update: { status: AttendanceStatus.PRESENT, note: 'Điểm danh bằng camera sinh trắc học', markedById: req.user?.id },
        create: { studentId: student.id, classId, date, status: AttendanceStatus.PRESENT, note: 'Điểm danh bằng camera sinh trắc học', markedById: req.user?.id },
      });
      attendanceId = attendance.id;
      if (existing?.status !== AttendanceStatus.PRESENT) {
        await prisma.student.update({ where: { id: student.id }, data: { sessionUsed: { increment: 1 }, sessionRemaining: { decrement: 1 } } });
      }
      await prisma.biometricAttendanceLog.update({ where: { id: log.id }, data: { createdAttendanceId: attendance.id } });
      emitRealtime('attendance.biometric', { classId, studentId: student.id, date, confidence: best.confidence });
    }

    res.json({
      matched,
      result: matched ? 'MATCHED' : lowConfidence ? 'LOW_CONFIDENCE' : 'UNKNOWN',
      confidence: best?.confidence || 0,
      faceScore: best?.faceScore,
      irisScore: best?.irisScore,
      threshold: body.threshold,
      safetyPassed,
      logId: log.id,
      attendanceId,
      student: best?.profile.student ? {
        id: best.profile.student.id,
        studentCode: best.profile.student.studentCode,
        fullName: best.profile.student.fullName,
        class: best.profile.student.class,
        sessionRemaining: best.profile.student.sessionRemaining,
      } : null,
      message: matched ? 'Đã nhận diện thành công' : safetyPassed ? 'Chưa đủ độ tin cậy để tự động điểm danh' : 'Chưa đạt kiểm tra chống điểm danh hộ',
    });
  } catch (error) { next(error); }
});

biometricRoutes.get('/logs', async (req, res, next) => {
  try {
    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const logs = await prisma.biometricAttendanceLog.findMany({
      where: {
        classId,
        class: req.user?.role === Role.COACH ? { coachId: req.user.id } : undefined,
      },
      include: {
        student: { select: { id: true, studentCode: true, fullName: true } },
        class: { select: { id: true, name: true } },
        markedBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (error) { next(error); }
});
