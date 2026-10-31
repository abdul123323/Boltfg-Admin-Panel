import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { errMsg } from '../api.js';

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setItems((s) => [...s, { id, msg, type }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {items.map((i) => (
          <div key={i.id} className={`toast ${i.type}`}>{i.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Form bits ---------- */
export const Field = ({ label, hint, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

export const Badge = ({ children, tone = 'gray' }) => <span className={`badge ${tone}`}>{children}</span>;

export const Spinner = () => <div className="spinner" />;

export const Empty = ({ text = 'Koi data nahi mila' }) => <div className="empty">{text}</div>;

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

export function Pager({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  return (
    <div className="pager">
      <span>{total ?? 0} records</span>
      <div>
        <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Prev</button>
        <span className="pg">Page {page} / {pages}</span>
        <button className="btn sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next ›</button>
      </div>
    </div>
  );
}

/* ---------- async action helper ---------- */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      if (okMsg) toast(okMsg);
      return r ?? true;
    } catch (e) {
      toast(errMsg(e), 'err');
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

export const confirmDo = (msg) => window.confirm(msg);
