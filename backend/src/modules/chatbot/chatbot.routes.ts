// @ts-nocheck
import { Router } from 'express';
import { AttendanceStatus, PaymentStatus, Role, UniformOrderStatus, UniformType } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const chatbotRoutes = Router();
chatbotRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const chatSchema = z.object({
  message: z.string().min(1, 'Vui lòng nhập nội dung cần hỏi').max(500),
});

type ChatCard = {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
};

type ChatResponse = {
  reply: string;
  cards?: ChatCard[];
  suggestedActions?: string[];
};

const dayNames: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};

const uniformTypeLabels: Record<UniformType, string> = {
  SHIRT: 'Áo',
  SHORTS: 'Quần',
  SOCKS: 'Tất',
  KIT: 'Bộ đồng phục',
  BALL: 'Bóng',
  CONE: 'Cone / chóp',
  BIB: 'Áo bib',
  LADDER: 'Thang dây',
  MARKER: 'Dụng cụ đánh dấu',
  OTHER: 'Khác',
};

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function currency(value: unknown) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(number);
}

function todayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function jsDayToSystemDay(date = new Date()) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function getCoachClassFilter(user: Express.UserPayload) {
  return user.role === Role.COACH ? { coachId: user.id } : undefined;
}

function canSeeAll(user: Express.UserPayload) {
  return user.role === Role.ADMIN;
}

function defaultActions(role?: Role) {
  const base = [
    'Học viên còn nợ học phí',
    'Học viên gần hết buổi',
    'Lịch tập hôm nay',
    'Tình hình điểm danh hôm nay',
  ];
  if (role === Role.ADMIN) return [...base, 'Kho đồ sắp hết', 'Doanh thu tháng này'];
  return [...base, 'Danh sách lớp của tôi'];
}

async function answerDebtStudents(user: Express.UserPayload): Promise<ChatResponse> {
  const where: any = {
    tuitionStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] },
  };
  if (user.role === Role.COACH) where.class = { coachId: user.id };

  const students = await prisma.student.findMany({
    where,
    include: {
      class: { select: { name: true } },
      paymentHistories: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 8,
  });

  return {
    reply: students.length
      ? `Hiện có ${students.length} học viên đang ở trạng thái chưa nộp/còn nợ trong phạm vi bạn được xem. Tôi đang hiển thị tối đa 8 em gần nhất.`
      : 'Hiện chưa thấy học viên nào đang nợ học phí trong phạm vi bạn được xem.',
    cards: students.map((student) => {
      const lastPayment = student.paymentHistories[0];
      return {
        title: `${student.fullName} • ${student.studentCode}`,
        subtitle: `Lớp: ${student.class?.name || 'Chưa phân lớp'} • PH: ${student.parentPhone}`,
        meta: lastPayment ? `Khoản gần nhất: ${currency(lastPayment.paidAmount)} / ${currency(lastPayment.amount)} • Còn nợ ${currency(lastPayment.debtAmount)}` : 'Chưa có lịch sử thanh toán',
        status: student.tuitionStatus,
      };
    }),
    suggestedActions: ['Tạo nhắc học phí Zalo', 'Xem học viên gần hết buổi', 'Doanh thu tháng này'],
  };
}

async function answerSessionStatus(user: Express.UserPayload, mode: 'near-end' | 'out' | 'over' | 'all'): Promise<ChatResponse> {
  const where: any = {};
  if (mode === 'near-end') where.sessionRemaining = { gte: 1, lte: 3 };
  if (mode === 'out') where.sessionRemaining = 0;
  if (mode === 'over') where.sessionRemaining = { lt: 0 };
  if (user.role === Role.COACH) where.class = { coachId: user.id };

  const students = await prisma.student.findMany({
    where,
    include: { class: { select: { name: true } } },
    orderBy: [{ sessionRemaining: 'asc' }, { fullName: 'asc' }],
    take: 10,
  });

  const label = mode === 'near-end' ? 'gần hết buổi' : mode === 'out' ? 'hết buổi' : mode === 'over' ? 'quá buổi' : 'theo gói buổi';
  return {
    reply: students.length
      ? `Có ${students.length} học viên ${label} trong phạm vi bạn được xem. Tôi đang hiển thị tối đa 10 em.`
      : `Chưa có học viên ${label} trong phạm vi bạn được xem.`,
    cards: students.map((student) => ({
      title: `${student.fullName} • ${student.studentCode}`,
      subtitle: `Lớp: ${student.class?.name || 'Chưa phân lớp'} • PH: ${student.parentPhone}`,
      meta: `Đã học ${student.sessionUsed}/${student.sessionTotal} buổi • Còn ${student.sessionRemaining} buổi`,
      status: student.sessionRemaining < 0 ? 'QUÁ BUỔI' : student.sessionRemaining === 0 ? 'HẾT BUỔI' : student.sessionRemaining <= 3 ? 'GẦN HẾT BUỔI' : 'ĐANG HỌC',
    })),
    suggestedActions: ['Học viên còn nợ học phí', 'Lịch tập hôm nay', 'Tình hình điểm danh hôm nay'],
  };
}

