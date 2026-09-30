import { useEffect, useState } from 'react';

/* Champs de formulaire réutilisables */
export function Field({ label, htmlFor, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-steel-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-cure-600">{error}</p>}
    </div>
  );
}

export function Select({ value, onChange, options, placeholder, id, className = '', ...rest }) {
  return (
    <select id={id} className={`input ${className}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function NumberInput({ value, onChange, id, min = 0, step = 'any', ...rest }) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const commit = (input, element) => {
    const normalized = String(input).replace(',', '.');
    if (normalized === '') {
      element.setCustomValidity('');
      onChange('');
      setDraft('');
      return;
    }

    if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
      element.setCustomValidity('Saisissez un nombre valide.');
      return;
    }

    const number = Number(normalized);
    const stepValue = Number(step);
    const validStep = step === 'any' || !Number.isFinite(stepValue) ||
      Math.abs(number / stepValue - Math.round(number / stepValue)) < 1e-8;
    if (min !== undefined && number < Number(min)) {
      element.setCustomValidity(`La valeur doit être supérieure ou égale à ${min}.`);
      return;
    }
    if (rest.max !== undefined && number > Number(rest.max)) {
      element.setCustomValidity(`La valeur doit être inférieure ou égale à ${rest.max}.`);
      return;
    }
    if (!validStep) {
      element.setCustomValidity(`Utilisez un pas de ${step}.`);
      return;
    }

    element.setCustomValidity('');
    setDraft(String(number));
    onChange(number);
  };

  return (
    <input {...rest} id={id} className={`input ${rest.className || ''}`} type="text" inputMode="decimal" value={draft}
      onChange={(e) => {
        const input = e.target.value;
        setDraft(input);
        e.target.setCustomValidity('');
        const normalized = input.replace(',', '.');
        if (normalized === '') onChange('');
        else if (/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) onChange(Number(normalized));
      }}
      onBlur={(e) => commit(e.target.value, e.target)} />
  );
}

/** Filtre de période AAAA-MM-JJ */
export function DateRange({ from, to, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input className="input w-auto" type="date" value={from} onChange={(e) => onChange({ from: e.target.value, to })} aria-label="Du" />
      <span className="text-steel-400">au</span>
      <input className="input w-auto" type="date" value={to} min={from} onChange={(e) => onChange({ from, to: e.target.value })} aria-label="Au" />
    </div>
  );
}
