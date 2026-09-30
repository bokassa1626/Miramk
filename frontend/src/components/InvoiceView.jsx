import { money, qty, dateOnly, timeOnly } from '../utils/format.js';
import { paymentLabel } from '../utils/labels.js';

/** Zone imprimable de la facture (composant .print-area, cahier des charges §14) */
export default function InvoiceView({ sale, company }) {
  if (!sale) return null;
  return (
    <div className="print-area mx-auto max-w-xl bg-white p-6 text-sm text-steel-900">
      <div className="mb-4 text-center">
        {company?.logo && <img src={company.logo} alt="Logo de l'entreprise" className="mx-auto mb-2 max-h-16 max-w-40 object-contain" />}
        <p className="font-display text-lg font-bold">{company?.companyName || 'BOUCHERIE MIRA-MK'}</p>
        {company?.address && <p className="text-xs text-steel-600">{company.address}</p>}
        {company?.phone && <p className="text-xs text-steel-600">Tél. : {company.phone}</p>}
        {company?.email && <p className="text-xs text-steel-600">E-mail : {company.email}</p>}
      </div>
      <div className="mb-3 flex justify-between border-y border-steel-200 py-2 text-xs">
        <div><p className="font-semibold">Facture {sale.invoiceNumber}</p><p>Vente {sale.saleNumber}</p></div>
        <div className="text-right"><p>{dateOnly(sale.createdAt)}</p><p>{timeOnly(sale.createdAt)}</p></div>
      </div>
      {sale.customerName && <p className="mb-2 text-xs">Client : <span className="font-medium">{sale.customerName}</span></p>}
      <table className="w-full text-xs">
        <thead><tr className="border-b border-steel-300 text-left"><th className="py-1">Produit</th><th className="py-1 text-right">Qté</th><th className="py-1 text-right">P.U.</th><th className="py-1 text-right">Total</th></tr></thead>
        <tbody>
          {sale.items.map((it, i) => (
            <tr key={i} className="border-b border-steel-100">
              <td className="py-1">{it.productName}</td>
              <td className="py-1 text-right">{qty(it.quantity, it.unit)}</td>
              <td className="py-1 text-right">{money(it.unitPrice)}</td>
              <td className="py-1 text-right">{money(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between"><span>Sous-total</span><span>{money(sale.subtotal)}</span></div>
        {sale.discount > 0 && <div className="flex justify-between"><span>Remise</span><span>-{money(sale.discount)}</span></div>}
        <div className="flex justify-between border-t border-steel-300 pt-1 text-sm font-bold"><span>TOTAL</span><span>{money(sale.total)}</span></div>
        <div className="flex justify-between"><span>Montant payé ({paymentLabel(sale.paymentMethod)})</span><span>{money(sale.amountPaid)}</span></div>
        {sale.remainingAmount > 0 && <div className="flex justify-between font-medium text-cure-600"><span>Reste à payer</span><span>{money(sale.remainingAmount)}</span></div>}
      </div>
      <p className="mt-6 text-center text-[11px] text-steel-500">Merci pour votre confiance — {company?.companyName || 'Boucherie Mira-Mk'}</p>
    </div>
  );
}
