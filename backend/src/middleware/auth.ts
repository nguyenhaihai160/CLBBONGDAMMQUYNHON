import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../prisma.js';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Chưa đăng nhập' });

    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ message: 'Tài khoản không hợp lệ' });

    req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
    next();
  } catch {
    return res.status(401).json({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' });
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Chưa đăng nhập' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Không đủ quyền thao tác' });
    next();
  };
}