async function answerSchedules(user: Express.UserPayload, target: 'today' | 'tomorrow' | 'all'): Promise<ChatResponse> {
  const now = new Date();
  const date = new Date(now);
  if (target === 'tomorrow') date.setDate(date.getDate() + 1);
  const dayOfWeek = target === 'all' ? undefined : jsDayToSystemDay(date);

  const where: any = {};
  if (dayOfWeek) where.dayOfWeek = dayOfWeek;
  if (user.role === Role.COACH) where.class = { coachId: user.id, isActive: true };

  const schedules = await prisma.trainingSchedule.findMany({
    where,
    include: { field: true, class: { include: { coach: { select: { fullName: true, phone: true } }, _count: { select: { students: true } } } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    take: 12,
  });

  const heading = target === 'today' ? `hôm nay (${dayNames[jsDayToSystemDay(now)]})` : target === 'tomorrow' ? `ngày mai (${dayNames[jsDayToSystemDay(date)]})` : 'sắp tới';

  return {
    reply: schedules.length
      ? `Có ${schedules.length} lịch tập ${heading} trong phạm vi bạn được xem.`
      : `Chưa có lịch tập ${heading} trong phạm vi bạn được xem.`,
    cards: schedules.map((schedule) => ({
      title: `${schedule.class.name} • ${schedule.startTime} - ${schedule.endTime}`,
      subtitle: `${dayNames[schedule.dayOfWeek]} • Sân: ${schedule.field?.name || 'Chưa gán sân'}`,
      meta: `HLV: ${schedule.class.coach?.fullName || 'Chưa gán'} • ${schedule.class._count.students} học viên${schedule.note ? ` • ${schedule.note}` : ''}`,
      status: 'LỊCH TẬP',
    })),
    suggestedActions: ['Tình hình điểm danh hôm nay', 'Danh sách lớp của tôi', 'Học viên gần hết buổi'],
  };
}

async function answerAttendanceToday(user: Express.UserPayload): Promise<ChatResponse> {
  const today = todayStart();
  const classWhere = getCoachClassFilter(user);

  const [present, absent, excused, classes] = await Promise.all([
    prisma.attendance.count({ where: { date: today, status: AttendanceStatus.PRESENT, class: classWhere } }),
    prisma.attendance.count({ where: { date: today, status: AttendanceStatus.ABSENT, class: classWhere } }),
    prisma.attendance.count({ where: { date: today, status: AttendanceStatus.EXCUSED, class: classWhere } }),
    prisma.class.findMany({
      where: { ...(classWhere || {}), isActive: true },
      include: { _count: { select: { students: true, attendances: { where: { date: today } } } } },
      orderBy: { name: 'asc' },
      take: 10,
    }),
  ]);

  const notMarkedTotal = classes.reduce((sum, klass) => sum + Math.max(0, klass._count.students - klass._count.attendances), 0);

  return {
    reply: `Điểm danh hôm nay: Có mặt ${present}, vắng ${absent}, xin phép ${excused}, chưa điểm danh khoảng ${notMarkedTotal} học viên.`,
    cards: classes.map((klass) => ({
      title: klass.name,
      subtitle: `Tổng học viên: ${klass._count.students}`,
      meta: `Đã điểm danh: ${klass._count.attendances} • Chưa điểm danh: ${Math.max(0, klass._count.students - klass._count.attendances)}`,
      status: klass._count.attendances >= klass._count.students && klass._count.students > 0 ? 'ĐÃ XONG' : 'CẦN KIỂM TRA',
    })),
    suggestedActions: ['Lịch tập hôm nay', 'Học viên còn nợ học phí', 'Học viên gần hết buổi'],
  };
}

async function answerInventory(): Promise<ChatResponse> {
  const allProducts = await prisma.uniformProduct.findMany({
    where: { isActive: true },
    orderBy: [{ stock: 'asc' }, { name: 'asc' }],
  });
  const products = allProducts.filter((product) => product.stock <= product.minStock).slice(0, 10);

  return {
    reply: products.length
      ? `Có ${products.length} mặt hàng kho đang ở mức sắp hết hoặc thấp hơn định mức. Tôi hiển thị tối đa 10 mặt hàng cần xử lý.`
      : 'Kho hiện chưa có mặt hàng nào dưới mức tồn tối thiểu.',
    cards: products.map((product) => ({
      title: `${product.name} • Size ${product.size}`,
      subtitle: `${uniformTypeLabels[product.type]} • SKU: ${product.sku || 'Chưa có'}`,
      meta: `Tồn hiện tại: ${product.stock} • Tồn tối thiểu: ${product.minStock} • Giá: ${currency(product.price)}`,
      status: product.stock <= 0 ? 'HẾT HÀNG' : 'SẮP HẾT',
    })),
    suggestedActions: ['Doanh thu tháng này', 'Học viên còn nợ học phí', 'Lịch tập hôm nay'],
  };
}

async function answerRevenue(): Promise<ChatResponse> {
  const start = todayStart();
  start.setDate(1);

  const [tuition, uniform, debts] = await Promise.all([
    prisma.payment.aggregate({ _sum: { paidAmount: true }, where: { status: PaymentStatus.PAID, confirmedAt: { gte: start } } }),
    prisma.uniformOrder.aggregate({ _sum: { totalAmount: true }, where: { status: UniformOrderStatus.PAID, paidAt: { gte: start } } }),
    prisma.payment.aggregate({ _sum: { debtAmount: true }, where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] } } }),
  ]);

  const tuitionRevenue = Number(tuition._sum.paidAmount || 0);
  const uniformRevenue = Number(uniform._sum.totalAmount || 0);
  const total = tuitionRevenue + uniformRevenue;

  return {
    reply: `Doanh thu tháng này đang ghi nhận ${currency(total)}. Trong đó học phí ${currency(tuitionRevenue)}, đồng phục/dụng cụ ${currency(uniformRevenue)}. Công nợ hiện tại khoảng ${currency(debts._sum.debtAmount || 0)}.`,
    cards: [
      { title: 'Doanh thu học phí', meta: currency(tuitionRevenue), status: 'THÁNG NÀY' },
      { title: 'Doanh thu đồng phục / dụng cụ', meta: currency(uniformRevenue), status: 'THÁNG NÀY' },
      { title: 'Công nợ cần theo dõi', meta: currency(debts._sum.debtAmount || 0), status: 'CÔNG NỢ' },
    ],
    suggestedActions: ['Xuất Excel báo cáo', 'Kho đồ sắp hết', 'Học viên còn nợ học phí'],
  };
}

