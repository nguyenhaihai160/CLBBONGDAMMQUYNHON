import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarCheck, Users, UserCheck, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function CoachClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedClassId, setSelectedClassId] = useState('');

  async function load() {
    const res = await api.get(`/coach-portal/classes?date=${date}`);
    setClasses(res.data);
    if (!selectedClassId && res.data.length) setSelectedClassId(res.data[0].id);
  }

  useEffect(() => { load(); }, [date]);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const totals = useMemo(() => classes.reduce((acc, c) => {
    acc.students += c.students?.length || 0;
    acc.marked += c.attendanceSummary?.marked || 0;
    acc.present += c.attendanceSummary?.present || 0;
    acc.notMarked += c.attendanceSummary?.notMarked || 0;
    return acc;
  }, { students: 0, marked: 0, present: 0, notMarked: 0 }), [classes]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-black">Liên kết HLV & Admin</h1>
          <p className="text-slate-500">HLV quản lý lớp được Admin gán, điểm danh trên điện thoại. Admin xem toàn bộ trạng thái điểm danh và quân số theo lớp.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="input w-auto" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Link to="/attendance" className="btn-primary flex items-center gap-2"><CalendarCheck size={18} /> Điểm danh nhanh</Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat title="Số lớp hiển thị" value={classes.length} icon={<ShieldCheck size={20} />} />
        <Stat title="Tổng học viên" value={totals.students} icon={<Users size={20} />} />
        <Stat title="Có mặt hôm nay" value={totals.present} icon={<UserCheck size={20} />} />
        <Stat title="Chưa điểm danh" value={totals.notMarked} icon={<Clock size={20} />} />
      </div>

      {user?.role === 'ADMIN' && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          <b>Chế độ Admin:</b> Anh đang xem toàn bộ lớp của trung tâm. Khi HLV lưu điểm danh ở module Điểm danh, dữ liệu sẽ hiện lại tại đây theo ngày đã chọn.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {classes.map(c => (
            <button key={c.id} onClick={() => setSelectedClassId(c.id)} className={`w-full rounded-2xl border p-4 text-left shadow-sm ${selectedClassId === c.id ? 'border-orange-500 bg-emerald-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
              <div className="flex justify-between gap-2">
                <div>
                  <h3 className="font-black">{c.name}</h3>
                  <p className="text-sm text-slate-500">{c.ageGroup} • HLV: {c.coach?.fullName || 'Chưa gán'}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-pitch">{c.students?.length || 0} HV</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <Box label="Có" value={c.attendanceSummary?.present || 0} />
                <Box label="Vắng" value={c.attendanceSummary?.absent || 0} />
                <Box label="Phép" value={c.attendanceSummary?.excused || 0} />
                <Box label="Chưa" value={c.attendanceSummary?.notMarked || 0} />
              </div>
              <p className="mt-3 text-xs text-slate-400">Cập nhật: {c.latestAttendanceAt ? new Date(c.latestAttendanceAt).toLocaleString('vi-VN') : 'Chưa điểm danh ngày này'}</p>
            </button>
          ))}
        </div>

        <div className="card min-h-[420px]">
          {!selectedClass ? (
            <div className="flex h-full items-center justify-center text-slate-400">Chọn một lớp để xem chi tiết</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-black">{selectedClass.name}</h2>
                  <p className="text-sm text-slate-500">HLV phụ trách: {selectedClass.coach?.fullName || 'Chưa gán'} {selectedClass.coach?.phone ? `• ${selectedClass.coach.phone}` : ''}</p>
                </div>
                <Link to="/attendance" className="btn-soft">Mở điểm danh lớp</Link>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Summary label="Có mặt" value={selectedClass.attendanceSummary?.present || 0} />
                <Summary label="Vắng" value={selectedClass.attendanceSummary?.absent || 0} />
                <Summary label="Xin phép" value={selectedClass.attendanceSummary?.excused || 0} />
                <Summary label="Chưa điểm danh" value={selectedClass.attendanceSummary?.notMarked || 0} />
              </div>

              <div>
                <h3 className="mb-2 font-bold">Lịch tập</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {selectedClass.schedules?.length ? selectedClass.schedules.map((s: any) => <div key={s.id} className="rounded-xl bg-slate-50 p-3 text-sm">Thứ {s.dayOfWeek} • {s.startTime}-{s.endTime}<p className="text-slate-500">{s.field?.name || 'Chưa gán sân'}</p></div>) : <p className="text-sm text-slate-400">Chưa có lịch tập.</p>}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-bold">Danh sách học viên & trạng thái điểm danh</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Học viên</th><th>Mã</th><th>SĐT PH</th><th>Còn buổi</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                      {selectedClass.students?.map((student: any) => {
                        const attendance = selectedClass.attendances?.find((a: any) => a.studentId === student.id);
                        return <tr key={student.id} className="border-t"><td className="p-3 font-semibold">{student.fullName}</td><td>{student.studentCode}</td><td>{student.parentPhone}</td><td>{student.sessionRemaining}</td><td><AttendanceBadge status={attendance?.status} /></td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return <div className="card flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-pitch">{icon}</div><div><p className="text-sm text-slate-500">{title}</p><b className="text-xl">{value}</b></div></div>;
}

function Box({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-white p-2"><b>{value}</b><p className="text-slate-400">{label}</p></div>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-sm text-slate-500">{label}</p><b className="text-lg">{value}</b></div>;
}

function AttendanceBadge({ status }: { status?: string }) {
  if (status === 'PRESENT') return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Có mặt</span>;
  if (status === 'ABSENT') return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Vắng</span>;
  if (status === 'EXCUSED') return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Xin phép</span>;
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Chưa điểm danh</span>;
}
