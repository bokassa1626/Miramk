import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api.js';

/** useFetch(() => get('/products'), [deps]) → { data, loading, error, reload } */
export default function useFetch(fetcher, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const run = useCallback(() => {
    if (!enabled) return Promise.resolve();
    setLoading(true);
    setError(null);
    return fetchRef.current()
      .then(setData)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [enabled]); // eslint-disable-line

  useEffect(() => { run(); }, [run, ...deps]); // eslint-disable-line
  return { data, loading, error, reload: run };
}
