import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';

export const authRoutes = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

authRoutes.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const email = body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    if (user.status !== 'ACTIVE') return res.status(403).json({ message: 'Tài khoản đang bị khóa' });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: '7d' });
    return res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

authRoutes.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});
