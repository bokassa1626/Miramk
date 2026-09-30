import { useState } from 'react';
import Modal from './Modal.jsx';

/** Confirmation ; avec askReason, un motif (3 caractères min.) est exigé — ex. annulation d'une vente */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', danger, askReason, onConfirm, onCancel, busy }) {
  const [reason, setReason] = useState('');
  const invalid = askReason && reason.trim().length < 3;
  const close = () => { setReason(''); onCancel(); };
  return (
    <Modal open={open} onClose={close} title={title} size="sm"
      footer={(
        <>
          <button className="btn-secondary" onClick={close} disabled={busy}>Retour</button>
          <button className={danger ? 'btn-primary' : 'btn-primary'} disabled={busy || invalid}
            onClick={async () => { await onConfirm(reason.trim()); setReason(''); }}>{busy ? 'Traitement…' : confirmLabel}</button>
        </>
      )}>
      <p className="text-sm text-steel-700">{message}</p>
      {askReason && (
        <div className="mt-3">
          <label className="label" htmlFor="confirm-reason">Motif (obligatoire)</label>
          <textarea id="confirm-reason" className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
