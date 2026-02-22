import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import styles from './Navbar.module.scss';

export function Navbar() {
  const { user, signOut } = useAuthContext();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const logoHref = location.pathname === '/' ? '/' : '/dashboard';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/add', label: 'Add Watch' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to={logoHref} className={styles.logo}>
            <span className={styles.logoIcon}>🏕️</span>
            <span className={styles.logoText}>CampSight</span>
          </Link>

          {user ? (
            <>
              <nav className={styles.nav}>
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${styles.navLink} ${
                      location.pathname === item.path
                        ? styles.navLinkActive
                        : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className={styles.userSection}>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className={styles.avatar}
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className={styles.userName}>
                  {user.displayName || user.email}
                </span>
                <button onClick={signOut} className={styles.signOutBtn}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className={styles.signInBtn}>
              Sign in
            </Link>
          )}

          {user && (
            <button
              className={`${styles.menuToggle} ${menuOpen ? styles.menuToggleOpen : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <span />
              <span />
              <span />
            </button>
          )}
        </div>
      </header>

      {user && menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}
      {user && (
        <aside
          className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}
        >
          <nav className={styles.mobileNav}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.mobileNavLink} ${
                  location.pathname === item.path
                    ? styles.mobileNavLinkActive
                    : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.mobileUserSection}>
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className={styles.avatar}
                referrerPolicy="no-referrer"
              />
            )}
            <span className={styles.mobileUserName}>
              {user.displayName || user.email}
            </span>
            <button onClick={signOut} className={styles.mobileSignOutBtn}>
              Sign out
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
