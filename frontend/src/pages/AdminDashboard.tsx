import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Layers,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRoundX,
  Warehouse,
} from 'lucide-react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/dashboard/admin').then(res => setData(res.data));
  }, []);

  if (!data) return <div className="card animate-pulse">Đang tải dashboard...</div>;

  const present = data.attendanceStats?.find((x: any) => x.status === 'PRESENT')?._count?.status || 0;
  const absent = data.attendanceStats?.find((x: any) => x.status === 'ABSENT')?._count?.status || 0;
  const totalAttendance = Math.max(1, present + absent);

  const stories = [
    { label: 'Học viên', value: data.totalStudents, icon: GraduationCap, to: '/students' },
    { label: 'Nợ phí', value: data.debtStudents, icon: UserRoundX, to: '/payments' },
    { label: 'Lớp', value: data.activeClasses, icon: Layers, to: '/classes' },
    { label: 'Lịch', value: 'Xem', icon: CalendarDays, to: '/schedules' },
    { label: 'Kho', value: 'Quản lý', icon: Warehouse, to: '/uniforms' },
  ];

  const feed = [
    { title: 'Tổng quan vận hành đã sẵn sàng', desc: `${data.activeStudents} học viên đang hoạt động trong ${data.activeClasses} lớp.`, icon: Sparkles, to: '/classes' },
    { title: 'Cần nhắc học phí', desc: `${data.debtStudents} học viên đang ở trạng thái chưa đóng/còn nợ/quá hạn.`, icon: CreditCard, to: '/payments' },
    { title: 'Điểm danh tháng này', desc: `${present} lượt có mặt, ${absent} lượt vắng đã được ghi nhận.`, icon: CalendarCheck, to: '/attendance' },
    { title: 'Báo cáo doanh thu', desc: `Doanh thu tháng: ${Number(data.monthRevenue).toLocaleString('vi-VN')}đ.`, icon: BarChart3, to: '/reports' },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] brand-panel p-5 text-white shadow-2xl shadow-brandForest/15 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-orange-200">CLB MM Quy Nhơn Operations</p>
            <h1 className="text-3xl font-black sm:text-4xl">Trung tâm đang online</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">Dashboard mobile-first: xem nhanh tình hình học viên, học phí, lịch tập, kho đồ và thao tác giống một ứng dụng hiện đại.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Link to="/students" className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-emerald-700 shadow-lg">+ Học viên</Link>
            <Link to="/attendance" className="rounded-2xl bg-orange-400 px-4 py-3 text-center text-sm font-black text-white shadow-lg">Điểm danh</Link>
          </div>
        </div>
      </section>

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {stories.map((story) => (
          <StoryBubble key={story.label} {...story} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tổng học viên" value={data.totalStudents} icon={GraduationCap} hint={`${data.activeStudents} đang hoạt động`} />
        <StatCard title="Học viên nợ phí" value={data.debtStudents} icon={UserRoundX} hint="Cần nhắc thanh toán" />
        <StatCard title="Doanh thu tháng" value={`${Number(data.monthRevenue).toLocaleString('vi-VN')}đ`} icon={CircleDollarSign} />
        <StatCard title="Lớp hoạt động" value={data.activeClasses} icon={Layers} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="card rounded-[2rem]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Activity feed</p>
              <h2 className="text-xl font-black">Hoạt động quan trọng</h2>
            </div>
            <MessageCircle className="text-pitch" />
          </div>
          <div className="space-y-3">
            {feed.map((item) => (
              <Link key={item.title} to={item.to} className="flex gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-3 transition hover:border-emerald-200 hover:bg-emerald-50">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-pitch shadow-sm"><item.icon /></span>
                <span>
                  <b className="block text-brandForest">{item.title}</b>
                  <span className="text-sm text-slate-500">{item.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card rounded-[2rem]">
            <h2 className="mb-4 text-lg font-black">Tỷ lệ điểm danh tháng</h2>
            <Progress label="Có mặt" value={present} total={totalAttendance} />
            <Progress label="Vắng" value={absent} total={totalAttendance} />
          </div>
          <div className="card rounded-[2rem] bg-gradient-to-br from-emerald-700 to-brandForest text-white">
            <CalendarCheck className="mb-4" />
            <h2 className="text-xl font-black">Tác vụ Admin</h2>
            <p className="mt-2 text-sm text-emerald-50">Tạo lớp, gán HLV, xác nhận học phí, quản lý QR, lịch tập, kho đồ, chatbot và Zalo OA.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <QuickCard to="/students" icon={UserPlus} title="Học viên" desc="Thêm, sửa, xóa, phân lớp." />
        <QuickCard to="/settings" icon={Settings} title="Logo & CLB" desc="Đổi thương hiệu, hotline, QR." />
        <QuickCard to="/users" icon={ShieldCheck} title="Phân quyền" desc="Admin, HLV, Phụ huynh và gán con." />
        <QuickCard to="/schedules" icon={CalendarDays} title="Lịch tập" desc="Phân bổ lớp, sân, khung giờ." />
        <QuickCard to="/reports" icon={BarChart3} title="Báo cáo" desc="Doanh thu tháng, xuất Excel." />
      </div>
    </div>
  );
}

function StoryBubble({ to, icon: Icon, label, value }: { to: string; icon: any; label: string; value: any }) {
  return (
    <Link to={to} className="flex min-w-[92px] flex-col items-center gap-2 rounded-[1.75rem] bg-white p-3 text-center shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-emerald-600 to-brandForest p-[3px]">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-pitch"><Icon /></span>
      </span>
      <span className="text-xs font-black text-brandForest">{label}</span>
      <span className="text-[11px] font-bold text-slate-500">{value}</span>
    </Link>
  );
}

function QuickCard({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} className="card group rounded-[2rem] transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl">
      <Icon className="mb-3 text-emerald-700 transition group-hover:scale-110" />
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </Link>
  );
}

function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = Math.round((value / total) * 100);
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><b>{value}</b></div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-3 rounded-full bg-pitch" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
