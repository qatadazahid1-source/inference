import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, ChevronDown, User, Building2, LogOut } from 'lucide-react';
import { Avatar } from '../../ui/Avatar/Avatar';
import { useAuth } from '../../../hooks/useAuth';
import { useOrganization } from '../../../hooks/useOrganization';
import styles from './Topbar.module.css';

interface TopbarProps {
  title: string;
  onMenuToggle: () => void;
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <h1 className={styles.pageTitle}>{title}</h1>
      </div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.orgSwitcher}
          onClick={() => navigate('/settings/organization')}
          aria-label={`Switch organization. Current organization: ${organization.name}`}
        >
          {organization.name}
          <ChevronDown size={14} />
        </button>

        <button className={styles.notifBtn} aria-label="Notifications" onClick={() => navigate('/dashboard/alerts')}>
          <Bell size={20} />
          <span className={styles.notifBadge} aria-hidden="true" />
        </button>

        <div className={styles.userMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="User account menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <Avatar name={user?.full_name ?? 'User'} src={user?.avatar_url ?? undefined} size="md" />
          </button>

          {menuOpen && (
            <div className={styles.userDropdown} role="menu" aria-label="Account options">
              <div className={styles.userDropdownHeader}>
                <div className={styles.userDropdownName}>{user?.full_name ?? 'User'}</div>
                <div className={styles.userDropdownEmail}>{user?.email ?? ''}</div>
              </div>
              <button
                type="button"
                role="menuitem"
                className={styles.userDropdownItem}
                onClick={() => { setMenuOpen(false); navigate('/settings/profile'); }}
              >
                <User size={16} />
                Profile Settings
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.userDropdownItem}
                onClick={() => { setMenuOpen(false); navigate('/settings/organization'); }}
              >
                <Building2 size={16} />
                Organization Settings
              </button>
              <div className={styles.userDropdownDivider} role="separator" />
              <button
                type="button"
                role="menuitem"
                className={`${styles.userDropdownItem} ${styles.userDropdownDanger}`}
                onClick={() => { setMenuOpen(false); signOut(); }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
