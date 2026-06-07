import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RefreshCw, Wrench } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api, API_BASE_URL } from '../api/client';

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState('Đang kiểm tra máy chủ...');
  const [debugText, setDebugText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [repairing, setRepairing] = useState(false);

  async function checkServer() {
    setServerStatus('Đang kiểm tra máy chủ...');
    setDebugText('');
    try {
      const health = await api.get('/health');
      const debug = await api.get('/auth/debug');
      setServerStatus(health.data?.status === 'ok' ? 'Máy chủ đã kết nối' : 'Máy chủ phản hồi không rõ');
      setDebugText(`DB: ${debug.data?.database || 'unknown'} | Admin: ${debug.data?.adminExists ? 'có' : 'chưa có'} | Users: ${debug.data?.userCount ?? 0}`);
    } catch (err: any) {
      const status = err.response?.status ? `HTTP ${err.response.status}` : 'Không có phản hồi';
      const message = err.response?.data?.message || err.message || 'Không rõ lỗi';
      setServerStatus(`Chưa kết nối được backend (${status}). ${message}`);
    }
  }

  useEffect(() => { checkServer(); }, []);

  async function clearAppCache() {
    localStorage.removeItem('fam_token');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (cacheError) {
      console.warn('Không thể xóa toàn bộ cache PWA:', cacheError);
    }
    window.location.reload();
  }

  async function repairDemoAccount() {
    setRepairing(true);
    setError('');
    try {
      const res = await api.post('/auth/reset-demo');
      setDebugText(res.data?.message || 'Đã sửa tài khoản demo');
      setEmail('admin@demo.com');
      setPassword('Admin@123');
      await checkServer();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không sửa được tài khoản demo');
    } finally {
      setRepairing(false);
    }
  }

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/');
    } catch (err: any) {
      if (!err.response) {
        setError(`Không kết nối được máy chủ backend qua ${API_BASE_URL}. Mở thử ${API_BASE_URL === '/api' ? '/api/health' : `${API_BASE_URL}/health`}.`);
      } else {
        setError(err.response?.data?.message || err.response?.data?.hint || 'Không đăng nhập được');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_40%),linear-gradient(135deg,#052e16,#0f172a)] p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-emerald-700 to-orange-400 p-5 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-50">CLB MM QUY NHƠN</p>
          <h1 className="text-3xl font-black">Football Manager Pro</h1>
          <p className="mt-2 text-sm text-emerald-50">Giao diện CLB MM Quy Nhơn: xanh lá cây chủ đạo, cam năng lượng.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">Mật khẩu</label>
            <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">Trạng thái:</span>
              <button type="button" onClick={checkServer} className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-bold shadow-sm">
                <RefreshCw size={12} /> Kiểm tra lại
              </button>
            </div>
            <p className="mt-1">{serverStatus}</p>
            {debugText && <p className="mt-1 font-bold text-emerald-700">{debugText}</p>}
            <p className="mt-1 break-all text-slate-400">API: {API_BASE_URL}</p>
            <p className="mt-1 text-slate-400">Mở thử: {API_BASE_URL === '/api' ? '/api/health' : `${API_BASE_URL}/health`}</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              <div>{error}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={clearAppCache} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm">
                  Xóa cache app
                </button>
                <button type="button" onClick={repairDemoAccount} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm">
                  <Wrench size={12} /> Sửa tài khoản demo
                </button>
              </div>
            </div>
          )}

          <button disabled={submitting} className="btn-primary w-full py-3">{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          <button type="button" disabled={repairing} onClick={repairDemoAccount} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">
            {repairing ? 'Đang sửa tài khoản demo...' : 'Tạo lại tài khoản demo'}
          </button>
          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
            <p>Admin: admin@demo.com / Admin@123</p>
            <p>HLV: coach@demo.com / Coach@123</p>
            <p>Phụ huynh: parent@demo.com / Parent@123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
