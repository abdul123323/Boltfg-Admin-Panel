import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { errMsg } from '../api.js';
import { Field } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (localStorage.getItem('accessToken')) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await login(username, password);
      nav('/');
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>⚡ BoltFG</h1>
        {err && <div className="alert" style={{ background: '#fde4e7', borderColor: '#f3b0b8', color: '#a8202f' }}>{err}</div>}
        <Field label="Username / Email">
          <input value={username} onChange={(e) => setU(e.target.value)} autoFocus required />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setP(e.target.value)} required />
        </Field>
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
      </form>
    </div>
  );
}
