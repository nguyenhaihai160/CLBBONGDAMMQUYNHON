import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Printer, Search } from 'lucide-react';
import { api } from '../api/client';

type Settings = {
  academyName: string;
  academyShortName: string;
  logoUrl: string;
  hotline: string;
  address: string;
  tuitionQrUrl: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentNotePrefix: string;
};

const defaultSettings: Settings = {
  academyName: 'Football Academy Manager Pro',
  academyShortName: 'FAM Pro',
  logoUrl: '',
  hotline: '',
  address: '',
  tuitionQrUrl: '',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
  paymentNotePrefix: 'HP',
};

export function StudentCards() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  async function load() {
    const [studentRes, classRes, settingsRes] = await Promise.all([
      api.get('/students'),
      api.get('/classes'),
      api.get('/settings/academy'),
    ]);
    setStudents(studentRes.data);
    setClasses(classRes.data);
    setSettings({ ...defaultSettings, ...settingsRes.data });
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

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black"><CreditCard /> Thẻ học viên</h1>
          <p className="text-slate-500">In thẻ học viên có logo CLB, QR nộp học phí và trạng thái gói buổi: chưa nộp tiền, đang học, gần hết buổi, hết buổi, quá buổi.</p>
        </div>
        <button className="btn-primary flex items-center justify-center gap-2" onClick={() => window.print()}><Printer size={18} /> In thẻ</button>
      </div>

      <div className="no-print card grid gap-3 md:grid-cols-[1fr_240px_auto] md:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Tìm theo tên, mã học viên hoặc SĐT phụ huynh" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">Tất cả lớp</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="text-sm font-bold text-slate-600">{filteredStudents.length} thẻ</div>
      </div>

      {!settings.tuitionQrUrl && (
        <div className="no-print rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Chưa upload QR học phí. Vào Cấu hình CLB → QR nộp học phí trên thẻ học viên để thêm mã QR.
        </div>
      )}

      <div className="student-card-print-grid grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredStudents.map((student) => <StudentCard key={student.id} student={student} settings={settings} />)}
      </div>
    </div>
  );
}

function getLearningStatus(student: any) {
  const remaining = Number(student.sessionRemaining ?? 0);
  const total = Number(student.sessionTotal ?? 0);
  const tuitionStatus = student.tuitionStatus;

  if (tuitionStatus !== 'PAID') {
    return { label: 'CHƯA NỘP TIỀN', className: 'bg-red-100 text-red-700 border-red-200', note: 'Cần nhắc phụ huynh thanh toán' };
  }
  if (remaining < 0) {
    return { label: 'QUÁ BUỔI', className: 'bg-red-100 text-red-700 border-red-200', note: `Đã vượt ${Math.abs(remaining)} buổi` };
  }
  if (remaining === 0) {
    return { label: 'HẾT BUỔI', className: 'bg-slate-200 text-slate-800 border-slate-300', note: 'Cần gia hạn gói học' };
  }
  const nearLimit = total <= 4 ? remaining <= 1 : remaining <= 3 || remaining <= Math.ceil(total * 0.2);
  if (nearLimit) {
    return { label: 'GẦN HẾT BUỔI', className: 'bg-amber-100 text-amber-800 border-amber-200', note: `Còn ${remaining} buổi` };
  }
  return { label: 'ĐANG HỌC', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', note: `Còn ${remaining}/${total} buổi` };
}

function StudentCard({ student, settings }: { student: any; settings: Settings }) {
  const paymentContent = `${settings.paymentNotePrefix || 'HP'} ${student.studentCode} ${student.fullName}`.trim();
  const learningStatus = getLearningStatus(student);
  return (
    <article className="student-print-card overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-brandForest p-4 text-white">
        <div className="flex items-center gap-3">
          {settings.logoUrl ? <img src={settings.logoUrl} className="h-14 w-14 rounded-2xl bg-white object-contain p-2" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl">⚽</div>}
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-widest text-emerald-100">{settings.academyShortName || 'Football Academy'}</p>
            <h2 className="truncate text-lg font-black">{settings.academyName || 'Thẻ học viên'}</h2>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-4">
          {student.avatarUrl ? <img src={student.avatarUrl} className="h-24 w-24 rounded-3xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-100 text-4xl font-black text-emerald-800">{student.fullName.charAt(0)}</div>}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">{student.studentCode}</p>
            <h3 className="text-xl font-black leading-tight text-slate-900">{student.fullName}</h3>
            <p className="mt-2 text-sm text-slate-500">Lớp: <b className="text-slate-800">{student.class?.name || 'Chưa phân lớp'}</b></p>
            <p className="text-sm text-slate-500">PH: <b className="text-slate-800">{student.parentPhone}</b></p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Buổi còn lại</p><b>{student.sessionRemaining}/{student.sessionTotal}</b></div>
          <div className={`rounded-2xl border p-3 ${learningStatus.className}`}><p className="text-xs opacity-80">Trạng thái gói</p><b>{learningStatus.label}</b><p className="text-[11px] font-semibold opacity-80">{learningStatus.note}</p></div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-3">
          {settings.tuitionQrUrl ? <img src={settings.tuitionQrUrl} className="h-24 w-24 rounded-2xl bg-white object-contain p-1" /> : <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-center text-xs font-bold text-slate-400">QR học phí</div>}
          <div className="min-w-0 text-xs text-slate-600">
            <b className="text-sm text-slate-900">QR nộp học phí</b>
            <p>{settings.bankName || 'Ngân hàng chưa cập nhật'}</p>
            <p>STK: {settings.bankAccountNumber || '---'}</p>
            <p>CTK: {settings.bankAccountName || '---'}</p>
            <p className="mt-1 rounded-xl bg-white px-2 py-1 font-bold text-emerald-700">ND: {paymentContent}</p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">{settings.hotline ? `Hotline: ${settings.hotline}` : 'Vui lòng liên hệ CLB khi cần hỗ trợ'} {settings.address ? `· ${settings.address}` : ''}</p>
      </div>
    </article>
  );
}
