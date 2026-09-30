import { useState } from 'react';
import { Plus, Ban } from 'lucide-react';
import usePaged from '../hooks/usePaged.js';
import { post, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge, Pagination } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Field, Select, DateRange, NumberInput } from '../components/Form.jsx';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, label } from '../utils/labels.js';
import { money, dateTime, todayISO, shiftDay } from '../utils/format.js';

const EMPTY = { category: 'TRANSPORT', description: '', amount: '', currency: 'CDF', paymentMethod: 'CASH', reference: '' };

function NewExpenseModal({ open, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await post('/expenses', { ...form, amount: Number(form.amount) }); toast.success('Dépense enregistrée'); onSaved(); onClose(); setForm(EMPTY); }
    catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle dépense"
      footer={<><button className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" form="exp-form" type="submit" disabled={busy}>Enregistrer</button></>}>
      <form id="exp-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Catégorie" htmlFor="ecat" className="col-span-2"><Select id="ecat" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={EXPENSE_CATEGORIES} /></Field>
        <Field label="Description" htmlFor="edesc" className="col-span-2"><input id="edesc" required className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Montant" htmlFor="eamt"><NumberInput id="eamt" required value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} /></Field>
        <Field label="Devise" htmlFor="ecur"><Select id="ecur" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={[{ value: 'CDF', label: 'CDF' }, { value: 'USD', label: 'USD' }]} /></Field>
        <Field label="Mode de paiement" htmlFor="epay"><Select id="epay" value={form.paymentMethod} onChange={(v) => setForm({ ...form, paymentMethod: v })} options={PAYMENT_METHODS} /></Field>
        <Field label="Référence (optionnel)" htmlFor="eref"><input id="eref" className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
      </form>
    </Modal>
  );
}

export default function Expenses() {
  const { can } = useAuth();
  const toast = useToast();
  const [range, setRange] = useState({ from: shiftDay(todayISO(), -30), to: todayISO() });
  const [category, setCategory] = useState('');
  const { items, loading, error, reload, page, hasNext, hasPrev, next, prev } = usePaged('/expenses', { from: range.from, to: range.to, category }, 20);
  const [newOpen, setNewOpen] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const cancel = async (reason) => {
    try { await post(`/expenses/${cancelling.id}/cancel`, { reason }); toast.success('Dépense annulée'); setCancelling(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const columns = [
    { key: 'date', header: 'Date', render: (r) => dateTime(r.createdAt) },
    { key: 'cat', header: 'Catégorie', render: (r) => label(EXPENSE_CATEGORIES, r.category) },
    { key: 'desc', header: 'Description', render: (r) => r.description },
    { key: 'amount', header: 'Montant', align: 'right', render: (r) => money(r.amount) },
    { key: 'method', header: 'Paiement', render: (r) => label(PAYMENT_METHODS, r.paymentMethod) },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    can('expenses:cancel') && { key: 'actions', header: '', align: 'right', render: (r) => r.status === 'VALIDATED' && (
      <button className="btn-ghost btn-sm text-cure-600" onClick={() => setCancelling(r)}><Ban className="h-3.5 w-3.5" /></button>
    ) },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader title="Dépenses" subtitle="Transport, électricité, salaires, entretien…">
        <DateRange from={range.from} to={range.to} onChange={setRange} />
        <Select value={category} onChange={setCategory} options={EXPENSE_CATEGORIES} placeholder="Toutes catégories" className="w-48" />
        {can('expenses:create') && <button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Nouvelle dépense</button>}
      </PageHeader>
      <div className="card">
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : items.length ? (
          <><DataTable columns={columns} rows={items} /><Pagination page={page} hasNext={hasNext} hasPrev={hasPrev} onNext={next} onPrev={prev} /></>
        ) : <EmptyState title="Aucune dépense sur cette période" />}
      </div>
      <NewExpenseModal open={newOpen} onClose={() => setNewOpen(false)} onSaved={reload} />
      <ConfirmDialog open={!!cancelling} title="Annuler la dépense" message={`Annuler « ${cancelling?.description} » ?`} askReason confirmLabel="Annuler" onConfirm={cancel} onCancel={() => setCancelling(null)} />
    </div>
  );
}
