import React, { useCallback, useEffect, useState } from 'react';
import { api, listOf, totalOf, labelOf } from '../api.js';
import { PageHead, Spinner, Empty, Pager, Badge, useAction } from '../components/ui.jsx';

const LIMIT = 50;

export default function Permissions() {
  const { run } = useAction();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await run(async () => {
      const r = await api.post('/permission/getAll', { filters: { rules: [] }, sort: { permissionSequence: 1 }, page, limit: LIMIT });
      const list = listOf(r, ['permissions']);
      setRows(list);
      setTotal(totalOf(r, list.length));
    });
    setLoading(false);
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const key = (p) => p.permissionKey || p.key || p.name || labelOf(p);
  const shown = q ? rows.filter((p) => JSON.stringify(p).toLowerCase().includes(q.toLowerCase())) : rows;

  return (
    <>
      <PageHead title="Permissions" sub="Read-only catalog">
        <input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
      </PageHead>
      {loading ? <Spinner /> : shown.length === 0 ? <Empty /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Permission</th><th>Description</th><th>Roles holding it</th></tr></thead>
            <tbody>
              {shown.map((p, i) => (
                <tr key={p._id || key(p)}>
                  <td>{p.permissionSequence ?? i + 1}</td>
                  <td className="mono">{key(p)}</td>
                  <td className="wrap">{p.description || p.label || '-'}</td>
                  <td className="wrap">
                    {(p.roles || []).length === 0 ? '-' : (p.roles || []).map((r) => <Badge key={r._id || r} tone="blue">{r.name || r}</Badge>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} limit={LIMIT} total={total} onPage={setPage} />
    </>
  );
}
