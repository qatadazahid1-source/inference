import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../../../components/dashboard/Sidebar/Sidebar';
import { Topbar } from '../../../components/dashboard/Topbar/Topbar';
import styles from './DashboardLayout.module.css';

const titleMap: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/cost-analytics': 'Cost Analytics',
  '/dashboard/roi-calculator': 'ROI Calculator',
  '/dashboard/budget-manager': 'Budget Manager',
  '/dashboard/api-usage': 'API Usage',
  '/dashboard/reports': 'Reports',
  '/dashboard/integrations': 'Integrations',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/benchmarks': 'Benchmarks',
};

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const title = Object.entries(titleMap).find(([path]) =>
    path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(path),
  )?.[1] ?? 'Dashboard';

  return (
    <div className={styles.layout}>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={styles.main}>
        <Topbar title={title} onMenuToggle={() => setMobileOpen(true)} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
