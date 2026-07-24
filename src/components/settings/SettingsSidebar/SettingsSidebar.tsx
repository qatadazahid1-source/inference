import { useNavigate, useLocation } from 'react-router-dom';
import { User, Shield, Bell, Building2, Users, CreditCard } from 'lucide-react';
import { Avatar } from '../../ui/Avatar/Avatar';
import { useAuth } from '../../../hooks/useAuth';
import styles from './SettingsSidebar.module.css';

const navItems = [
  { label: 'Profile', path: '/settings/profile', icon: <User size={18} /> },
  { label: 'Security', path: '/settings/security', icon: <Shield size={18} /> },
  { label: 'Notifications', path: '/settings/notifications', icon: <Bell size={18} /> },
  { label: 'Organization', path: '/settings/organization', icon: <Building2 size={18} /> },
  { label: 'Team', path: '/settings/team', icon: <Users size={18} /> },
  { label: 'Billing', path: '/settings/billing', icon: <CreditCard size={18} /> },
];

export function SettingsSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.heading}>Settings</h2>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className={styles.userSection}>
        <Avatar name={user?.full_name ?? 'User'} size="sm" />
        <div>
          <div className={styles.userName}>{user?.full_name ?? 'User'}</div>
          <div className={styles.userEmail}>{user?.email ?? ''}</div>
        </div>
      </div>
    </aside>
  );
}
