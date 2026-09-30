import { useState } from 'react';
import { Plus, Pencil, Archive, Phone, Mail } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get, post, put, del, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge, SearchBar } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Field } from '../components/Form.jsx';
import { money } from '../utils/format.js';

const EMPTY = { name: '', phone: '', email: '', address: '', contactPerson: '' };

export default function Suppliers() {
  const { can } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => get('/suppliers'), []);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(null);

  const openCreate = () => { setForm(EMPTY); setModal({ mode: 'create' }); };
  const openEdit = (item) => { setForm({ name: item.name, phone: item.phone || '', email: item.email || '', address: item.address || '', contactPerson: item.contactPerson || '' }); setModal({ mode: 'edit', item }); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (modal.mode === 'create') { await post('/suppliers', form); toast.success('Fournisseur créé'); }
      else { await put(`/suppliers/${modal.item.id}`, form); toast.success('Fournisseur modifié'); }
      setModal(null); reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const archive = async () => {
    try { await del(`/suppliers/${archiving.id}`); toast.success('Fournisseur archivé'); setArchiving(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const items = (data?.items || []).filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  const columns = [
    { key: 'name', header: 'Fournisseur', render: (r) => (
      <div><p className="font-medium text-steel-800">{r.name}</p>{r.contactPerson && <p className="text-xs text-steel-500">{r.contactPerson}</p>}</div>
    ) },
    { key: 'contact', header: 'Contact', render: (r) => (
      <div className="space-y-0.5 text-xs text-steel-600">
        {r.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</p>}
        {r.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {r.email}</p>}
      </div>
    ) },
    { key: 'count', header: 'Achats', align: 'right', render: (r) => r.stats.purchaseCount },
    { key: 'total', header: 'Total acheté', align: 'right', render: (r) => money(r.stats.totalPurchased) },
    { key: 'debt', header: 'Dette', align: 'right', render: (r) => <span className={r.stats.debt > 0 ? 'font-semibold text-cure-600' : ''}>{money(r.stats.debt)}</span> },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    can('suppliers:write') && { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button className="btn-ghost btn-sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></button>
        {r.status === 'ACTIVE' && <button className="btn-ghost btn-sm text-cure-600" onClick={() => setArchiving(r)}><Archive className="h-3.5 w-3.5" /></button>}
      </div>
    ) },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader title="Fournisseurs" subtitle={`${items.length} fournisseur(s)`}>
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher un fournisseur…" className="w-64" />
        {can('suppliers:write') && <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nouveau fournisseur</button>}
      </PageHeader>
      <div className="card">
        {items.length ? <DataTable columns={columns} rows={items} /> : <EmptyState title="Aucun fournisseur" />}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nouveau fournisseur' : 'Modifier le fournisseur'}
        footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Annuler</button><button className="btn-primary" form="sup-form" type="submit" disabled={busy}>Enregistrer</button></>}>
        <form id="sup-form" onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom" htmlFor="sname" className="sm:col-span-2"><input id="sname" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Personne à contacter" htmlFor="scontact"><input id="scontact" className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
          <Field label="Téléphone" htmlFor="sphone"><input id="sphone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="E-mail" htmlFor="semail"><input id="semail" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Adresse" htmlFor="saddr" className="sm:col-span-2"><input id="saddr" className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!archiving} title="Archiver le fournisseur" message={`Archiver « ${archiving?.name} » ? Son historique d'achats reste consultable.`}
        confirmLabel="Archiver" onConfirm={archive} onCancel={() => setArchiving(null)} />
    </div>
  );
}