async function answerMyClasses(user: Express.UserPayload): Promise<ChatResponse> {
  const where: any = { isActive: true };
  if (user.role === Role.COACH) where.coachId = user.id;

  const classes = await prisma.class.findMany({
    where,
    include: { coach: { select: { fullName: true, phone: true } }, _count: { select: { students: true, schedules: true } } },
    orderBy: { name: 'asc' },
    take: 12,
  });

  return {
    reply: user.role === Role.ADMIN ? `Admin đang quản lý ${classes.length} lớp đang hoạt động.` : `Bạn đang được phân công ${classes.length} lớp đang hoạt động.`,
    cards: classes.map((klass) => ({
      title: `${klass.name} • ${klass.ageGroup}`,
      subtitle: `HLV: ${klass.coach?.fullName || 'Chưa gán'}${klass.coach?.phone ? ` • ${klass.coach.phone}` : ''}`,
      meta: `${klass._count.students} học viên • ${klass._count.schedules} lịch tập • Gói ${klass.totalSessions} buổi`,
      status: klass.feeType,
    })),
    suggestedActions: ['Lịch tập hôm nay', 'Tình hình điểm danh hôm nay', 'Học viên gần hết buổi'],
  };
}

async function answerStudentSearch(user: Express.UserPayload, raw: string): Promise<ChatResponse> {
  const query = raw
    .replace(/hoc vien|học viên|tim|tìm|tra cuu|tra cứu|so dien thoai|số điện thoại|sdt|sđt/gi, '')
    .trim();

  const where: any = {
    OR: [
      { fullName: { contains: query || raw, mode: 'insensitive' } },
      { parentPhone: { contains: query || raw } },
      { studentCode: { contains: query || raw, mode: 'insensitive' } },
    ],
  };
  if (user.role === Role.COACH) where.class = { coachId: user.id };

  const students = await prisma.student.findMany({
    where,
    include: { class: { select: { name: true } } },
    orderBy: { fullName: 'asc' },
    take: 8,
  });

  return {
    reply: students.length ? `Tìm thấy ${students.length} học viên phù hợp.` : 'Chưa tìm thấy học viên phù hợp. Anh có thể nhập tên, mã học viên hoặc số điện thoại phụ huynh rõ hơn.',
    cards: students.map((student) => ({
      title: `${student.fullName} • ${student.studentCode}`,
      subtitle: `Lớp: ${student.class?.name || 'Chưa phân lớp'} • PH: ${student.parentPhone}`,
      meta: `Học phí: ${student.tuitionStatus} • Còn ${student.sessionRemaining} buổi • Trạng thái: ${student.status}`,
      status: student.sessionRemaining <= 0 ? 'CẦN KIỂM TRA GÓI' : student.tuitionStatus,
    })),
    suggestedActions: ['Học viên còn nợ học phí', 'Học viên gần hết buổi', 'Lịch tập hôm nay'],
  };
}

