import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(email.trim(), password); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sky-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600 font-display text-2xl font-bold text-white">M</div>
          <h1 className="font-display text-xl font-bold text-white">Boucherie Mira-Mk</h1>
          <p className="mt-1 text-sm text-sky-50/70">Système de gestion et de contrôle</p>
        </div>
        <form onSubmit={submit} className="rounded-xl bg-white p-6 shadow-xl">
          <div className="mb-4">
            <label className="label" htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" required autoFocus className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@mira-mk.cd" />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="password">Mot de passe</label>
            <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="mb-4 rounded-md bg-cure-50 px-3 py-2 text-sm text-cure-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Se connecter</button>
        </form>
        <p className="mt-6 text-center text-xs text-sky-50/60">Mitipisha, Gécamines, Avenue de Kinshasa, Lubumbashi</p>
      </div>
    </div>
  );
}
