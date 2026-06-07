import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';
import { normalizeDateOnly } from '../../utils/code.js';

export const coachPortalRoutes = Router();
coachPortalRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

async function assertClassAccess(user: { id: string; role: Role }, classId: string) {
  if (user.role === Role.ADMIN) return;
  const klass = await prisma.class.findFirst({ where: { id: classId, coachId: user.id } });
  if (!klass) throw Object.assign(new Error('HLV chỉ được quản lý lớp được Admin gán'), { statusCode: 403 });
}

coachPortalRoutes.get('/classes', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Chưa đăng nhập' });
    const user = req.user;
    const date = typeof req.query.date === 'string' ? normalizeDateOnly(req.query.date) : normalizeDateOnly(new Date().toISOString());
    const where: any = user.role === Role.COACH ? { coachId: user.id, isActive: true } : { isActive: true };

    const classes = await prisma.class.findMany({
      where,
      include: {
        coach: { select: { id: true, fullName: true, phone: true, email: true } },
        schedules: { include: { field: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        students: { where: { status: 'ACTIVE' }, orderBy: { fullName: 'asc' } },
        attendances: { where: { date }, include: { student: true, markedBy: { select: { id: true, fullName: true, role: true } } } },
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });

    const result = classes.map((c) => {
      const present = c.attendances.filter((a) => a.status === 'PRESENT').length;
      const absent = c.attendances.filter((a) => a.status === 'ABSENT').length;
      const excused = c.attendances.filter((a) => a.status === 'EXCUSED').length;
      const notMarked = Math.max(0, c.students.length - c.attendances.length);
      const latest = c.attendances
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      return {
        ...c,
        attendanceSummary: { date, present, absent, excused, notMarked, total: c.students.length, marked: c.attendances.length },
        latestAttendanceAt: latest?.updatedAt || null,
        latestMarkedBy: latest?.markedBy || null,
      };
    });

    res.json(result);
  } catch (error) { next(error); }
});

coachPortalRoutes.get('/classes/:id', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Chưa đăng nhập' });
    await assertClassAccess({ id: req.user.id, role: req.user.role }, req.params.id);
    const date = typeof req.query.date === 'string' ? normalizeDateOnly(req.query.date) : normalizeDateOnly(new Date().toISOString());

    const klass = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        coach: { select: { id: true, fullName: true, phone: true, email: true } },
        schedules: { include: { field: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        students: { where: { status: 'ACTIVE' }, orderBy: { fullName: 'asc' } },
        attendances: { where: { date }, include: { student: true, markedBy: { select: { id: true, fullName: true, role: true } } } },
      },
    });
    if (!klass) return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    res.json(klass);
  } catch (error) { next(error); }
});
