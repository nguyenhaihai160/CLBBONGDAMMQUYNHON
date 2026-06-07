import { Router } from 'express';
import { Role, ZaloMessageType } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const zaloRoutes = Router();
zaloRoutes.use(authenticate);

const sendSchema = z.object({
  parentPhone: z.string().min(8),
  studentId: z.string().optional().nullable(),
  type: z.nativeEnum(ZaloMessageType),
  content: z.string().min(1),
});

const connectionSchema = z.object({
  oaId: z.string().min(3, 'Vui lòng nhập OA ID'),
  accessToken: z.string().min(10, 'Vui lòng nhập Access Token'),
  refreshToken: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

zaloRoutes.get('/connection', authorize(Role.ADMIN), async (_req, res, next) => {
  try {
    const conn = await prisma.zaloConnection.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!conn) return res.json({ connected: false, isActive: false });

    res.json({
      connected: Boolean(conn.accessToken),
      id: conn.id,
      oaId: conn.oaId,
      isActive: conn.isActive,
      expiresAt: conn.expiresAt,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      hasRefreshToken: Boolean(conn.refreshToken),
    });
  } catch (error) { next(error); }
});

zaloRoutes.put('/connection', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = connectionSchema.parse(req.body);
    const current = await prisma.zaloConnection.findFirst({ orderBy: { updatedAt: 'desc' } });
    const data = {
      oaId: body.oaId,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken || null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      isActive: body.isActive,
    };

    const saved = current
      ? await prisma.zaloConnection.update({ where: { id: current.id }, data })
      : await prisma.zaloConnection.create({ data });

    res.json({
      message: 'Đã lưu cấu hình Zalo OA. Bản local hiện ghi log demo; khi có OA thật chỉ cần bật adapter gọi API Zalo.',
      data: { id: saved.id, oaId: saved.oaId, isActive: saved.isActive, expiresAt: saved.expiresAt, connected: true },
    });
  } catch (error) { next(error); }
});

zaloRoutes.delete('/connection', authorize(Role.ADMIN), async (_req, res, next) => {
  try {
    const current = await prisma.zaloConnection.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (current) await prisma.zaloConnection.delete({ where: { id: current.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

zaloRoutes.post('/send', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = sendSchema.parse(req.body);
    const connection = await prisma.zaloConnection.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } });

    // Adapter demo: lưu log trước. Khi có Zalo OA thật, gọi API Zalo ở đây bằng accessToken.
    const message = await prisma.zaloMessage.create({
      data: {
        parentPhone: body.parentPhone,
        studentId: body.studentId || null,
        type: body.type,
        content: body.content,
        status: connection ? 'READY_DEMO' : 'SENT_DEMO_NO_CONNECTION',
        sentAt: new Date(),
      },
    });

    res.json({ message: connection ? 'Đã ghi nhận tin nhắn Zalo demo qua OA đã cấu hình' : 'Đã ghi nhận tin nhắn Zalo demo, chưa cấu hình OA', data: message });
  } catch (error) { next(error); }
});

zaloRoutes.get('/messages', authorize(Role.ADMIN), async (_req, res, next) => {
  try {
    const messages = await prisma.zaloMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { student: { select: { id: true, fullName: true, studentCode: true } } },
    });
    res.json(messages);
  } catch (error) { next(error); }
});
