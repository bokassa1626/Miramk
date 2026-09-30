import { useState } from 'react';
import { Plus, Pencil, Archive } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get, post, put, del, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, EmptyState, StatusBadge } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Field } from '../components/Form.jsx';

const EMPTY = { name: '', description: '' };

export default function Categories() {
  const { can } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => get('/categories'), []);
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', item }
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(null);

  const openCreate = () => { setForm(EMPTY); setModal({ mode: 'create' }); };
  const openEdit = (item) => { setForm({ name: item.name, description: item.description || '' }); setModal({ mode: 'edit', item }); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (modal.mode === 'create') { await post('/categories', form); toast.success('Catégorie créée'); }
      else { await put(`/categories/${modal.item.id}`, form); toast.success('Catégorie modifiée'); }
      setModal(null); reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const archive = async () => {
    try { await del(`/categories/${archiving.id}`); toast.success('Catégorie archivée'); setArchiving(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const items = data?.items || [];

  const columns = [
    { key: 'name', header: 'Nom', render: (r) => <span className="font-medium text-steel-800">{r.name}</span> },
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    can('categories:write') && { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button className="btn-ghost btn-sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></button>
        {r.status === 'ACTIVE' && <button className="btn-ghost btn-sm text-cure-600" onClick={() => setArchiving(r)}><Archive className="h-3.5 w-3.5" /></button>}
      </div>
    ) },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader title="Catégories" subtitle={`${items.length} catégorie(s)`}>
        {can('categories:write') && <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nouvelle catégorie</button>}
      </PageHeader>
      <div className="card">
        {items.length ? <DataTable columns={columns} rows={items} /> : <EmptyState title="Aucune catégorie" hint="Créez votre première catégorie de produits." />}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
        footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Annuler</button><button className="btn-primary" form="cat-form" type="submit" disabled={busy}>Enregistrer</button></>}>
        <form id="cat-form" onSubmit={submit} className="space-y-3">
          <Field label="Nom" htmlFor="cname"><input id="cname" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Description" htmlFor="cdesc"><textarea id="cdesc" className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!archiving} title="Archiver la catégorie" message={`Archiver « ${archiving?.name} » ? Elle restera visible dans l'historique.`}
        confirmLabel="Archiver" onConfirm={archive} onCancel={() => setArchiving(null)} />
    </div>
  );
}
