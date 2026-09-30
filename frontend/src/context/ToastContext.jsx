import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const STYLES = {
  success: ['border-leaf-600', 'text-leaf-600', CheckCircle2],
  error: ['border-cure-600', 'text-cure-600', XCircle],
  warning: ['border-amber2-600', 'text-amber2-600', AlertTriangle],
};

/** Notifications : « Enregistré », « Stock insuffisant »… (composant Notification du cahier des charges) */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 8000 : 4000);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    warning: (m) => push('warning', m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[100] flex w-[min(92vw,26rem)] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => {
          const [border, color, Icon] = STYLES[t.type];
          return (
            <div key={t.id} className={`flex items-start gap-3 rounded-md border-l-4 bg-white p-3 shadow-lg ${border}`}>
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
              <p className="flex-1 text-sm text-steel-800">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Fermer" className="text-steel-400 hover:text-steel-700"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
