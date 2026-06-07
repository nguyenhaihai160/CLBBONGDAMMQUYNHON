import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Link2,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users as UsersIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type Role = 'COACH' | 'ADMIN' | 'PARENT';
type Student = { id: string; fullName: string; studentCode: string; class?: { name: string } };
type ParentLink = { student: Student };
type Account = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  parentStudents?: ParentLink[];
  _count?: { coachClasses: number; parentStudents: number };
};
type UserForm = { email: string; password: string; fullName: string; phone: string; role: Role; studentIds: string[] };

const initialForm: UserForm = { email: '', password: 'Coach@123', fullName: '', phone: '', role: 'COACH', studentIds: [] };
const roleInfo: Record<Role, { title: string; description: string; icon: any; password: string; permissions: string[] }> = {
  ADMIN: {
    title: 'Admin',
    description: 'Toàn quyền quản trị hệ thống.',
    icon: ShieldCheck,
    password: 'Admin@123',
    permissions: ['Quản lý tài khoản', 'Học phí & báo cáo', 'Cấu hình CLB'],
  },
  COACH: {
    title: 'Huấn luyện viên',
    description: 'Chỉ thao tác lớp được phân công.',
    icon: UsersIcon,
    password: 'Coach@123',
    permissions: ['Điểm danh', 'Xem lớp phụ trách', 'Xem lịch tập'],
  },
  PARENT: {
    title: 'Phụ huynh',
    description: 'Xem đúng hồ sơ con được Admin gán.',
    icon: GraduationCap,
    password: 'Parent@123',
    permissions: ['Quá trình học', 'Công nợ & QR', 'Tải thẻ học viên'],
  },
};

