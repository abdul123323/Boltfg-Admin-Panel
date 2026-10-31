import React, { useCallback, useEffect, useState } from 'react';
import { api, listOf, totalOf, fullName, fmtDate, labelOf, idOf } from '../api.js';
import { PageHead, Spinner, Empty, Pager, Modal, Field, Badge, useAction, confirmDo } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

const LIMIT = 20;
const blank = { username: '', email: '', password: '', firstName: '', lastName: '', mobile: '', roleId: '', allowedIps: '' };

export default function Users() {
  const { can, user } = useAuth();
  const me = user?.user || user;
  const { run, busy } = useAction();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [modal, setModal] = useState(null); // {type, user?, data?}

  const load = useCallback(async () => {
    setLoading(true);
    await run(async () => {
      const r = await api.post('/user/getAll', { filters: { rules: [] }, sort: { createdAt: -1 }, page, limit: LIMIT });
      const list = listOf(r, ['users']);
      setRows(list);
      setTotal(totalOf(r, list.length));
    });
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/role/getAll/drd').then((r) => setRoles(listOf(r, ['roles']))).catch(() => {});
  }, []);

  const shown = q ? rows.filter((u) => JSON.stringify([u.username, u.email, fullName(u)]).toLowerCase().includes(q.toLowerCase())) : rows;
  const roleName = (u) => u.role?.name || roles.find((r) => idOf(r) === (u.roleId?._id || u.roleId))?.name || labelOf(roles.find((r) => idOf(r) === u.roleId) || {}) ;
  const setD = (k) => (e) => setModal({ ...modal, data: { ...modal.data, [k]: e.target.value } });
  const close = () => setModal(null);

  const openEdit = (u) => setModal({
    type: 'edit', user: u,
    data: {
      firstName: u.personalInfo?.firstName || '', lastName: u.personalInfo?.lastName || '', mobile: u.personalInfo?.mobile || '',
      roleId: u.role?._id || u.roleId?._id || u.roleId || '', allowedIps: (u.allowedIps || []).join(', '),
    },
  });

  const ips = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const save = async () => {
    const d = modal.data;
    const ok = await run(async () => {
      if (modal.type === 'create') {
        await api.post('/user/create', {
          username: d.username, email: d.email, password: d.password,
          personalInfo: { firstName: d.firstName, lastName: d.lastName, mobile: d.mobile },
          roleId: d.roleId, allowedIps: ips(d.allowedIps),
        });
      } else if (modal.type === 'edit') {
        const body = { personalInfo: { firstName: d.firstName, lastName: d.lastName, mobile: d.mobile }, allowedIps: ips(d.allowedIps) };
        if (d.roleId) body.roleId = d.roleId;
        await api.put(`/user/update/${modal.user._id}`, body);
      } else if (modal.type === 'role') {
        await api.put(`/user/assign_role/${modal.user._id}`, { roleId: d.roleId });
      } else if (modal.type === 'password') {
        await api.put(`/user/change_password/${modal.user._id}`, { new_password: d.new_password });
      }
    }, 'Save ho gaya');
    if (ok) { close(); load(); }
  };

  const del = (u) => confirmDo(`User "${u.username}" delete karna hai?`) &&
    run(async () => { await api.delete(`/user/delete/${u._id}`, { data: {} }); load(); }, 'User deleted');

  const roleSelect = (
    <Field label="Role">
      <select value={modal?.data?.roleId || ''} onChange={setD('roleId')}>
        <option value="">— select —</option>
        {roles.map((r) => <option key={idOf(r)} value={idOf(r)}>{labelOf(r)}</option>)}
      </select>
    </Field>
  );

  return (
    <>
      <PageHead title="Users">
        <input placeholder="Search on this page…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
        {can('add_user') && <button className="btn primary" onClick={() => setModal({ type: 'create', data: blank })}>+ New user</button>}
      </PageHead>

      {loading ? <Spinner /> : shown.length === 0 ? <Empty /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u._id}>
                  <td><b>{fullName(u)}</b></td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td><Badge tone="blue">{roleName(u) || '-'}</Badge></td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      {can('edit_user') && <button className="btn sm" onClick={() => openEdit(u)}>Edit</button>}
                      {can('assign_role') && <button className="btn sm" onClick={() => setModal({ type: 'role', user: u, data: { roleId: u.role?._id || u.roleId || '' } })}>Role</button>}
                      {(can('change_password') || u._id === me?._id) && <button className="btn sm" onClick={() => setModal({ type: 'password', user: u, data: { new_password: '' } })}>Password</button>}
                      {can('delete_user') && u._id !== me?._id && <button className="btn sm danger" onClick={() => del(u)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} limit={LIMIT} total={total} onPage={setPage} />

      {modal && (
        <Modal
          title={{ create: 'New user', edit: `Edit ${modal.user?.username}`, role: `Assign role — ${modal.user?.username}`, password: `Change password — ${modal.user?.username}` }[modal.type]}
          onClose={close}
          footer={<><button className="btn" onClick={close}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>Save</button></>}
        >
          {modal.type === 'create' && (
            <>
              <div className="grid2">
                <Field label="Username"><input value={modal.data.username} onChange={setD('username')} /></Field>
                <Field label="Email"><input type="email" value={modal.data.email} onChange={setD('email')} /></Field>
              </div>
              <Field label="Password"><input type="password" value={modal.data.password} onChange={setD('password')} /></Field>
            </>
          )}
          {(modal.type === 'create' || modal.type === 'edit') && (
            <>
              <div className="grid2">
                <Field label="First name"><input value={modal.data.firstName} onChange={setD('firstName')} /></Field>
                <Field label="Last name"><input value={modal.data.lastName} onChange={setD('lastName')} /></Field>
              </div>
              <Field label="Mobile"><input value={modal.data.mobile} onChange={setD('mobile')} /></Field>
              {roleSelect}
              <Field label="Allowed IPs" hint="Comma separated. Khali = koi pabandi nahi"><input value={modal.data.allowedIps} onChange={setD('allowedIps')} /></Field>
            </>
          )}
          {modal.type === 'role' && roleSelect}
          {modal.type === 'password' && (
            <Field label="New password" hint="Strong password: upper, lower, number, symbol">
              <input type="password" value={modal.data.new_password} onChange={setD('new_password')} />
            </Field>
          )}
        </Modal>
      )}
    </>
  );
}
