import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; mode?: Mode } | null;
  const [mode, setMode] = useState<Mode>(state?.mode ?? 'signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const from = state?.from ?? '/accueil';

  if (!isSupabaseConfigured) {
    return (
      <div>
        <header className="page-header">
          <div>
            <h1>Connexion</h1>
            <p>Supabase n’est pas configuré.</p>
          </div>
        </header>
        <div className="panel">
          <p>
            Renseigne <code>VITE_SUPABASE_URL</code> et{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> dans <code>.env</code>, puis
            exécute <code>supabase/schema.sql</code>. En attendant, l’app
            fonctionne en local sans compte.
          </p>
        </div>
      </div>
    );
  }

  if (auth.ready && auth.user) {
    return <Navigate to={from} replace />;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        await auth.signIn(email.trim(), password);
        navigate(from, { replace: true });
        return;
      }
      await auth.signUp(email.trim(), password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: Number(age),
        weightKg: Number(weightKg.replace(',', '.')),
      });
      navigate(from, { replace: true });
    } catch (err) {
      setMessage(translateError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="hero-home">
        <h1>
          Sporti<em>vis</em>
        </h1>
        <p className="lead">
          Connecte-toi pour accéder à tes exercices, tes programmes et ton
          historique, synchronisés sur tous tes appareils.
        </p>
      </section>

      <form className="panel auth-card" onSubmit={submit}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
          {mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
        </h2>

        {mode === 'signup' && (
          <div className="auth-profile-fields">
            <div className="field">
              <label htmlFor="signup-first-name">Prénom</label>
              <input
                id="signup-first-name"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="signup-last-name">Nom</label>
              <input
                id="signup-last-name"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="signup-age">Âge</label>
              <input
                id="signup-age"
                type="number"
                min={13}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="signup-weight">Poids (kg)</label>
              <input
                id="signup-weight"
                type="number"
                min={30}
                max={300}
                step={0.5}
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {message && (
          <p className="muted" style={{ marginBottom: '0.85rem' }}>
            {message}
          </p>
        )}

        <div className="row-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? '…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setMessage(null);
            }}
          >
            {mode === 'signin' ? 'Pas encore de compte ?' : 'J’ai déjà un compte'}
          </button>
        </div>
      </form>
    </div>
  );
}

function translateError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(raw)) {
    return 'Email ou mot de passe incorrect.';
  }
  if (/user already registered/i.test(raw)) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (/connexion directe doit être activée/i.test(raw)) {
    return 'La connexion directe doit être activée dans les réglages Supabase.';
  }
  if (/password should be at least/i.test(raw)) {
    return 'Mot de passe trop court (6 caractères minimum).';
  }
  return raw;
}
