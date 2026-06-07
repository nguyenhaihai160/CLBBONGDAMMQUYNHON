import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CreditCard, Link2, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { api } from '../api/client';

type Student = {
  id: string;
  fullName: string;
  studentCode: string;
  class?: { name?: string } | null;
  parentPhone?: string;
};

type ParentLink = { student: Student };
type ParentAccount = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: 'PARENT';
  parentStudents?: ParentLink[];
};

type ParentForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  studentIds: string[];
};

const initialForm: ParentForm = {
  fullName: '',
  email: '',
  phone: '',
  password: 'Parent@123',
  studentIds: [],
};

export function Parents() {
  const [parents, setParents] = useState<ParentAccount[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<ParentForm>(initialForm);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingParentId, setEditingParentId] = useState('');
  const [editingStudentIds, setEditingStudentIds] = useState<string[]>([]);

  async function loadData() {
    try {
      const [usersResponse, studentsResponse] = await Promise.all([api.get('/users'), api.get('/students')]);
      setParents(usersResponse.data.filter((account: ParentAccount) => account.role === 'PARENT'));
      setStudents(studentsResponse.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể tải dữ liệu phụ huynh.');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredParents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return parents;
    return parents.filter((parent) => {
      const children = (parent.parentStudents || []).map((link) => link.student.fullName).join(' ');
      return `${parent.fullName} ${parent.email} ${parent.phone || ''} ${children}`.toLowerCase().includes(keyword);
    });
  }, [parents, search]);

  function toggleFormStudent(studentId: string) {
    setForm((current) => ({
      ...current,
      studentIds: current.studentIds.includes(studentId)
        ? current.studentIds.filter((id) => id !== studentId)
        : [...current.studentIds, studentId],
    }));
  }

  function toggleEditStudent(studentId: string) {
    setEditingStudentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  }

  async function createParent(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      setBusy(true);
      await api.post('/users', { ...form, role: 'PARENT' });
      setMessage(form.studentIds.length > 0 ? 'Đã tạo tài khoản phụ huynh và gán quyền xem hồ sơ của con.' : 'Đã tạo tài khoản phụ huynh. Anh có thể gán con sau khi hồ sơ học viên đã sẵn sàng.');
      setForm(initialForm);
      await loadData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể tạo tài khoản phụ huynh.');
    } finally {
      setBusy(false);
    }
  }

  async function saveChildren(parentId: string) {
    setMessage('');
    setError('');
    try {
      await api.put(`/users/${parentId}/parent-students`, { studentIds: editingStudentIds });
      setMessage('Đã cập nhật danh sách con được phụ huynh theo dõi.');
      setEditingParentId('');
      await loadData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể cập nhật liên kết học viên.');
    }
  }

  async function toggleStatus(parent: ParentAccount) {
    const nextStatus = parent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/users/${parent.id}/status`, { status: nextStatus });
      setMessage(nextStatus === 'ACTIVE' ? 'Đã mở khóa tài khoản phụ huynh.' : 'Đã khóa tài khoản phụ huynh.');
      await loadData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản.');
    }
  }

  async function removeParent(parent: ParentAccount) {
    if (!window.confirm(`Xóa tài khoản phụ huynh ${parent.fullName}? Phụ huynh sẽ không đăng nhập xem hồ sơ của con được nữa.`)) return;
    try {
      await api.delete(`/users/${parent.id}`);
      setMessage(`Đã xóa tài khoản phụ huynh ${parent.fullName}.`);
      await loadData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể xóa tài khoản phụ huynh.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Cổng phụ huynh</p>
          <h1 className="text-2xl font-black text-brandForest">Tạo tài khoản phụ huynh</h1>
          <p className="mt-1 text-slate-500">Admin có thể tạo tài khoản trước, sau đó gán một hoặc nhiều học viên là con để phụ huynh theo dõi, xem công nợ và quét QR học phí.</p>
        </div>
        <div className="rounded-3xl bg-brandForest px-5 py-4 text-white shadow-xl">
          <p className="text-xs text-slate-300">Tổng tài khoản phụ huynh</p>
          <p className="text-3xl font-black">{parents.length}</p>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <form onSubmit={createParent} className="card space-y-5 rounded-[2rem] border border-emerald-100 bg-white shadow-xl shadow-emerald-950/5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><UserPlus size={25} /></span>
          <div>
            <h2 className="text-lg font-black">Tạo tài khoản mới cho phụ huynh</h2>
            <p className="text-sm text-slate-500">Có thể tạo tài khoản ngay cả khi chưa gán con; sau đó gán con tại danh sách bên dưới.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm font-semibold text-slate-600">Họ tên phụ huynh
            <input className="input mt-1" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nguyễn Văn An" required />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-600">Email đăng nhập
            <input className="input mt-1" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="phuhuynh@email.com" required />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-600">Số điện thoại
            <input className="input mt-1" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0909 000 000" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-600">Mật khẩu tạm
            <input className="input mt-1" type="text" minLength={6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </label>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black text-emerald-900"><Link2 size={17} /> Gán học viên là con (không bắt buộc lúc tạo)</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800">Đã chọn: {form.studentIds.length}</span>
          </div>
          {students.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">Chưa có học viên. Vui lòng tạo học viên trước khi tạo tài khoản phụ huynh.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {students.map((student) => (
                <label key={student.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${form.studentIds.includes(student.id) ? 'border-emerald-400 bg-white shadow-sm' : 'border-transparent bg-white/70'}`}>
                  <input className="mt-1" type="checkbox" checked={form.studentIds.includes(student.id)} onChange={() => toggleFormStudent(student.id)} />
                  <span>
                    <b className="block text-brandForest">{student.fullName}</b>
                    <span className="block text-xs text-slate-500">{student.studentCode} · {student.class?.name || 'Chưa phân lớp'}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button disabled={busy || students.length === 0} className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
          <UserPlus size={18} /> {busy ? 'Đang tạo...' : 'Tạo tài khoản phụ huynh'}
        </button>
      </form>

      <div className="card space-y-4 rounded-[2rem]">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800"><Users size={20} /></span>
            <div>
              <h2 className="text-lg font-black">Danh sách tài khoản phụ huynh</h2>
              <p className="text-sm text-slate-500">Gán thêm con, khóa tài khoản hoặc xóa quyền truy cập.</p>
            </div>
          </div>
          <input className="input md:max-w-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm phụ huynh hoặc học viên..." />
        </div>

        {filteredParents.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500">Chưa có tài khoản phụ huynh nào.</div>
        ) : (
          <div className="grid gap-3">
            {filteredParents.map((parent) => {
              const children = parent.parentStudents || [];
              const editing = editingParentId === parent.id;
              return (
                <div key={parent.id} className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-base text-brandForest">{parent.fullName}</b>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${parent.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{parent.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{parent.email} · {parent.phone || 'Chưa có SĐT'}</p>
                      <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-700"><CreditCard size={15} /> Xem được: {children.map((link) => link.student.fullName).join(', ') || 'Chưa gán con'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-soft inline-flex items-center gap-2" onClick={() => {
                        setEditingParentId(editing ? '' : parent.id);
                        setEditingStudentIds(children.map((link) => link.student.id));
                      }}><Link2 size={16} /> {editing ? 'Đóng' : 'Gán / đổi con'}</button>
                      <button type="button" className="btn-soft inline-flex items-center gap-2" onClick={() => toggleStatus(parent)}><ShieldCheck size={16} /> {parent.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</button>
                      <button type="button" className="rounded-xl bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100" onClick={() => removeParent(parent)}><Trash2 className="inline" size={16} /> Xóa</button>
                    </div>
                  </div>

                  {editing && (
                    <div className="mt-4 rounded-3xl border border-emerald-100 bg-white p-4">
                      <p className="mb-3 text-sm font-black text-emerald-800">Chọn các con phụ huynh được phép xem</p>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {students.map((student) => (
                          <label key={student.id} className="flex cursor-pointer items-start gap-2 rounded-2xl bg-emerald-50/60 p-3 text-sm">
                            <input className="mt-1" type="checkbox" checked={editingStudentIds.includes(student.id)} onChange={() => toggleEditStudent(student.id)} />
                            <span><b className="block">{student.fullName}</b><span className="text-xs text-slate-500">{student.studentCode}</span></span>
                          </label>
                        ))}
                      </div>
                      <button type="button" className="btn-primary mt-4" onClick={() => saveChildren(parent.id)}>Lưu danh sách con</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
