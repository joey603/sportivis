import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

const privateLinks = [
  { to: '/accueil', label: 'Accueil' },
  { to: '/exercices', label: 'Exercices' },
  { to: '/programmes', label: 'Programmes' },
  { to: '/historique', label: 'Historique' },
  { to: '/compte', label: 'Compte' },
];

export function Layout() {
  const auth = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = !isSupabaseConfigured || Boolean(auth.user);
  const brandTo = signedIn ? '/accueil' : '/connexion';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    // Empêche le défilement de la page derrière le panneau ouvert.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      {/* Hors session il ne reste qu'un lien : le menu latéral serait inutile. */}
      <header className={signedIn ? 'top-nav nav-collapsible' : 'top-nav'}>
        <NavLink to={brandTo} className="brand">
          Sporti<span>vis</span>
        </NavLink>

        {signedIn && (
          <button
            type="button"
            className={menuOpen ? 'nav-toggle open' : 'nav-toggle'}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            aria-controls="nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        )}

        {menuOpen && (
          <div
            className="nav-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        <nav
          id="nav-menu"
          className={menuOpen ? 'nav-links open' : 'nav-links'}
          aria-label="Navigation principale"
        >
          {signedIn &&
            privateLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {l.label}
              </NavLink>
            ))}
          {isSupabaseConfigured && auth.ready && !auth.user && (
            <NavLink
              to="/connexion"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              Connexion
            </NavLink>
          )}
          {isSupabaseConfigured && auth.user && (
            <div className="nav-user">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void auth.signOut()}
              >
                Déconnexion
              </button>
            </div>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
