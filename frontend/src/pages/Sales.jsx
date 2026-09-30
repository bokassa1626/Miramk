import { useMemo, useState } from 'react';
import { Plus, Printer, Ban, Wallet } from 'lucide-react';
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
import InvoiceView from '../components/InvoiceView.jsx';
import { Field, Select, DateRange } from '../components/Form.jsx';
import { money, dateTime, todayISO, shiftDay } from '../utils/format.js';
import { paymentLabel } from '../utils/labels.js';

function NewSaleModal({ open, onClose, products, onSaved }) {
  const toast = useToast();
  const [customerName, setCustomerName] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantity: '', unitPrice: '' }]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState({ method: 'CASH', currency: 'CDF', amount: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const total = useMemo(() => lines.reduce((a, l) => a + (l.quantity || 0) * (l.unitPrice || 0), 0) - (discount || 0), [lines, discount]);

  const reset = () => { setCustomerName(''); setLines([{ productId: '', quantity: '', unitPrice: '' }]); setDiscount(0); setPayment({ method: 'CASH', currency: 'CDF', amount: '' }); setResult(null); };
  const close = () => { reset(); onClose(); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const items = lines.filter((l) => l.productId && l.quantity > 0).map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }));
      if (!items.length) throw new Error('Ajoutez au moins un produit');
      const body = { customerName: customerName || undefined, items, discount: Number(discount) || 0 };
      if (payment.amount) body.payment = { ...payment, amount: Number(payment.amount) };
      const data = await post('/sales', body);
      toast.success(`Vente ${data.sale.saleNumber} validée${data.change > 0 ? ` — rendu : ${money(data.change)}` : ''}`);
      setResult(data); onSaved();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={close} title={result ? 'Vente enregistrée' : 'Nouvelle vente'} size="lg"
      footer={result ? (
        <><button className="btn-secondary" onClick={close}>Fermer</button><button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer la facture</button></>
      ) : (
        <><button className="btn-secondary" onClick={close}>Annuler</button><button className="btn-primary" form="sale-form" type="submit" disabled={busy}>Valider la vente</button></>
      )}>
      {result ? <InvoiceView sale={result.sale} company={result.company} /> : (
        <form id="sale-form" onSubmit={submit} className="space-y-4">
          <Field label="Client (optionnel, obligatoire pour une vente à crédit)" htmlFor="cust"><input id="cust" className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
          <div>
            <p className="label">Produits</p>
            <div className="rounded-md border border-steel-200 p-2">
              {lines.map((l, i) => (
                <CartLine key={i} line={l} products={products} priceField="unitPrice" priceLabel="Prix de vente"
                  onChange={(nl) => setLines(lines.map((x, j) => (j === i ? nl : x)))}
                  onRemove={() => setLines(lines.filter((_, j) => j !== i))} />
              ))}
              <button type="button" className="btn-ghost btn-sm mt-1" onClick={() => setLines([...lines, { productId: '', quantity: '', unitPrice: '' }])}><Plus className="h-3.5 w-3.5" /> Ajouter une ligne</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Remise (CDF)" htmlFor="disc"><input id="disc" className="input" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
            <div className="flex items-end justify-end"><p className="text-lg font-bold">Total : {money(total)}</p></div>
          </div>
          <PaymentFields value={payment} onChange={setPayment} remainingLabel="Montant payé (laisser vide = crédit)" />
        </form>
      )}
    </Modal>
  );
}

