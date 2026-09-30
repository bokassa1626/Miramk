import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import usePaged from '../hooks/usePaged.js';
import { get, post, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge, Pagination } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Field, Select, NumberInput } from '../components/Form.jsx';
import { LOSS_TYPES, label } from '../utils/labels.js';
import { money, qty, dateTime } from '../utils/format.js';

function NewLossModal({ open, onClose, products, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ productId: '', quantity: '', lossType: 'DAMAGED', reason: '' });
  const [busy, setBusy] = useState(false);
  const options = products.map((p) => ({ value: p.id, label: `${p.name} (${qty(p.currentStock, p.unit)} dispo.)` }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await post('/losses', { ...form, quantity: Number(form.quantity) });
      toast[r.status === 'PENDING' ? 'warning' : 'success'](r.status === 'PENDING' ? 'Perte enregistrée : en attente de validation' : 'Perte enregistrée');
      onSaved(); onClose(); setForm({ productId: '', quantity: '', lossType: 'DAMAGED', reason: '' });
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Déclarer une perte"
      footer={<><button className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" form="loss-form" type="submit" disabled={busy}>Enregistrer</button></>}>
      <form id="loss-form" onSubmit={submit} className="space-y-3">
        <Field label="Produit" htmlFor="lp"><Select id="lp" value={form.productId} onChange={(v) => setForm({ ...form, productId: v })} options={options} placeholder="Choisir…" required /></Field>
        <Field label="Quantité" htmlFor="lq"><NumberInput id="lq" required value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} step="0.001" /></Field>
        <Field label="Type de perte" htmlFor="lt"><Select id="lt" value={form.lossType} onChange={(v) => setForm({ ...form, lossType: v })} options={LOSS_TYPES} /></Field>
        <Field label="Motif" htmlFor="lr"><textarea id="lr" required minLength={3} className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        <p className="text-xs text-steel-500">Un vol suspecté ou une perte de valeur importante nécessite la validation d'un responsable.</p>
      </form>
    </Modal>
  );
}

export default function Losses() {
  const { can } = useAuth();
  const toast = useToast();
  const { data: prodData } = useFetch(() => get('/products'), []);
  const [status, setStatus] = useState('');
  const { items, loading, error, reload, page, hasNext, hasPrev, next, prev } = usePaged('/losses', { status }, 20);
  const [newOpen, setNewOpen] = useState(false);
  const [rejecting, setRejecting] = useState(null);

  const validate = async (row) => {
    try { await post(`/losses/${row.id}/validate`); toast.success('Perte validée : stock mis à jour'); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };
  const reject = async (reason) => {
    try { await post(`/losses/${rejecting.id}/reject`, { reason }); toast.success('Perte rejetée'); setRejecting(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const columns = [
    { key: 'date', header: 'Date', render: (r) => dateTime(r.createdAt) },
    { key: 'product', header: 'Produit', render: (r) => r.productName },
    { key: 'qty', header: 'Quantité', align: 'right', render: (r) => qty(r.quantity, r.unit) },
    { key: 'type', header: 'Type', render: (r) => label(LOSS_TYPES, r.lossType) },
    { key: 'value', header: 'Valeur', align: 'right', render: (r) => money(r.value) },
    { key: 'reason', header: 'Motif', render: (r) => r.reason },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    can('losses:validate') && { key: 'actions', header: '', align: 'right', render: (r) => r.status === 'PENDING' && (
      <div className="flex justify-end gap-1">
        <button className="btn-ghost btn-sm text-leaf-700" onClick={() => validate(r)}><Check className="h-3.5 w-3.5" /></button>
        <button className="btn-ghost btn-sm text-cure-600" onClick={() => setRejecting(r)}><X className="h-3.5 w-3.5" /></button>
      </div>
    ) },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader title="Pertes et anomalies" subtitle="Produits abîmés, périmés, perdus ou volés">
        <Select value={status} onChange={setStatus} options={[{ value: 'PENDING', label: 'En attente' }, { value: 'VALIDATED', label: 'Validées' }, { value: 'REJECTED', label: 'Rejetées' }]} placeholder="Tous statuts" className="w-44" />
        {can('losses:create') && <button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Déclarer une perte</button>}
      </PageHeader>
      <div className="card">
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : items.length ? (
          <><DataTable columns={columns} rows={items} /><Pagination page={page} hasNext={hasNext} hasPrev={hasPrev} onNext={next} onPrev={prev} /></>
        ) : <EmptyState title="Aucune perte enregistrée" />}
      </div>
      <NewLossModal open={newOpen} onClose={() => setNewOpen(false)} products={prodData?.items || []} onSaved={reload} />
      <ConfirmDialog open={!!rejecting} title="Rejeter la perte" message={`Rejeter la perte déclarée pour « ${rejecting?.productName} » ?`} askReason confirmLabel="Rejeter" onConfirm={reject} onCancel={() => setRejecting(null)} />
    </div>
  );
}
