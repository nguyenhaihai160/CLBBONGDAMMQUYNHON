import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const fullName = (process.env.ADMIN_NAME || 'Quản trị viên').trim();
  const phone = (process.env.ADMIN_PHONE || '').trim() || null;

  if (!email || !password) {
    console.warn('Bỏ qua tạo Admin ban đầu: chưa có ADMIN_EMAIL hoặc ADMIN_PASSWORD.');
    return;
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD phải có ít nhất 8 ký tự.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Tài khoản Admin đã tồn tại: ${email}. Không ghi đè mật khẩu.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      phone,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`Đã tạo Admin ban đầu: ${email}`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
