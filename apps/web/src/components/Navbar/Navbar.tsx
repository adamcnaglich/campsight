import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { useAuthContext } from '../../context/AuthContext';
import { isAdmin } from '../../lib/admin';
import { Text } from '../Text';
import { Button } from '../Button';
import styles from './Navbar.module.scss';

export const Navbar = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNewWatchClick = (e: React.MouseEvent) => {
    if (location.pathname === '/new') {
      e.preventDefault();
      navigate('/new', { state: { resetNewWatch: true } });
    }
  };

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
    { path: '/new', label: 'New Watch' },
  ];

  const userIsAdmin = isAdmin(user?.email);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to={logoHref} className={styles.logo}>
            <span className={styles.logoIcon}>🏕️</span>
            <Text variant="h2" className={styles.logoText}>
              CampSight
            </Text>
          </Link>

          {user ? (
            <>
              <nav className={styles.nav}>
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    className={styles.navLink}
                    size="compact"
                    as={({ children, className, ...props }) => (
                      <Link
                        to={item.path}
                        className={className}
                        onClick={
                          item.path === '/new' ? handleNewWatchClick : undefined
                        }
                        {...props}
                      >
                        {children}
                      </Link>
                    )}
                    variant="ghost"
                    level={
                      location.pathname === item.path ? 'success' : undefined
                    }
                  >
                    {item.label}
                  </Button>
                ))}
                {userIsAdmin && (
                  <Button
                    className={styles.navLink}
                    size="compact"
                    as={({ children, className, ...props }) => (
                      <Link to="/admin" className={className} {...props}>
                        {children}
                      </Link>
                    )}
                    variant="ghost"
                    level={
                      location.pathname.startsWith('/admin')
                        ? 'success'
                        : undefined
                    }
                  >
                    Admin
                  </Button>
                )}
              </nav>

              <div className={styles.userSection}>
                <Link
                  to="/settings"
                  className={styles.avatarButton}
                  aria-label="Settings"
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
                </Link>
              </div>
            </>
          ) : (
            <Link to="/login" className={styles.signInBtn}>
              Sign in
            </Link>
          )}

          {user && (
            <button
              className={classNames(styles.menuToggle, {
                [styles.menuToggleOpen]: menuOpen,
              })}
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
          className={classNames(styles.mobileMenu, {
            [styles.mobileMenuOpen]: menuOpen,
          })}
        >
          <button
            type="button"
            className={styles.mobileMenuClose}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <span aria-hidden>×</span>
          </button>
          <nav className={styles.mobileNav}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                className={styles.navLink}
                size="compact"
                as={({ children, className, ...props }) => (
                  <Link
                    to={item.path}
                    className={className}
                    onClick={
                      item.path === '/new' ? handleNewWatchClick : undefined
                    }
                    {...props}
                  >
                    {children}
                  </Link>
                )}
                variant="ghost"
                level={location.pathname === item.path ? 'success' : undefined}
              >
                {item.label}
              </Button>
            ))}
            {userIsAdmin && (
              <Button
                className={styles.navLink}
                size="compact"
                as={({ children, className, ...props }) => (
                  <Link to="/admin" className={className} {...props}>
                    {children}
                  </Link>
                )}
                variant="ghost"
                level={
                  location.pathname.startsWith('/admin') ? 'success' : undefined
                }
              >
                Admin
              </Button>
            )}
          </nav>
          <div className={styles.mobileUserSection}>
            <Link
              to="/settings"
              className={styles.mobileSettingsLink}
              onClick={() => setMenuOpen(false)}
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
              <span>Settings</span>
            </Link>
          </div>
        </aside>
      )}
    </>
  );
};
