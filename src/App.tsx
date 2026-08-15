import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { Account } from './pages/Account';
import { Dashboard } from './pages/Dashboard';
import { Exercises } from './pages/Exercises';
import { History } from './pages/History';
import { Login } from './pages/Login';
import { ProgramEditor } from './pages/ProgramEditor';
import { Programs } from './pages/Programs';
import { Workout } from './pages/Workout';
import { isSupabaseConfigured } from './lib/supabase';

function RootRedirect() {
  const auth = useAuth();

  if (!isSupabaseConfigured) {
    return <Navigate to="/accueil" replace />;
  }

  if (!auth.ready) {
    return <p className="muted">Vérification de la session…</p>;
  }

  return (
    <Navigate to={auth.user ? '/accueil' : '/connexion'} replace />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<RootRedirect />} />
            <Route path="connexion" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route path="accueil" element={<Dashboard />} />
              <Route path="exercices" element={<Exercises />} />
              <Route path="programmes" element={<Programs />} />
              <Route path="programmes/:id" element={<ProgramEditor />} />
              <Route path="seance/:programId" element={<Workout />} />
              <Route path="historique" element={<History />} />
              <Route path="compte" element={<Account />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
