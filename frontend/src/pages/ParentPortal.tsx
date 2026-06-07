import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Copy, CreditCard, Download, GraduationCap, QrCode, UserCircle2, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { buildDynamicPaymentQrUrl, pickQrImage } from '../utils/qr';

type Settings = {
  academyName: string;
  academyShortName: string;
  logoUrl: string;
  hotline: string;
  address: string;
  tuitionQrUrl: string;
  bankName: string;
  bankBin: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentNotePrefix: string;
};

const settingsFallback: Settings = {
  academyName: 'Football Academy Manager Pro', academyShortName: 'FAM Pro', logoUrl: '', hotline: '', address: '',
  tuitionQrUrl: '', bankName: '', bankBin: '970436', bankAccountName: '', bankAccountNumber: '', paymentNotePrefix: 'HP',
};

const dayNames: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ nhật' };

export function ParentPortal() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [settings, setSettings] = useState<Settings>(settingsFallback);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function loadChildren() {
    const [childrenRes, settingsRes] = await Promise.all([api.get('/parent-portal/children'), api.get('/settings/academy')]);
    setChildren(childrenRes.data);
    setSettings({ ...settingsFallback, ...settingsRes.data });
    const firstId = childrenRes.data[0]?.id || '';
    setSelectedId((current) => current || firstId);
    if (firstId) {
      const detail = await api.get(`/parent-portal/children/${firstId}`);
      setStudent(detail.data);
    }
    setLoading(false);
  }

  useEffect(() => { loadChildren().catch(() => setLoading(false)); }, []);

  async function selectChild(id: string) {
    setSelectedId(id);
    const res = await api.get(`/parent-portal/children/${id}`);
    setStudent(res.data);
  }

  const status = useMemo(() => getLearningStatus(student), [student]);
  const unpaidPayments = useMemo(() => (student?.paymentHistories || []).filter((payment: any) => payment.status !== 'PAID'), [student]);
  const activePayment = unpaidPayments[0];
  const outstandingDebt = useMemo(() => unpaidPayments.reduce((sum: number, payment: any) => sum + Number(payment.debtAmount || 0), 0), [unpaidPayments]);
  const presentCount = student?.attendanceHistories?.filter((row: any) => row.status === 'PRESENT').length || 0;
  const excusedCount = student?.attendanceHistories?.filter((row: any) => row.status === 'EXCUSED').length || 0;
  const absentCount = student?.attendanceHistories?.filter((row: any) => row.status === 'ABSENT').length || 0;
  const paymentContent = activePayment?.transferContent || (student ? `${settings.paymentNotePrefix || 'HP'} ${student.studentCode} ${student.fullName}`.trim() : '');
  const paymentAmount = Number(activePayment?.debtAmount || activePayment?.amount || outstandingDebt || 0);
  const dynamicQrUrl = activePayment ? pickQrImage(activePayment.qrPayload) || buildDynamicPaymentQrUrl(settings, paymentAmount, paymentContent) : '';
  const finalQrUrl = dynamicQrUrl || settings.tuitionQrUrl;

  async function copyPaymentContent() {
    try {
      await navigator.clipboard.writeText(paymentContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Sao chép nội dung chuyển khoản:', paymentContent);
    }
  }

  if (loading) return <div className="card animate-pulse">Đang tải thông tin của con...</div>;
  if (!student) return <div className="card"><h1 className="text-xl font-black">Chưa có học viên được liên kết</h1><p className="mt-2 text-slate-500">Vui lòng liên hệ Admin để gán tài khoản phụ huynh với hồ sơ của con.</p></div>;

  return (
    <div className="parent-card-page space-y-5">
      <section className="no-print overflow-hidden rounded-[2rem] bg-gradient-to-br from-brandForest via-emerald-900 to-orange-500 p-5 text-white shadow-xl sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">Cổng phụ huynh</p>
        <h1 className="mt-2 text-3xl font-black">Theo dõi hành trình của con</h1>
        <p className="mt-2 text-sm text-emerald-50">Xem số buổi, lịch tập, điểm danh, học phí và tải thẻ học viên ngay trên điện thoại.</p>
      </section>

      {children.length > 1 && (
        <div className="no-print flex gap-3 overflow-x-auto pb-1">
          {children.map((child) => (
            <button key={child.id} onClick={() => selectChild(child.id)} className={`min-w-[160px] rounded-3xl border p-3 text-left transition ${selectedId === child.id ? 'border-orange-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
              <p className="text-xs font-black text-emerald-700">{child.studentCode}</p>
              <p className="font-black">{child.fullName}</p>
              <p className="text-xs text-slate-500">{child.class?.name || 'Chưa phân lớp'}</p>
            </button>
          ))}
        </div>
      )}

      <div className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={GraduationCap} title="Số buổi còn lại" value={`${student.sessionRemaining}/${student.sessionTotal}`} note={status.label} />
        <InfoCard icon={CheckCircle2} title="Có mặt gần đây" value={presentCount} note={`Vắng ${absentCount} · Xin phép ${excusedCount}`} />
        <InfoCard icon={Wallet} title="Công nợ" value={money(outstandingDebt)} note={outstandingDebt > 0 ? 'Cần thanh toán' : 'Không còn nợ'} />
        <InfoCard icon={CalendarDays} title="Lớp hiện tại" value={student.class?.name || 'Chưa phân lớp'} note={student.class?.coach ? `HLV ${student.class.coach.fullName}` : 'Chưa gán HLV'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="no-print space-y-5">
          <section className="card rounded-[2rem]">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><ClipboardList className="text-emerald-700" /> Quá trình học</h2>
            <div className="space-y-3">
              {(student.attendanceHistories || []).length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có dữ liệu điểm danh.</p>}
              {(student.attendanceHistories || []).slice(0, 8).map((row: any) => (
                <div key={row.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <div><b>{formatDate(row.date)}</b><p className="text-xs text-slate-500">{row.note || 'Buổi tập'}</p></div>
                  <AttendanceBadge status={row.status} />
                </div>
              ))}
            </div>
          </section>

          <section className="card rounded-[2rem]">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><CalendarDays className="text-emerald-700" /> Lịch tập</h2>
            <div className="space-y-3">
              {(student.class?.schedules || []).map((schedule: any) => (
                <div key={schedule.id} className="rounded-2xl border border-slate-100 p-3">
                  <b>{dayNames[schedule.dayOfWeek] || 'Lịch tập'} · {schedule.startTime} - {schedule.endTime}</b>
                  <p className="text-sm text-slate-500">{schedule.field?.name || 'Chưa cập nhật sân'} {schedule.field?.address ? `· ${schedule.field.address}` : ''}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <StudentCard student={student} settings={settings} status={status} paymentContent={paymentContent} qrUrl={finalQrUrl} paymentAmount={paymentAmount} />
          <div className="no-print flex gap-3">
            <button className="btn-primary flex flex-1 items-center justify-center gap-2 py-3" onClick={() => window.print()}><Download size={18} /> Tải / In thẻ</button>
          </div>

          <section className="no-print card rounded-[2rem]">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><QrCode className="text-emerald-700" /> Đóng học phí bằng QR</h2>
            {outstandingDebt > 0 ? <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Số tiền còn nợ: <b>{money(outstandingDebt)}</b></p> : <p className="mb-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Học viên hiện không có công nợ.</p>}
            <div className="flex flex-col gap-4 sm:flex-row">
              {finalQrUrl ? <img src={finalQrUrl} alt="QR học phí" className="h-40 w-40 rounded-2xl border bg-white object-contain p-2" /> : <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-slate-100 text-center text-sm font-semibold text-slate-400">Admin chưa cấu hình QR/ngân hàng</div>}
              <div className="text-sm text-slate-600">
                <p><b>{settings.bankName || 'Ngân hàng chưa cập nhật'}</b> {settings.bankBin ? `· BIN ${settings.bankBin}` : ''}</p>
                <p>STK: {settings.bankAccountNumber || '---'}</p>
                <p>Chủ TK: {settings.bankAccountName || '---'}</p>
                {paymentAmount > 0 && <p>Số tiền QR: <b>{money(paymentAmount)}</b></p>}
                <p className="mt-3 text-xs font-bold uppercase text-slate-400">Nội dung chuyển khoản</p>
                <div className="mt-1 flex items-center gap-2 rounded-xl bg-emerald-50 p-2 font-black text-emerald-800">
                  <span>{paymentContent}</span>
                  <button onClick={copyPaymentContent} aria-label="Sao chép nội dung"><Copy size={15} /></button>
                </div>
                {copied && <p className="mt-1 text-xs font-bold text-emerald-700">Đã sao chép nội dung.</p>}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">Sau khi chuyển khoản, Admin xác nhận thanh toán để cập nhật công nợ và số buổi học trên hệ thống.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, value, note }: any) {
  return <div className="card rounded-[2rem]"><Icon className="mb-3 text-emerald-700" /><p className="text-xs font-bold text-slate-400">{title}</p><p className="mt-1 text-xl font-black">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>;
}

function AttendanceBadge({ status }: { status: string }) {
  const map: Record<string, { text: string; css: string }> = {
    PRESENT: { text: 'Có mặt', css: 'bg-emerald-100 text-emerald-700' },
    ABSENT: { text: 'Vắng', css: 'bg-red-100 text-red-700' },
    EXCUSED: { text: 'Xin phép', css: 'bg-amber-100 text-amber-700' },
  };
  const value = map[status] || { text: status, css: 'bg-slate-100 text-slate-700' };
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${value.css}`}>{value.text}</span>;
}

function getLearningStatus(student: any) {
  if (!student) return { label: '', css: '' };
  const remaining = Number(student.sessionRemaining || 0);
  if (student.tuitionStatus !== 'PAID') return { label: 'CHƯA NỘP TIỀN', css: 'bg-red-100 text-red-700' };
  if (remaining < 0) return { label: 'QUÁ BUỔI', css: 'bg-red-100 text-red-700' };
  if (remaining === 0) return { label: 'HẾT BUỔI', css: 'bg-slate-200 text-slate-800' };
  if (remaining <= 3) return { label: 'GẦN HẾT BUỔI', css: 'bg-amber-100 text-amber-800' };
  return { label: 'ĐANG HỌC', css: 'bg-emerald-100 text-emerald-800' };
}

function StudentCard({ student, settings, status, paymentContent, qrUrl, paymentAmount }: any) {
  return (
    <article className="student-print-card overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-brandForest p-4 text-white">
        <div className="flex items-center gap-3">
          {settings.logoUrl ? <img src={settings.logoUrl} className="h-14 w-14 rounded-2xl bg-white object-contain p-2" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl">⚽</div>}
          <div><p className="text-xs uppercase tracking-widest text-emerald-100">{settings.academyShortName}</p><h2 className="text-lg font-black">THẺ HỌC VIÊN</h2></div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex gap-4">
          {student.avatarUrl ? <img src={student.avatarUrl} className="h-24 w-24 rounded-3xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-100 text-4xl font-black text-emerald-800"><UserCircle2 /></div>}
          <div className="flex-1"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">{student.studentCode}</p><h3 className="text-xl font-black">{student.fullName}</h3><p className="mt-2 text-sm text-slate-500">Lớp: <b className="text-slate-800">{student.class?.name || 'Chưa phân lớp'}</b></p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Còn lại</p><b>{student.sessionRemaining}/{student.sessionTotal} buổi</b></div>
          <div className={`rounded-2xl p-3 ${status.css}`}><p className="text-xs opacity-80">Trạng thái</p><b>{status.label}</b></div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-slate-50 p-3">
          {qrUrl ? <img src={qrUrl} className="h-20 w-20 rounded-xl bg-white object-contain p-1" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-xs text-slate-400">QR</div>}
          <div className="text-xs"><b className="text-sm">QR học phí</b><p>STK: {settings.bankAccountNumber || '---'}</p>{paymentAmount > 0 && <p>Số tiền: <b>{money(paymentAmount)}</b></p>}<p className="mt-1 rounded-lg bg-white px-2 py-1 font-bold text-emerald-700">ND: {paymentContent}</p></div>
        </div>
      </div>
    </article>
  );
}

function money(value: number) { return new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ'; }
function formatDate(value: string) { return new Date(value).toLocaleDateString('vi-VN'); }
