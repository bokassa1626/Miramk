/* Petits composants d'interface partagés : Loading, EmptyState, StatusBadge, StatCard, PageHeader, StockGauge, SearchBar, Pagination */
import { Loader2, Inbox, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS } from '../utils/labels.js';

export function Loading({ label = 'Chargement…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-12 text-sm text-steel-500 ${className}`} role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ title = 'Aucun résultat', hint, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Icon className="h-8 w-8 text-steel-300" />
      <p className="font-medium text-steel-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-steel-500">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="m-4 flex items-center justify-between gap-3 rounded-md border border-cure-100 bg-cure-50 p-3 text-sm text-cure-700">
      <span>{message}</span>
      {onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Réessayer</button>}
    </div>
  );
}

const BADGE = {
  green: 'bg-leaf-50 text-leaf-700', amber: 'bg-amber2-50 text-amber2-700',
  red: 'bg-cure-50 text-cure-700', gray: 'bg-steel-200 text-steel-600', blue: 'bg-steel-100 text-steel-700',
};
export function Badge({ color = 'gray', children }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[color]}`}>{children}</span>;
}
export function StatusBadge({ status }) {
  const [text, color] = STATUS[status] || [status || '—', 'gray'];
  return <Badge color={color}>{text}</Badge>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight text-steel-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-steel-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  const tones = { default: 'text-steel-900', good: 'text-leaf-700', bad: 'text-cure-600', warn: 'text-amber2-700' };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-steel-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-steel-400" />}
      </div>
      <p className={`mt-1 font-display text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-steel-500">{hint}</p>}
    </div>
  );
}

/**
 * Jauge de stock — l'élément visuel signature : une barre avec un repère au seuil minimum,
 * comme la marque sur une balance de boucher. Rouge en rupture, ambre sous le seuil.
 */
export function StockGauge({ current, minimum, className = '' }) {
  const max = Math.max(minimum * 2, current, 1);
  const pct = Math.min(100, (current / max) * 100);
  const tick = Math.min(100, (minimum / max) * 100);
  const color = current <= 0 ? 'bg-cure-600' : current <= minimum ? 'bg-amber2-600' : 'bg-leaf-600';
  return (
    <div className={`relative h-2 w-28 rounded-full bg-steel-200 ${className}`} role="img" aria-label={`Stock ${current}, seuil ${minimum}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      <div className="absolute -top-0.5 h-3 w-0.5 bg-steel-700" style={{ left: `${tick}%` }} title={`Seuil minimum : ${minimum}`} />
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
      <input className="input pl-9" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

/** Pagination : mode client (pages numérotées) ou mode curseur (précédent / suivant) */
export function Pagination({ page, pageCount, onPage, hasNext, hasPrev, onNext, onPrev, total }) {
  const cursorMode = onNext !== undefined;
  const canPrev = cursorMode ? hasPrev : page > 0;
  const canNext = cursorMode ? hasNext : page < pageCount - 1;
  return (
    <div className="no-print flex items-center justify-between gap-3 border-t border-steel-200 px-4 py-2.5 text-sm text-steel-500">
      <span>{cursorMode ? `Page ${page + 1}` : `${total ?? ''} résultat${total > 1 ? 's' : ''} — page ${page + 1} / ${Math.max(pageCount, 1)}`}</span>
      <div className="flex gap-1">
        <button className="btn-secondary btn-sm" disabled={!canPrev} onClick={() => (cursorMode ? onPrev() : onPage(page - 1))}><ChevronLeft className="h-4 w-4" /> Précédent</button>
        <button className="btn-secondary btn-sm" disabled={!canNext} onClick={() => (cursorMode ? onNext() : onPage(page + 1))}>Suivant <ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
