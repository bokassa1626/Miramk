import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading } from '../components/ui.jsx';

/** Protège une route par authentification et, optionnellement, par permission RBAC */
export default function ProtectedRoute({ perm }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loading label="Vérification de la session…" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (perm && !can(perm)) return <Navigate to="/" replace />;
  return <Outlet />;
}
