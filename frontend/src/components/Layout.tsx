import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Camera,
  ClipboardList,
  CreditCard,
  DollarSign,
  GraduationCap,
  Home,
  History,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UserPlus,
  Warehouse,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { InstallAppBanner } from './InstallAppBanner';
import { NetworkStatus } from './NetworkStatus';
import { ChatbotWidget } from './ChatbotWidget';

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard, roles: ['ADMIN', 'COACH', 'PARENT'] },
  { to: '/parent-portal', label: 'Con của tôi', icon: GraduationCap, roles: ['PARENT'] },
  { to: '/classes', label: 'Lớp học', icon: Users, roles: ['ADMIN', 'COACH'] },
  { to: '/schedules', label: 'Lịch tập', icon: CalendarDays, roles: ['ADMIN', 'COACH'] },
  { to: '/students', label: 'Học viên', icon: GraduationCap, roles: ['ADMIN', 'COACH'] },
  { to: '/student-cards', label: 'Thẻ học viên', icon: IdCard, roles: ['ADMIN', 'COACH'] },
  { to: '/attendance', label: 'Điểm danh', icon: CalendarCheck, roles: ['ADMIN', 'COACH'] },
  { to: '/biometric-attendance', label: 'Camera AI', icon: Camera, roles: ['ADMIN', 'COACH'] },
  { to: '/attendance-history', label: 'Lịch sử điểm danh', icon: History, roles: ['ADMIN'] },
  { to: '/coach-classes', label: 'Lớp của HLV', icon: ClipboardList, roles: ['ADMIN', 'COACH'] },
  { to: '/coach-payroll', label: 'Chấm công & lương HLV', icon: DollarSign, roles: ['ADMIN', 'COACH'] },
  { to: '/payments', label: 'Học phí', icon: CreditCard, roles: ['ADMIN', 'COACH'] },
  { to: '/reports', label: 'Báo cáo', icon: BarChart3, roles: ['ADMIN'] },
  { to: '/uniforms', label: 'Kho đồ', icon: Warehouse, roles: ['ADMIN', 'COACH'] },
  { to: '/parents', label: 'Tài khoản phụ huynh', icon: UserPlus, roles: ['ADMIN'] },
  { to: '/users', label: 'Phân quyền tài khoản', icon: ShieldCheck, roles: ['ADMIN'] },
  { to: '/zalo', label: 'Zalo OA', icon: MessageCircle, roles: ['ADMIN'] },
  { to: '/settings', label: 'Cấu hình CLB', icon: Settings, roles: ['ADMIN'] },
];

const staffMobileNavItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/students', label: 'Học viên', icon: GraduationCap },
  { to: '/attendance', label: 'Điểm danh', icon: CalendarCheck },
  { to: '/biometric-attendance', label: 'AI Cam', icon: Camera },
  { to: '/schedules', label: 'Lịch', icon: CalendarDays },
];

const parentMobileNavItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/parent-portal', label: 'Con tôi', icon: GraduationCap },
];

type AcademySettings = {
  academyName: string;
  academyShortName: string;
  logoUrl: string;
};

