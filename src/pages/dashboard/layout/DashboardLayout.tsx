import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Sidebar } from '../../../components/dashboard/Sidebar/Sidebar';
import { Topbar } from '../../../components/dashboard/Topbar/Topbar';
import { Button } from '../../../components/ui/Button/Button';
import { PrivateNoIndex } from '../../../components/seo/PrivateNoIndex';
import { supabase } from '../../../lib/supabase';
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

interface AccessState {
  hasAccess: boolean;
  source: 'trial' | 'subscription' | 'none';
  daysLeft?: number;
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [access, setAccess] = useState<AccessState | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/organization/access', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await res.json();
        if (!cancelled && res.ok) setAccess(body.data);
      } catch (err) {
        console.error('[DashboardLayout] access check failed:', err);
        // Fail open rather than locking someone out over a network hiccup —
        // the backend is still the real source of truth for anything
        // sensitive; this gate is a UX nudge, not the security boundary.
        if (!cancelled) setAccess({ hasAccess: true, source: 'none' });
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const title = Object.entries(titleMap).find(([path]) =>
    path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(path),
  )?.[1] ?? 'Dashboard';

  if (checkingAccess) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--color-border)', borderTopColor: 'var(--color-green)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (access && !access.hasAccess) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)', padding: 20 }}>
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg, 12px)', padding: 40, maxWidth: 460, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-tertiary)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={26} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Your free trial has ended</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6, fontSize: 14 }}>
            Your 14-day trial is over. Pick a plan to keep using your dashboard —
            your data and settings are all still here.
          </p>
          <Button onClick={() => navigate('/settings/billing')}>View Plans</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <PrivateNoIndex />
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={styles.main}>
        <Topbar title={title} onMenuToggle={() => setMobileOpen(true)} />
        {access?.source === 'trial' && access.daysLeft !== undefined && (
          <div className={styles.trialBanner}>
            {access.daysLeft === 0
              ? 'Your trial ends today.'
              : `${access.daysLeft} day${access.daysLeft === 1 ? '' : 's'} left in your free trial.`}
            {' '}
            <button type="button" className={styles.trialBannerLink} onClick={() => navigate('/settings/billing')}>
              Upgrade now
            </button>
          </div>
        )}
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
