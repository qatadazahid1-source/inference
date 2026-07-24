import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, DollarSign, TrendingUp, PiggyBank, Activity,
  FileText, Plug, Bell, BarChart2, MessageSquare, LogOut, ShieldAlert
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar/Avatar';
import { useAuth } from '../../../hooks/useAuth';
import { useAdminCheck } from '../../../hooks/useAdminCheck';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Cost Analytics', path: '/dashboard/cost-analytics', icon: <DollarSign size={18} /> },
  { label: 'ROI Calculator', path: '/dashboard/roi-calculator', icon: <TrendingUp size={18} /> },
  { label: 'Budget Manager', path: '/dashboard/budget-manager', icon: <PiggyBank size={18} /> },
  { label: 'API Usage', path: '/dashboard/api-usage', icon: <Activity size={18} /> },
  { label: 'Reports', path: '/dashboard/reports', icon: <FileText size={18} /> },
  { label: 'Integrations', path: '/dashboard/integrations', icon: <Plug size={18} /> },
  { label: 'Playground', path: '/dashboard/playground', icon: <MessageSquare size={18} /> },
  { label: 'Alerts', path: '/dashboard/alerts', icon: <Bell size={18} /> },
  { label: 'Benchmarks', path: '/dashboard/benchmarks', icon: <BarChart2 size={18} /> },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isPlatformAdmin } = useAdminCheck();

  // Supabase-style hover collapse: the sidebar sits collapsed (icons only) by
  // default and expands on hover without affecting layout flow underneath
  // (it overlays on top of content rather than pushing it). There is no
  // manual toggle button anymore — hover is the only way to expand.
  const [isHovered, setIsHovered] = useState(false);

  const expanded = isHovered || mobileOpen;

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  const sidebarClasses = [
    styles.sidebar,
    expanded ? styles.expanded : styles.collapsed,
    mobileOpen ? styles.sidebarOpen : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {mobileOpen && <div className={styles.mobileOverlay} onClick={onMobileClose} aria-hidden="true" />}
      <aside
        className={sidebarClasses}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={styles.logo}>
          <div className={styles.logoMark}>II</div>
          {expanded && <span className={styles.logoText}>Inference Intel.</span>}
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
              onClick={() => handleNav(item.path)}
              title={!expanded ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {expanded && <span className={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
          
          {isPlatformAdmin && (
            <>
              <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />
              <button
                className={`${styles.navItem} ${isActive('/admin') ? styles.navItemActive : ''}`}
                style={{ color: '#ef4444' }}
                onClick={() => handleNav('/admin')}
                title={!expanded ? 'Admin Panel' : undefined}
              >
                <span className={styles.navIcon}><ShieldAlert size={18} /></span>
                {expanded && <span className={styles.navLabel}>Admin Panel</span>}
              </button>
            </>
          )}
        </nav>


        <div className={styles.footer}>
          {expanded && (
            <button
              type="button"
              className={styles.footerUserBtn}
              onClick={() => handleNav('/settings/profile')}
              title="Profile settings"
            >
              <Avatar name={user?.full_name ?? 'User'} size="sm" />
              <div className={styles.footerInfo}>
                <div className={styles.footerName}>{user?.full_name ?? 'User'}</div>
                <div className={styles.footerEmail}>{user?.email ?? ''}</div>
              </div>
            </button>
          )}
          <button className={styles.signOutBtn} onClick={signOut} title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
