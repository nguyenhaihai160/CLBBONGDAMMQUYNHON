import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarCheck, CheckCircle2, ClipboardList, DollarSign, RefreshCcw, Trash2, WalletCards } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { StatCard } from '../components/StatCard';

type Coach = { id: string; fullName: string; email?: string; phone?: string; _count?: { coachClasses: number } };
type Klass = { id: string; name: string; coachId?: string | null };
type WorkLog = {
  id: string;
  coachId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  sessionCount: number;
  hours: string | number;
  rate: string | number;
  amount: string | number;
  note?: string;
  coach?: Coach;
  class?: { id: string; name: string } | null;
  createdBy?: { fullName: string } | null;
};
type Payroll = {
  id: string;
  coachId: string;
  month: string;
  baseSalary: string | number;
  sessionRate: string | number;
  sessionCount: number;
  sessionAmount: string | number;
  bonus: string | number;
  deduction: string | number;
  totalAmount: string | number;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID';
  note?: string;
  paidAt?: string | null;
  coach?: Coach;
  confirmedBy?: { fullName: string } | null;
};

type WorkLogResponse = { month: string; records: WorkLog[]; summary: { totalLogs: number; present: number; absent: number; excused: number; sessions: number; amount: number } };
type PayrollResponse = { month: string; payrolls: Payroll[]; summary: { total: number; paid: number; sessions: number } };

type WorkForm = {
  coachId: string;
  classId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  sessionCount: number;
  hours: number;
  rate: number;
  note: string;
};

type PayrollForm = {
  coachId: string;
  baseSalary: number;
  sessionRate: number;
  bonus: number;
  deduction: number;
  note: string;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: any) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const dateLabel = (value: string) => new Date(value).toLocaleDateString('vi-VN');

const statusLabel: Record<string, string> = {
  PRESENT: 'Có mặt / dạy đủ',
  ABSENT: 'Vắng',
  EXCUSED: 'Xin phép',
  DRAFT: 'Tạm tính',
  CONFIRMED: 'Đã chốt',
  PAID: 'Đã thanh toán',
};

const statusClass: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800',
  ABSENT: 'bg-red-100 text-red-700',
  EXCUSED: 'bg-amber-100 text-amber-800',
  DRAFT: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  PAID: 'bg-emerald-100 text-emerald-800',
};

