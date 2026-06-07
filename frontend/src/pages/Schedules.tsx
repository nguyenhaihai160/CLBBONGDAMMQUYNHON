import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit3, MapPin, Plus, Trash2, Users, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type ScheduleForm = {
  classId: string;
  fieldId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note: string;
};

type FieldForm = {
  name: string;
  address: string;
  note: string;
};

const days = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 7, label: 'Chủ nhật' },
];

const emptySchedule: ScheduleForm = { classId: '', fieldId: '', dayOfWeek: 1, startTime: '17:30', endTime: '19:00', note: '' };
const emptyField: FieldForm = { name: '', address: '', note: '' };

function dayLabel(day: number) {
  return days.find((item) => item.value === day)?.label || `Thứ ${day}`;
}

export function Schedules() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [form, setForm] = useState<ScheduleForm>(emptySchedule);
  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyField);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [scheduleRes, classRes, fieldRes] = await Promise.all([
        api.get(`/schedules${selectedClassId ? `?classId=${selectedClassId}` : ''}`),
        api.get('/classes'),
        api.get('/schedules/fields/list'),
      ]);
      setSchedules(scheduleRes.data);
      setClasses(classRes.data);
      setFields(fieldRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [selectedClassId]);

  const grouped = useMemo(() => {
    return days.map((day) => ({
      ...day,
      schedules: schedules.filter((schedule) => schedule.dayOfWeek === day.value),
    }));
  }, [schedules]);

  const todayDayOfWeek = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  }, []);

  function openCreate() {
    setForm({ ...emptySchedule, classId: classes[0]?.id || '', fieldId: fields[0]?.id || '' });
    setEditingId(null);
    setShowScheduleForm(true);
    setMessage('');
  }

  function openEdit(schedule: any) {
    setForm({
      classId: schedule.classId || '',
      fieldId: schedule.fieldId || '',
      dayOfWeek: schedule.dayOfWeek || 1,
      startTime: schedule.startTime || '17:30',
      endTime: schedule.endTime || '19:00',
      note: schedule.note || '',
    });
    setEditingId(schedule.id);
    setShowScheduleForm(true);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeScheduleForm() {
    setForm(emptySchedule);
    setEditingId(null);
    setShowScheduleForm(false);
  }

  async function submitSchedule(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    const payload = { ...form, fieldId: form.fieldId || null, note: form.note || null, dayOfWeek: Number(form.dayOfWeek) };
    try {
      if (editingId) {
        await api.put(`/schedules/${editingId}`, payload);
        setMessage('Đã cập nhật lịch tập.');
      } else {
        await api.post('/schedules', payload);
        setMessage('Đã phân bổ lịch tập mới.');
      }
      closeScheduleForm();
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể lưu lịch tập.');
    }
  }

  async function deleteSchedule(schedule: any) {
    const ok = window.confirm(`Xóa lịch ${schedule.class?.name || ''} vào ${dayLabel(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}?`);
    if (!ok) return;
    try {
      await api.delete(`/schedules/${schedule.id}`);
      setMessage('Đã xóa lịch tập.');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể xóa lịch tập.');
    }
  }

  async function submitField(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/schedules/fields', fieldForm);
      setFieldForm(emptyField);
      setShowFieldForm(false);
      setMessage('Đã thêm sân tập.');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể thêm sân tập.');
    }
  }

  async function deleteField(field: any) {
    const ok = window.confirm(`Xóa sân ${field.name}? Các lịch đang dùng sân này sẽ chuyển sang trạng thái chưa gán sân.`);
    if (!ok) return;
    try {
      await api.delete(`/schedules/fields/${field.id}`);
      setMessage('Đã xóa sân tập.');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể xóa sân tập.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Lịch tập & phân bổ sân</h1>
          <p className="text-slate-500">Admin tùy chỉnh lịch tập theo lớp, HLV, sân và khung giờ. HLV chỉ xem lịch lớp được phân công.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {isAdmin && <button className="btn-soft flex items-center justify-center gap-2" onClick={() => setShowFieldForm(!showFieldForm)}><MapPin size={18} /> Quản lý sân</button>}
          {isAdmin && <button className="btn-primary flex items-center justify-center gap-2" onClick={openCreate}><Plus size={18} /> Phân bổ lịch</button>}
        </div>
      </div>

      {message && <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.includes('Không thể') || message.includes('đã có') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{message}</div>}

      <div className="card flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="w-full max-w-md space-y-1">
          <span className="text-sm font-bold text-slate-700">Lọc theo lớp</span>
          <select className="input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            <option value="">Tất cả lớp {isAdmin ? '' : 'của tôi'}</option>
            {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name} {klass.coach?.fullName ? `• ${klass.coach.fullName}` : ''}</option>)}
          </select>
        </label>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><b>{schedules.length}</b><p className="text-slate-500">Lịch/tuần</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><b>{fields.length}</b><p className="text-slate-500">Sân tập</p></div>
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><b>{schedules.filter((s) => s.dayOfWeek === todayDayOfWeek).length}</b><p>Ca hôm nay</p></div>
        </div>
      </div>

      {isAdmin && showFieldForm && (
        <form onSubmit={submitField} className="card space-y-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Thêm sân tập / địa điểm</h2><button type="button" className="rounded-xl bg-slate-100 p-2" onClick={() => setShowFieldForm(false)}><X size={18} /></button></div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Tên sân *</span><input className="input" value={fieldForm.name} onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} placeholder="Sân bóng cộng đồng A" required /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Địa chỉ</span><input className="input" value={fieldForm.address} onChange={(e) => setFieldForm({ ...fieldForm, address: e.target.value })} placeholder="Địa chỉ sân" /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Ghi chú</span><input className="input" value={fieldForm.note} onChange={(e) => setFieldForm({ ...fieldForm, note: e.target.value })} placeholder="Sân 5, sân 7..." /></label>
          </div>
          <button className="btn-primary">Lưu sân tập</button>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => <div key={field.id} className="rounded-xl border border-slate-100 p-3"><b>{field.name}</b><p className="text-sm text-slate-500">{field.address || 'Chưa có địa chỉ'}</p>{field.note && <p className="text-xs text-slate-400">{field.note}</p>}<button type="button" onClick={() => deleteField(field)} className="mt-2 rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Xóa sân</button></div>)}
          </div>
        </form>
      )}

      {isAdmin && showScheduleForm && (
        <form onSubmit={submitSchedule} className="card space-y-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">{editingId ? 'Cập nhật lịch tập' : 'Phân bổ lịch tập mới'}</h2><button type="button" className="rounded-xl bg-slate-100 p-2" onClick={closeScheduleForm}><X size={18} /></button></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-1 xl:col-span-2"><span className="text-sm font-bold text-slate-700">Lớp *</span><select className="input" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required><option value="">Chọn lớp</option>{classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name} • {klass.coach?.fullName || 'Chưa gán HLV'}</option>)}</select></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Ngày tập</span><select className="input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}>{days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Bắt đầu</span><input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Kết thúc</span><input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Sân</span><select className="input" value={form.fieldId} onChange={(e) => setForm({ ...form, fieldId: e.target.value })}><option value="">Chưa gán sân</option>{fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
          </div>
          <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Ghi chú lịch tập</span><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="VD: mang giày sân cỏ nhân tạo, chia nhóm kỹ thuật..." /></label>
          <div className="flex gap-2"><button className="btn-primary">{editingId ? 'Lưu cập nhật' : 'Tạo lịch'}</button><button type="button" className="btn-soft" onClick={closeScheduleForm}>Hủy</button></div>
        </form>
      )}

      {loading ? <div className="card">Đang tải lịch tập...</div> : (
        <div className="grid gap-4 xl:grid-cols-7">
          {grouped.map((day) => (
            <section key={day.value} className={`rounded-3xl border bg-white p-4 shadow-sm ${day.value === todayDayOfWeek ? 'border-orange-300 ring-2 ring-emerald-100' : 'border-slate-100'}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-black">{day.label}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{day.schedules.length}</span>
              </div>
              <div className="space-y-3">
                {day.schedules.length === 0 && <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-400">Chưa có lịch.</p>}
                {day.schedules.map((schedule) => (
                  <article key={schedule.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-pitch"><CalendarDays size={16} /><b>{schedule.startTime} - {schedule.endTime}</b></div>
                    <h3 className="font-black text-slate-900">{schedule.class?.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Users size={14} /> {schedule.class?.coach?.fullName || 'Chưa gán HLV'} • {schedule.class?._count?.students || 0} HV</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {schedule.field?.name || 'Chưa gán sân'}</p>
                    {schedule.note && <p className="mt-2 rounded-xl bg-white p-2 text-xs text-slate-500">{schedule.note}</p>}
                    {isAdmin && <div className="mt-3 flex gap-2"><button className="rounded-xl bg-white px-3 py-2 text-xs font-bold hover:bg-slate-100" onClick={() => openEdit(schedule)}><Edit3 className="inline" size={14} /> Sửa</button><button className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100" onClick={() => deleteSchedule(schedule)}><Trash2 className="inline" size={14} /> Xóa</button></div>}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
