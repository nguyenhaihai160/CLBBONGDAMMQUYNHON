import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, QrCode } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { pickQrImage } from '../utils/qr';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

type QrPreview = {
  bankBin: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  amount: number;
  transferContent: string;
  qrPayload: string;
  ready: boolean;
};

export function Payments() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [qrPreview, setQrPreview] = useState<QrPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    amount: 500000,
    paidAmount: 0,
    feeType: 'MONTHLY',
    packageSessions: 12,
    month: new Date().toISOString().slice(0, 7),
  });

  async function load() {
    const [studentRes, paymentRes] = await Promise.all([api.get('/students'), api.get('/payments')]);
    setStudents(studentRes.data);
    setPayments(paymentRes.data);
  }

  useEffect(() => { load(); }, []);

  const amountToPay = useMemo(() => Math.max(Number(form.amount || 0) - Number(form.paidAmount || 0), 0) || Number(form.amount || 0), [form.amount, form.paidAmount]);

  useEffect(() => {
    if (user?.role !== 'ADMIN' || !form.studentId || !amountToPay) {
      setQrPreview(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await api.post('/payments/qr-preview', {
          studentId: form.studentId,
          amount: amountToPay,
          month: form.feeType === 'MONTHLY' ? form.month : undefined,
        });
        setQrPreview(res.data);
      } catch {
        setQrPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [form.studentId, amountToPay, form.month, form.feeType, user?.role]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    const payload: any = {
      ...form,
      amount: Number(form.amount),
      paidAmount: Number(form.paidAmount),
      feeType: form.feeType,
      month: form.feeType === 'MONTHLY' ? form.month : undefined,
      packageSessions: form.feeType === 'PACKAGE' ? Number(form.packageSessions) : undefined,
    };

    try {
      await api.post('/payments', payload);
      setForm({ ...form, studentId: '', paidAmount: 0 });
      setMessage('Đã tạo khoản học phí và QR động theo đúng số tiền cần nộp. Phụ huynh quét QR sẽ thấy đúng số tiền Admin nhập.');
      load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không tạo được khoản học phí.');
    }
  }

  async function confirm(id: string) {
    await api.patch(`/payments/${id}/confirm`, {});
    setMessage('Đã xác nhận thanh toán. Nếu là gói buổi, hệ thống đã tự cộng số buổi cho học viên.');
    load();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Đã sao chép nội dung chuyển khoản.');
    } catch {
      window.prompt('Sao chép nội dung chuyển khoản:', text);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Quản lý học phí</h1>
        <p className="text-slate-500">Admin nhập số tiền cần thu, hệ thống tự tạo QR đúng số tiền và liên kết với tài khoản ngân hàng đã cấu hình.</p>
      </div>
      {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="card grid gap-3 md:grid-cols-3 xl:grid-cols-2">
          <select className="input md:col-span-3 xl:col-span-2" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} required>
            <option value="">Chọn học viên</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.studentCode} - {s.fullName}</option>)}
          </select>
          <select className="input" value={form.feeType} onChange={e => setForm({ ...form, feeType: e.target.value })}>
            <option value="MONTHLY">Theo tháng</option>
            <option value="PACKAGE">Gói buổi</option>
          </select>
          <input className="input" type="number" min={1000} value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} placeholder="Số tiền cần thu" />
          <input className="input" type="number" min={0} value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: Number(e.target.value) })} placeholder="Đã đóng trước đó" />
          {form.feeType === 'PACKAGE' ? (
            <input className="input" type="number" min={1} value={form.packageSessions} onChange={e => setForm({ ...form, packageSessions: Number(e.target.value) })} placeholder="Số buổi" />
          ) : (
            <input className="input" type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} />
          )}
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600 md:col-span-3 xl:col-span-2">
            Số tiền QR sẽ tạo: <b className="text-emerald-700">{money(amountToPay)}</b>
          </div>
          <button className="btn-primary md:col-span-3 xl:col-span-2">Tạo học phí + QR {money(amountToPay)}</button>
        </form>

        <section className="card h-fit rounded-[2rem]">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><QrCode className="text-emerald-700" /> Xem trước QR động</h2>
          {previewLoading && <p className="text-sm text-slate-500">Đang tạo QR...</p>}
          {!qrPreview && !previewLoading && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Chọn học viên và nhập số tiền để xem QR. Cần cấu hình mã BIN, số tài khoản và chủ tài khoản trong Cấu hình CLB.</p>}
          {qrPreview && (
            <div className="space-y-3">
              {qrPreview.ready ? <img src={qrPreview.qrPayload} className="mx-auto h-56 w-56 rounded-3xl border bg-white object-contain p-2" /> : <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Chưa đủ thông tin ngân hàng để tạo QR. Vào Cấu hình CLB để nhập mã BIN và số tài khoản.</div>}
              <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                <p><b>{qrPreview.bankName || 'Ngân hàng'}</b> {qrPreview.bankBin ? `· BIN ${qrPreview.bankBin}` : ''}</p>
                <p>STK: {qrPreview.bankAccount || '---'}</p>
                <p>CTK: {qrPreview.bankAccountName || '---'}</p>
                <p>Số tiền: <b>{money(qrPreview.amount)}</b></p>
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-black text-emerald-700">
                  <span className="min-w-0 flex-1 truncate">{qrPreview.transferContent}</span>
                  <button type="button" onClick={() => copy(qrPreview.transferContent)}><Copy size={16} /></button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-3">
        {payments.map(p => {
          const qrImage = pickQrImage(p.qrPayload);
          return (
            <div key={p.id} className="card grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1.1fr_auto] lg:items-center">
              <div><h3 className="font-bold">{p.student?.fullName}</h3><p className="text-sm text-slate-500">{p.student?.studentCode} · {p.student?.class?.name || 'Chưa phân lớp'}</p></div>
              <div><p className="text-xs text-slate-400">Loại phí</p><b>{p.feeType === 'PACKAGE' ? `Gói ${p.packageSessions || 0} buổi` : `Tháng ${p.month || ''}`}</b></div>
              <div><p className="text-xs text-slate-400">Số tiền</p><b>{money(p.amount)}</b></div>
              <div><p className="text-xs text-slate-400">Còn nợ</p><b>{money(p.debtAmount)}</b></div>
              <div><p className="text-xs text-slate-400">Trạng thái</p><PaymentStatus value={p.status} sessionsApplied={p.sessionsApplied} /></div>
              <div className="flex items-center gap-3">
                {qrImage && p.status !== 'PAID' && <img src={qrImage} className="h-20 w-20 rounded-2xl border bg-white object-contain p-1" />}
                {user?.role === 'ADMIN' && p.status !== 'PAID' && <button className="btn-primary" onClick={() => confirm(p.id)}>Xác nhận</button>}
              </div>
              {p.transferContent && p.status !== 'PAID' && <div className="lg:col-span-6 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">Nội dung CK: <b className="text-emerald-700">{p.transferContent}</b></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentStatus({ value, sessionsApplied }: { value: string; sessionsApplied?: boolean }) {
  const map: Record<string, string> = { PAID: 'Đã đóng', PENDING: 'Chưa đóng', PARTIAL: 'Còn nợ', OVERDUE: 'Quá hạn' };
  return (
    <div className="space-y-1">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${value === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{map[value] || value}</span>
      {sessionsApplied && <p className="text-xs font-semibold text-emerald-700">Đã cộng buổi</p>}
    </div>
  );
}
