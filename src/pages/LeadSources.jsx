import React, { useCallback, useEffect, useState } from 'react';
import { api, payload, listOf, totalOf, fmtDate, BASE_URL } from '../api.js';
import { PageHead, Spinner, Empty, Pager, Modal, Field, Badge, useAction, confirmDo } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

const LIMIT = 20;
const blank = { name: '', provider: 'unbounce', landingPageUrl: '', campaign: '', fieldMapping: '{\n  \n}' };

export default function LeadSources() {
  const { can } = useAuth();
  const { run, busy } = useAction();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // {mode:'create'|'edit', id, data}
  const [secret, setSecret] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rules = provider ? [{ field: 'provider', op: 'eq', data: provider }] : [];
    await run(async () => {
      const r = await api.post('/leadSource/getAll', { filters: { rules }, sort: { createdAt: -1 }, page, limit: LIMIT });
      const list = listOf(r, ['leadSources', 'sources']);
      setRows(list);
      setTotal(totalOf(r, list.length));
    });
    setLoading(false);
  }, [page, provider]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (s) => setForm({
    mode: 'edit', id: s._id,
    data: { name: s.name || '', provider: s.provider, landingPageUrl: s.landingPageUrl || '', campaign: s.campaign || '',
      fieldMapping: JSON.stringify(s.fieldMapping || {}, null, 2) },
  });

  const save = async () => {
    let mapping;
    try { mapping = JSON.parse(form.data.fieldMapping || '{}'); } catch { return run(async () => { throw new Error('Field mapping valid JSON nahi hai'); }); }
    const body = { name: form.data.name, landingPageUrl: form.data.landingPageUrl, campaign: form.data.campaign, fieldMapping: mapping };
    if (form.mode === 'create') body.provider = form.data.provider;
    const ok = await run(async () => {
      const r = form.mode === 'create'
        ? await api.post('/leadSource/create', body)
        : await api.put(`/leadSource/update/${form.id}`, body);
      if (form.mode === 'create') setSecret(payload(r));
    }, form.mode === 'create' ? 'Lead source ban gaya' : 'Update ho gaya');
    if (ok) { setForm(null); load(); }
  };

  const toggle = (s) => run(async () => {
    await api.put(`/leadSource/update/${s._id}`, { isActive: !s.isActive });
    load();
  }, s.isActive ? 'Disabled' : 'Enabled');

  const del = (s) => confirmDo(`"${s.name}" delete karna hai? Webhook band ho jayega.`) &&
    run(async () => { await api.delete(`/leadSource/delete/${s._id}`, { data: {} }); load(); }, 'Deleted');

  const setD = (k) => (e) => setForm({ ...form, data: { ...form.data, [k]: e.target.value } });
  const origin = BASE_URL.startsWith('http') ? '' : window.location.origin;

  return (
    <>
      <PageHead title="Lead Sources" sub=" landing page URL">
        <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} style={{ width: 160 }}>
          <option value="">All providers</option>
          <option value="unbounce">Unbounce</option>
          <option value="instapage">Instapage</option>
        </select>
        {can('add_lead_source') && <button className="btn primary" onClick={() => setForm({ mode: 'create', data: blank })}>+ New source</button>}
      </PageHead>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Provider</th><th>Campaign</th><th>Source key</th><th>Status</th><th>Last delivery</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s._id}>
                  <td><b>{s.name}</b><br /><small style={{ color: 'var(--mute)' }}>{s.landingPageUrl}</small></td>
                  <td><Badge tone="blue">{s.provider}</Badge></td>
                  <td>{s.campaign || '-'}</td>
                  <td className="mono">{s.sourceKey}</td>
                  <td><Badge tone={s.isActive === false ? 'red' : 'green'}>{s.isActive === false ? 'Disabled' : 'Active'}</Badge></td>
                  <td>{s.lastDelivery?.at || s.lastDelivery?.receivedAt ? <>{fmtDate(s.lastDelivery.at || s.lastDelivery.receivedAt)} <Badge tone={s.lastDelivery.success === false ? 'red' : 'green'}>{s.lastDelivery.success === false ? 'failed' : 'ok'}</Badge></> : '-'}</td>
                  <td>
                    <div className="row-actions">
                      {can('edit_lead_source') && <button className="btn sm" onClick={() => openEdit(s)}>Edit</button>}
                      {can('edit_lead_source') && <button className="btn sm" onClick={() => toggle(s)}>{s.isActive === false ? 'Enable' : 'Disable'}</button>}
                      {can('delete_lead_source') && <button className="btn sm danger" onClick={() => del(s)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} limit={LIMIT} total={total} onPage={setPage} />

      {form && (
        <Modal title={form.mode === 'create' ? 'New lead source' : 'Edit lead source'} onClose={() => setForm(null)}
          footer={<><button className="btn" onClick={() => setForm(null)}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>Save</button></>}>
          <Field label="Name"><input value={form.data.name} onChange={setD('name')} /></Field>
          <Field label="Provider">
            <select value={form.data.provider} onChange={setD('provider')} disabled={form.mode === 'edit'}>
              <option value="unbounce">Unbounce</option>
              <option value="instapage">Instapage</option>
            </select>
          </Field>
          <Field label="Landing page URL"><input value={form.data.landingPageUrl} onChange={setD('landingPageUrl')} /></Field>
          <Field label="Campaign"><input value={form.data.campaign} onChange={setD('campaign')} /></Field>
          <Field label="Field mapping (JSON)" hint='Form field -> email, firstName, lastName, fullName, phone, businessName. e.g. {"legal_business_name":"businessName"}'>
            <textarea value={form.data.fieldMapping} onChange={setD('fieldMapping')} />
          </Field>
        </Modal>
      )}

      {secret && (
        <Modal title="Webhook details" onClose={() => setSecret(null)}>
          <div className="alert">Webhook secret  <b></b></div>
          <b>Webhook URL</b>
          <div className="copy-box">{(secret.webhookPath || '').startsWith('http') ? secret.webhookPath : `${origin || ''}${secret.webhookPath || ''}`}</div>
          <b>Webhook secret / token</b>
          <div className="copy-box">{secret.webhookSecret}</div>
          <b>Source key</b>
          <div className="copy-box">{secret.sourceKey}</div>
          <button className="btn" onClick={() => navigator.clipboard?.writeText(`${secret.webhookPath}`)}>Copy URL</button>
        </Modal>
      )}
    </>
  );
}
