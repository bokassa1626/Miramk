import { useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { get, post, download, errorMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useFetch from '../hooks/useFetch.js';
import { PageHeader, Loading, ErrorState, StatCard } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import { Select, DateRange } from '../components/Form.jsx';
import { money, qty, todayISO, shiftDay } from '../utils/format.js';

const PERIODS = [{ value: 'day', label: "Aujourd'hui" }, { value: 'week', label: 'Cette semaine' }, { value: 'month', label: 'Ce mois' }, { value: 'year', label: 'Cette année' }, { value: 'custom', label: 'Période personnalisée' }];

export default function Reports() {
  const { can } = useAuth();
  const toast = useToast();
  const [period, setPeriod] = useState('day');
  const [range, setRange] = useState({ from: shiftDay(todayISO(), -7), to: todayISO() });
  const params = period === 'custom' ? { period: 'custom', from: range.from, to: range.to } : { period };
  const { data, loading, error, reload } = useFetch(() => get('/reports/summary', params), [period, range.from, range.to]);

  const exportCsv = () => download('/reports/export', params, `rapport-mira-mk.csv`).catch((e) => toast.error(errorMessage(e)));
  const generate = async () => {
    try { await post('/reports/daily/generate'); toast.success('Rapport du jour archivé'); reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader title="Rapports" subtitle="Ventes, achats, stocks, dépenses, finance et contrôle">
        <Select value={period} onChange={setPeriod} options={PERIODS} className="w-56" />
        {period === 'custom' && <DateRange from={range.from} to={range.to} onChange={setRange} />}
        <button className="btn-secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</button>
        {can('reports:generate') && period === 'day' && <button className="btn-secondary" onClick={generate}><FileBarChart className="h-4 w-4" /> Archiver le rapport du jour</button>}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Chiffre d'affaires" value={money(data.finance.turnover)} />
        <StatCard label="Coût des marchandises" value={money(data.finance.costOfGoodsSold)} />
        <StatCard label="Marge brute" value={money(data.finance.grossMargin)} />
        <StatCard label="Dépenses" value={money(data.finance.expenses)} />
        <StatCard label="Bénéfice estimé" value={money(data.finance.estimatedProfit)} tone={data.finance.estimatedProfit >= 0 ? 'good' : 'bad'} />
        <StatCard label="Recettes encaissées" value={money(data.finance.receipts)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-steel-700">Ventes — {data.sales.count} vente(s), {money(data.sales.total)}</p>
          <DataTable rowKey="productId" columns={[
            { key: 'p', header: 'Produit', render: (r) => r.productName },
            { key: 'q', header: 'Qté', align: 'right', render: (r) => qty(r.quantity, r.unit) },
            { key: 't', header: 'Total', align: 'right', render: (r) => money(r.total) },
            { key: 'm', header: 'Marge', align: 'right', render: (r) => money(r.margin) },
          ]} rows={data.sales.productsSold} emptyMessage="Aucune vente" />
        </div>
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-steel-700">Stocks — valeur : {money(data.stocks.value)}</p>
          <div className="max-h-80 overflow-y-auto">
            <DataTable rowKey="productId" columns={[
              { key: 'p', header: 'Produit', render: (r) => r.productName },
              { key: 'o', header: 'Initial', align: 'right', render: (r) => qty(r.opening, r.unit) },
              { key: 'e', header: 'Entrées', align: 'right', render: (r) => qty(r.entries, r.unit) },
              { key: 'x', header: 'Sorties', align: 'right', render: (r) => qty(r.exits, r.unit) },
              { key: 'l', header: 'Pertes', align: 'right', render: (r) => qty(r.losses, r.unit) },
              { key: 'c', header: 'Final', align: 'right', render: (r) => qty(r.closing, r.unit) },
            ]} rows={data.stocks.rows} emptyMessage="Aucun mouvement" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-steel-700">Dépenses par catégorie — total {money(data.expenses.total)}</p>
          <DataTable columns={[{ key: 'c', header: 'Catégorie', render: (r) => r.category }, { key: 't', header: 'Total', align: 'right', render: (r) => money(r.total) }]} rows={data.expenses.byCategory} rowKey="category" emptyMessage="Aucune dépense" />
        </div>
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-steel-700">Contrôle — anomalies détectées</p>
          {data.control.anomalies.length ? (
            <ul className="space-y-1.5 text-sm">
              {data.control.anomalies.map((a, i) => <li key={i} className="flex justify-between gap-2 border-b border-steel-100 pb-1.5 last:border-0"><span>{a.label}</span><span className="shrink-0 font-medium text-cure-600">{money(a.value)}</span></li>)}
            </ul>
          ) : <p className="py-6 text-center text-sm text-steel-500">Aucune anomalie détectée.</p>}
        </div>
      </div>
    </div>
  );
}
