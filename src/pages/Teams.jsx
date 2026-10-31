import React, { useCallback, useEffect, useState } from 'react';
import { api, listOf, totalOf, payload, idOf, labelOf, fullName, fmtDate } from '../api.js';
import { PageHead, Spinner, Empty, Pager, Modal, Field, Badge, useAction, confirmDo } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

const LIMIT = 20;

export default function Teams() {
  const { can } = useAuth();
  const { run, busy } = useAction();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [team, setTeam] = useState(null); // members modal data
  const [pick, setPick] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    await run(async () => {
      const r = await api.post('/team/getAll', { filters: { rules: [] }, sort: { createdAt: -1 }, page, limit: LIMIT });
      const list = listOf(r, ['teams']);
      setRows(list);
      setTotal(totalOf(r, list.length));
    });
    setLoading(false);
  }, [page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/user/drd').then((r) => setUsers(listOf(r, ['users']))).catch(() => {}); }, []);

  const userLabel = (u) => (u?.personalInfo ? `${fullName(u)} (${u.username || ''})` : labelOf(u));
  const close = () => setModal(null);

  const save = async () => {
    const d = modal.data;
    const body = { name: d.name, managerId: d.managerId || null };
    const ok = await run(async () => {
      if (modal.type === 'create') await api.post('/team/create', body);
      else await api.put(`/team/update/${modal.team._id}`, body);
    }, 'Team save ho gayi');
    if (ok) { close(); load(); }
  };

  const openMembers = async (t) => {
    await run(async () => {
      const r = await api.get(`/team/get/${t._id}`);
      const d = payload(r);
      setTeam(d?.team || d);
      setPick('');
    });
  };

  const members = team?.members || team?.users || [];
  const refreshTeam = async () => { const r = await api.get(`/team/get/${team._id}`); const d = payload(r); setTeam(d?.team || d); load(); };

  const addMember = () => pick && run(async () => {
    await api.put(`/team/members/${team._id}/add`, { userIds: [pick] });
    setPick('');
    await refreshTeam();
  }, 'Member add ho gaya');

  const removeMember = (id) => run(async () => {
    await api.put(`/team/members/${team._id}/remove`, { userIds: [id] });
    await refreshTeam();
  }, 'Member remove ho gaya');

  const del = (t) => confirmDo(`Team "${t.name}" delete karni hai?`) &&
    run(async () => { await api.delete(`/team/delete/${t._id}`, { data: {} }); load(); }, 'Team deleted');

  return (
    <>
      <PageHead title="Teams" sub="Users ko teams mein organize karein">
        {can('add_team') && <button className="btn primary" onClick={() => setModal({ type: 'create', data: { name: '', managerId: '' } })}>+ New team</button>}
      </PageHead>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Manager</th><th>Members</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t._id}>
                  <td><b>{t.name}</b></td>
                  <td>{t.manager ? userLabel(t.manager) : '-'}</td>
                  <td><Badge tone="blue">{t.memberCount ?? 0}</Badge></td>
                  <td>{fmtDate(t.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn sm" onClick={() => openMembers(t)}>Members</button>
                      {can('edit_team') && <button className="btn sm" onClick={() => setModal({ type: 'edit', team: t, data: { name: t.name, managerId: t.manager?._id || t.managerId || '' } })}>Edit</button>}
                      {can('delete_team') && <button className="btn sm danger" onClick={() => del(t)}>Delete</button>}
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
        <Modal title={modal.type === 'create' ? 'New team' : `Edit ${modal.team.name}`} onClose={close}
          footer={<><button className="btn" onClick={close}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>Save</button></>}>
          <Field label="Team name"><input value={modal.data.name} onChange={(e) => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })} /></Field>
          <Field label="Manager" hint="Team manager 'team' scope waale leads dekh sakta hai">
            <select value={modal.data.managerId} onChange={(e) => setModal({ ...modal, data: { ...modal.data, managerId: e.target.value } })}>
              <option value="">— no manager —</option>
              {users.map((u) => <option key={idOf(u)} value={idOf(u)}>{userLabel(u)}</option>)}
            </select>
          </Field>
        </Modal>
      )}

      {team && (
        <Modal wide title={`Members — ${team.name}`} onClose={() => setTeam(null)}>
          {can('edit_team') && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <select value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Select user to add…</option>
                {users.filter((u) => !members.some((m) => idOf(m) === idOf(u))).map((u) => <option key={idOf(u)} value={idOf(u)}>{userLabel(u)}</option>)}
              </select>
              <button className="btn primary" disabled={!pick || busy} onClick={addMember} style={{ flex: '0 0 auto' }}>Add</button>
            </div>
          )}
          {members.length === 0 ? <Empty text="Is team mein koi member nahi" /> : (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th></th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m._id}>
                    <td>{fullName(m)}</td><td>{m.email}</td>
                    <td>{can('edit_team') && <button className="btn sm danger" onClick={() => removeMember(m._id)}>Remove</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </>
  );
}
