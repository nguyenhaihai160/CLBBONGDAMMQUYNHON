import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, Clock3, Search, UserX } from 'lucide-react';
import { api } from '../api/client';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';
type ClassOption = { id: string; name: string; coach?: { fullName: string } | null };
type RecordItem = {
  id: string;
  date: string;
  status: AttendanceStatus;
  note?: string | null;
  student: { studentCode: string; fullName: string; parentPhone: string; sessionRemaining: number };
  class: { name: string; coach?: { fullName: string } | null };
  markedBy?: { fullName: string; role: string } | null;
};
type Summary = { total: number; present: number; absent: number; excused: number };

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function startRange() { const value = new Date(); value.setDate(value.getDate() - 30); return isoDate(value); }

const statusText: Record<AttendanceStatus, string> = { PRESENT: 'Có mặt', ABSENT: 'Vắng', EXCUSED: 'Xin phép' };
const statusClass: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800',
  ABSENT: 'bg-red-100 text-red-700',
  EXCUSED: 'bg-amber-100 text-amber-800',
};

export function AttendanceHistory() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, present: 0, absent: 0, excused: 0 });
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(startRange());
  const [dateTo, setDateTo] = useState(() => isoDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/classes').then((response) => setClasses(response.data)).catch(() => setClasses([]));
  }, []);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (classId) params.set('classId', classId);
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const response = await api.get(`/attendance/history?${params.toString()}`);
      setRecords(response.data.records || []);
      setSummary(response.data.summary || { total: 0, present: 0, absent: 0, excused: 0 });
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể tải lịch sử điểm danh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selectedClass = useMemo(() => classes.find((item) => item.id === classId), [classes, classId]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-brandForest p-5 text-white shadow-xl sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">Admin / Điểm danh</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Lịch sử điểm danh</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">Xem lại toàn bộ lần điểm danh của học viên theo ngày, lớp, trạng thái hoặc tìm kiếm tên/mã học viên/SĐT phụ huynh.</p>
      </section>

      <form onSubmit={load} className="card rounded-[2rem]">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-500">Tìm học viên</label>
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, mã học viên, SĐT..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Lớp</label>
            <select className="input" value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">Tất cả lớp</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Trạng thái</label>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="PRESENT">Có mặt</option>
              <option value="ABSENT">Vắng</option>
              <option value="EXCUSED">Xin phép</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Từ ngày</label>
            <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Đến ngày</label>
            <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-primary inline-flex items-center gap-2" disabled={loading}><Search size={16} />{loading ? 'Đang tải...' : 'Xem lịch sử'}</button>
          {selectedClass && <span className="text-sm text-slate-500">Đang lọc lớp: <b>{selectedClass.name}</b></span>}
        </div>
      </form>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Tổng lượt" value={summary.total} icon={<CalendarRange size={19} />} classes="bg-brandForest text-white" />
        <SummaryCard title="Có mặt" value={summary.present} icon={<CheckCircle2 size={19} />} classes="bg-emerald-50 text-emerald-800" />
        <SummaryCard title="Vắng" value={summary.absent} icon={<UserX size={19} />} classes="bg-red-50 text-red-700" />
        <SummaryCard title="Xin phép" value={summary.excused} icon={<Clock3 size={19} />} classes="bg-amber-50 text-amber-800" />
      </div>

      <section className="card overflow-hidden rounded-[2rem] p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black">Chi tiết lịch sử</h2>
          <p className="text-sm text-slate-500">Hiển thị tối đa 1.000 lượt điểm danh gần nhất theo bộ lọc.</p>
        </div>
        {records.length === 0 && !loading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">Không có dữ liệu điểm danh trong khoảng thời gian đã chọn.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((item) => (
              <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[140px_1.2fr_1fr_120px_1fr] md:items-center">
                <div className="text-sm font-bold text-slate-700">{new Date(item.date).toLocaleDateString('vi-VN')}</div>
                <div>
                  <p className="font-black text-brandForest">{item.student.fullName}</p>
                  <p className="text-xs text-slate-500">{item.student.studentCode} · Còn {item.student.sessionRemaining} buổi</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{item.class.name}</p>
                  <p className="text-xs text-slate-500">HLV: {item.class.coach?.fullName || 'Chưa gán'}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass[item.status]}`}>{statusText[item.status]}</span>
                <div className="text-xs text-slate-500">Chấm bởi: <b>{item.markedBy?.fullName || 'Không xác định'}</b>{item.note ? <span className="block">Ghi chú: {item.note}</span> : null}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ title, value, icon, classes }: { title: string; value: number; icon: React.ReactNode; classes: string }) {
  return <div className={`rounded-3xl p-4 shadow-sm ${classes}`}><div className="flex items-center justify-between"><p className="text-sm font-bold opacity-80">{title}</p>{icon}</div><p className="mt-3 text-3xl font-black">{value}</p></div>;
}
