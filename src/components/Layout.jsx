import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { fullName } from '../api.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/leads', label: 'Leads', icon: '☰', perm: 'view_leads' },
  { to: '/lead-sources', label: 'Lead Sources', icon: '⚡', perm: 'view_lead_sources' },
  { to: '/users', label: 'Users', icon: '☺', perm: 'view_users' },
  { to: '/roles', label: 'Roles', icon: '⚑', perm: 'view_roles' },
  { to: '/teams', label: 'Teams', icon: '⚇', perm: 'view_teams' },
  { to: '/permissions', label: 'Permissions', icon: '🔑', perm: 'manage_permissions' },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="clock" title={Intl.DateTimeFormat().resolvedOptions().timeZone}>
      <b>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</b>
      <small>{now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</small>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };
  return (
    <button className="theme-btn" onClick={toggle} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} aria-label="Toggle theme">
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

export default function Layout() {
  const { user, can, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1'); // desktop
  const u = user?.user || user;
  const current = NAV.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));

  const toggleMenu = () => {
    if (window.innerWidth <= 900) {
      setOpen((o) => !o);
    } else {
      setCollapsed((c) => {
        localStorage.setItem('sidebarCollapsed', c ? '0' : '1');
        return !c;
      });
    }
  };

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand"><span className="logo">⚡</span><span className="brand-text"> BoltFG</span></div>
        <nav onClick={() => setOpen(false)}>
          {NAV.filter((n) => can(n.perm)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} title={n.label} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ico">{n.icon}</span><span className="lbl">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="me">
            <div className="avatar" title={fullName(u)}>{(fullName(u) || '?')[0]?.toUpperCase()}</div>
            <div className="me-info">
              <b>{fullName(u)}</b>
              <small>{u?.role?.name || u?.email || ''}</small>
            </div>
          </div>
          <button className="btn block" title="Logout" onClick={async () => { await logout(); nav('/login'); }}>
            <span className="logout-ico">⎋</span><span className="lbl">Logout</span>
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <div className="left">
            <button className="icon-btn menu" onClick={toggleMenu} aria-label="Toggle sidebar" title="Sidebar collapse / expand">☰</button>
            <span className="title">{current?.label || 'BoltFG CRM'}</span>
          </div>
          <div className="right">
            <Clock />
            <ThemeToggle />
            <div className="user-chip">
              <div className="avatar">{(fullName(u) || '?')[0]?.toUpperCase()}</div>
              <span>{fullName(u)}</span>
            </div>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