function answerHelp(role: Role): ChatResponse {
  return {
    reply: 'Tôi là trợ lý nội bộ của phần mềm quản lý CLB. Anh có thể hỏi nhanh về học viên, công nợ, gói buổi, lịch tập, điểm danh, kho đồ và doanh thu.',
    cards: [
      { title: 'Ví dụ câu hỏi', subtitle: 'Học viên còn nợ học phí', meta: 'Liệt kê học viên chưa nộp/còn nợ trong phạm vi quyền của tài khoản.' },
      { title: 'Ví dụ câu hỏi', subtitle: 'Lịch tập hôm nay', meta: 'Xem lịch tập theo lớp, sân và HLV.' },
      { title: 'Ví dụ câu hỏi', subtitle: role === Role.ADMIN ? 'Kho đồ sắp hết' : 'Danh sách lớp của tôi', meta: role === Role.ADMIN ? 'Kiểm tra tồn kho đồng phục/dụng cụ.' : 'Xem các lớp được Admin phân công.' },
    ],
    suggestedActions: defaultActions(role),
  };
}

async function routeQuestion(user: Express.UserPayload, message: string): Promise<ChatResponse> {
  const normalized = normalize(message);

  if (/doanh thu|bao cao|excel|thu thang|doanh so/.test(normalized)) {
    if (!canSeeAll(user)) return { reply: 'Báo cáo doanh thu chỉ dành cho Admin. HLV có thể hỏi về lớp, lịch tập, điểm danh và học viên của mình.', suggestedActions: defaultActions(user.role) };
    return answerRevenue();
  }
  if (/kho|ton kho|dong phuc|dung cu|sap het hang|het hang/.test(normalized)) {
    if (!canSeeAll(user)) return { reply: 'Phần kho đồ hiện chỉ dành cho Admin. HLV có thể hỏi về lớp, lịch tập, điểm danh và học viên trong lớp của mình.', suggestedActions: defaultActions(user.role) };
    return answerInventory();
  }
  if (/diem danh|vang|co mat|xin phep/.test(normalized)) return answerAttendanceToday(user);
  if (/no hoc phi|chua nop|con no|cong no|qua han|hoc phi/.test(normalized)) return answerDebtStudents(user);
  if (/gan het buoi|sap het buoi|sap het goi/.test(normalized)) return answerSessionStatus(user, 'near-end');
  if (/qua buoi|am buoi|vuot buoi/.test(normalized)) return answerSessionStatus(user, 'over');
  if (/het buoi|het goi/.test(normalized)) return answerSessionStatus(user, 'out');
  if (/lich tap hom nay|hom nay/.test(normalized)) return answerSchedules(user, 'today');
  if (/lich tap ngay mai|ngay mai/.test(normalized)) return answerSchedules(user, 'tomorrow');
  if (/lich tap|lich hoc|phan bo lich/.test(normalized)) return answerSchedules(user, 'all');
  if (/lop cua toi|lop minh|danh sach lop|lop hoc/.test(normalized)) return answerMyClasses(user);
  if (/hoc vien|tim|tra cuu|sdt|so dien thoai|ma hoc vien/.test(normalized)) return answerStudentSearch(user, message);

  return answerHelp(user.role);
}


chatbotRoutes.get('/quick-actions', (req, res) => {
  res.json({ actions: defaultActions(req.user?.role) });
});

chatbotRoutes.post('/message', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Chưa đăng nhập' });
    const { message } = chatSchema.parse(req.body);
    const response = await routeQuestion(req.user, message);

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CHATBOT_MESSAGE',
        entity: 'Chatbot',
        metadata: {
          message: message.slice(0, 500),
          reply: response.reply.slice(0, 500),
          cardCount: response.cards?.length || 0,
        },
      },
    }).catch(() => undefined);

    res.json(response);
  } catch (error) { next(error); }
});
