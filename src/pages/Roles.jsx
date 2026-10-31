import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, listOf, totalOf, payload, idOf, labelOf, fmtDate } from '../api.js';
import { PageHead, Spinner, Empty, Pager, Modal, Field, Badge, useAction, confirmDo } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

const LIMIT = 20;
const blank = { name: '', level: 50, type: 'user', dataScope: 'own' };

export default function Roles() {
  const { can, reloadPerms } = useAuth();
  const { run, busy } = useAction();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [allPerms, setAllPerms] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    await run(async () => {
      const r = await api.post('/role/getAll', { filters: { rules: [] }, sort: { createdAt: -1 }, page, limit: LIMIT });
      const list = listOf(r, ['roles']);
      setRows(list);
      setTotal(totalOf(r, list.length));
    });
    setLoading(false);
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const permKey = (p) => (typeof p === 'string' ? p : p.permissionKey || p.key || p.name || p.value);
  const groups = useMemo(() => {
    const g = {};
    allPerms.forEach((p) => {
      const k = permKey(p);
      if (!k) return;
      const grp = (typeof p === 'object' && (p.group || p.module || p.category)) || k.split('_').slice(1).join(' ') || 'general';
      (g[grp] = g[grp] || []).push(k);
    });
    return g;
  }, [allPerms]);

  const setD = (k) => (e) => setModal({ ...modal, data: { ...modal.data, [k]: e.target.value } });
  const close = () => setModal(null);

  const save = async () => {
    const d = { ...modal.data, level: Number(modal.data.level) };
    const ok = await run(async () => {
      if (modal.type === 'create') await api.post('/role/create', { ...d, permissions: [] });
      else await api.put(`/role/update/${modal.role._id}`, d);
    }, 'Role save ho gaya');
    if (ok) { close(); load(); reloadPerms(); }
  };

  const openPerms = async (role) => {
    await run(async () => {
      const [pr, rr] = await Promise.all([api.get('/permission/getAll/drd'), api.get(`/role/get/${role._id}`)]);
      setAllPerms(listOf(pr, ['permissions']));
      const rd = payload(rr);
      const cur = (rd?.role || rd)?.permissions || role.permissions || [];
      setSelected(new Set(cur.map(permKey)));
      setModal({ type: 'perms', role });
    });
  };

  const toggle = (k) => setSelected((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleGroup = (keys, on) => setSelected((s) => { const n = new Set(s); keys.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });

  const savePerms = async () => {
    const ok = await run(() => api.patch(`/role/permissions/${modal.role._id}/add`, { permissions: [...selected] }), 'Permissions update ho gaye');
    if (ok) { close(); load(); reloadPerms(); }
  };

  const del = (r) => confirmDo(`Role "${r.name}" delete karna hai?`) &&
    run(async () => { await api.delete(`/role/delete/${r._id}`, { data: {} }); load(); }, 'Role deleted');

  return (
    <>
      <PageHead title="Roles" >
        {can('add_role') && <button className="btn primary" onClick={() => setModal({ type: 'create', data: blank })}>+ New role</button>}
      </PageHead>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Level</th><th>Type</th><th>Data scope</th><th>Permissions</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td><b>{r.name}</b></td>
                  <td>{r.level}</td>
                  <td><Badge tone={r.type === 'admin' ? 'red' : r.type === 'developer' ? 'amber' : 'blue'}>{r.type}</Badge></td>
                  <td>{r.dataScope || 'own'}</td>
                  <td>{r.permissions?.length ?? '-'}</td>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      {can('edit_role') && <button className="btn sm" onClick={() => setModal({ type: 'edit', role: r, data: { name: r.name, level: r.level, type: r.type, dataScope: r.dataScope || 'own' } })}>Edit</button>}
                      {can('manage_permissions') && <button className="btn sm" onClick={() => openPerms(r)}>Permissions</button>}
                      {can('delete_role') && <button className="btn sm danger" onClick={() => del(r)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} limit={LIMIT} total={total} onPage={setPage} />

      {modal && modal.type !== 'perms' && (
        <Modal title={modal.type === 'create' ? 'New role' : `Edit ${modal.role.name}`} onClose={close}
          footer={<><button className="btn" onClick={close}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>Save</button></>}>
          <Field label="Name" hint="Unique hona chahiye"><input value={modal.data.name} onChange={setD('name')} /></Field>
          <div className="grid2">
            <Field label="Level" hint="Unique number"><input type="number" value={modal.data.level} onChange={setD('level')} /></Field>
            <Field label="Type">
              <select value={modal.data.type} onChange={setD('type')}>
                <option value="user">user</option><option value="developer">developer</option><option value="admin">admin</option>
              </select>
            </Field>
          </div>
          <Field label="Data scope" hint="Role kin records ko dekh sakta hai">
            <select value={modal.data.dataScope} onChange={setD('dataScope')}>
              <option value="own">own</option><option value="team">team</option><option value="all">all</option>
            </select>
          </Field>
        </Modal>
      )}

      {modal?.type === 'perms' && (
        <Modal wide title={`Permissions — ${modal.role.name}`} onClose={close}
          footer={<><span style={{ marginRight: 'auto', color: 'var(--mute)' }}>{selected.size} selected</span><button className="btn" onClick={close}>Cancel</button><button className="btn primary" disabled={busy} onClick={savePerms}>Save permissions</button></>}>
          {Object.keys(groups).length === 0 ? <Empty text="Permissions load nahi huin" /> : (
            <div className="perm-groups">
              {Object.entries(groups).map(([g, keys]) => (
                <div key={g} style={{ marginBottom: 12 }}>
                  <label className="check"><input type="checkbox" checked={keys.every((k) => selected.has(k))} onChange={(e) => toggleGroup(keys, e.target.checked)} /><b style={{ textTransform: 'capitalize' }}>{g}</b></label>
                  {keys.map((k) => (
                    <label className="check" key={k} style={{ marginLeft: 18 }}>
                      <input type="checkbox" checked={selected.has(k)} onChange={() => toggle(k)} />{k}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
