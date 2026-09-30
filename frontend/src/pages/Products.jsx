import { useMemo, useState } from 'react';
import { Plus, Pencil, Archive } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get, post, put, del, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge, SearchBar, StockGauge } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Field, Select, NumberInput } from '../components/Form.jsx';
import { UNIT_OPTIONS } from '../utils/labels.js';
import { money, qty } from '../utils/format.js';

const EMPTY = { code: '', name: '', categoryId: '', unit: 'kg', purchasePrice: '', sellingPrice: '', minimumStock: '', supplierId: '', initialStock: 0 };

export default function Products() {
  const { can } = useAuth();
  const toast = useToast();
  const showCost = can('costs:read');
  const { data, loading, error, reload } = useFetch(() => get('/products'), []);
  const { data: cats } = useFetch(() => get('/categories'), []);
  const { data: sups } = useFetch(() => get('/suppliers'), [], { enabled: can('products:write') });
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(null);

  const catOptions = useMemo(() => (cats?.items || []).map((c) => ({ value: c.id, label: c.name })), [cats]);
  const supOptions = useMemo(() => (sups?.items || []).map((s) => ({ value: s.id, label: s.name })), [sups]);
  const catName = (id) => catOptions.find((c) => c.value === id)?.label || '—';

  const openCreate = () => { setForm(EMPTY); setModal({ mode: 'create' }); };
  const openEdit = (item) => { setForm({ code: item.code, name: item.name, categoryId: item.categoryId, unit: item.unit, purchasePrice: item.purchasePrice ?? '', sellingPrice: item.sellingPrice, minimumStock: item.minimumStock, supplierId: item.supplierId || '' }); setModal({ mode: 'edit', item }); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { ...form, supplierId: form.supplierId || null };
      if (modal.mode === 'create') {
        if (!payload.code) delete payload.code;
        await post('/products', payload); toast.success('Produit créé');
      } else {
        const { initialStock, ...patch } = payload;
        await put(`/products/${modal.item.id}`, patch); toast.success('Produit modifié');
      }
      setModal(null); reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const archive = async () => {
    try { await del(`/products/${archiving.id}`); toast.success('Produit archivé'); setArchiving(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const items = (data?.items || []).filter((p) =>
    (!catFilter || p.categoryId === catFilter) && (p.name.toLowerCase().includes(q.toLowerCase()) || p.code?.toLowerCase().includes(q.toLowerCase())));

  const columns = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono text-xs text-steel-500">{r.code}</span> },
    { key: 'name', header: 'Produit', render: (r) => <span className="font-medium text-steel-800">{r.name}</span> },
    { key: 'category', header: 'Catégorie', render: (r) => catName(r.categoryId) },
    showCost && { key: 'purchasePrice', header: "Prix d'achat", align: 'right', render: (r) => money(r.purchasePrice) },
    { key: 'sellingPrice', header: 'Prix de vente', align: 'right', render: (r) => money(r.sellingPrice) },
    { key: 'stock', header: 'Stock', render: (r) => (
      <div className="flex items-center gap-2"><StockGauge current={r.currentStock} minimum={r.minimumStock} /><span className="whitespace-nowrap text-xs text-steel-600">{qty(r.currentStock, r.unit)}</span></div>
    ) },
    { key: 'status2', header: '', render: (r) => <StatusBadge status={r.stockStatus} /> },
    can('products:write') && { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button className="btn-ghost btn-sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></button>
        {r.status === 'ACTIVE' && <button className="btn-ghost btn-sm text-cure-600" onClick={() => setArchiving(r)}><Archive className="h-3.5 w-3.5" /></button>}
      </div>
    ) },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader title="Produits" subtitle={`${items.length} produit(s)`}>
        <Select value={catFilter} onChange={setCatFilter} options={catOptions} placeholder="Toutes les catégories" className="w-52" />
        <SearchBar value={q} onChange={setQ} placeholder="Nom ou code…" className="w-56" />
        {can('products:write') && <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nouveau produit</button>}
      </PageHeader>
      <div className="card">
        {items.length ? <DataTable columns={columns} rows={items} /> : <EmptyState title="Aucun produit" hint="Ajoutez de la viande de bœuf, de porc, de chèvre, du poulet, des abats…" />}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'} size="lg"
        footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Annuler</button><button className="btn-primary" form="prod-form" type="submit" disabled={busy}>Enregistrer</button></>}>
        <form id="prod-form" onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom" htmlFor="pname" className="sm:col-span-2"><input id="pname" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Viande de bœuf" /></Field>
          <Field label="Code (auto si vide)" htmlFor="pcode"><input id="pcode" className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={modal?.mode === 'edit'} /></Field>
          <Field label="Catégorie" htmlFor="pcat"><Select id="pcat" value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })} options={catOptions} placeholder="Choisir…" required /></Field>
          <Field label="Unité" htmlFor="punit"><Select id="punit" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} options={UNIT_OPTIONS} /></Field>
          <Field label="Fournisseur" htmlFor="psup"><Select id="psup" value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v })} options={supOptions} placeholder="Aucun" /></Field>
          <Field label="Prix d'achat (CDF)" htmlFor="ppp"><NumberInput id="ppp" required value={form.purchasePrice} onChange={(v) => setForm({ ...form, purchasePrice: v })} /></Field>
          <Field label="Prix de vente (CDF)" htmlFor="psp"><NumberInput id="psp" required value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} /></Field>
          <Field label="Seuil minimum" htmlFor="pmin" hint="Déclenche l'alerte « stock faible »"><NumberInput id="pmin" value={form.minimumStock} onChange={(v) => setForm({ ...form, minimumStock: v })} /></Field>
          {modal?.mode === 'create' && <Field label="Stock initial" htmlFor="pinit"><NumberInput id="pinit" value={form.initialStock} onChange={(v) => setForm({ ...form, initialStock: v })} /></Field>}
        </form>
      </Modal>

      <ConfirmDialog open={!!archiving} title="Archiver le produit" message={`Archiver « ${archiving?.name} » ? Il restera visible dans l'historique des ventes et achats.`}
        confirmLabel="Archiver" onConfirm={archive} onCancel={() => setArchiving(null)} />
    </div>
  );
}
