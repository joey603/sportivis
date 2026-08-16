import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Layout() {
  const auth = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = !isSupabaseConfigured || Boolean(auth.user);
  const brandTo = signedIn ? '/accueil' : '/connexion';

  const privateLinks = [
    { to: '/accueil', label: t('nav.home') },
    { to: '/exercices', label: t('nav.exercises') },
    { to: '/programmes', label: t('nav.programs') },
    { to: '/historique', label: t('nav.history') },
    { to: '/compte', label: t('nav.account') },
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <header className={signedIn ? 'top-nav nav-collapsible' : 'top-nav'}>
        <NavLink to={brandTo} className="brand">
          Sporti<span>vis</span>
        </NavLink>

        <div className="nav-tools">
          <LanguageSwitcher />
          {signedIn && (
            <button
              type="button"
              className={menuOpen ? 'nav-toggle open' : 'nav-toggle'}
              aria-label={menuOpen ? t('nav.menuClose') : t('nav.menuOpen')}
              aria-expanded={menuOpen}
              aria-controls="nav-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          )}
        </div>

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
          aria-label={t('nav.main')}
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
              {t('nav.login')}
            </NavLink>
          )}
          {isSupabaseConfigured && auth.user && (
            <div className="nav-user">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void auth.signOut()}
              >
                {t('nav.logout')}
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
