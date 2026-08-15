import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Protège les pages de données. Sans Supabase configuré, l'app reste
 * utilisable en local : la barrière ne s'applique qu'en mode cloud.
 */
export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) return <Outlet />;

  if (!auth.ready) {
    return <p className="muted">Vérification de la session…</p>;
  }

  if (!auth.user) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
