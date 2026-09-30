import { useState } from 'react';
import usePaged from '../hooks/usePaged.js';
import { PageHeader, Loading, ErrorState, EmptyState, Pagination, Badge } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { Select, DateRange } from '../components/Form.jsx';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../utils/labels.js';
import { dateTime, todayISO, shiftDay } from '../utils/format.js';

const ACTION_COLOR = { CREATE: 'green', VALIDATE: 'green', SALE: 'green', PURCHASE: 'blue', UPDATE: 'blue', STOCK_ADJUSTMENT: 'amber', EXPENSE: 'blue', CANCEL: 'red', DELETE: 'red', LOGIN: 'gray', LOGOUT: 'gray' };

export default function Audit() {
  const [range, setRange] = useState({ from: shiftDay(todayISO(), -7), to: todayISO() });
  const [action, setAction] = useState('');
  const [module, setModule] = useState('');
  const { items, loading, error, reload, page, hasNext, hasPrev, next, prev } = usePaged('/audit', { from: range.from, to: range.to, action, module }, 25);
  const [detail, setDetail] = useState(null);

  const columns = [
    { key: 'date', header: 'Date', render: (r) => dateTime(r.createdAt) },
    { key: 'user', header: 'Utilisateur', render: (r) => r.userName },
    { key: 'action', header: 'Action', render: (r) => <Badge color={ACTION_COLOR[r.action] || 'gray'}>{r.action}</Badge> },
    { key: 'module', header: 'Module', render: (r) => r.module },
    { key: 'desc', header: 'Description', render: (r) => r.description },
    { key: 'ip', header: 'IP', render: (r) => <span className="font-mono text-xs text-steel-400">{r.ipAddress || '—'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Audit" subtitle="Journal complet des opérations — lecture seule, non modifiable">
        <DateRange from={range.from} to={range.to} onChange={setRange} />
        <Select value={action} onChange={setAction} options={AUDIT_ACTIONS} placeholder="Toutes actions" className="w-44" />
        <Select value={module} onChange={setModule} options={AUDIT_MODULES} placeholder="Tous modules" className="w-40" />
      </PageHeader>
      <div className="card">
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : items.length ? (
          <><DataTable columns={columns} rows={items} onRowClick={setDetail} /><Pagination page={page} hasNext={hasNext} hasPrev={hasPrev} onNext={next} onPrev={prev} /></>
        ) : <EmptyState title="Aucune entrée pour ces filtres" />}
      </div>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Détail de l'entrée d'audit" footer={<button className="btn-secondary" onClick={() => setDetail(null)}>Fermer</button>}>
        {detail && (
          <div className="space-y-3 text-sm">
            <p><span className="text-steel-500">Date :</span> {dateTime(detail.createdAt)}</p>
            <p><span className="text-steel-500">Utilisateur :</span> {detail.userName} ({detail.role})</p>
            <p><span className="text-steel-500">Action :</span> {detail.action} — {detail.module}</p>
            <p><span className="text-steel-500">Description :</span> {detail.description}</p>
            {detail.oldData && <div><p className="text-steel-500">Avant :</p><pre className="mt-1 max-h-40 overflow-auto rounded bg-steel-50 p-2 text-xs">{JSON.stringify(detail.oldData, null, 2)}</pre></div>}
            {detail.newData && <div><p className="text-steel-500">Après :</p><pre className="mt-1 max-h-40 overflow-auto rounded bg-steel-50 p-2 text-xs">{JSON.stringify(detail.newData, null, 2)}</pre></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
