import { useState } from 'react';
import { Plus, Pencil, KeyRound } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get, post, put, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Loading, ErrorState, StatusBadge } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Select } from '../components/Form.jsx';
import { ROLE_LABELS, label } from '../utils/labels.js';
import { dateTime } from '../utils/format.js';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const EMPTY = { firstName: '', lastName: '', email: '', phone: '', role: 'VENDEUR', password: '' };

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => get('/users'), []);
  const [modal, setModal] = useState(null); // 'create' | user
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (u) => { setForm({ firstName: u.firstName, lastName: u.lastName, phone: u.phone || '', role: u.role, status: u.status }); setModal(u); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (modal === 'create') { await post('/users', form); toast.success('Utilisateur créé'); }
      else { const { firstName, lastName, phone, role, status } = form; await put(`/users/${modal.id}`, { firstName, lastName, phone, role, status }); toast.success('Utilisateur modifié'); }
      setModal(null); reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    try { await post(`/users/${resetting.id}/reset-password`, { password: newPassword }); toast.success('Mot de passe réinitialisé'); setResetting(null); setNewPassword(''); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const items = data.items || [];

  const columns = [
    { key: 'name', header: 'Nom', render: (r) => <span className="font-medium text-steel-800">{r.firstName} {r.lastName}</span> },
    { key: 'email', header: 'E-mail', render: (r) => r.email },
    { key: 'role', header: 'Rôle', render: (r) => ROLE_LABELS[r.role] || r.role },
    { key: 'status', header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'last', header: 'Dernière connexion', render: (r) => dateTime(r.lastLogin) },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button className="btn-ghost btn-sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></button>
        <button className="btn-ghost btn-sm" onClick={() => setResetting(r)}><KeyRound className="h-3.5 w-3.5" /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle={`${items.length} compte(s)`}>
        <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nouvel utilisateur</button>
      </PageHeader>
      <div className="card"><DataTable columns={columns} rows={items} /></div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
        footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Annuler</button><button className="btn-primary" form="user-form" type="submit" disabled={busy}>Enregistrer</button></>}>
        <form id="user-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Prénom" htmlFor="ufn"><input id="ufn" required className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Nom" htmlFor="uln"><input id="uln" required className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          {modal === 'create' && <Field label="E-mail" htmlFor="uem" className="col-span-2"><input id="uem" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>}
          <Field label="Téléphone" htmlFor="uph"><input id="uph" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Rôle" htmlFor="urole"><Select id="urole" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLE_OPTIONS} disabled={modal !== 'create' && modal?.id === me?.id} /></Field>
          {modal === 'create' && <Field label="Mot de passe" htmlFor="upass" className="col-span-2" hint="8 caractères minimum"><input id="upass" type="password" required minLength={8} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>}
          {modal && modal !== 'create' && <Field label="Statut" htmlFor="ustatus"><Select id="ustatus" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[{ value: 'ACTIVE', label: 'Actif' }, { value: 'INACTIVE', label: 'Inactif' }]} disabled={modal.id === me?.id} /></Field>}
        </form>
      </Modal>

      <Modal open={!!resetting} onClose={() => setResetting(null)} title={`Réinitialiser le mot de passe — ${resetting?.email || ''}`}
        footer={<><button className="btn-secondary" onClick={() => setResetting(null)}>Annuler</button><button className="btn-primary" form="reset-form" type="submit">Réinitialiser</button></>}>
        <form id="reset-form" onSubmit={resetPassword}>
          <Field label="Nouveau mot de passe" htmlFor="newpass" hint="8 caractères minimum"><input id="newpass" type="password" required minLength={8} className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Field>
        </form>
      </Modal>
    </div>
  );
}
