import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DollarSign, Building2, BarChart2, Activity,
  Users, PiggyBank, Plug, FileText, ArrowLeft, Link as LinkIcon, Tag, FileCode, Server, Bot, Newspaper,
} from 'lucide-react';
import styles from './AdminSidebar.module.css';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Pricing',       path: '/admin/pricing',       icon: <DollarSign size={18} /> },
  { label: 'Organizations', path: '/admin/organizations', icon: <Building2 size={18} /> },
  { label: 'Analytics',     path: '/admin/analytics',     icon: <BarChart2 size={18} /> },
  { label: 'System Health', path: '/admin/health',        icon: <Activity size={18} /> },
  { label: 'Users',         path: '/admin/users',         icon: <Users size={18} /> },
  { label: 'Budgets',       path: '/admin/budgets',       icon: <PiggyBank size={18} /> },
  { label: 'Integrations',  path: '/admin/integrations',  icon: <Plug size={18} /> },
  { label: 'AI Providers',  path: '/admin/providers',     icon: <Server size={18} /> },
  { label: 'Reports',       path: '/admin/reports',       icon: <FileText size={18} /> },
  { label: 'Site Links',       path: '/admin/site-links',       icon: <LinkIcon size={18} /> },
  { label: 'Landing Pricing',  path: '/admin/landing-pricing',  icon: <Tag size={18} /> },
  { label: 'AI Pricing Agent', path: '/admin/pricing-agent',    icon: <Bot size={18} /> },
  { label: 'Content Pages',    path: '/admin/pages',            icon: <FileCode size={18} /> },
  { label: 'Blog',             path: '/admin/blog',             icon: <Newspaper size={18} /> },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const expanded = isHovered;

  const isActive = (path: string) => location.pathname.startsWith(path);

  const sidebarClasses = [
    styles.sidebar,
    expanded ? styles.expanded : styles.collapsed,
  ].join(' ');

  return (
    <aside
      className={sidebarClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.logo}>
        <div className={styles.logoMark}>A</div>
        {expanded && (
          <div>
            <div className={styles.logoText}>Inference Intel.</div>
            <div className={styles.logoSubText}>Admin Panel</div>
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.path}
            id={`admin-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
            onClick={() => navigate(item.path)}
            title={!expanded ? item.label : undefined}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {expanded && <span className={styles.navLabel}>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/dashboard')}
          title={!expanded ? 'Back to Dashboard' : undefined}
        >
          <span className={styles.navIcon}><ArrowLeft size={16} /></span>
          {expanded && <span className={styles.backLabel}>Back to Dashboard</span>}
        </button>
      </div>
    </aside>
  );
}