export function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Account[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<UserForm>(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | Role>('ALL');
  const [editingParentId, setEditingParentId] = useState('');
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [roleEditingId, setRoleEditingId] = useState('');
  const [nextRole, setNextRole] = useState<Role>('COACH');
  const [nextRoleStudentIds, setNextRoleStudentIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [userRes, studentRes] = await Promise.all([api.get('/users'), api.get('/students')]);
    setUsers(userRes.data);
    setStudents(studentRes.data);
  }

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    ADMIN: users.filter((account) => account.role === 'ADMIN').length,
    COACH: users.filter((account) => account.role === 'COACH').length,
    PARENT: users.filter((account) => account.role === 'PARENT').length,
  }), [users]);

  const filteredUsers = filter === 'ALL' ? users : users.filter((account) => account.role === filter);

  function chooseRole(role: Role) {
    setForm((current) => ({
      ...current,
      role,
      password: roleInfo[role].password,
      studentIds: role === 'PARENT' ? current.studentIds : [],
    }));
  }

  function toggleFormStudent(id: string) {
    setForm((current) => ({ ...current, studentIds: current.studentIds.includes(id) ? current.studentIds.filter((value) => value !== id) : [...current.studentIds, id] }));
  }

  function toggleEditStudent(id: string) {
    setEditStudentIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleRoleStudent(id: string) {
    setNextRoleStudentIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    setBusy(true);
    try {
      await api.post('/users', form);
      setForm({ ...initialForm, password: 'Coach@123' });
      setMessage(form.role === 'PARENT' ? (form.studentIds.length > 0 ? 'Đã tạo tài khoản Phụ huynh và cấp quyền xem hồ sơ con.' : 'Đã tạo tài khoản Phụ huynh. Có thể gán con sau trong mục Tài khoản phụ huynh.') : 'Đã tạo tài khoản mới.');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể tạo tài khoản.');
    } finally {
      setBusy(false);
    }
  }

  async function saveParentLinks(parentId: string) {
    setMessage('');
    setError('');
    try {
      await api.put(`/users/${parentId}/parent-students`, { studentIds: editStudentIds });
      setMessage('Đã cập nhật danh sách con mà phụ huynh được phép theo dõi.');
      setEditingParentId('');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể liên kết học viên.');
    }
  }

  function openRoleEditor(account: Account) {
    setRoleEditingId(roleEditingId === account.id ? '' : account.id);
    setNextRole(account.role);
    setNextRoleStudentIds((account.parentStudents || []).map((link) => link.student.id));
  }

  async function saveRole(account: Account) {
    setMessage('');
    setError('');
    if (nextRole === 'PARENT' && nextRoleStudentIds.length === 0) {
      setError('Khi chuyển sang Phụ huynh, hãy chọn ít nhất một học viên là con.');
      return;
    }
    try {
      await api.patch(`/users/${account.id}/role`, { role: nextRole, studentIds: nextRole === 'PARENT' ? nextRoleStudentIds : [] });
      setMessage(`Đã đổi quyền của ${account.fullName} thành ${roleInfo[nextRole].title}.`);
      setRoleEditingId('');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể đổi quyền tài khoản.');
    }
  }

  async function toggleStatus(account: Account) {
    const nextStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/users/${account.id}/status`, { status: nextStatus });
      setMessage(nextStatus === 'ACTIVE' ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể đổi trạng thái tài khoản.');
    }
  }

  async function deleteUser(account: Account) {
    const ok = window.confirm(`Xóa tài khoản ${account.fullName}? Các liên kết quyền của tài khoản này sẽ được gỡ.`);
    if (!ok) return;
    try {
      await api.delete(`/users/${account.id}`);
      setMessage(`Đã xóa tài khoản ${account.fullName}.`);
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể xóa tài khoản.');
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-brandForest p-5 text-white shadow-xl sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">Admin / Phân quyền · Bản PH v4</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Phân quyền tài khoản</h1>
        <div className="mt-4 inline-flex rounded-full bg-orange-300 px-4 py-2 text-xs font-black text-brandForest">✓ ĐÃ BẬT QUYỀN PHỤ HUYNH</div><p className="mt-3 max-w-3xl text-sm text-slate-300">Tạo mới hoặc thay đổi quyền Admin, Huấn luyện viên, Phụ huynh. Quyền <b className="text-white">Phụ huynh</b> chỉ xem hồ sơ con đã được gán, công nợ và QR thanh toán.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(Object.keys(roleInfo) as Role[]).map((role) => {
            const RoleIcon = roleInfo[role].icon;
            return (
              <button key={role} type="button" onClick={() => { chooseRole(role); setFilter(role); }} className={`rounded-3xl border p-4 text-left transition ${form.role === role ? 'border-orange-300 bg-white text-brandForest' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <div className="flex items-center justify-between"><RoleIcon size={21} /><span className="rounded-full bg-orange-300 px-2.5 py-1 text-xs font-black text-brandForest">{counts[role]}</span></div>
                <p className="mt-3 font-black">{roleInfo[role].title}</p>
                <p className={`mt-1 text-xs ${form.role === role ? 'text-slate-600' : 'text-slate-300'}`}>{roleInfo[role].description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="mr-2 inline" size={17} />{message}</div>}
      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={submit} className="card space-y-4 rounded-[2rem]">
          <div className="flex items-center gap-3">
            <UserPlus className="text-emerald-700" />
            <div><h2 className="text-lg font-black">Tạo tài khoản {roleInfo[form.role].title}</h2><p className="text-sm text-slate-500">Chọn loại quyền ở các thẻ phía trên.</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Họ tên" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
            <input className="input" placeholder="Email đăng nhập" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            <input className="input" placeholder="Số điện thoại" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <input className="input" placeholder="Mật khẩu tạm" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </div>
          {form.role === 'PARENT' && (
            <StudentSelector title="Gán con ngay khi tạo (không bắt buộc)" students={students} checkedIds={form.studentIds} onToggle={toggleFormStudent} />
          )}
          <button className="btn-primary inline-flex items-center gap-2" disabled={busy}><UserPlus size={17} />{busy ? 'Đang tạo...' : `Tạo tài khoản ${roleInfo[form.role].title}`}</button>
        </form>

        <div className="card rounded-[2rem]">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Quyền được cấp</p><h2 className="text-lg font-black">{roleInfo[form.role].title}</h2></div>
            <LockKeyhole className="text-emerald-700" />
          </div>
          <p className="mt-2 text-sm text-slate-500">{roleInfo[form.role].description}</p>
          <div className="mt-4 space-y-2">
            {roleInfo[form.role].permissions.map((permission) => <div key={permission} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm font-semibold"><CheckCircle2 size={16} className="text-emerald-700" />{permission}</div>)}
          </div>
          {form.role === 'PARENT' && (
            <Link to="/parents" className="btn-soft mt-4 inline-flex items-center gap-2"><GraduationCap size={17} />Mở quản lý phụ huynh & gán con</Link>
          )}
        </div>
      </div>

      <section className="card rounded-[2rem]">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><h2 className="text-xl font-black">Danh sách và đổi quyền</h2><p className="text-sm text-slate-500">Đổi tài khoản đã có sang Phụ huynh rồi chọn con được xem.</p></div>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'ADMIN', 'COACH', 'PARENT'] as const).map((role) => (
              <button key={role} type="button" onClick={() => setFilter(role)} className={`rounded-full px-3 py-2 text-xs font-black ${filter === role ? 'bg-brandForest text-white' : 'bg-slate-100 text-slate-600'}`}>
                {role === 'ALL' ? 'Tất cả' : roleInfo[role].title}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          {filteredUsers.map((account) => {
            const parentLinks = account.parentStudents || [];
            const editingParent = editingParentId === account.id;
            const editingRole = roleEditingId === account.id;
            return (
              <div key={account.id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><b>{account.fullName}</b><RoleBadge role={account.role} /><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${account.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{account.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}</span></div>
                    <p className="mt-1 text-sm text-slate-500">{account.email} · {account.phone || 'Chưa có SĐT'}</p>
                    {account.role === 'PARENT' && <p className="mt-1 text-xs text-emerald-700">Được xem: {parentLinks.map((link) => link.student.fullName).join(', ') || 'Chưa gán con'}</p>}
                    {account.role === 'COACH' && <p className="mt-1 text-xs text-slate-400">Đang phụ trách {account._count?.coachClasses || 0} lớp</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {account.id !== currentUser?.id && <button type="button" className="btn-soft inline-flex items-center gap-1" onClick={() => openRoleEditor(account)}><UserCog size={16} /> Đổi quyền {editingRole ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>}
                    {account.role === 'PARENT' && <button type="button" className="btn-soft inline-flex items-center gap-1" onClick={() => { setEditingParentId(editingParent ? '' : account.id); setEditStudentIds(parentLinks.map((link) => link.student.id)); }}><Link2 size={15} /> Gán con</button>}
                    <button type="button" className="btn-soft" disabled={account.id === currentUser?.id} onClick={() => toggleStatus(account)}>{account.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</button>
                    {account.id !== currentUser?.id && account.role !== 'ADMIN' && <button type="button" className="rounded-xl bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100" onClick={() => deleteUser(account)}><Trash2 className="inline" size={16} /> Xóa</button>}
                  </div>
                </div>
                {editingRole && (
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <p className="mb-3 text-sm font-black">Đổi quyền tài khoản</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(Object.keys(roleInfo) as Role[]).map((role) => (
                        <button key={role} type="button" onClick={() => { setNextRole(role); if (role !== 'PARENT') setNextRoleStudentIds([]); }} className={`rounded-2xl border px-3 py-3 text-left text-sm font-bold ${nextRole === role ? 'border-orange-500 bg-emerald-50 text-emerald-800' : 'border-slate-100'}`}>{roleInfo[role].title}</button>
                      ))}
                    </div>
                    {nextRole === 'PARENT' && <StudentSelector title="Chọn con được phép xem" students={students} checkedIds={nextRoleStudentIds} onToggle={toggleRoleStudent} />}
                    <button type="button" className="btn-primary mt-4" onClick={() => saveRole(account)}>Lưu quyền</button>
                  </div>
                )}
                {editingParent && (
                  <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <StudentSelector title={`Gán con cho ${account.fullName}`} students={students} checkedIds={editStudentIds} onToggle={toggleEditStudent} />
                    <button type="button" className="btn-primary mt-4" onClick={() => saveParentLinks(account.id)}>Lưu danh sách con</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const classes = role === 'ADMIN' ? 'bg-brandForest text-white' : role === 'PARENT' ? 'bg-orange-100 text-emerald-800' : 'bg-emerald-100 text-emerald-800';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${classes}`}>{roleInfo[role].title}</span>;
}

function StudentSelector({ title, students, checkedIds, onToggle }: { title: string; students: Student[]; checkedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
      <p className="mb-3 text-sm font-black text-emerald-800">{title}</p>
      {students.length === 0 ? <p className="text-sm text-slate-500">Chưa có học viên để gán quyền.</p> : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white p-3 text-sm">
              <input type="checkbox" checked={checkedIds.includes(student.id)} onChange={() => onToggle(student.id)} />
              <span><b>{student.fullName}</b><span className="block text-xs text-slate-500">{student.studentCode} · {student.class?.name || 'Chưa phân lớp'}</span></span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
