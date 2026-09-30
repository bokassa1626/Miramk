import { Trash2 } from 'lucide-react';
import { Select, NumberInput } from './Form.jsx';
import { money, qty } from '../utils/format.js';

/** Ligne de panier réutilisée pour ventes et achats : produit, quantité, prix unitaire, total */
export default function CartLine({ line, products, priceField, onChange, onRemove, priceLabel = 'Prix unitaire' }) {
  const options = products.map((p) => ({ value: p.id, label: `${p.name}${p.code ? ` (${p.code})` : ''}` }));
  const product = products.find((p) => p.id === line.productId);
  const total = (line.quantity || 0) * (line[priceField] || 0);
  return (
    <div className="grid grid-cols-12 items-start gap-2 border-b border-steel-100 py-2 last:border-0">
      <div className="col-span-12 sm:col-span-5"><Select value={line.productId} onChange={(v) => onChange({ ...line, productId: v, [priceField]: products.find((p) => p.id === v)?.[priceField === 'unitPrice' ? 'sellingPrice' : priceField] ?? line[priceField] })} options={options} placeholder="Choisir un produit…" /></div>
      <div className="col-span-4 sm:col-span-2"><NumberInput value={line.quantity} onChange={(v) => onChange({ ...line, quantity: v })} step="0.001" placeholder="Qté" aria-label="Quantité" /></div>
      <div className="col-span-4 sm:col-span-2"><NumberInput value={line[priceField]} onChange={(v) => onChange({ ...line, [priceField]: v })} placeholder={priceLabel} aria-label={priceLabel} /></div>
      <div className="col-span-3 flex items-center justify-end pt-2 text-sm font-medium text-steel-700 sm:col-span-2">{money(total)}</div>
      <div className="col-span-1 flex justify-end pt-1"><button type="button" onClick={onRemove} className="text-steel-400 hover:text-cure-600" aria-label="Retirer la ligne"><Trash2 className="h-4 w-4" /></button></div>
      {product && line.quantity > (product.currentStock ?? Infinity) && priceField === 'unitPrice' && (
        <p className="col-span-12 -mt-1 text-xs text-cure-600">Stock disponible : {qty(product.currentStock, product.unit)}</p>
      )}
    </div>
  );
}