export function CoachPayroll() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [month, setMonth] = useState(currentMonth());
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [workData, setWorkData] = useState<WorkLogResponse | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollResponse | null>(null);
  const [myData, setMyData] = useState<{ workLogs: WorkLog[]; payroll?: Payroll | null; summary: { sessions: number; amount: number; logs: number } } | null>(null);
  const [coachFilter, setCoachFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [workForm, setWorkForm] = useState<WorkForm>({ coachId: '', classId: '', date: today(), status: 'PRESENT', sessionCount: 1, hours: 1.5, rate: 100000, note: '' });
  const [payrollForm, setPayrollForm] = useState<PayrollForm>({ coachId: '', baseSalary: 0, sessionRate: 100000, bonus: 0, deduction: 0, note: '' });

  async function loadBase() {
    const [coachResponse, classResponse] = await Promise.all([api.get('/coach-payroll/coaches'), api.get('/classes')]);
    setCoaches(coachResponse.data || []);
    setClasses(classResponse.data || []);
    const firstCoachId = coachResponse.data?.[0]?.id || '';
    setCoachFilter((current) => current || firstCoachId);
    setWorkForm((current) => ({ ...current, coachId: current.coachId || firstCoachId }));
    setPayrollForm((current) => ({ ...current, coachId: current.coachId || firstCoachId }));
  }

  async function load() {
    setError('');
    try {
      if (isAdmin) {
        const query = coachFilter ? `&coachId=${coachFilter}` : '';
        const [workResponse, payrollResponse] = await Promise.all([
          api.get(`/coach-payroll/work-logs?month=${month}${query}`),
          api.get(`/coach-payroll/payrolls?month=${month}${query}`),
        ]);
        setWorkData(workResponse.data);
        setPayrollData(payrollResponse.data);
      } else {
        const response = await api.get(`/coach-payroll/me?month=${month}`);
        setMyData(response.data);
      }
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể tải dữ liệu chấm công/lương.');
    }
  }

  useEffect(() => { loadBase().catch(() => setError('Không thể tải danh sách HLV/lớp.')); }, []);
  useEffect(() => { load(); }, [month, coachFilter, isAdmin]);

  const filteredClasses = useMemo(() => {
    if (!workForm.coachId) return classes;
    const assigned = classes.filter((item) => item.coachId === workForm.coachId);
    return assigned.length > 0 ? assigned : classes;
  }, [classes, workForm.coachId]);

  async function createWorkLog(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      setBusy(true);
      await api.post('/coach-payroll/work-logs', { ...workForm, classId: workForm.classId || null });
      setMessage('Đã ghi nhận chấm công Huấn luyện viên.');
      setWorkForm((current) => ({ ...current, date: today(), note: '' }));
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể tạo dòng chấm công.');
    } finally { setBusy(false); }
  }

  async function deleteWorkLog(id: string) {
    if (!window.confirm('Xóa dòng chấm công này?')) return;
    try {
      await api.delete(`/coach-payroll/work-logs/${id}`);
      setMessage('Đã xóa dòng chấm công.');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể xóa dòng chấm công.');
    }
  }

  async function generatePayroll(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      setBusy(true);
      await api.post('/coach-payroll/payrolls/generate', { ...payrollForm, month });
      setMessage('Đã tính lương tháng cho Huấn luyện viên.');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể tính lương.');
    } finally { setBusy(false); }
  }

  async function updatePayrollStatus(payroll: Payroll, status: 'DRAFT' | 'CONFIRMED' | 'PAID') {
    try {
      await api.patch(`/coach-payroll/payrolls/${payroll.id}/status`, { status });
      setMessage(status === 'PAID' ? 'Đã đánh dấu lương đã thanh toán.' : 'Đã cập nhật trạng thái bảng lương.');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Không thể cập nhật trạng thái lương.');
    }
  }

  if (!isAdmin) {
    const payroll = myData?.payroll;
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Lương của tôi</p>
            <h1 className="text-2xl font-black text-brandForest">Chấm công & lương Huấn luyện viên</h1>
            <p className="text-slate-500">HLV xem số buổi đã được chấm công, lương tạm tính và trạng thái thanh toán.</p>
          </div>
          <input className="input max-w-xs" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Số buổi được chấm" value={myData?.summary.sessions || 0} icon={CalendarCheck} hint={`Tháng ${month}`} />
          <StatCard title="Tiền theo buổi" value={money(myData?.summary.amount || 0)} icon={WalletCards} hint="Dựa trên dòng chấm công" />
          <StatCard title="Tổng lương" value={money(payroll?.totalAmount || 0)} icon={Banknote} hint={payroll ? statusLabel[payroll.status] : 'Chưa chốt bảng lương'} />
          <StatCard title="Trạng thái" value={payroll ? statusLabel[payroll.status] : 'Chưa có'} icon={CheckCircle2} hint={payroll?.paidAt ? `Thanh toán ${dateLabel(payroll.paidAt)}` : 'Admin sẽ xác nhận'} />
        </div>

        {payroll && (
          <div className="card rounded-[2rem] border border-emerald-100 bg-white">
            <h2 className="mb-4 text-lg font-black">Bảng lương tháng {month}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Lương cơ bản</p><b>{money(payroll.baseSalary)}</b></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Lương theo buổi</p><b>{money(payroll.sessionAmount)}</b></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Thưởng / Phạt</p><b>{money(Number(payroll.bonus || 0) - Number(payroll.deduction || 0))}</b></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Thực nhận</p><b className="text-emerald-800">{money(payroll.totalAmount)}</b></div>
            </div>
            {payroll.note && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">Ghi chú: {payroll.note}</p>}
          </div>
        )}

        <div className="card overflow-hidden p-0">
          <div className="border-b px-4 py-3"><h2 className="font-black">Lịch sử chấm công tháng {month}</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">Lớp</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Buổi</th><th className="px-4 py-3">Thành tiền</th><th className="px-4 py-3">Ghi chú</th></tr></thead>
              <tbody className="divide-y">
                {(myData?.workLogs || []).map((item) => (
                  <tr key={item.id}><td className="px-4 py-3 font-bold">{dateLabel(item.date)}</td><td className="px-4 py-3">{item.class?.name || 'Không gán lớp'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${statusClass[item.status]}`}>{statusLabel[item.status]}</span></td><td className="px-4 py-3">{item.sessionCount}</td><td className="px-4 py-3 font-bold">{money(item.amount)}</td><td className="px-4 py-3">{item.note || '-'}</td></tr>
                ))}
                {(myData?.workLogs || []).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Chưa có dòng chấm công trong tháng này.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Nhân sự HLV</p>
          <h1 className="text-2xl font-black text-brandForest">Chấm công & tính lương Huấn luyện viên</h1>
          <p className="text-slate-500">Admin ghi nhận buổi dạy, tính lương theo tháng, chốt và đánh dấu đã thanh toán.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <select className="input" value={coachFilter} onChange={(event) => setCoachFilter(event.target.value)}>
            <option value="">Tất cả HLV</option>
            {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.fullName}</option>)}
          </select>
          <button className="btn-soft flex items-center gap-2" onClick={load}><RefreshCcw size={17} /> Tải lại</button>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Buổi đã chấm" value={workData?.summary.sessions || 0} icon={CalendarCheck} hint={`Tháng ${month}`} />
        <StatCard title="Tiền theo buổi" value={money(workData?.summary.amount || 0)} icon={WalletCards} hint="Theo dòng chấm công" />
        <StatCard title="Tổng lương" value={money(payrollData?.summary.total || 0)} icon={Banknote} hint="Các bảng lương đã tạo" />
        <StatCard title="Đã thanh toán" value={money(payrollData?.summary.paid || 0)} icon={CheckCircle2} hint="Bảng lương trạng thái PAID" />
      </div>

      <form onSubmit={createWorkLog} className="card space-y-4 rounded-[2rem] border border-emerald-100 bg-white shadow-xl shadow-emerald-950/5">
        <div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-800"><ClipboardList /></span><div><h2 className="text-lg font-black">Chấm công HLV</h2><p className="text-sm text-slate-500">Ghi nhận buổi dạy, vắng hoặc xin phép. Buổi có mặt sẽ được tính lương.</p></div></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-semibold text-slate-600">Huấn luyện viên<select className="input mt-1" value={workForm.coachId} onChange={(e) => setWorkForm({ ...workForm, coachId: e.target.value })} required><option value="">Chọn HLV</option>{coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.fullName}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-600">Lớp / đội<select className="input mt-1" value={workForm.classId} onChange={(e) => setWorkForm({ ...workForm, classId: e.target.value })}><option value="">Không gán lớp</option>{filteredClasses.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-600">Ngày<input className="input mt-1" type="date" value={workForm.date} onChange={(e) => setWorkForm({ ...workForm, date: e.target.value })} required /></label>
          <label className="text-sm font-semibold text-slate-600">Trạng thái<select className="input mt-1" value={workForm.status} onChange={(e) => setWorkForm({ ...workForm, status: e.target.value as any })}><option value="PRESENT">Có mặt / dạy đủ</option><option value="ABSENT">Vắng</option><option value="EXCUSED">Xin phép</option></select></label>
          <label className="text-sm font-semibold text-slate-600">Số buổi<input className="input mt-1" type="number" min={0} value={workForm.sessionCount} onChange={(e) => setWorkForm({ ...workForm, sessionCount: Number(e.target.value) })} /></label>
          <label className="text-sm font-semibold text-slate-600">Số giờ<input className="input mt-1" type="number" step="0.5" min={0} value={workForm.hours} onChange={(e) => setWorkForm({ ...workForm, hours: Number(e.target.value) })} /></label>
          <label className="text-sm font-semibold text-slate-600">Lương / buổi<input className="input mt-1" type="number" min={0} value={workForm.rate} onChange={(e) => setWorkForm({ ...workForm, rate: Number(e.target.value) })} /></label>
          <label className="text-sm font-semibold text-slate-600">Ghi chú<input className="input mt-1" value={workForm.note} onChange={(e) => setWorkForm({ ...workForm, note: e.target.value })} placeholder="Dạy thay, mưa, nghỉ phép..." /></label>
        </div>
        <button className="btn-primary" disabled={busy || !workForm.coachId}>{busy ? 'Đang lưu...' : 'Lưu chấm công HLV'}</button>
      </form>

      <form onSubmit={generatePayroll} className="card space-y-4 rounded-[2rem] border border-emerald-100 bg-white shadow-xl shadow-emerald-950/5">
        <div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-800"><DollarSign /></span><div><h2 className="text-lg font-black">Tính lương tháng</h2><p className="text-sm text-slate-500">Hệ thống tự cộng số buổi đã chấm trong tháng, sau đó cộng lương cơ bản, thưởng và trừ phạt.</p></div></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold text-slate-600">Huấn luyện viên<select className="input mt-1" value={payrollForm.coachId} onChange={(e) => setPayrollForm({ ...payrollForm, coachId: e.target.value })} required><option value="">Chọn HLV</option>{coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.fullName}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-600">Lương cơ bản<input className="input mt-1" type="number" min={0} value={payrollForm.baseSalary} onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: Number(e.target.value) })} /></label>
          <label className="text-sm font-semibold text-slate-600">Lương chuẩn / buổi<input className="input mt-1" type="number" min={0} value={payrollForm.sessionRate} onChange={(e) => setPayrollForm({ ...payrollForm, sessionRate: Number(e.target.value) })} /></label>
          <label className="text-sm font-semibold text-slate-600">Thưởng<input className="input mt-1" type="number" min={0} value={payrollForm.bonus} onChange={(e) => setPayrollForm({ ...payrollForm, bonus: Number(e.target.value) })} /></label>
          <label className="text-sm font-semibold text-slate-600">Khấu trừ<input className="input mt-1" type="number" min={0} value={payrollForm.deduction} onChange={(e) => setPayrollForm({ ...payrollForm, deduction: Number(e.target.value) })} /></label>
          <label className="text-sm font-semibold text-slate-600">Ghi chú<input className="input mt-1" value={payrollForm.note} onChange={(e) => setPayrollForm({ ...payrollForm, note: e.target.value })} placeholder="Thưởng chuyên cần, hỗ trợ giải đấu..." /></label>
        </div>
        <button className="btn-primary" disabled={busy || !payrollForm.coachId}>{busy ? 'Đang tính...' : 'Tính / cập nhật bảng lương'}</button>
      </form>

      <div className="card overflow-hidden p-0">
        <div className="border-b px-4 py-3"><h2 className="font-black">Bảng lương tháng {month}</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">HLV</th><th className="px-4 py-3">Buổi</th><th className="px-4 py-3">Lương cơ bản</th><th className="px-4 py-3">Theo buổi</th><th className="px-4 py-3">Thưởng</th><th className="px-4 py-3">Khấu trừ</th><th className="px-4 py-3">Thực nhận</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead>
            <tbody className="divide-y">
              {(payrollData?.payrolls || []).map((payroll) => (
                <tr key={payroll.id} className="hover:bg-slate-50"><td className="px-4 py-3"><b>{payroll.coach?.fullName}</b><p className="text-xs text-slate-500">{payroll.coach?.email}</p></td><td className="px-4 py-3">{payroll.sessionCount}</td><td className="px-4 py-3">{money(payroll.baseSalary)}</td><td className="px-4 py-3">{money(payroll.sessionAmount)}</td><td className="px-4 py-3">{money(payroll.bonus)}</td><td className="px-4 py-3">{money(payroll.deduction)}</td><td className="px-4 py-3 font-black text-emerald-700">{money(payroll.totalAmount)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${statusClass[payroll.status]}`}>{statusLabel[payroll.status]}</span></td><td className="px-4 py-3"><div className="flex gap-2"><button className="btn-soft py-1 text-xs" onClick={() => updatePayrollStatus(payroll, 'CONFIRMED')}>Chốt</button><button className="btn-primary py-1 text-xs" onClick={() => updatePayrollStatus(payroll, 'PAID')}>Đã trả</button></div></td></tr>
              ))}
              {(payrollData?.payrolls || []).length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Chưa có bảng lương. Hãy chấm công và bấm tính lương.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b px-4 py-3"><h2 className="font-black">Lịch sử chấm công HLV</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">HLV</th><th className="px-4 py-3">Lớp</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Buổi</th><th className="px-4 py-3">Lương/buổi</th><th className="px-4 py-3">Thành tiền</th><th className="px-4 py-3">Ghi chú</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y">
              {(workData?.records || []).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold">{dateLabel(item.date)}</td><td className="px-4 py-3">{item.coach?.fullName}</td><td className="px-4 py-3">{item.class?.name || '-'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${statusClass[item.status]}`}>{statusLabel[item.status]}</span></td><td className="px-4 py-3">{item.sessionCount}</td><td className="px-4 py-3">{money(item.rate)}</td><td className="px-4 py-3 font-bold">{money(item.amount)}</td><td className="px-4 py-3">{item.note || '-'}</td><td className="px-4 py-3"><button className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100" onClick={() => deleteWorkLog(item.id)}><Trash2 size={16} /></button></td></tr>
              ))}
              {(workData?.records || []).length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Chưa có chấm công HLV trong tháng này.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
