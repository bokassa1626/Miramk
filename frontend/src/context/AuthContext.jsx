import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, session } from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!session.get());

  const logoutLocal = useCallback(() => { session.clear(); setUser(null); }, []);

  // Restaure la session au chargement
  useEffect(() => {
    if (!session.get()) return;
    get('/auth/me').then(setUser).catch(logoutLocal).finally(() => setLoading(false));
  }, [logoutLocal]);

  useEffect(() => {
    window.addEventListener('auth:expired', logoutLocal);
    return () => window.removeEventListener('auth:expired', logoutLocal);
  }, [logoutLocal]);

  const login = async (email, password) => {
    const data = await post('/auth/login', { email, password });
    session.set({ idToken: data.idToken, refreshToken: data.refreshToken });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await post('/auth/logout'); } catch { /* la session locale est supprimée dans tous les cas */ }
    logoutLocal();
  };

  const can = useCallback((perm) => {
    const p = user?.permissions || [];
    return p.includes('*') || p.includes(perm);
  }, [user]);

  const value = useMemo(() => ({ user, loading, login, logout, can }), [user, loading, can]); // eslint-disable-line
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
