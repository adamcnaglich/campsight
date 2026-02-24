import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { isAdmin } from '../../lib/admin';
import styles from './Navbar.module.scss';

export const Navbar = () => {
  const { user, signOut } = useAuthContext();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(e.target as Node)
      ) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarMenuOpen]);

  const logoHref = location.pathname === '/' ? '/' : '/dashboard';

  useEffect(() => {
    setMenuOpen(false);
    setAvatarMenuOpen(false);
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
    { path: '/new', label: 'New Watch' },
    { path: '/settings', label: 'Settings' },
  ];

  const userIsAdmin = isAdmin(user?.email);

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
                {userIsAdmin && (
                  <Link
                    to="/admin"
                    className={`${styles.navLink} ${
                      location.pathname.startsWith('/admin')
                        ? styles.navLinkActive
                        : ''
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </nav>

              <div className={styles.userSection} ref={avatarMenuRef}>
                <button
                  type="button"
                  className={styles.avatarButton}
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  aria-label="User menu"
                  aria-expanded={avatarMenuOpen}
                  aria-haspopup="true"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className={styles.avatar}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className={styles.avatarPlaceholder}>
                      {user.displayName?.[0] || user.email?.[0] || '?'}
                    </span>
                  )}
                </button>
                {avatarMenuOpen && (
                  <div className={styles.avatarPopover}>
                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        signOut();
                      }}
                      className={styles.popoverSignOutBtn}
                    >
                      Sign out
                    </button>
                  </div>
                )}
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
            {userIsAdmin && (
              <Link
                to="/admin"
                className={`${styles.mobileNavLink} ${
                  location.pathname.startsWith('/admin')
                    ? styles.mobileNavLinkActive
                    : ''
                }`}
              >
                Admin
              </Link>
            )}
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
            <button
              type="button"
              className={styles.mobileSignOutBtn}
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
            >
              Sign out
            </button>
          </div>
        </aside>
      )}
    </>
  );
};
