import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, saveSession, clearSession, payload } from './api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const extractPerms = (res) => {
  const d = payload(res);
  const arr = Array.isArray(d) ? d : d?.permissions || d?.data || null;
  if (!Array.isArray(arr)) return null;
  return arr.map((p) => (typeof p === 'string' ? p : p?.permissionKey || p?.key || p?.name)).filter(Boolean);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [perms, setPerms] = useState(null); // null = unknown -> sab dikhao
  const [ready, setReady] = useState(false);

  const loadPerms = useCallback(async () => {
    try {
      const res = await api.get('/role/getPermission');
      setPerms(extractPerms(res));
    } catch {
      setPerms(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (localStorage.getItem('accessToken')) await loadPerms();
      setReady(true);
    })();
  }, [loadPerms]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password }, { skipAuth: true });
    const d = payload(res);
    saveSession(d);
    localStorage.setItem('user', JSON.stringify(d));
    setUser(d);
    await loadPerms();
  };

  const logout = async () => {
    try { await api.get('/user/logout'); } catch { /* ignore */ }
    clearSession();
    setUser(null);
    setPerms(null);
  };

  const can = (p) => !p || perms === null || perms.includes(p);

  return (
    <AuthCtx.Provider value={{ user, perms, can, login, logout, ready, reloadPerms: loadPerms }}>
      {children}
    </AuthCtx.Provider>
  );
}
