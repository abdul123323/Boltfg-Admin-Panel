import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, payload, listOf, totalOf, fmtDate, money, fullName } from '../api.js';
import { PageHead, Spinner, Badge } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

const pretty = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function normalizeCounts(d) {
  if (!d) return { map: {}, total: 0 };
  let src = d.counts ?? d.statuses ?? d.byStatus ?? d.statusCounts ?? d;
  const map = {};
  if (Array.isArray(src)) {
    src.forEach((r) => {
      const k = r.status ?? r._id ?? r.key;
      if (k != null) map[k] = r.count ?? r.total ?? 0;
    });
  } else if (src && typeof src === 'object') {
    Object.entries(src).forEach(([k, v]) => {
      if (typeof v === 'number' && k !== 'total') map[k] = v;
      else if (v && typeof v === 'object' && typeof v.count === 'number') map[k] = v.count;
    });
  }
  const total = d.total ?? Object.values(map).reduce((a, b) => a + b, 0);
  return { map, total };
}

export const statusTone = (s) =>
  ({ no_attempt: 'gray', app_out: 'blue', funded: 'green', declined: 'red', dead: 'red' }[s] || 'amber');

export default function Dashboard() {
  const { can } = useAuth();
  const [counts, setCounts] = useState(null);
  const [recent, setRecent] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const body = { filters: { rules: [] }, page: 1, limit: 1 };
    const t = async (key, url, perm) => {
      if (!can(perm)) return;
      try {
        const r = await api.post(url, body);
        setTotals((s) => ({ ...s, [key]: totalOf(r, listOf(r).length) }));
      } catch { /* ignore */ }
    };
    (async () => {
      if (can('view_leads')) {
        try {
          const [c, l] = await Promise.all([
            api.post('/lead/statusCounts', { filters: {} }),
            api.post('/lead/getAll', { filters: {}, sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 8 }),
          ]);
          setCounts(normalizeCounts(payload(c)));
          setRecent(listOf(l, ['leads']));
        } catch { setCounts({ map: {}, total: 0 }); }
      }
      await Promise.all([
        t('users', '/user/getAll', 'view_users'),
        t('roles', '/role/getAll', 'view_roles'),
        t('teams', '/team/getAll', 'view_teams'),
        t('sources', '/leadSource/getAll', 'view_lead_sources'),
      ]);
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  if (loading) return <Spinner />;
  const entries = counts ? Object.entries(counts.map).sort((a, b) => b[1] - a[1]) : [];
  const max = Math.max(1, ...entries.map((e) => e[1]));

  return (
    <>
      <PageHead title="Dashboard" sub=" CRM  overview" />
      <div className="stats">
        {counts && (
          <div className="stat accent"><small>Total Leads</small><b>{counts.total}</b></div>
        )}
        {[['users', 'Users'], ['roles', 'Roles'], ['teams', 'Teams'], ['sources', 'Lead Sources']].map(
          ([k, l]) => totals[k] !== undefined && (
            <div className="stat" key={k}><small>{l}</small><b>{totals[k]}</b></div>
          )
        )}
      </div>

      {counts && (
        <div className="two">
          <div className="card">
            <h3>Leads by status</h3>
            {entries.length === 0 ? <div className="empty">No data</div> : (
              <div className="bars">
                {entries.map(([s, n]) => (
                  <div className="bar-row" key={s}>
                    <span>{pretty(s)}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(n / max) * 100}%` }} /></div>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h3>Recent leads <Link to="/leads" style={{ float: 'right', fontSize: 12.5 }}>View all</Link></h3>
            {recent.length === 0 ? <div className="empty">No leads yet</div> : recent.map((l) => (
              <div key={l._id} style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <b>{l.businessName || fullName(l) || l.email || l.leadNumber}</b>{' '}
                <Badge tone={statusTone(l.status)}>{pretty(l.status || '-')}</Badge>
                <div style={{ color: 'var(--mute)', fontSize: 12.5 }}>
                  {money(l.requestedAmount)} · {fmtDate(l.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
