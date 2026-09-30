import { useMemo, useState } from 'react';
import { Plus, Ban, Wallet, Eye } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import usePaged from '../hooks/usePaged.js';
import { get, post, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge, Pagination } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CartLine from '../components/CartLine.jsx';
import PaymentFields from '../components/PaymentFields.jsx';
import { Field, Select, DateRange } from '../components/Form.jsx';
import { money, qty, dateTime, todayISO, shiftDay } from '../utils/format.js';

function NewPurchaseModal({ open, onClose, products, suppliers, onSaved }) {
  const toast = useToast();
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantity: '', purchasePrice: '' }]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState({ method: 'CASH', currency: 'CDF', amount: '' });
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => lines.reduce((a, l) => a + (l.quantity || 0) * (l.purchasePrice || 0), 0) - (discount || 0), [lines, discount]);
  const supOptions = suppliers.map((s) => ({ value: s.id, label: s.name }));

  const reset = () => { setSupplierId(''); setLines([{ productId: '', quantity: '', purchasePrice: '' }]); setDiscount(0); setPayment({ method: 'CASH', currency: 'CDF', amount: '' }); };
  const close = () => { reset(); onClose(); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const items = lines.filter((l) => l.productId && l.quantity > 0).map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitPrice: Number(l.purchasePrice) }));
      if (!items.length) throw new Error('Ajoutez au moins un produit');
      const body = { supplierId, items, discount: Number(discount) || 0 };
      if (payment.amount) body.payment = { ...payment, amount: Number(payment.amount) };
      const data = await post('/purchases', body);
      toast.success(`Achat ${data.purchaseNumber} validé — stock mis à jour`);
      onSaved(); close();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={close} title="Nouvel achat" size="lg"
      footer={<><button className="btn-secondary" onClick={close}>Annuler</button><button className="btn-primary" form="purch-form" type="submit" disabled={busy}>Valider l'achat</button></>}>
      <form id="purch-form" onSubmit={submit} className="space-y-4">
        <Field label="Fournisseur" htmlFor="psupid"><Select id="psupid" value={supplierId} onChange={setSupplierId} options={supOptions} placeholder="Choisir…" required /></Field>
        <div>
          <p className="label">Produits achetés</p>
          <div className="rounded-md border border-steel-200 p-2">
            {lines.map((l, i) => (
              <CartLine key={i} line={l} products={products} priceField="purchasePrice" priceLabel="Prix d'achat"
                onChange={(nl) => setLines(lines.map((x, j) => (j === i ? nl : x)))}
                onRemove={() => setLines(lines.filter((_, j) => j !== i))} />
            ))}
            <button type="button" className="btn-ghost btn-sm mt-1" onClick={() => setLines([...lines, { productId: '', quantity: '', purchasePrice: '' }])}><Plus className="h-3.5 w-3.5" /> Ajouter une ligne</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Remise (CDF)" htmlFor="pdisc"><input id="pdisc" className="input" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
          <div className="flex items-end justify-end"><p className="text-lg font-bold">Total : {money(total)}</p></div>
        </div>
        <PaymentFields value={payment} onChange={setPayment} remainingLabel="Montant payé (laisser vide = à crédit)" />
      </form>
    </Modal>
  );
}

