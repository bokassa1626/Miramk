import { Field, Select, NumberInput } from './Form.jsx';
import { PAYMENT_METHODS } from '../utils/labels.js';

/** Bloc de paiement partagé (ventes, achats, encaissements) : mode, devise, montant */
export default function PaymentFields({ value, onChange, total, remainingLabel }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Field label="Mode" htmlFor="pay-method"><Select id="pay-method" value={value.method} onChange={(v) => onChange({ ...value, method: v })} options={PAYMENT_METHODS} /></Field>
      <Field label="Devise" htmlFor="pay-cur"><Select id="pay-cur" value={value.currency} onChange={(v) => onChange({ ...value, currency: v })} options={[{ value: 'CDF', label: 'CDF' }, { value: 'USD', label: 'USD' }]} /></Field>
      <Field label={remainingLabel || 'Montant payé'} htmlFor="pay-amt"><NumberInput id="pay-amt" value={value.amount} onChange={(v) => onChange({ ...value, amount: v })} /></Field>
    </div>
  );
}