function PayModal({ sale, onClose, onSaved }) {
  const toast = useToast();
  const [payment, setPayment] = useState({ method: 'CASH', currency: 'CDF', amount: sale?.remainingAmount || '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const data = await post(`/sales/${sale.id}/payments`, { payment: { ...payment, amount: Number(payment.amount) } });
      toast.success(`Encaissement enregistré${data.change > 0 ? ` — rendu : ${money(data.change)}` : ''}`);
      onSaved(); onClose();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!sale} onClose={onClose} title={`Encaisser — ${sale?.saleNumber}`}
      footer={<><button className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" form="pay-sale" type="submit" disabled={busy}>Encaisser</button></>}>
      <form id="pay-sale" onSubmit={submit} className="space-y-3">
        <p className="text-sm text-steel-600">Reste à payer : <span className="font-semibold text-cure-600">{money(sale?.remainingAmount)}</span></p>
        <PaymentFields value={payment} onChange={setPayment} />
      </form>
    </Modal>
  );
}

export default function Sales() {
  const { user, can } = useAuth();
  const toast = useToast();
  const { data: prodData } = useFetch(() => get('/products'), []);
  const [range, setRange] = useState({ from: shiftDay(todayISO(), -30), to: todayISO() });
  const [status, setStatus] = useState('');
  const { items, loading, error, reload, page, hasNext, hasPrev, next, prev } = usePaged('/sales', { from: range.from, to: range.to, status }, 20);
  const [newOpen, setNewOpen] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [paying, setPaying] = useState(null);
  const [invoiceOf, setInvoiceOf] = useState(null);

  const openInvoice = async (r) => {
    try { setInvoiceOf(await get(`/invoices/${r.id}`)); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const cancel = async (reason) => {
    try { await post(`/sales/${cancelling.id}/cancel`, { reason }); toast.success('Vente annulée'); setCancelling(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const columns = [
    { key: 'no', header: 'N° vente', render: (r) => <span className="font-mono text-xs">{r.saleNumber}</span> },
    { key: 'date', header: 'Date', render: (r) => dateTime(r.createdAt) },
    { key: 'customer', header: 'Client', render: (r) => r.customerName || '—' },
    { key: 'total', header: 'Total', align: 'right', render: (r) => money(r.total) },
    { key: 'paid', header: 'Payé', align: 'right', render: (r) => money(r.amountPaid) },
    { key: 'pay', header: 'Paiement', render: (r) => <StatusBadge status={r.paymentStatus} /> },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button className="btn-ghost btn-sm" onClick={() => openInvoice(r)}><Printer className="h-3.5 w-3.5" /></button>
        {r.status === 'VALIDATED' && r.remainingAmount > 0 && can('sales:pay') && <button className="btn-ghost btn-sm text-leaf-700" onClick={() => setPaying(r)}><Wallet className="h-3.5 w-3.5" /></button>}
        {r.status === 'VALIDATED' && can('sales:cancel') && <button className="btn-ghost btn-sm text-cure-600" onClick={() => setCancelling(r)}><Ban className="h-3.5 w-3.5" /></button>}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Ventes" subtitle={user?.role === 'VENDEUR' ? 'Vos ventes' : 'Toutes les ventes'}>
        <DateRange from={range.from} to={range.to} onChange={setRange} />
        <Select value={status} onChange={setStatus} options={[{ value: 'VALIDATED', label: 'Validées' }, { value: 'CANCELLED', label: 'Annulées' }]} placeholder="Tous statuts" className="w-40" />
        {can('sales:create') && <button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Nouvelle vente</button>}
      </PageHeader>

      <div className="card">
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : items.length ? (
          <><DataTable columns={columns} rows={items} /><Pagination page={page} hasNext={hasNext} hasPrev={hasPrev} onNext={next} onPrev={prev} /></>
        ) : <EmptyState title="Aucune vente sur cette période" />}
      </div>

      <NewSaleModal open={newOpen} onClose={() => setNewOpen(false)} products={prodData?.items || []} onSaved={reload} />
      <PayModal sale={paying} onClose={() => setPaying(null)} onSaved={reload} />
      <ConfirmDialog open={!!cancelling} title="Annuler la vente" message={`Annuler la vente ${cancelling?.saleNumber} ? Le stock sera rétabli.`} askReason confirmLabel="Annuler la vente" onConfirm={cancel} onCancel={() => setCancelling(null)} />

      <Modal open={!!invoiceOf} onClose={() => setInvoiceOf(null)} title={`Facture ${invoiceOf?.invoice?.invoiceNumber || ''}`}
        footer={<><button className="btn-secondary" onClick={() => setInvoiceOf(null)}>Fermer</button><button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer</button></>}>
        <InvoiceView sale={invoiceOf?.invoice} company={invoiceOf?.company} />
      </Modal>
    </div>
  );
}
