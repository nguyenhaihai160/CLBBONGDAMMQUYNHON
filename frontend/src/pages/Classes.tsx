import { FormEvent, useEffect, useState } from 'react';
import { Edit3, Plus, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type ClassForm = {
  name: string;
  ageGroup: string;
  feeAmount: number;
  feeType: string;
  totalSessions: number;
  coachId: string;
};

const emptyForm: ClassForm = { name: '', ageGroup: '', feeAmount: 900000, feeType: 'MONTHLY', totalSessions: 12, coachId: '' };

export function Classes() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const classRes = await api.get('/classes');
    setClasses(classRes.data);
    if (user?.role === 'ADMIN') {
      const userRes = await api.get('/users');
      setUsers(userRes.data.filter((u: any) => u.role === 'COACH'));
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
    setShowForm(true);
  }

  function openEdit(c: any) {
    setEditingId(c.id);
    setForm({
      name: c.name || '',
      ageGroup: c.ageGroup || '',
      feeAmount: Number(c.feeAmount) || 0,
      feeType: c.feeType || 'MONTHLY',
      totalSessions: c.totalSessions || 12,
      coachId: c.coachId || '',
    });
    setShowForm(true);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    const payload = { ...form, feeAmount: Number(form.feeAmount), totalSessions: Number(form.totalSessions), coachId: form.coachId || null };
    try {
      if (editingId) {
        await api.put(`/classes/${editingId}`, payload);
        setMessage('Đã cập nhật lớp học.');
      } else {
        await api.post('/classes', payload);
        setMessage('Đã tạo lớp mới.');
      }
      closeForm();
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể lưu lớp học.');
    }
  }

  async function deleteClass(c: any) {
    const studentCount = c._count?.students || 0;
    const ok = window.confirm(`Xóa lớp ${c.name}? ${studentCount > 0 ? `${studentCount} học viên sẽ được chuyển về trạng thái chưa phân lớp.` : ''}`);
    if (!ok) return;
    try {
      await api.delete(`/classes/${c.id}`);
      setMessage(`Đã xóa lớp ${c.name}.`);
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể xóa lớp học.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-black">Quản lý lớp học</h1><p className="text-slate-500">Admin tạo, sửa, xóa lớp, phân độ tuổi, tùy chỉnh học phí và gán HLV.</p></div>
        {user?.role === 'ADMIN' && <button className="btn-primary flex items-center justify-center gap-2" onClick={openCreate}><Plus size={18} /> Tạo lớp</button>}
      </div>

      {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div>}

      {user?.role === 'ADMIN' && showForm && (
        <form onSubmit={submit} className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">{editingId ? 'Cập nhật lớp học' : 'Tạo lớp mới'}</h2>
            <button type="button" className="rounded-xl bg-slate-100 p-2 hover:bg-slate-200" onClick={closeForm}><X size={18} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Tên lớp *</span><input className="input" placeholder="U9 Cơ bản" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Độ tuổi *</span><input className="input" placeholder="7-9 tuổi" value={form.ageGroup} onChange={e => setForm({ ...form, ageGroup: e.target.value })} required /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Học phí</span><input className="input" type="number" placeholder="Học phí" value={form.feeAmount} onChange={e => setForm({ ...form, feeAmount: Number(e.target.value) })} /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Kiểu phí</span><select className="input" value={form.feeType} onChange={e => setForm({ ...form, feeType: e.target.value })}><option value="MONTHLY">Theo tháng</option><option value="PACKAGE">Gói buổi</option></select></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Số buổi</span><input className="input" type="number" min={1} value={form.totalSessions} onChange={e => setForm({ ...form, totalSessions: Number(e.target.value) })} /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">HLV phụ trách</span><select className="input" value={form.coachId} onChange={e => setForm({ ...form, coachId: e.target.value })}><option value="">Chọn HLV</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></label>
          </div>
          <div className="flex gap-2"><button className="btn-primary">{editingId ? 'Lưu cập nhật' : 'Tạo lớp'}</button><button type="button" className="btn-soft" onClick={closeForm}>Hủy</button></div>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {classes.map(c => (
          <div key={c.id} className="card">
            <div className="flex justify-between gap-3">
              <div><h3 className="font-black">{c.name}</h3><p className="text-sm text-slate-500">{c.ageGroup}</p></div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-pitch">{c._count?.students || 0} HV</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">Học phí</p><b>{Number(c.feeAmount).toLocaleString('vi-VN')}đ</b></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">Số buổi</p><b>{c.totalSessions}</b></div>
            </div>
            <p className="mt-3 text-sm text-slate-500">HLV: {c.coach?.fullName || 'Chưa gán'}</p>
            {user?.role === 'ADMIN' && (
              <div className="mt-4 flex gap-2">
                <button className="btn-soft flex items-center gap-2" onClick={() => openEdit(c)}><Edit3 size={16} /> Sửa</button>
                <button className="rounded-xl bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100" onClick={() => deleteClass(c)}><Trash2 className="inline" size={16} /> Xóa</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
