import { useState } from 'react';
import { Plus, Check, X, Eye } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import usePaged from '../hooks/usePaged.js';
import { get, post, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge, Pagination } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { NumberInput } from '../components/Form.jsx';
import { money, qty, dateTime } from '../utils/format.js';

function NewInventoryModal({ open, onClose, products, onSaved }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const startWith = () => setRows(products.map((p) => ({ productId: p.id, name: p.name, unit: p.unit, theoretical: p.currentStock, physicalStock: p.currentStock, reason: '' })));
  const openFresh = () => { startWith(); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const items = rows.filter((r) => r.physicalStock !== '' && r.physicalStock !== r.theoretical).map((r) => ({ productId: r.productId, physicalStock: Number(r.physicalStock), reason: r.reason || undefined }));
      if (!items.length) throw new Error('Aucune différence saisie');
      const bad = items.find((r) => !r.reason);
      if (bad) throw new Error('Un motif est requis pour chaque produit avec écart');
      const data = await post('/inventory', { items });
      toast.warning(`Comptage ${data.number} enregistré : en attente de validation`);
      onSaved(); onClose(); setRows([]);
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nouveau comptage d'inventaire" size="xl"
      footer={<><button className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" form="inv-form" type="submit" disabled={busy || !rows.length}>Enregistrer le comptage</button></>}>
      {!rows.length ? (
        <button className="btn-primary" onClick={openFresh}>Charger tous les produits actifs</button>
      ) : (
        <form id="inv-form" onSubmit={submit}>
          <div className="max-h-[55vh] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-steel-200"><th className="th">Produit</th><th className="th text-right">Théorique</th><th className="th text-right">Physique</th><th className="th text-right">Écart</th><th className="th">Motif si écart</th></tr></thead>
              <tbody className="divide-y divide-steel-100">
                {rows.map((r, i) => {
                  const diff = r.physicalStock === '' ? 0 : Number(r.physicalStock) - r.theoretical;
                  return (
                    <tr key={r.productId}>
                      <td className="td">{r.name} <span className="text-xs text-steel-400">({r.unit})</span></td>
                      <td className="td text-right">{qty(r.theoretical)}</td>
                      <td className="td text-right"><NumberInput value={r.physicalStock} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, physicalStock: v } : x)))} step="0.001" /></td>
                      <td className={`td text-right font-medium ${diff < 0 ? 'text-cure-600' : diff > 0 ? 'text-leaf-700' : ''}`}>{diff !== 0 ? diff.toFixed(3).replace(/\.?0+$/, '') : '—'}</td>
                      <td className="td"><input className="input" disabled={diff === 0} value={r.reason} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))} placeholder={diff !== 0 ? 'Motif obligatoire' : ''} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      )}
    </Modal>
  );
}

function DetailModal({ session, onClose, onValidate, onReject, canValidate }) {
  if (!session) return null;
  const diffs = session.items.filter((i) => i.difference !== 0);
  return (
    <Modal open={!!session} onClose={onClose} title={`Inventaire ${session.number}`} size="lg"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Fermer</button>
        {session.status === 'PENDING' && canValidate && (<>
          <button className="btn-danger" onClick={() => onReject(session)}>Rejeter</button>
          <button className="btn-primary" onClick={() => onValidate(session)}>Valider</button>
        </>)}
      </>}>
      <p className="mb-2 text-sm text-steel-600">{diffs.length} ligne(s) avec écart sur {session.items.length} — {dateTime(session.createdAt)}</p>
      <DataTable rowKey="productId" columns={[
        { key: 'p', header: 'Produit', render: (r) => r.productName },
        { key: 't', header: 'Théorique', align: 'right', render: (r) => qty(r.theoreticalStock, r.unit) },
        { key: 'ph', header: 'Physique', align: 'right', render: (r) => qty(r.physicalStock, r.unit) },
        { key: 'd', header: 'Écart', align: 'right', render: (r) => <span className={r.difference < 0 ? 'text-cure-600' : r.difference > 0 ? 'text-leaf-700' : ''}>{r.difference}</span> },
        { key: 'v', header: 'Valeur', align: 'right', render: (r) => money(r.differenceValue) },
        { key: 'r', header: 'Motif', render: (r) => r.reason || '—' },
      ]} rows={diffs} />
    </Modal>
  );
}

export default function Inventory() {
  const { can } = useAuth();
  const toast = useToast();
  const { data: prodData } = useFetch(() => get('/products'), []);
  const [status, setStatus] = useState('');
  const { items, loading, error, reload, page, hasNext, hasPrev, next, prev } = usePaged('/inventory', { status }, 20);
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const validate = async (s) => {
    try { await post(`/inventory/${s.id}/validate`); toast.success('Inventaire validé : stocks ajustés'); setDetail(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };
  const reject = async (reason) => {
    try { await post(`/inventory/${rejecting.id}/reject`, { reason }); toast.success('Inventaire rejeté'); setRejecting(null); setDetail(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const columns = [
    { key: 'no', header: 'N°', render: (r) => <span className="font-mono text-xs">{r.number}</span> },
    { key: 'date', header: 'Date', render: (r) => dateTime(r.createdAt) },
    { key: 'lines', header: 'Lignes / écarts', render: (r) => `${r.summary.lines} / ${r.summary.linesWithDifference}` },
    { key: 'net', header: 'Valeur nette', align: 'right', render: (r) => money(r.summary.netValue) },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', align: 'right', render: (r) => <button className="btn-ghost btn-sm" onClick={() => setDetail(r)}><Eye className="h-3.5 w-3.5" /> Détails</button> },
  ];

  return (
    <div>
      <PageHeader title="Inventaire" subtitle="Comptage physique et ajustement des écarts">
        <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous statuts</option><option value="PENDING">En attente</option><option value="VALIDATED">Validés</option><option value="REJECTED">Rejetés</option>
        </select>
        {can('inventory:create') && <button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Nouveau comptage</button>}
      </PageHeader>
      <div className="card">
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : items.length ? (
          <><DataTable columns={columns} rows={items} /><Pagination page={page} hasNext={hasNext} hasPrev={hasPrev} onNext={next} onPrev={prev} /></>
        ) : <EmptyState title="Aucune session d'inventaire" />}
      </div>
      <NewInventoryModal open={newOpen} onClose={() => setNewOpen(false)} products={prodData?.items || []} onSaved={reload} />
      <DetailModal session={detail} onClose={() => setDetail(null)} onValidate={validate} onReject={setRejecting} canValidate={can('inventory:validate')} />
      <ConfirmDialog open={!!rejecting} title="Rejeter l'inventaire" message={`Rejeter le comptage ${rejecting?.number} ?`} askReason confirmLabel="Rejeter" onConfirm={reject} onCancel={() => setRejecting(null)} />
    </div>
  );
}