const fallbackSettings: AcademySettings = {
  academyName: 'Football Academy',
  academyShortName: 'Manager Pro',
  logoUrl: '',
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [settings, setSettings] = useState<AcademySettings>(fallbackSettings);

  useEffect(() => {
    api.get('/settings/academy')
      .then((res) => setSettings({ ...fallbackSettings, ...res.data }))
      .catch(() => setSettings(fallbackSettings));
  }, []);

  const visibleNav = useMemo(
    () => navItems.filter(item => item.roles.includes(user?.role || 'COACH')),
    [user?.role],
  );

  const mobileItems = user?.role === 'PARENT' ? parentMobileNavItems : staffMobileNavItems;

  const quickActions = useMemo(() => {
    if (user?.role === 'PARENT') {
      return [
        { to: '/parent-portal', label: 'Xem tiến trình học', hint: 'Điểm danh, số buổi và lịch tập', icon: GraduationCap },
        { to: '/parent-portal', label: 'Xem học phí', hint: 'Kiểm tra công nợ và QR thanh toán', icon: CreditCard },
        { to: '/parent-portal', label: 'Tải thẻ học viên', hint: 'Lưu hoặc in thẻ của con', icon: IdCard },
      ];
    }
    const common = [
      { to: '/attendance', label: 'Điểm danh nhanh', hint: 'Ghi nhận có mặt/vắng/xin phép', icon: CalendarCheck },
      { to: '/biometric-attendance', label: 'Điểm danh AI Camera', hint: 'Nhận diện khuôn mặt/mống mắt', icon: Camera },
      { to: '/students', label: 'Tra cứu học viên', hint: 'Tìm theo tên hoặc số phụ huynh', icon: Search },
      { to: '/schedules', label: 'Lịch tập hôm nay', hint: 'Xem lịch và sân tập', icon: CalendarDays },
      { to: '/coach-payroll', label: 'Lương của tôi', hint: 'Xem chấm công và bảng lương', icon: DollarSign },
    ];
    if (user?.role === 'ADMIN') {
      return [
        { to: '/students', label: 'Thêm học viên', hint: 'Tạo hồ sơ học viên mới', icon: GraduationCap },
        { to: '/classes', label: 'Tạo lớp / gán HLV', hint: 'Phân bổ lớp học', icon: Users },
        { to: '/payments', label: 'Xác nhận học phí', hint: 'Cập nhật gói buổi', icon: CreditCard },
        { to: '/attendance-history', label: 'Lịch sử điểm danh', hint: 'Lọc ngày, lớp và trạng thái', icon: History },
        { to: '/biometric-attendance', label: 'AI Camera', hint: 'Điểm danh bằng camera sinh trắc học', icon: Camera },
        { to: '/coach-payroll', label: 'Chấm công HLV', hint: 'Tính lương và thanh toán HLV', icon: DollarSign },
        { to: '/parents', label: 'Tạo tài khoản phụ huynh', hint: 'Gán con và quyền xem học phí', icon: UserPlus },
        { to: '/reports', label: 'Xem báo cáo', hint: 'Doanh thu & công nợ', icon: BarChart3 },
      ];
    }
    return common;
  }, [user?.role]);

  const Sidebar = () => (
    <aside className="flex h-full w-72 flex-col bg-brandForest p-4 text-white">
      <Link to="/" className="mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-600 to-brandForest p-4 shadow-2xl shadow-emerald-950/30" onClick={() => setOpen(false)}>
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo CLB" className="h-12 w-12 rounded-2xl bg-white object-contain p-1 shadow-lg" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-lg">⚽</div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-[0.22em] text-emerald-50">{settings.academyShortName || 'Football Academy'}</p>
            <h1 className="truncate text-xl font-black">Manager Pro</h1>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-xs text-emerald-50 backdrop-blur">
          Realtime • Mobile-first • PWA
        </div>
      </Link>
      <nav className="space-y-1.5 overflow-y-auto pr-1">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-white text-brandForest shadow-lg border-l-4 border-orange-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 group-hover:bg-white/15"><item.icon size={18} /></span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-[1.75rem] border border-white/10 bg-slate-900/90 p-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-300 to-emerald-600 font-black text-brandForest">
            {user?.fullName?.slice(0, 1).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-400">{user?.role === 'ADMIN' ? 'Quản trị viên toàn quyền' : user?.role === 'PARENT' ? 'Phụ huynh học viên' : 'Huấn luyện viên'}</p>
          </div>
        </div>
        <button onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 px-3 py-2.5 text-sm font-semibold hover:bg-slate-700">
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen brand-soft-bg lg:flex">
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0"><Sidebar /></div>
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}><Sidebar /></div>
      <main className="min-h-screen flex-1 lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-2xl lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-2xl bg-slate-100 p-2 lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo CLB" className="hidden h-11 w-11 rounded-2xl bg-white object-contain p-1 shadow-sm sm:block" />
              ) : (
                <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-brandForest text-xl sm:flex">⚽</div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-500">Xin chào, {user?.fullName}</p>
                <h2 className="truncate text-base font-black text-brandForest sm:text-lg">{settings.academyName || 'Quản lý lớp bóng đá cộng đồng'}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700 sm:inline-flex">Online · AI Camera v9</span>
              <button onClick={() => setQuickOpen(true)} className="hidden items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-brandForest/10 sm:flex">
                <Sparkles size={16} /> Tác vụ nhanh
              </button>
            </div>
          </div>
        </header>
        <section className="mx-auto max-w-7xl p-4 pb-32 lg:p-8"><Outlet /></section>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[2rem] border border-white/70 bg-white/90 p-2 shadow-2xl shadow-brandForest/15 backdrop-blur-2xl lg:hidden app-safe-bottom">
        <div className={`grid ${user?.role === 'PARENT' ? 'grid-cols-3' : 'grid-cols-6'} items-center gap-1`}>
          {mobileItems.map((item) => {
            const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink key={item.to} to={item.to} className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-black transition ${active ? 'bg-gradient-to-br from-emerald-700 to-orange-500 text-white' : 'text-slate-500'}`}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <button onClick={() => setQuickOpen(true)} className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-emerald-600 to-orange-400 px-1 py-2 text-[11px] font-black text-brandForest shadow-lg shadow-orange-900/20">
            <Plus size={22} />
            <span>Thêm</span>
          </button>
        </div>
      </nav>

      {quickOpen && (
        <div className="fixed inset-0 z-[70] flex items-end bg-brandForest/50 p-3 backdrop-blur-sm sm:items-center sm:justify-center" onClick={() => setQuickOpen(false)}>
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Quick actions</p>
                <h3 className="text-xl font-black text-brandForest">Tác vụ nhanh</h3>
              </div>
              <button onClick={() => setQuickOpen(false)} className="rounded-2xl bg-slate-100 p-2"><X /></button>
            </div>
            <div className="grid gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.to} onClick={() => setQuickOpen(false)} className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-3 transition hover:border-emerald-200 hover:bg-emerald-50">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-pitch shadow-sm"><action.icon /></span>
                  <span>
                    <b className="block text-brandForest">{action.label}</b>
                    <span className="text-sm text-slate-500">{action.hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <NetworkStatus />
      <InstallAppBanner />
      {user?.role !== 'PARENT' && <ChatbotWidget />}
    </div>
  );
}
