import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const userRoutes = Router();
userRoutes.use(authenticate, authorize(Role.ADMIN));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.nativeEnum(Role),
  studentIds: z.array(z.string()).optional().default([]),
});

userRoutes.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        parentStudents: { include: { student: { select: { id: true, fullName: true, studentCode: true } } } },
        _count: { select: { coachClasses: true, createdStudents: true, parentStudents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) { next(error); }
});

userRoutes.post('/', async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    if (body.role !== Role.PARENT && body.studentIds.length > 0) {
      return res.status(400).json({ message: 'Chỉ tài khoản Phụ huynh mới được liên kết học viên' });
    }
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        fullName: body.fullName,
        phone: body.phone,
        role: body.role,
        parentStudents: body.role === Role.PARENT && body.studentIds.length > 0
          ? { create: body.studentIds.map((studentId) => ({ studentId })) }
          : undefined,
      },
      select: {
        id: true, email: true, fullName: true, phone: true, role: true, status: true,
        parentStudents: { include: { student: { select: { id: true, fullName: true, studentCode: true } } } },
      },
    });
    res.status(201).json(user);
  } catch (error) { next(error); }
});


userRoutes.put('/:id/parent-students', async (req, res, next) => {
  try {
    const studentIds = z.array(z.string()).parse(req.body.studentIds ?? []);
    const parent = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!parent || parent.role !== Role.PARENT) {
      return res.status(400).json({ message: 'Tài khoản được chọn không phải Phụ huynh' });
    }
    const studentCount = await prisma.student.count({ where: { id: { in: studentIds } } });
    if (studentCount !== studentIds.length) {
      return res.status(400).json({ message: 'Có học viên không tồn tại' });
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.parentStudent.deleteMany({ where: { parentId: parent.id } });
      if (studentIds.length > 0) {
        await tx.parentStudent.createMany({ data: studentIds.map((studentId) => ({ parentId: parent.id, studentId })) });
      }
      await tx.auditLog.create({
        data: { userId: req.user?.id, action: 'ASSIGN_PARENT_STUDENTS', entity: 'User', entityId: parent.id, metadata: { studentIds } },
      });
      return tx.user.findUnique({
        where: { id: parent.id },
        select: { id: true, fullName: true, role: true, parentStudents: { include: { student: { select: { id: true, fullName: true, studentCode: true } } } } },
      });
    });
    res.json(updated);
  } catch (error) { next(error); }
});


const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
  studentIds: z.array(z.string()).optional().default([]),
});

userRoutes.patch('/:id/role', async (req, res, next) => {
  try {
    const body = updateRoleSchema.parse(req.body);
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ message: 'Không thể tự thay đổi vai trò tài khoản đang đăng nhập' });
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    if (existing.role === Role.ADMIN && body.role !== Role.ADMIN) {
      const activeAdminCount = await prisma.user.count({ where: { role: Role.ADMIN, status: 'ACTIVE' } });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: 'Không thể đổi quyền Admin hoạt động cuối cùng' });
      }
    }

    if (body.role !== Role.PARENT && body.studentIds.length > 0) {
      return res.status(400).json({ message: 'Chỉ tài khoản Phụ huynh mới được gán học viên là con' });
    }

    if (body.role === Role.PARENT && body.studentIds.length > 0) {
      const studentCount = await prisma.student.count({ where: { id: { in: body.studentIds } } });
      if (studentCount !== body.studentIds.length) {
        return res.status(400).json({ message: 'Có học viên không tồn tại' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.role === Role.COACH && body.role !== Role.COACH) {
        await tx.class.updateMany({ where: { coachId: existing.id }, data: { coachId: null } });
      }

      await tx.parentStudent.deleteMany({ where: { parentId: existing.id } });
      if (body.role === Role.PARENT && body.studentIds.length > 0) {
        await tx.parentStudent.createMany({ data: body.studentIds.map((studentId) => ({ parentId: existing.id, studentId })) });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'CHANGE_USER_ROLE',
          entity: 'User',
          entityId: existing.id,
          metadata: { previousRole: existing.role, nextRole: body.role, studentIds: body.role === Role.PARENT ? body.studentIds : [] },
        },
      });

      return tx.user.update({
        where: { id: existing.id },
        data: { role: body.role },
        select: {
          id: true, email: true, fullName: true, phone: true, role: true, status: true, createdAt: true,
          parentStudents: { include: { student: { select: { id: true, fullName: true, studentCode: true } } } },
          _count: { select: { coachClasses: true, createdStudents: true, parentStudents: true } },
        },
      });
    });

    res.json(updated);
  } catch (error) { next(error); }
});

userRoutes.patch('/:id/status', async (req, res, next) => {
  try {
    const status = z.enum(['ACTIVE', 'INACTIVE']).parse(req.body.status);
    if (req.params.id === req.user?.id && status === 'INACTIVE') {
      return res.status(400).json({ message: 'Không thể khóa chính tài khoản đang đăng nhập' });
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status } });
    res.json(user);
  } catch (error) { next(error); }
});

userRoutes.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user?.id) return res.status(400).json({ message: 'Không thể xóa chính tài khoản đang đăng nhập' });

    const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { _count: { select: { coachClasses: true, parentStudents: true } } } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    if (user.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN, status: 'ACTIVE' } });
      if (adminCount <= 1) return res.status(400).json({ message: 'Không thể xóa Admin hoạt động cuối cùng' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.class.updateMany({ where: { coachId: user.id }, data: { coachId: null } });
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'DELETE_USER',
          entity: 'User',
          entityId: user.id,
          metadata: { email: user.email, fullName: user.fullName, role: user.role, detachedClasses: user._count.coachClasses, detachedChildren: user._count.parentStudents },
        },
      });
      await tx.user.delete({ where: { id: user.id } });
    });

    res.status(204).send();
  } catch (error) { next(error); }
});
