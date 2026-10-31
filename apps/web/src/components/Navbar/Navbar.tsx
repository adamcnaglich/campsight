import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { useMe } from '../../hooks/useMe';
import { Text } from '../Text';
import { Button } from '../Button';
import styles from './Navbar.module.scss';

export const Navbar = () => {
  const { data: me } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNewWatchClick = (e: React.MouseEvent) => {
    if (location.pathname === '/new') {
      e.preventDefault();
      navigate('/new', { state: { resetNewWatch: true } });
    }
  };

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
    { path: '/admin', label: 'Admin' },
  ];

  const avatarInitial = me?.displayName?.[0] || me?.email?.[0] || '🏕️';

  const renderNavLinks = () =>
    navItems.map((item) => (
      <Button
        key={item.path}
        className={styles.navLink}
        size="compact"
        as={({ children, className, ...props }) => (
          <Link
            to={item.path}
            className={className}
            onClick={item.path === '/new' ? handleNewWatchClick : undefined}
            {...props}
          >
            {children}
          </Link>
        )}
        variant="ghost"
        level={location.pathname.startsWith(item.path) ? 'success' : undefined}
      >
        {item.label}
      </Button>
    ));

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/dashboard" className={styles.logo}>
            <span className={styles.logoIcon}>🏕️</span>
            <Text variant="h2" className={styles.logoText}>
              CampSight
            </Text>
          </Link>

          <nav className={styles.nav}>{renderNavLinks()}</nav>

          <div className={styles.userSection}>
            <Link
              to="/settings"
              className={styles.avatarButton}
              aria-label="Settings"
            >
              <span className={styles.avatarPlaceholder}>{avatarInitial}</span>
            </Link>
          </div>

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
        </div>
      </header>

      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}
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
        <nav className={styles.mobileNav}>{renderNavLinks()}</nav>
        <div className={styles.mobileUserSection}>
          <Link
            to="/settings"
            className={styles.mobileSettingsLink}
            onClick={() => setMenuOpen(false)}
          >
            <span className={styles.avatarPlaceholder}>{avatarInitial}</span>
            <span>Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
};
