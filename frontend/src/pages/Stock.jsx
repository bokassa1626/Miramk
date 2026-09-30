import { useMemo, useState } from 'react';
import { SlidersHorizontal, History } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import usePaged from '../hooks/usePaged.js';
import { get, post, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge, SearchBar, StockGauge, Pagination, StatCard } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Select, NumberInput } from '../components/Form.jsx';
import { MOVEMENT_TYPES, label } from '../utils/labels.js';
import { money, qty, dateTime } from '../utils/format.js';

function AdjustModal({ open, onClose, products, onSaved }) {
  const toast = useToast();
  const [productId, setProductId] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const options = products.map((p) => ({ value: p.id, label: `${p.name} (${qty(p.currentStock, p.unit)})` }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await post('/stock/adjust', { productId, delta: Number(delta), reason });
      toast.success('Stock ajusté'); onSaved(); onClose();
      setProductId(''); setDelta(''); setReason('');
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajustement manuel du stock"
      footer={<><button className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" form="adj-form" type="submit" disabled={busy}>Enregistrer</button></>}>
      <form id="adj-form" onSubmit={submit} className="space-y-3">
        <Field label="Produit" htmlFor="adj-p"><Select id="adj-p" value={productId} onChange={setProductId} options={options} placeholder="Choisir un produit…" required /></Field>
        <Field label="Variation (+ ou -)" htmlFor="adj-d" hint="Exemple : -2 pour retirer 2 unités, 5 pour en ajouter 5">
          <NumberInput id="adj-d" required value={delta} onChange={setDelta} min={-1e6} step="0.001" />
        </Field>
        <Field label="Motif" htmlFor="adj-r"><textarea id="adj-r" required minLength={3} className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </form>
    </Modal>
  );
}

function MovementsDrawer({ open, onClose, productId, productName }) {
  const { items, loading, hasNext, hasPrev, next, prev, page } = usePaged('/stock/movements', { productId }, 15);
  return (
    <Modal open={open} onClose={onClose} title={`Mouvements — ${productName || ''}`} size="lg">
      {loading ? <Loading /> : items.length ? (
        <>
          <DataTable columns={[
            { key: 'date', header: 'Date', render: (r) => dateTime(r.createdAt) },
            { key: 'type', header: 'Type', render: (r) => label(MOVEMENT_TYPES, r.type) },
            { key: 'qty', header: 'Quantité', align: 'right', render: (r) => qty(r.quantity, r.unit) },
            { key: 'prev', header: 'Avant', align: 'right', render: (r) => qty(r.previousStock, r.unit) },
            { key: 'new', header: 'Après', align: 'right', render: (r) => qty(r.newStock, r.unit) },
            { key: 'reason', header: 'Motif / référence', render: (r) => r.reason || r.referenceNumber || '—' },
            { key: 'user', header: 'Utilisateur', render: (r) => r.userName },
          ]} rows={items} />
          <Pagination page={page} hasNext={hasNext} hasPrev={hasPrev} onNext={next} onPrev={prev} />
        </>
      ) : <EmptyState title="Aucun mouvement" />}
    </Modal>
  );
}

export default function Stock() {
  const { can } = useAuth();
  const toast = useToast();
  const showCost = can('costs:read');
  const { data, loading, error, reload } = useFetch(() => get('/stock'), []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [drawer, setDrawer] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const items = (data.items || []).filter((p) => (!status || p.status === status) && p.name.toLowerCase().includes(q.toLowerCase()));

  const columns = [
    { key: 'name', header: 'Produit', render: (r) => <span className="font-medium text-steel-800">{r.name}</span> },
    { key: 'cat', header: 'Catégorie', render: (r) => r.categoryName },
    { key: 'stock', header: 'Stock actuel', render: (r) => (
      <div className="flex items-center gap-2"><StockGauge current={r.currentStock} minimum={r.minimumStock} /><span className="whitespace-nowrap text-xs text-steel-600">{qty(r.currentStock, r.unit)}</span></div>
    ) },
    { key: 'min', header: 'Seuil', align: 'right', render: (r) => qty(r.minimumStock, r.unit) },
    showCost && { key: 'value', header: 'Valeur', align: 'right', render: (r) => money(r.value) },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <button className="btn-ghost btn-sm" onClick={() => setDrawer({ id: r.id, name: r.name })}><History className="h-3.5 w-3.5" /> Mouvements</button>
    ) },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader title="Stocks" subtitle={`${items.length} produit(s)`}>
        <Select value={status} onChange={setStatus} options={[{ value: 'NORMAL', label: 'Normal' }, { value: 'STOCK_FAIBLE', label: 'Stock faible' }, { value: 'RUPTURE', label: 'Rupture' }]} placeholder="Tous statuts" className="w-44" />
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher…" className="w-56" />
        {can('stock:adjust') && <button className="btn-secondary" onClick={() => setAdjustOpen(true)}><SlidersHorizontal className="h-4 w-4" /> Ajuster</button>}
      </PageHeader>

      {showCost && data.totals && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Valeur totale du stock" value={money(data.totals.value)} />
          {data.totals.byCategory.slice(0, 3).map((c) => <StatCard key={c.categoryId} label={c.categoryName} value={money(c.value)} />)}
        </div>
      )}

      <div className="card">{items.length ? <DataTable columns={columns} rows={items} /> : <EmptyState title="Aucun produit" />}</div>

      <AdjustModal open={adjustOpen} onClose={() => setAdjustOpen(false)} products={data.items} onSaved={reload} />
      <MovementsDrawer open={!!drawer} onClose={() => setDrawer(null)} productId={drawer?.id} productName={drawer?.name} />
    </div>
  );
}
