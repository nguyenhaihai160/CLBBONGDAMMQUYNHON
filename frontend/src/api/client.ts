import axios from 'axios';

function normalizeApiUrl(url: string) {
  return url.replace(/\/$/, '');
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return normalizeApiUrl(configured);

  // Quan trọng: mặc định dùng cùng origin /api để Vite/Docker proxy sang backend.
  // Cách này ổn hơn khi mở trên iPhone bằng http://IP_MAY_TINH:5173,
  // vì điện thoại chỉ cần truy cập port 5173, không cần gọi trực tiếp port 4000.
  return '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fam_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
