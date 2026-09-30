import { useState } from 'react';
import { Printer } from 'lucide-react';
import usePaged from '../hooks/usePaged.js';
import { get, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge, Pagination } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import InvoiceView from '../components/InvoiceView.jsx';
import { DateRange } from '../components/Form.jsx';
import { money, dateTime, todayISO, shiftDay } from '../utils/format.js';

/** Registre des factures (cahier des charges §14) : aperçu et impression de chaque vente validée */
export default function Invoices() {
  const toast = useToast();
  const [range, setRange] = useState({ from: shiftDay(todayISO(), -30), to: todayISO() });
  const { items, loading, error, reload, page, hasNext, hasPrev, next, prev } = usePaged('/invoices', { from: range.from, to: range.to, status: 'VALIDATED' }, 20);
  const [invoiceOf, setInvoiceOf] = useState(null);

  const openInvoice = async (r) => {
    try { setInvoiceOf(await get(`/invoices/${r.id}`)); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const columns = [
    { key: 'no', header: 'N° facture', render: (r) => <span className="font-mono text-xs">{r.invoiceNumber}</span> },
    { key: 'sale', header: 'N° vente', render: (r) => <span className="font-mono text-xs text-steel-500">{r.saleNumber}</span> },
    { key: 'date', header: 'Date', render: (r) => dateTime(r.createdAt) },
    { key: 'customer', header: 'Client', render: (r) => r.customerName || '—' },
    { key: 'total', header: 'Total', align: 'right', render: (r) => money(r.total) },
    { key: 'pay', header: 'Paiement', render: (r) => <StatusBadge status={r.paymentStatus} /> },
    { key: 'actions', header: '', align: 'right', render: (r) => <button className="btn-secondary btn-sm" onClick={() => openInvoice(r)}><Printer className="h-3.5 w-3.5" /> Aperçu</button> },
  ];

  return (
    <div>
      <PageHeader title="Factures" subtitle={`${items.length} facture(s) affichée(s)`}>
        <DateRange from={range.from} to={range.to} onChange={setRange} />
      </PageHeader>
      <div className="card">
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : items.length ? (
          <><DataTable columns={columns} rows={items} /><Pagination page={page} hasNext={hasNext} hasPrev={hasPrev} onNext={next} onPrev={prev} /></>
        ) : <EmptyState title="Aucune facture sur cette période" />}
      </div>
      <Modal open={!!invoiceOf} onClose={() => setInvoiceOf(null)} title={`Facture ${invoiceOf?.invoice?.invoiceNumber || ''}`}
        footer={<><button className="btn-secondary" onClick={() => setInvoiceOf(null)}>Fermer</button><button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer</button></>}>
        <InvoiceView sale={invoiceOf?.invoice} company={invoiceOf?.company} />
      </Modal>
    </div>
  );
}
