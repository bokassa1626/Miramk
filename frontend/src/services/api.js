import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const KEY = 'mira_mk_session';

/**
 * Session : jetons Firebase émis par le backend (le frontend n'embarque aucun secret Firebase).
 * Stockés en localStorage ; pour un durcissement supplémentaire, voir README (cookies httpOnly).
 */
export const session = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  set(s) { localStorage.setItem(KEY, JSON.stringify(s)); },
  clear() { localStorage.removeItem(KEY); },
};

const api = axios.create({ baseURL, timeout: 30000 });

api.interceptors.request.use((cfg) => {
  const s = session.get();
  if (s?.idToken) cfg.headers.Authorization = `Bearer ${s.idToken}`;
  return cfg;
});

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    const s = session.get();
    const isAuthCall = original?.url?.includes('/auth/');
    if (err.response?.status === 401 && s?.refreshToken && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios.post(`${baseURL}/auth/refresh`, { refreshToken: s.refreshToken }).finally(() => { refreshing = null; });
        }
        const { data } = await refreshing;
        session.set({ ...s, idToken: data.data.idToken, refreshToken: data.data.refreshToken });
        original.headers.Authorization = `Bearer ${data.data.idToken}`;
        return api(original);
      } catch (e) {
        session.clear();
        window.dispatchEvent(new Event('auth:expired'));
      }
    }
    return Promise.reject(err);
  },
);

export const unwrap = (promise) => promise.then((r) => r.data.data);

export const errorMessage = (e) => {
  const d = e?.response?.data;
  if (Array.isArray(d?.error) && d.error.length) {
    return `${d.message} — ${d.error.map((x) => x.message).join(' ; ')}`;
  }
  return d?.message || (e?.code === 'ERR_NETWORK' ? 'Serveur injoignable. Vérifiez votre connexion.' : e?.message) || 'Une erreur est survenue';
};

export const get = (url, params) => unwrap(api.get(url, { params }));
export const post = (url, body) => unwrap(api.post(url, body));
export const put = (url, body) => unwrap(api.put(url, body));
export const del = (url) => unwrap(api.delete(url));

/** Téléchargement d'un fichier (CSV) avec le jeton d'authentification */
export const download = async (url, params, filename) => {
  const res = await api.get(url, { params, responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href; a.download = filename; a.click();
  URL.revokeObjectURL(href);
};

export default api;
