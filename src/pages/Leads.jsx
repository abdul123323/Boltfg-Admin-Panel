import React, { useCallback, useEffect, useState } from 'react';
import { api, payload, listOf, totalOf, errMsg, fmtDate, money, fullName, labelOf, idOf } from '../api.js';
import { PageHead, Spinner, Empty, Pager, Modal, Badge, useToast } from '../components/ui.jsx';
import { statusTone } from './Dashboard.jsx';

const pretty = (s) => String(s || '-').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const LIMIT = 25;
const blank = { search: '', status: '', assignedTo: '', state: '', provider: '', sourceId: '', minRequestedAmount: '', maxRequestedAmount: '', createdFrom: '', createdTo: '' };

function buildFilters(f) {
  const out = {};
  Object.entries(f).forEach(([k, v]) => {
    if (v === '' || v == null) return;
    out[k] = k.includes('RequestedAmount') ? Number(v) : v;
  });
  return out;
}

export default function Leads() {
  const toast = useToast();
  const [f, setF] = useState(blank);
  const [applied, setApplied] = useState(blank);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.post('/lead/statusCounts', { filters: {} }).then((r) => {
      const d = payload(r) || {};
      const src = d.counts ?? d.statuses ?? d.byStatus ?? d;
      const keys = Array.isArray(src) ? src.map((x) => x.status ?? x._id) : Object.keys(src).filter((k) => k !== 'total');
      setStatuses(keys.filter(Boolean));
    }).catch(() => {});
    api.post('/leadSource/getAll', { filters: { rules: [] }, page: 1, limit: 100 })
      .then((r) => setSources(listOf(r))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.post('/lead/getAll', { filters: buildFilters(applied), sortBy, sortOrder, page, limit: LIMIT });
      const list = listOf(r, ['leads']);
      setRows(list);
      setTotal(totalOf(r, list.length));
    } catch (e) { toast(errMsg(e), 'err'); }
    finally { setLoading(false); }
  }, [applied, sortBy, sortOrder, page]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const apply = (e) => { e?.preventDefault(); setPage(1); setApplied(f); };
  const reset = () => { setF(blank); setApplied(blank); setPage(1); };

  const openDetail = async (id) => {
    try { const r = await api.get(`/lead/get/${id}`); const d = payload(r); setDetail(d?.lead || d); }
    catch (e) { toast(errMsg(e), 'err'); }
  };

  const sortHead = (key, label) => (
    <th style={{ cursor: 'pointer' }} onClick={() => { if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortOrder('desc'); } }}>
      {label}{sortBy === key ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <>
      <PageHead title="Leads" sub="Landing pages se aaye hue leads" />
      <form className="card" onSubmit={apply} style={{ marginBottom: 16 }}>
        <div className="filters">
          <input placeholder="Search name, business, email, phone, lead #" value={f.search} onChange={set('search')} style={{ flexBasis: 280 }} />
          <select value={f.status} onChange={set('status')}>
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
          </select>
          <select value={f.assignedTo} onChange={set('assignedTo')}>
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <select value={f.sourceId} onChange={set('sourceId')}>
            <option value="">All sources</option>
            {sources.map((s) => <option key={idOf(s)} value={idOf(s)}>{labelOf(s)}</option>)}
          </select>
          <select value={f.provider} onChange={set('provider')}>
            <option value="">All providers</option>
            <option value="unbounce">Unbounce</option>
            <option value="instapage">Instapage</option>
          </select>
        </div>
        <div className="filters" style={{ marginBottom: 0 }}>
          <input placeholder="State (e.g. NY)" value={f.state} onChange={set('state')} />
          <input type="number" placeholder="Min amount" value={f.minRequestedAmount} onChange={set('minRequestedAmount')} />
          <input type="number" placeholder="Max amount" value={f.maxRequestedAmount} onChange={set('maxRequestedAmount')} />
          <input type="date" value={f.createdFrom} onChange={set('createdFrom')} title="Created from" />
          <input type="date" value={f.createdTo} onChange={set('createdTo')} title="Created to" />
          <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
            <button className="btn primary">Apply</button>
            <button type="button" className="btn" onClick={reset}>Reset</button>
          </div>
        </div>
      </form>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {sortHead('leadNumber', 'Lead #')}
                {sortHead('businessName', 'Business')}
                <th>Contact</th><th>Status</th>
                {sortHead('requestedAmount', 'Requested')}
                {sortHead('monthlyRevenue', 'Monthly Rev')}
                <th>Source</th>
                {sortHead('createdAt', 'Created')}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l._id}>
                  <td className="mono">{l.leadNumber ?? '-'}</td>
                  <td>{l.businessName || '-'}</td>
                  <td>{fullName(l) !== '-' && !l.personalInfo ? fullName(l) : [l.firstName, l.lastName].filter(Boolean).join(' ') || l.fullName || '-'}<br /><small style={{ color: 'var(--mute)' }}>{l.email || l.phone}</small></td>
                  <td><Badge tone={statusTone(l.status)}>{pretty(l.status)}</Badge></td>
                  <td>{money(l.requestedAmount)}</td>
                  <td>{money(l.monthlyRevenue)}</td>
                  <td>{l.source?.name || l.provider || '-'}</td>
                  <td>{fmtDate(l.createdAt)}</td>
                  <td><button className="btn sm" onClick={() => openDetail(l._id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} limit={LIMIT} total={total} onPage={setPage} />

      {detail && (
        <Modal title={`Lead ${detail.leadNumber ?? ''}`} wide onClose={() => setDetail(null)}>
          <LeadDetail d={detail} />
        </Modal>
      )}
    </>
  );
}

function LeadDetail({ d }) {
  const simple = Object.entries(d).filter(([, v]) => v == null || typeof v !== 'object');
  const complex = Object.entries(d).filter(([, v]) => v && typeof v === 'object');
  return (
    <>
      <dl className="kv">
        {simple.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>{k}</dt>
            <dd>{/At$/.test(k) && v ? fmtDate(v) : String(v ?? '-')}</dd>
          </React.Fragment>
        ))}
      </dl>
      {complex.map(([k, v]) => (
        <div key={k} style={{ marginTop: 14 }}>
          <b>{k}</b>
          <pre>{JSON.stringify(v, null, 2)}</pre>
        </div>
      ))}
    </>
  );
}
