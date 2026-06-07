import { PrismaClient, Role, FeeType, UniformType, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('Admin@123', 10);
  const coachPass = await bcrypt.hash('Coach@123', 10);
  const parentPass = await bcrypt.hash('Parent@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {
      passwordHash: adminPass,
      fullName: 'Admin Demo',
      role: Role.ADMIN,
      status: 'ACTIVE',
      phone: '0900000000',
    },
    create: {
      email: 'admin@demo.com',
      passwordHash: adminPass,
      fullName: 'Admin Demo',
      role: Role.ADMIN,
      phone: '0900000000',
    },
  });

  const coach = await prisma.user.upsert({
    where: { email: 'coach@demo.com' },
    update: {
      passwordHash: coachPass,
      fullName: 'HLV Demo',
      role: Role.COACH,
      status: 'ACTIVE',
      phone: '0911111111',
    },
    create: {
      email: 'coach@demo.com',
      passwordHash: coachPass,
      fullName: 'HLV Demo',
      role: Role.COACH,
      phone: '0911111111',
    },
  });



  const parent = await prisma.user.upsert({
    where: { email: 'parent@demo.com' },
    update: {
      passwordHash: parentPass,
      fullName: 'Phụ huynh Demo',
      role: Role.PARENT,
      status: 'ACTIVE',
      phone: '0901234567',
    },
    create: {
      email: 'parent@demo.com',
      passwordHash: parentPass,
      fullName: 'Phụ huynh Demo',
      role: Role.PARENT,
      phone: '0901234567',
    },
  });

  let field = await prisma.trainingField.findFirst({ where: { name: 'Sân bóng cộng đồng A' } });
  if (!field) {
    field = await prisma.trainingField.create({
      data: { name: 'Sân bóng cộng đồng A', address: 'TP.HCM' },
    });
  }

  let u9 = await prisma.class.findFirst({ where: { name: 'U9 Cơ bản' } });
  if (!u9) {
    u9 = await prisma.class.create({
      data: {
        name: 'U9 Cơ bản',
        ageGroup: '7-9 tuổi',
        feeAmount: 900000,
        feeType: FeeType.MONTHLY,
        totalSessions: 12,
        coachId: coach.id,
        schedules: {
          create: [
            { dayOfWeek: 2, startTime: '17:30', endTime: '19:00', fieldId: field.id },
            { dayOfWeek: 5, startTime: '17:30', endTime: '19:00', fieldId: field.id },
          ],
        },
      },
    });
  } else {
    u9 = await prisma.class.update({
      where: { id: u9.id },
      data: {
        ageGroup: '7-9 tuổi',
        feeAmount: 900000,
        feeType: FeeType.MONTHLY,
        totalSessions: 12,
        coachId: coach.id,
        isActive: true,
      },
    });

    const scheduleCount = await prisma.trainingSchedule.count({ where: { classId: u9.id } });
    if (scheduleCount === 0) {
      await prisma.trainingSchedule.createMany({
        data: [
          { classId: u9.id, dayOfWeek: 2, startTime: '17:30', endTime: '19:00', fieldId: field.id },
          { classId: u9.id, dayOfWeek: 5, startTime: '17:30', endTime: '19:00', fieldId: field.id },
        ],
      });
    }
  }

  const student1 = await prisma.student.upsert({
    where: { studentCode: 'FA20260001' },
    update: {
      fullName: 'Nguyễn Minh Khang',
      parentPhone: '0901234567',
      classId: u9.id,
      sessionTotal: 12,
      sessionRemaining: 12,
      sessionUsed: 0,
      tuitionStatus: 'PAID',
      createdById: admin.id,
    },
    create: {
      studentCode: 'FA20260001',
      fullName: 'Nguyễn Minh Khang',
      parentPhone: '0901234567',
      classId: u9.id,
      sessionTotal: 12,
      sessionRemaining: 12,
      tuitionStatus: 'PAID',
      createdById: admin.id,
    },
  });

  const student2 = await prisma.student.upsert({
    where: { studentCode: 'FA20260002' },
    update: {
      fullName: 'Trần Gia Bảo',
      parentPhone: '0912345678',
      classId: u9.id,
      sessionTotal: 12,
      sessionRemaining: 8,
      sessionUsed: 4,
      tuitionStatus: 'OVERDUE',
      createdById: admin.id,
    },
    create: {
      studentCode: 'FA20260002',
      fullName: 'Trần Gia Bảo',
      parentPhone: '0912345678',
      classId: u9.id,
      sessionTotal: 12,
      sessionRemaining: 8,
      sessionUsed: 4,
      tuitionStatus: 'OVERDUE',
      createdById: admin.id,
    },
  });


  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student1.id } },
    update: {},
    create: { parentId: parent.id, studentId: student1.id },
  });

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student2.id } },
    update: {},
    create: { parentId: parent.id, studentId: student2.id },
  });


  const currentMonth = new Date().toISOString().slice(0, 7);
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  async function ensureSamplePayment(studentId: string, month: string, amount: number, status: PaymentStatus, packageSessions?: number) {
    const existing = await prisma.payment.findFirst({ where: { studentId, month } });
    if (existing) return;
    const isPaid = status === PaymentStatus.PAID;
    await prisma.payment.create({
      data: {
        studentId,
        amount,
        paidAmount: isPaid ? amount : 0,
        debtAmount: isPaid ? 0 : amount,
        feeType: packageSessions ? FeeType.PACKAGE : FeeType.MONTHLY,
        packageSessions,
        sessionsApplied: !!packageSessions && isPaid,
        month,
        status,
        confirmedById: isPaid ? admin.id : undefined,
        confirmedAt: isPaid ? new Date(`${month}-15T09:00:00.000Z`) : undefined,
        transferContent: `HP DEMO ${month}`,
        bankCode: '',
      },
    });
  }

  await ensureSamplePayment(student1.id, lastMonth, 900000, PaymentStatus.PAID);
  await ensureSamplePayment(student1.id, currentMonth, 1200000, PaymentStatus.PAID, 12);
  await ensureSamplePayment(student2.id, currentMonth, 900000, PaymentStatus.OVERDUE);

  const settings = [
    ['academyName', 'Football Academy Manager Pro'],
    ['academyShortName', 'FAM Pro'],
    ['logoUrl', ''],
    ['hotline', ''],
    ['address', 'TP.HCM'],
    ['primaryColor', '#15803d'],
    ['tuitionQrUrl', ''],
    ['bankName', ''],
    ['bankBin', process.env.BANK_BIN || '970436'],
    ['bankAccountName', process.env.BANK_ACCOUNT_NAME || 'FOOTBALL ACADEMY'],
    ['bankAccountNumber', process.env.BANK_ACCOUNT || '0123456789'],
    ['paymentNotePrefix', 'HP'],
  ];

  for (const [key, value] of settings) {
    await prisma.academySetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  await prisma.uniformProduct.upsert({
    where: { name_size: { name: 'Áo tập CLB', size: 'S' } },
    update: { type: UniformType.SHIRT, price: 180000, stock: 20, isActive: true },
    create: { name: 'Áo tập CLB', type: UniformType.SHIRT, size: 'S', price: 180000, stock: 20 },
  });

  await prisma.uniformProduct.upsert({
    where: { name_size: { name: 'Áo tập CLB', size: 'M' } },
    update: { type: UniformType.SHIRT, price: 180000, stock: 25, isActive: true },
    create: { name: 'Áo tập CLB', type: UniformType.SHIRT, size: 'M', price: 180000, stock: 25 },
  });

  await prisma.uniformProduct.upsert({
    where: { name_size: { name: 'Quần tập CLB', size: 'S' } },
    update: { type: UniformType.SHORTS, price: 120000, stock: 20, isActive: true },
    create: { name: 'Quần tập CLB', type: UniformType.SHORTS, size: 'S', price: 120000, stock: 20 },
  });

  await prisma.uniformProduct.upsert({
    where: { name_size: { name: 'Bộ đồng phục', size: 'M' } },
    update: { type: UniformType.KIT, price: 320000, stock: 15, isActive: true },
    create: { name: 'Bộ đồng phục', type: UniformType.KIT, size: 'M', price: 320000, stock: 15 },
  });



  await prisma.uniformProduct.upsert({
    where: { name_size: { name: 'Bóng đá size 4', size: 'Không size' } },
    update: { type: UniformType.BALL, price: 250000, stock: 12, minStock: 3, isActive: true },
    create: { name: 'Bóng đá size 4', type: UniformType.BALL, size: 'Không size', price: 250000, stock: 12, minStock: 3, note: 'Dụng cụ tập luyện' },
  });

  await prisma.uniformProduct.upsert({
    where: { name_size: { name: 'Cone tập luyện', size: 'Bộ 10 cái' } },
    update: { type: UniformType.CONE, price: 90000, stock: 8, minStock: 2, isActive: true },
    create: { name: 'Cone tập luyện', type: UniformType.CONE, size: 'Bộ 10 cái', price: 90000, stock: 8, minStock: 2, note: 'Dụng cụ sân tập' },
  });

  await prisma.uniformProduct.upsert({
    where: { name_size: { name: 'Áo bib tập luyện', size: 'Free size' } },
    update: { type: UniformType.BIB, price: 45000, stock: 30, minStock: 5, isActive: true },
    create: { name: 'Áo bib tập luyện', type: UniformType.BIB, size: 'Free size', price: 45000, stock: 30, minStock: 5, note: 'Dụng cụ chia đội' },
  });

  await prisma.uniformProduct.upsert({
    where: { name_size: { name: 'Thang dây tốc độ', size: '6m' } },
    update: { type: UniformType.LADDER, price: 180000, stock: 4, minStock: 1, isActive: true },
    create: { name: 'Thang dây tốc độ', type: UniformType.LADDER, size: '6m', price: 180000, stock: 4, minStock: 1, note: 'Dụng cụ bổ trợ tốc độ' },
  });

  console.log('Seed hoàn tất: admin@demo.com/Admin@123, coach@demo.com/Coach@123 và parent@demo.com/Parent@123');
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
