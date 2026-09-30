import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get, put, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Loading, ErrorState } from '../components/ui.jsx';
import { Field, Select, NumberInput } from '../components/Form.jsx';

export default function Settings() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => get('/settings'), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await put('/settings', form); toast.success('Paramètres enregistrés'); reload(); }
    catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !form) return <Loading />;

  return (
    <div>
      <PageHeader title="Paramètres de l'entreprise" subtitle="Identité, coordonnées, ventes et gestion du stock" />
      <form onSubmit={submit} className="card max-w-4xl space-y-6 p-5 sm:p-6">
        <section className="space-y-4">
          <div className="border-b border-steel-200 pb-2"><h2 className="font-display text-lg font-semibold text-steel-900">Identité et contact</h2><p className="mt-1 text-sm text-steel-500">Ces informations apparaissent sur les factures et reçus.</p></div>
          <Field label="Nom de l'entreprise" htmlFor="sname"><input id="sname" required className="input" value={form.companyName || ''} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
          <Field label="Adresse" htmlFor="saddr"><input id="saddr" className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Téléphone(s)" htmlFor="sphone" hint="Séparez plusieurs numéros par une virgule"><input id="sphone" type="tel" className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="E-mail" htmlFor="semail"><input id="semail" type="email" className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="Logo (URL d'image)" htmlFor="slogo" hint="Facultatif. Le logo sera imprimé sur les factures et reçus."><input id="slogo" type="url" className="input" value={form.logo || ''} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://exemple.com/logo.png" /></Field>
        </section>

        <section className="space-y-4">
          <div className="border-b border-steel-200 pb-2"><h2 className="font-display text-lg font-semibold text-steel-900">Ventes et numérotation</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Devise" htmlFor="scur"><Select id="scur" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={[{ value: 'CDF', label: 'CDF' }, { value: 'USD', label: 'USD' }]} /></Field>
            <Field label="Taux USD → CDF" htmlFor="srate"><NumberInput id="srate" value={form.exchangeRateUSD} onChange={(v) => setForm({ ...form, exchangeRateUSD: v })} /></Field>
            <Field label="Préfixe factures" htmlFor="sinv"><input id="sinv" className="input" value={form.invoicePrefix || ''} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} /></Field>
            <Field label="Préfixe ventes" htmlFor="ssale"><input id="ssale" className="input" value={form.salePrefix || ''} onChange={(e) => setForm({ ...form, salePrefix: e.target.value })} /></Field>
            <Field label="Préfixe achats" htmlFor="spurch"><input id="spurch" className="input" value={form.purchasePrefix || ''} onChange={(e) => setForm({ ...form, purchasePrefix: e.target.value })} /></Field>
          </div>
        </section>

        <section className="space-y-4">
          <div className="border-b border-steel-200 pb-2"><h2 className="font-display text-lg font-semibold text-steel-900">Stock et validation</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Seuil de stock par défaut" htmlFor="sthresh"><NumberInput id="sthresh" value={form.defaultStockThreshold} onChange={(v) => setForm({ ...form, defaultStockThreshold: v })} /></Field>
            <Field label="Seuil de validation des pertes (CDF)" htmlFor="slossth" hint="Une perte atteignant ce montant nécessite la validation d'un responsable">
              <NumberInput id="slossth" value={form.lossApprovalThreshold} onChange={(v) => setForm({ ...form, lossApprovalThreshold: v })} />
            </Field>
          </div>
        </section>
        <div className="border-t border-steel-200 pt-4"><button type="submit" className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> Enregistrer les paramètres</button></div>
      </form>
    </div>
  );
}
