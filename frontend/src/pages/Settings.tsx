import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ImagePlus, QrCode, Save } from 'lucide-react';
import { api } from '../api/client';

type AcademySettings = {
  academyName: string;
  academyShortName: string;
  logoUrl: string;
  hotline: string;
  address: string;
  primaryColor: string;
  tuitionQrUrl: string;
  bankName: string;
  bankBin: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentNotePrefix: string;
};

const emptySettings: AcademySettings = {
  academyName: 'Football Academy Manager Pro',
  academyShortName: 'FAM Pro',
  logoUrl: '',
  hotline: '',
  address: '',
  primaryColor: '#15803d',
  tuitionQrUrl: '',
  bankName: '',
  bankBin: '970436',
  bankAccountName: '',
  bankAccountNumber: '',
  paymentNotePrefix: 'HP',
};

export function Settings() {
  const [settings, setSettings] = useState<AcademySettings>(emptySettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/settings/academy').then((res) => setSettings({ ...emptySettings, ...res.data }));
  }, []);

  function update<K extends keyof AcademySettings>(key: K, value: AcademySettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function uploadImage(key: 'logoUrl' | 'tuitionQrUrl', event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setMessage('Ảnh nên nhỏ hơn 1.5MB để phần mềm chạy nhanh hơn.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => update(key, String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await api.put('/settings/academy', settings);
      setSettings({ ...emptySettings, ...res.data });
      setMessage('Đã lưu cấu hình CLB và tài khoản ngân hàng. Từ giờ khi Admin tạo học phí, QR sẽ tự sinh theo đúng số tiền cần nộp.');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Cấu hình CLB</h1>
        <p className="text-slate-500">Admin có thể đổi logo, tên CLB, hotline, thông tin ngân hàng và QR nộp học phí hiển thị trên thẻ học viên.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="card space-y-6">
          <section className="space-y-4">
            <h2 className="font-black">Thông tin CLB</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Tên CLB / Học viện</span><input className="input" value={settings.academyName} onChange={(e) => update('academyName', e.target.value)} required /></label>
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Tên rút gọn</span><input className="input" value={settings.academyShortName} onChange={(e) => update('academyShortName', e.target.value)} /></label>
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Hotline</span><input className="input" value={settings.hotline} onChange={(e) => update('hotline', e.target.value)} placeholder="VD: 0900 000 000" /></label>
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Màu chủ đạo</span><input className="input" value={settings.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} placeholder="#15803d" /></label>
            </div>
            <label className="space-y-1 block"><span className="text-sm font-bold text-slate-700">Địa chỉ sân / văn phòng</span><input className="input" value={settings.address} onChange={(e) => update('address', e.target.value)} placeholder="Nhập địa chỉ" /></label>
          </section>

          <section className="space-y-4">
            <h2 className="font-black">Logo CLB</h2>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
                  <ImagePlus size={18} /> Chọn logo từ máy
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadImage('logoUrl', event)} />
                </label>
                <button type="button" className="btn-soft" onClick={() => update('logoUrl', '')}>Xóa logo</button>
                <span className="text-xs text-slate-500">Nên dùng PNG/JPG vuông, dưới 1.5MB.</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-black">Tài khoản ngân hàng & QR học phí động</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Ngân hàng</span><input className="input" value={settings.bankName} onChange={(e) => update('bankName', e.target.value)} placeholder="VD: MB, ACB, Vietcombank..." /></label>
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Mã BIN ngân hàng</span><input className="input" value={settings.bankBin} onChange={(e) => update('bankBin', e.target.value)} placeholder="VD: MB 970422, VCB 970436" /></label>
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Số tài khoản</span><input className="input" value={settings.bankAccountNumber} onChange={(e) => update('bankAccountNumber', e.target.value)} /></label>
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Tên chủ tài khoản</span><input className="input" value={settings.bankAccountName} onChange={(e) => update('bankAccountName', e.target.value)} /></label>
              <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Tiền tố nội dung CK</span><input className="input" value={settings.paymentNotePrefix} onChange={(e) => update('paymentNotePrefix', e.target.value)} placeholder="HP" /></label>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
                  <QrCode size={18} /> Upload mã QR học phí
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadImage('tuitionQrUrl', event)} />
                </label>
                <button type="button" className="btn-soft" onClick={() => update('tuitionQrUrl', '')}>Xóa QR</button>
                <span className="text-xs text-slate-500">QR upload là QR tĩnh dự phòng. Khi Admin tạo học phí, hệ thống sẽ tự sinh QR động theo đúng số tiền.</span>
              </div>
            </div>
          </section>

          {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div>}

          <button disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            <Save size={18} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </form>

        <div className="card h-fit space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Xem trước thẻ</p>
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-brandForest p-5 text-white">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo CLB" className="h-16 w-16 rounded-2xl bg-white object-contain p-2" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl">⚽</div>}
              <div>
                <h2 className="text-xl font-black">{settings.academyName || 'Tên CLB'}</h2>
                <p className="text-sm text-emerald-100">{settings.academyShortName || 'Tên rút gọn'}</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm">
              <p>Hotline: {settings.hotline || 'Chưa cập nhật'}</p>
              <p>Địa chỉ: {settings.address || 'Chưa cập nhật'}</p>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 text-slate-900">
              {settings.tuitionQrUrl ? <img src={settings.tuitionQrUrl} alt="QR học phí" className="h-24 w-24 rounded-xl object-contain" /> : <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">Chưa có QR</div>}
              <div className="text-sm">
                <b>QR nộp học phí</b>
                <p>{settings.bankName || 'Ngân hàng'} {settings.bankBin ? `· BIN ${settings.bankBin}` : ''}</p>
                <p>{settings.bankAccountNumber || 'Số tài khoản'}</p>
                <p>{settings.bankAccountName || 'Tên chủ tài khoản'}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">QR động sẽ lấy số tiền từ khoản học phí Admin tạo. Ví dụ nhập 500.000đ thì phụ huynh quét QR sẽ ra đúng 500.000đ.</p>
        </div>
      </div>
    </div>
  );
}
