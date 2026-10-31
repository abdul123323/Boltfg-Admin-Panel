import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import { ToastProvider, Spinner } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import LeadSources from './pages/LeadSources.jsx';
import Users from './pages/Users.jsx';
import Roles from './pages/Roles.jsx';
import Teams from './pages/Teams.jsx';
import Permissions from './pages/Permissions.jsx';
import './styles.css';

const savedTheme = localStorage.getItem('theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);

function Protected({ children }) {
  const { ready } = useAuth();
  if (!ready) return <div className="center"><Spinner /></div>;
  if (!localStorage.getItem('accessToken')) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="lead-sources" element={<LeadSources />} />
        <Route path="users" element={<Users />} />
        <Route path="roles" element={<Roles />} />
        <Route path="teams" element={<Teams />} />
        <Route path="permissions" element={<Permissions />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);
