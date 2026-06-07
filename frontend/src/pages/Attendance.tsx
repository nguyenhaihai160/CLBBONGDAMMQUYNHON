import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';

export function Attendance() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [message, setMessage] = useState('');

  useEffect(() => { api.get('/classes').then(res => setClasses(res.data)); }, []);

  async function loadClassAttendance() {
    if (!classId) return;
    const [studentRes, attendanceRes] = await Promise.all([
      api.get(`/students?classId=${classId}`),
      api.get(`/attendance?classId=${classId}&date=${date}`),
    ]);
    setStudents(studentRes.data);
    setAttendances(attendanceRes.data);
    const init: Record<string, AttendanceStatus> = {};
    studentRes.data.forEach((s: any) => { init[s.id] = 'PRESENT'; });
    attendanceRes.data.forEach((a: any) => { init[a.studentId] = a.status; });
    setRecords(init);
  }

  useEffect(() => { loadClassAttendance(); }, [classId, date]);

  const selectedClass = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
  const summary = useMemo(() => ({
    present: Object.values(records).filter(v => v === 'PRESENT').length,
    absent: Object.values(records).filter(v => v === 'ABSENT').length,
    excused: Object.values(records).filter(v => v === 'EXCUSED').length,
  }), [records]);

  async function submit() {
    if (!classId) return;
    await api.post('/attendance/bulk', {
      classId,
      date,
      records: students.map(s => ({ studentId: s.id, status: records[s.id] || 'PRESENT' })),
    });
    await loadClassAttendance();
    setMessage(user?.role === 'ADMIN' ? 'Admin đã lưu điểm danh. HLV và báo cáo lớp sẽ được cập nhật.' : 'HLV đã lưu điểm danh. Admin có thể xem ngay ở module Lớp của HLV.');
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-black">Điểm danh nhanh</h1><p className="text-slate-500">HLV điểm danh lớp được gán; Admin theo dõi và có thể hỗ trợ điểm danh toàn bộ lớp.</p></div>
      <div className="card grid gap-3 md:grid-cols-4">
        <select className="input" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">Chọn lớp</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.coach?.fullName ? `- ${c.coach.fullName}` : ''}</option>)}
        </select>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn-primary" onClick={submit} disabled={!students.length}>Lưu điểm danh</button>
        <Link className="btn-soft text-center" to="/coach-classes">Xem liên kết HLV</Link>
      </div>
      {selectedClass && <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-pitch">Đang điểm danh lớp: <b>{selectedClass.name}</b> • HLV: <b>{selectedClass.coach?.fullName || 'Chưa gán'}</b></div>}
      {message && <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      {students.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          <Summary label="Có mặt" value={summary.present} />
          <Summary label="Vắng" value={summary.absent} />
          <Summary label="Xin phép" value={summary.excused} />
        </div>
      )}
      <div className="grid gap-3">
        {students.map(s => {
          const history = attendances.find(a => a.studentId === s.id);
          return <div key={s.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">{s.fullName}</p>
              <p className="text-sm text-slate-500">Còn {s.sessionRemaining} buổi {history?.markedBy?.fullName ? `• Đã chấm bởi ${history.markedBy.fullName}` : ''}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:w-96">
              <Choice label="Có mặt" active={records[s.id] === 'PRESENT'} onClick={() => setRecords({ ...records, [s.id]: 'PRESENT' })} />
              <Choice label="Vắng" active={records[s.id] === 'ABSENT'} onClick={() => setRecords({ ...records, [s.id]: 'ABSENT' })} />
              <Choice label="Xin phép" active={records[s.id] === 'EXCUSED'} onClick={() => setRecords({ ...records, [s.id]: 'EXCUSED' })} />
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}

function Choice({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-xl px-3 py-2 text-sm font-bold ${active ? 'bg-pitch text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><b className="text-xl">{value}</b></div>;
}
