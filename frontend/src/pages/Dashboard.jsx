import { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, ShoppingCart, Receipt, TrendingUp, Boxes, TriangleAlert, PackageX, Beef } from 'lucide-react';
import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch.js';
import { get } from '../services/api.js';
import { PageHeader, StatCard, Loading, ErrorState, StatusBadge } from '../components/ui.jsx';
import { money, shortMoney, dateOnly } from '../utils/format.js';

const AXIS = { fontSize: 11, fill: '#6F7D86' };

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(() => get('/reports/dashboard'), []);

  const dailyChart = useMemo(() => (data?.daily || []).map((d) => ({ ...d, label: dateOnly(d.date).slice(0, 5) })), [data]);

  if (loading && !data) return <Loading label="Chargement du tableau de bord…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle={`Aujourd'hui — ${dateOnly(data.today.date)}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Ventes du jour" value={money(data.today.sales)} hint={`${data.today.salesCount} vente(s)`} icon={Receipt} />
        <StatCard label="Achats du jour" value={money(data.today.purchases)} icon={ShoppingCart} />
        <StatCard label="Dépenses du jour" value={money(data.today.expenses)} icon={Wallet} />
        <StatCard label="Bénéfice estimé" value={money(data.today.estimatedProfit)} icon={TrendingUp} tone={data.today.estimatedProfit >= 0 ? 'good' : 'bad'} />
        <StatCard label="Valeur du stock" value={money(data.stock.value)} icon={Boxes} />
        <StatCard label="Stocks faibles" value={data.stock.lowCount} icon={TriangleAlert} tone={data.stock.lowCount ? 'warn' : 'default'} />
        <StatCard label="Ruptures" value={data.stock.outCount} icon={PackageX} tone={data.stock.outCount ? 'bad' : 'default'} />
        <StatCard label="Produits actifs" value={data.stock.productCount} icon={Beef} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-steel-700">Ventes des 30 derniers jours (CDF)</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyChart}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C42B3B" stopOpacity={0.35} /><stop offset="95%" stopColor="#C42B3B" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F2" />
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={shortMoney} width={44} />
              <Tooltip formatter={(v) => money(v)} labelStyle={{ color: '#1B252B' }} />
              <Area type="monotone" dataKey="sales" name="Ventes" stroke="#C42B3B" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold text-steel-700">Alertes de stock</p>
          {data.stock.alerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-steel-500">Aucune alerte active.</p>
          ) : (
            <ul className="space-y-2">
              {data.stock.alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-steel-100 px-3 py-2 text-sm">
                  <div><p className="font-medium text-steel-800">{a.name}</p><p className="text-xs text-steel-500">{a.currentStock} {a.unit} / seuil {a.minimumStock}</p></div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
          <Link to="/stock" className="mt-3 block text-center text-sm font-medium text-cure-600 hover:underline">Voir tous les stocks</Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-steel-700">Ventes mensuelles (CDF)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F2" />
              <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={shortMoney} width={44} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="sales" name="Ventes" fill="#0284C7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold text-steel-700">Produits les plus vendus (30 j)</p>
          <ul className="space-y-2">
            {data.topProducts.map((p, i) => (
              <li key={p.productId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 truncate"><span className="text-steel-400">{i + 1}.</span>{p.name}</span>
                <span className="shrink-0 font-medium text-steel-700">{money(p.total)}</span>
              </li>
            ))}
            {!data.topProducts.length && <p className="py-6 text-center text-sm text-steel-500">Aucune vente sur la période.</p>}
          </ul>
        </div>
      </div>

      <div className="mt-4 card p-4">
        <p className="mb-3 text-sm font-semibold text-steel-700">Évolution de la valeur du stock</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.stockEvolution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F2" />
            <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(d) => dateOnly(d).slice(0, 5)} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={shortMoney} width={44} />
            <Tooltip formatter={(v) => money(v)} labelFormatter={(d) => dateOnly(d)} />
            <Line type="monotone" dataKey="value" name="Valeur du stock" stroke="#1F7A5A" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
