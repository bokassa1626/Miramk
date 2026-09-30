import { useCallback, useEffect, useRef, useState } from 'react';
import { get, errorMessage } from '../services/api.js';

/**
 * Pagination par curseur Firestore (pas d'offset coûteux) :
 * garde la pile des curseurs pour permettre « Précédent » sans relire tout.
 */
export default function usePaged(endpoint, params = {}, limit = 20) {
  const key = JSON.stringify({ endpoint, params, limit });
  const [cursors, setCursors] = useState([null]);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const load = useCallback((cursor) => {
    setLoading(true);
    setError(null);
    const clean = Object.fromEntries(Object.entries(paramsRef.current).filter(([, v]) => v !== '' && v != null));
    return get(endpoint, { ...clean, limit, cursor: cursor || undefined })
      .then(setData)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [endpoint, limit]);

  // Changement de filtres → retour à la première page
  useEffect(() => { setCursors([null]); setPage(0); load(null); }, [key, load]);

  const next = () => {
    if (!data.nextCursor) return;
    const c = [...cursors.slice(0, page + 1), data.nextCursor];
    setCursors(c); setPage(page + 1); load(data.nextCursor);
  };
  const prev = () => {
    if (page === 0) return;
    setPage(page - 1); load(cursors[page - 1]);
  };
  const reload = () => load(cursors[page]);

  return { items: data.items, loading, error, page, hasNext: !!data.nextCursor, hasPrev: page > 0, next, prev, reload };
}
