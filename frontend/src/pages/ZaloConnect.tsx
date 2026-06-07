import { FormEvent, useEffect, useState } from 'react';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { api } from '../api/client';

export function ZaloConnect() {
  const [connection, setConnection] = useState<any>({ connected: false });
  const [messages, setMessages] = useState<any[]>([]);
  const [form, setForm] = useState({ oaId: '', accessToken: '', refreshToken: '', expiresAt: '', isActive: true });
  const [test, setTest] = useState({ parentPhone: '', content: 'Nhắc phụ huynh đóng học phí tháng này cho bé. Cảm ơn quý phụ huynh!' });
  const [message, setMessage] = useState('');

  async function load() {
    const [connectionRes, messagesRes] = await Promise.all([api.get('/zalo/connection'), api.get('/zalo/messages')]);
    setConnection(connectionRes.data);
    setMessages(messagesRes.data);
    if (connectionRes.data?.oaId) {
      setForm((current) => ({ ...current, oaId: connectionRes.data.oaId, expiresAt: connectionRes.data.expiresAt ? String(connectionRes.data.expiresAt).slice(0, 10) : '', isActive: Boolean(connectionRes.data.isActive) }));
    }
  }

  useEffect(() => { load(); }, []);

  async function saveConnection(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      const payload = { ...form, expiresAt: form.expiresAt || null, refreshToken: form.refreshToken || null };
      const res = await api.put('/zalo/connection', payload);
      setMessage(res.data.message || 'Đã lưu kết nối Zalo OA.');
      setForm((current) => ({ ...current, accessToken: '', refreshToken: '' }));
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể lưu kết nối Zalo.');
    }
  }

  async function deleteConnection() {
    const ok = window.confirm('Xóa cấu hình Zalo OA hiện tại?');
    if (!ok) return;
    await api.delete('/zalo/connection');
    setMessage('Đã xóa cấu hình Zalo OA.');
    setConnection({ connected: false });
    setForm({ oaId: '', accessToken: '', refreshToken: '', expiresAt: '', isActive: true });
    await load();
  }

  async function sendTest(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.post('/zalo/send', { parentPhone: test.parentPhone, content: test.content, type: 'CUSTOM' });
      setMessage(res.data.message || 'Đã ghi nhận tin nhắn test.');
      setTest({ ...test, parentPhone: '' });
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể gửi tin test.');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black"><MessageCircle /> Kết nối Zalo OA</h1>
        <p className="text-slate-500">Admin lưu cấu hình Zalo Official Account, gửi thử thông báo và xem log tin nhắn.</p>
      </div>

      {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <form onSubmit={saveConnection} className="card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-black">Thông tin kết nối</h2>
              <p className="text-sm text-slate-500">Nhập OA ID và token lấy từ Zalo OA Developer/Official Account.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${connection.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{connection.connected ? 'Đã cấu hình' : 'Chưa cấu hình'}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Zalo OA ID *</span><input className="input" value={form.oaId} onChange={e => setForm({ ...form, oaId: e.target.value })} required /></label>
            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">Ngày hết hạn token</span><input className="input" type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-sm font-bold text-slate-700">Access Token *</span><textarea className="input min-h-24" value={form.accessToken} onChange={e => setForm({ ...form, accessToken: e.target.value })} placeholder="Dán access token Zalo OA" required /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-sm font-bold text-slate-700">Refresh Token</span><textarea className="input min-h-20" value={form.refreshToken} onChange={e => setForm({ ...form, refreshToken: e.target.value })} placeholder="Không bắt buộc" /></label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Kích hoạt kết nối</label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-primary">Lưu kết nối Zalo</button>
            {connection.connected && <button type="button" className="rounded-xl bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100" onClick={deleteConnection}><Trash2 className="inline" size={16} /> Xóa kết nối</button>}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <b>Lưu ý:</b> Bản local hiện đang ghi log demo để tránh gửi nhầm tin thật. Khi có OA thật và quyền API đầy đủ, chỉ cần bật adapter gọi API Zalo trong backend mà không đổi database hay giao diện.
          </div>
        </form>

        <form onSubmit={sendTest} className="card h-fit space-y-4">
          <h2 className="font-black">Gửi thử tin nhắn</h2>
          <label className="space-y-1 block"><span className="text-sm font-bold text-slate-700">SĐT phụ huynh</span><input className="input" value={test.parentPhone} onChange={e => setTest({ ...test, parentPhone: e.target.value })} placeholder="090..." required /></label>
          <label className="space-y-1 block"><span className="text-sm font-bold text-slate-700">Nội dung</span><textarea className="input min-h-28" value={test.content} onChange={e => setTest({ ...test, content: e.target.value })} required /></label>
          <button className="btn-primary flex items-center gap-2"><Send size={17} /> Gửi thử</button>
        </form>
      </div>

      <div className="card">
        <h2 className="mb-3 font-black">Log tin nhắn gần đây</h2>
        <div className="space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
              <div className="flex flex-col justify-between gap-1 sm:flex-row"><b>{m.parentPhone}</b><span className="text-xs font-bold text-emerald-700">{m.status}</span></div>
              <p className="text-slate-600">{m.content}</p>
              <p className="mt-1 text-xs text-slate-400">{m.student?.fullName ? `${m.student.fullName} · ` : ''}{new Date(m.createdAt).toLocaleString('vi-VN')}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-slate-500">Chưa có log tin nhắn.</p>}
        </div>
      </div>
    </div>
  );
}
