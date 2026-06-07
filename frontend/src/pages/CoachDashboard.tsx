import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarDays, ClipboardList, GraduationCap, MessageCircle, Sparkles, UserRoundX } from 'lucide-react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';

export function CoachDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/dashboard/coach').then(res => setData(res.data));
  }, []);

  if (!data) return <div className="card animate-pulse">Đang tải dashboard...</div>;

  const totalStudents = data.myClasses?.reduce((sum: number, c: any) => sum + c._count.students, 0) || 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-brandForest via-emerald-900 to-orange-500 p-5 text-white shadow-2xl shadow-emerald-950/20 sm:p-6">
        <p className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-orange-100">Coach mobile mode</p>
        <h1 className="text-3xl font-black sm:text-4xl">Sân tập hôm nay</h1>
        <p className="mt-2 max-w-2xl text-sm text-emerald-50 sm:text-base">HLV mở điện thoại ngoài sân, xem lớp mình, lịch tập và điểm danh nhanh như dùng app.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:flex">
          <Link to="/attendance" className="rounded-2xl bg-orange-300 px-4 py-3 text-center text-sm font-black text-brandForest shadow-lg">Điểm danh ngay</Link>
          <Link to="/coach-classes" className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-brandForest shadow-lg">Lớp của tôi</Link>
        </div>
      </section>

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <StoryBubble to="/coach-classes" icon={ClipboardList} label="Lớp" value={data.myClasses.length} />
        <StoryBubble to="/students" icon={GraduationCap} label="Học viên" value={totalStudents} />
        <StoryBubble to="/attendance" icon={CalendarCheck} label="Điểm danh" value="Nhanh" />
        <StoryBubble to="/schedules" icon={CalendarDays} label="Lịch" value={data.todaySchedules.length} />
        <StoryBubble to="/chatbot" icon={MessageCircle} label="Bot" value="Hỏi nhanh" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Lớp phụ trách" value={data.myClasses.length} icon={GraduationCap} />
        <StatCard title="Học viên" value={totalStudents} icon={GraduationCap} />
        <StatCard title="Nghỉ hôm nay" value={data.absentToday} icon={UserRoundX} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card rounded-[2rem]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Today schedule</p>
              <h2 className="text-xl font-black">Lịch tập hôm nay</h2>
            </div>
            <CalendarDays className="text-pitch" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.todaySchedules.length === 0 && <p className="rounded-3xl bg-slate-50 p-4 text-slate-500">Hôm nay chưa có lịch tập.</p>}
            {data.todaySchedules.map((s: any) => (
              <Link to="/attendance" key={s.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50">
                <p className="font-black text-brandForest">{s.class.name}</p>
                <p className="mt-1 text-sm font-semibold text-pitch">{s.startTime} - {s.endTime}</p>
                <p className="text-sm text-slate-500">{s.field?.name || 'Chưa gán sân'}</p>
                <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">Bấm để điểm danh</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card rounded-[2rem] bg-white">
          <Sparkles className="mb-3 text-pitch" />
          <h2 className="text-xl font-black">Gợi ý thao tác</h2>
          <div className="mt-4 space-y-3">
            <Action to="/attendance" title="Điểm danh nhanh" desc="Có mặt / Vắng / Xin phép ngay trên điện thoại." />
            <Action to="/coach-classes" title="Xem lớp của tôi" desc="Danh sách lớp được Admin phân công." />
            <Action to="/schedules" title="Xem lịch tập" desc="Theo dõi sân, giờ tập và ghi chú." />
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryBubble({ to, icon: Icon, label, value }: { to: string; icon: any; label: string; value: any }) {
  return (
    <Link to={to === '/chatbot' ? '/' : to} className="flex min-w-[92px] flex-col items-center gap-2 rounded-[1.75rem] bg-white p-3 text-center shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-emerald-600 to-brandForest p-[3px]">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-pitch"><Icon /></span>
      </span>
      <span className="text-xs font-black text-brandForest">{label}</span>
      <span className="text-[11px] font-bold text-slate-500">{value}</span>
    </Link>
  );
}

function Action({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="block rounded-3xl border border-slate-100 bg-slate-50 p-3 transition hover:border-emerald-200 hover:bg-emerald-50">
      <b className="block text-brandForest">{title}</b>
      <span className="text-sm text-slate-500">{desc}</span>
    </Link>
  );
}
