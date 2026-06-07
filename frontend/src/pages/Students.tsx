import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit3, IdCard, Plus, Search, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type ClassItem = {
  id: string;
  name: string;
  ageGroup?: string;
};

type StudentItem = {
  id: string;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  parentPhone: string;
  address?: string | null;
  avatarUrl?: string | null;
  classId?: string | null;
  class?: ClassItem | null;
  status: string;
  tuitionStatus: string;
  sessionTotal: number;
  sessionUsed: number;
  sessionRemaining: number;
};

type StudentForm = {
  fullName: string;
  dateOfBirth: string;
  parentPhone: string;
  address: string;
  avatarUrl: string;
  classId: string;
  status: string;
  sessionTotal: number;
};

const emptyForm: StudentForm = {
  fullName: '',
  dateOfBirth: '',
  parentPhone: '',
  address: '',
  avatarUrl: '',
  classId: '',
  status: 'ACTIVE',
  sessionTotal: 12,
};

export function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const [studentRes, classRes] = await Promise.all([api.get('/students'), api.get('/classes')]);
    setStudents(studentRes.data);
    setClasses(classRes.data);
  }

  useEffect(() => { load(); }, []);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchKeyword = !keyword
        || student.fullName.toLowerCase().includes(keyword)
        || student.studentCode.toLowerCase().includes(keyword)
        || student.parentPhone.includes(keyword);
      const matchClass = !classFilter || student.classId === classFilter;
      return matchKeyword && matchClass;
    });
  }, [students, search, classFilter]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
    setShowForm(true);
  }

  function openEditForm(student: StudentItem) {
    setEditingId(student.id);
    setForm({
      fullName: student.fullName || '',
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : '',
      parentPhone: student.parentPhone || '',
      address: student.address || '',
      avatarUrl: student.avatarUrl || '',
      classId: student.classId || '',
      status: student.status || 'ACTIVE',
      sessionTotal: student.sessionTotal || 0,
    });
    setMessage('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const payload = {
      ...form,
      dateOfBirth: form.dateOfBirth || null,
      avatarUrl: form.avatarUrl || null,
      address: form.address || null,
      classId: form.classId || null,
      sessionTotal: Number(form.sessionTotal) || 0,
    };

    try {
      const successMessage = editingId ? 'Đã cập nhật học viên thành công.' : 'Đã thêm học viên mới thành công.';
      if (editingId) {
        await api.put(`/students/${editingId}`, payload);
      } else {
        await api.post('/students', payload);
      }
      closeForm();
      setMessage(successMessage);
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể lưu học viên. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(student: StudentItem) {
    const ok = window.confirm(`Xóa học viên ${student.fullName}? Thao tác này sẽ xóa cả lịch sử điểm danh, học phí và đồng phục liên quan.`);
    if (!ok) return;

    try {
      await api.delete(`/students/${student.id}`);
      setMessage(`Đã xóa học viên ${student.fullName}.`);
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể xóa học viên.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black">Quản lý học viên</h1>
          <p className="text-slate-500">Admin được thêm, sửa, xóa, tìm kiếm, phân lớp và theo dõi buổi học của học viên.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/student-cards" className="btn-soft flex items-center justify-center gap-2"><IdCard size={18} /> In thẻ học viên</Link>
          <button className="btn-primary flex items-center justify-center gap-2" onClick={openCreateForm}>
            <Plus size={18} /> Thêm học viên
          </button>
        </div>
      </div>

      {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div>}

      {showForm && (
        <form onSubmit={submit} className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">{editingId ? 'Cập nhật học viên' : 'Thêm học viên mới'}</h2>
            <button type="button" className="rounded-xl bg-slate-100 p-2 hover:bg-slate-200" onClick={closeForm}><X size={18} /></button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Họ tên học viên *</span>
              <input className="input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-bold text-slate-700">SĐT phụ huynh *</span>
              <input className="input" value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Ngày sinh</span>
              <input className="input" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Lớp học</span>
              <select className="input" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
                <option value="">Chưa phân lớp</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Số buổi gói học</span>
              <input className="input" type="number" min={0} value={form.sessionTotal} onChange={e => setForm({ ...form, sessionTotal: Number(e.target.value) })} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Trạng thái</span>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">Đang học</option>
                <option value="PAUSED">Tạm nghỉ</option>
                <option value="INACTIVE">Nghỉ hẳn</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">Link ảnh đại diện</span>
              <input className="input" value={form.avatarUrl} onChange={e => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://..." />
            </label>
            <label className="space-y-1 md:col-span-2 xl:col-span-4">
              <span className="text-sm font-bold text-slate-700">Địa chỉ</span>
              <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Nhập địa chỉ học viên/phụ huynh" />
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Đang lưu...' : editingId ? 'Lưu cập nhật' : 'Thêm học viên'}</button>
            <button type="button" className="btn-soft" onClick={closeForm}>Hủy</button>
          </div>
        </form>
      )}

      <div className="card grid gap-3 md:grid-cols-[1fr_240px_auto] md:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Tìm theo tên, mã học viên hoặc SĐT phụ huynh" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">Tất cả lớp</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="text-sm font-bold text-slate-600">{filteredStudents.length} học viên</div>
      </div>

      <div className="grid gap-3">
        {filteredStudents.map((s) => (
          <div key={s.id} className="card grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto] md:items-center">
            <div className="flex items-center gap-3">
              {s.avatarUrl ? <img src={s.avatarUrl} alt={s.fullName} className="h-12 w-12 rounded-2xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 font-black text-emerald-800">{s.fullName.charAt(0)}</div>}
              <div>
                <p className="text-xs font-bold text-pitch">{s.studentCode}</p>
                <h3 className="font-bold">{s.fullName}</h3>
                <p className="text-sm text-slate-500">Phụ huynh: {s.parentPhone}</p>
              </div>
            </div>
            <div><p className="text-xs text-slate-400">Lớp</p><p className="font-semibold">{s.class?.name || 'Chưa phân lớp'}</p></div>
            <div><p className="text-xs text-slate-400">Buổi còn lại</p><p className="font-semibold">{s.sessionRemaining}/{s.sessionTotal}</p></div>
            <div><p className="text-xs text-slate-400">Trạng thái gói</p><LearningStatus student={s} /></div>
            <div className="flex gap-2 md:justify-end">
              <button className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200" title="Sửa học viên" onClick={() => openEditForm(s)}><Edit3 size={17} /></button>
              {user?.role === 'ADMIN' && <button className="rounded-xl bg-red-50 p-2 text-red-700 hover:bg-red-100" title="Xóa học viên" onClick={() => deleteStudent(s)}><Trash2 size={17} /></button>}
            </div>
          </div>
        ))}

        {filteredStudents.length === 0 && (
          <div className="card text-center text-slate-500">Chưa có học viên phù hợp với bộ lọc.</div>
        )}
      </div>
    </div>
  );
}

function getLearningStatus(student: StudentItem) {
  const remaining = Number(student.sessionRemaining ?? 0);
  const total = Number(student.sessionTotal ?? 0);
  if (student.tuitionStatus !== 'PAID') return { label: 'Chưa nộp tiền', className: 'bg-red-100 text-red-700' };
  if (remaining < 0) return { label: 'Quá buổi', className: 'bg-red-100 text-red-700' };
  if (remaining === 0) return { label: 'Hết buổi', className: 'bg-slate-200 text-slate-800' };
  const nearLimit = total <= 4 ? remaining <= 1 : remaining <= 3 || remaining <= Math.ceil(total * 0.2);
  if (nearLimit) return { label: 'Gần hết buổi', className: 'bg-amber-100 text-amber-800' };
  return { label: 'Đang học', className: 'bg-emerald-100 text-emerald-700' };
}

function LearningStatus({ student }: { student: StudentItem }) {
  const status = getLearningStatus(student);
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>;
}
