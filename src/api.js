import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: BASE_URL });

const store = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => (v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v)),
};

export const saveSession = (d = {}) => {
  if (d.accessToken) store.set('accessToken', d.accessToken);
  if (d.refreshToken) store.set('refreshToken', d.refreshToken);
  if (d.csrfToken) store.set('csrfToken', d.csrfToken);
};
export const clearSession = () => {
  ['accessToken', 'refreshToken', 'csrfToken', 'user'].forEach((k) => localStorage.removeItem(k));
};

api.interceptors.request.use((cfg) => {
  const t = store.get('accessToken');
  if (t && !cfg.skipAuth) cfg.headers.Authorization = `Bearer ${t}`;
  const c = store.get('csrfToken');
  if (c && !cfg.skipAuth) cfg.headers['x-csrf-token'] = c;
  return cfg;
});

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { response, config } = err;
    if (response?.status === 401 && config && !config._retry && !config.skipAuth && store.get('refreshToken')) {
      config._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${BASE_URL}/auth/refreshToken`, { refreshToken: store.get('refreshToken') });
        const res = await refreshing;
        refreshing = null;
        const token = res.data?.data?.accessToken;
        if (!token) throw new Error('no token');
        store.set('accessToken', token);
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      } catch (e) {
        refreshing = null;
        clearSession();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Something went wrong';

/* ---------- response helpers (backend shapes ke liye defensive) ---------- */
export const payload = (res) => res?.data?.data ?? res?.data;

export const listOf = (res, keys = []) => {
  const d = payload(res);
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') {
    for (const k of [...keys, 'items', 'docs', 'results', 'rows', 'list']) if (Array.isArray(d[k])) return d[k];
    const first = Object.values(d).find(Array.isArray);
    if (first) return first;
  }
  const top = res?.data;
  if (top && typeof top === 'object') {
    for (const k of keys) if (Array.isArray(top[k])) return top[k];
    const first = Object.values(top).find(Array.isArray);
    if (first) return first;
  }
  return [];
};

export const totalOf = (res, fallback = 0) => {
  const d = payload(res) || {};
  const t = res?.data || {};
  return (
    d.total ?? d.totalCount ?? d.count ?? d.pagination?.total ?? d.meta?.total ??
    t.total ?? t.totalCount ?? t.pagination?.total ?? fallback
  );
};

export const labelOf = (o) =>
  o?.label || o?.name || o?.title || o?.username || o?.email || o?.permissionKey || o?.key || o?._id || String(o);
export const idOf = (o) => o?._id || o?.id || o?.value || o;
export const fullName = (u) =>
  [u?.personalInfo?.firstName, u?.personalInfo?.lastName].filter(Boolean).join(' ') || u?.username || '-';
export const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '-');
export const money = (n) => (n == null || n === '' ? '-' : '$' + Number(n).toLocaleString());
