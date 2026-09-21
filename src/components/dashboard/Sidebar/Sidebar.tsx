import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, DollarSign, TrendingUp, PiggyBank, Activity,
  FileText, Plug, Bell, BarChart2, MessageSquare, LogOut, ShieldAlert,
  PanelLeftClose, PanelLeftOpen, Settings
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

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Observability & Spend',
    items: [
      { label: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Cost Analytics', path: '/dashboard/cost-analytics', icon: <DollarSign size={18} /> },
      { label: 'API Usage', path: '/dashboard/api-usage', icon: <Activity size={18} /> },
    ],
  },
  {
    title: 'Control & Operations',
    items: [
      { label: 'Budget Manager', path: '/dashboard/budget-manager', icon: <PiggyBank size={18} /> },
      { label: 'Alerts', path: '/dashboard/alerts', icon: <Bell size={18} /> },
      { label: 'Benchmarks', path: '/dashboard/benchmarks', icon: <BarChart2 size={18} /> },
      { label: 'Reports', path: '/dashboard/reports', icon: <FileText size={18} /> },
      { label: 'ROI Calculator', path: '/dashboard/roi-calculator', icon: <TrendingUp size={18} /> },
    ],
  },
  {
    title: 'Developer Tools',
    items: [
      { label: 'Playground', path: '/dashboard/playground', icon: <MessageSquare size={18} /> },
      { label: 'Integrations', path: '/dashboard/integrations', icon: <Plug size={18} /> },
    ],
  },
  {
    title: 'Account & Admin',
    items: [
      { label: 'Settings', path: '/settings/profile', icon: <Settings size={18} /> },
    ],
  },
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

  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    return localStorage.getItem('ordisum_sidebar_pinned') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ordisum_sidebar_pinned', String(isPinned));
  }, [isPinned]);

  const expanded = isPinned || isHovered || mobileOpen;

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  const togglePin = () => {
    setIsPinned((prev) => !prev);
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
        aria-label="Sidebar"
      >
        <div className={styles.logo}>
          <img
            src="/ordisum-logo.png"
            alt="ORDISUM"
            className={expanded ? styles.logoImg : styles.logoImgCollapsed}
          />
          {expanded && (
            <button
              type="button"
              className={styles.pinBtn}
              onClick={togglePin}
              aria-label={isPinned ? 'Collapse sidebar' : 'Pin sidebar expanded'}
              aria-expanded={isPinned}
              title={isPinned ? 'Collapse sidebar' : 'Pin sidebar expanded'}
            >
              {isPinned ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          )}
        </div>

        <nav className={styles.nav} aria-label="Main Navigation">
          {navSections.map((section) => (
            <div key={section.title} className={styles.navSection}>
              {expanded && (
                <div className={styles.navSectionHeader}>
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                    onClick={() => handleNav(item.path)}
                    title={!expanded ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {expanded && <span className={styles.navLabel}>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}

          {isPlatformAdmin && (
            <div className={styles.navSection}>
              {expanded && <div className={styles.navSectionHeader}>Platform Admin</div>}
              <button
                type="button"
                className={`${styles.navItem} ${isActive('/admin') ? styles.navItemActive : ''}`}
                style={{ color: '#ef4444' }}
                onClick={() => handleNav('/admin')}
                title={!expanded ? 'Admin Workspace' : undefined}
                aria-current={isActive('/admin') ? 'page' : undefined}
              >
                <span className={styles.navIcon}><ShieldAlert size={18} /></span>
                {expanded && <span className={styles.navLabel}>Admin Workspace</span>}
              </button>
            </div>
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
          <button
            type="button"
            className={styles.signOutBtn}
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