function PayModal({ purchase, onClose, onSaved }) {
  const toast = useToast();
  const [payment, setPayment] = useState({ method: 'CASH', currency: 'CDF', amount: purchase?.remainingAmount || '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await post(`/purchases/${purchase.id}/payments`, { payment: { ...payment, amount: Number(payment.amount) } });
      toast.success('Paiement enregistré'); onSaved(); onClose();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!purchase} onClose={onClose} title={`Payer — ${purchase?.purchaseNumber}`}
      footer={<><button className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" form="pay-purch" type="submit" disabled={busy}>Payer</button></>}>
      <form id="pay-purch" onSubmit={submit} className="space-y-3">
        <p className="text-sm text-steel-600">Dette restante : <span className="font-semibold text-cure-600">{money(purchase?.remainingAmount)}</span></p>
        <PaymentFields value={payment} onChange={setPayment} />
      </form>
    </Modal>
  );
}

function DetailModal({ purchase, onClose }) {
  if (!purchase) return null;
  return (
    <Modal open={!!purchase} onClose={onClose} title={`Achat ${purchase.purchaseNumber}`} size="lg" footer={<button className="btn-secondary" onClick={onClose}>Fermer</button>}>
      <p className="mb-2 text-sm text-steel-600">Fournisseur : <span className="font-medium">{purchase.supplierName}</span> — {dateTime(purchase.createdAt)}</p>
      <DataTable columns={[
        { key: 'p', header: 'Produit', render: (r) => r.productName },
        { key: 'q', header: 'Quantité', align: 'right', render: (r) => qty(r.quantity, r.unit) },
        { key: 'u', header: 'Prix unitaire', align: 'right', render: (r) => money(r.unitPrice) },
        { key: 't', header: 'Total', align: 'right', render: (r) => money(r.total) },
      ]} rows={purchase.items} rowKey="productId" />
      <div className="mt-3 space-y-1 text-right text-sm">
        <p>Sous-total : {money(purchase.subtotal)}</p>
        {purchase.discount > 0 && <p>Remise : -{money(purchase.discount)}</p>}
        <p className="font-bold">Total : {money(purchase.total)}</p>
        <p>Payé : {money(purchase.amountPaid)} — Reste : {money(purchase.remainingAmount)}</p>
      </div>
    </Modal>
  );
}

export default function Purchases() {
  const { can } = useAuth();
  const toast = useToast();
  const { data: prodData } = useFetch(() => get('/products'), []);
  const { data: supData } = useFetch(() => get('/suppliers'), []);
  const [range, setRange] = useState({ from: shiftDay(todayISO(), -30), to: todayISO() });
  const [status, setStatus] = useState('');
  const { items, loading, error, reload, page, hasNext, hasPrev, next, prev } = usePaged('/purchases', { from: range.from, to: range.to, status }, 20);
  const [newOpen, setNewOpen] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [paying, setPaying] = useState(null);
  const [detail, setDetail] = useState(null);

  const cancel = async (reason) => {
    try { await post(`/purchases/${cancelling.id}/cancel`, { reason }); toast.success('Achat annulé'); setCancelling(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const columns = [
    { key: 'no', header: 'N° achat', render: (r) => <span className="font-mono text-xs">{r.purchaseNumber}</span> },
    { key: 'date', header: 'Date', render: (r) => dateTime(r.createdAt) },
    { key: 'sup', header: 'Fournisseur', render: (r) => r.supplierName },
    { key: 'total', header: 'Total', align: 'right', render: (r) => money(r.total) },
    { key: 'remaining', header: 'Reste dû', align: 'right', render: (r) => <span className={r.remainingAmount > 0 ? 'font-semibold text-cure-600' : ''}>{money(r.remainingAmount)}</span> },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button className="btn-ghost btn-sm" onClick={() => setDetail(r)}><Eye className="h-3.5 w-3.5" /></button>
        {r.status === 'VALIDATED' && r.remainingAmount > 0 && can('purchases:pay') && <button className="btn-ghost btn-sm text-leaf-700" onClick={() => setPaying(r)}><Wallet className="h-3.5 w-3.5" /></button>}
        {r.status === 'VALIDATED' && can('purchases:cancel') && <button className="btn-ghost btn-sm text-cure-600" onClick={() => setCancelling(r)}><Ban className="h-3.5 w-3.5" /></button>}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Achats" subtitle="Approvisionnements auprès des fournisseurs">
        <DateRange from={range.from} to={range.to} onChange={setRange} />
        <Select value={status} onChange={setStatus} options={[{ value: 'VALIDATED', label: 'Validés' }, { value: 'CANCELLED', label: 'Annulés' }]} placeholder="Tous statuts" className="w-40" />
        {can('purchases:create') && <button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Nouvel achat</button>}
      </PageHeader>
      <div className="card">
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : items.length ? (
          <><DataTable columns={columns} rows={items} /><Pagination page={page} hasNext={hasNext} hasPrev={hasPrev} onNext={next} onPrev={prev} /></>
        ) : <EmptyState title="Aucun achat sur cette période" />}
      </div>
      <NewPurchaseModal open={newOpen} onClose={() => setNewOpen(false)} products={prodData?.items || []} suppliers={supData?.items || []} onSaved={reload} />
      <PayModal purchase={paying} onClose={() => setPaying(null)} onSaved={reload} />
      <DetailModal purchase={detail} onClose={() => setDetail(null)} />
      <ConfirmDialog open={!!cancelling} title="Annuler l'achat" message={`Annuler l'achat ${cancelling?.purchaseNumber} ? Le stock correspondant sera retiré.`} askReason confirmLabel="Annuler l'achat" onConfirm={cancel} onCancel={() => setCancelling(null)} />
    </div>
  );
}
