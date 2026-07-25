import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, DollarSign, AlertTriangle,
  CheckCircle, TrendingUp, Bell, PiggyBank,
  PowerOff, Power,
} from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './AdminBudgets.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatUSD(n: number) { return `$${Number(n).toFixed(2)}`; }
function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CLASS: Record<string, string> = {
  healthy:  styles.badgeHealthy,
  moderate: styles.badgeModerate,
  warning:  styles.badgeWarning,
  critical: styles.badgeCritical,
  exceeded: styles.badgeExceeded,
};

const SEVERITY_CLASS: Record<string, string> = {
  info:     styles.severityInfo,
  warning:  styles.severityWarning,
  critical: styles.severityCritical,
  error:    styles.severityCritical,
};

function UtilizationBar({ pct, status }: { pct: number; status: string }) {
  const color =
    status === 'exceeded' ? '#ef4444' :
    status === 'critical' ? '#f87171' :
    status === 'warning'  ? '#f59e0b' :
    status === 'moderate' ? '#60a5fa' : '#22c55e';

  return (
    <div className={styles.progressWrapper}>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <span className={styles.progressLabel}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AdminBudgetsPage() {
  const [activeTab, setActiveTab] = useState<'budgets' | 'alerts'>('budgets');
  const [summary, setSummary] = useState<any>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; nextActive: boolean } | null>(null);

  const fetchAll = useCallback(async (q = search, sf = statusFilter) => {
    setIsRefreshing(true);
    try {
      const [sum, bdata, adata] = await Promise.all([
        adminService.getBudgetsSummary(),
        adminService.getBudgets(q, sf),
        adminService.getGlobalAlerts(),
      ]);
      setSummary(sum);
      setBudgets(bdata);
      setAlerts(adata);
    } catch (err) {
      console.error('[AdminBudgets] fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(search, statusFilter), 350);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  const handleToggle = async () => {
    if (!confirm) return;
    setTogglingId(confirm.id);
    setConfirm(null);
    try {
      await adminService.toggleBudgetHardLimit(confirm.id, confirm.nextActive);
      await fetchAll();
    } finally {
      setTogglingId(null);
    }
  };

  // Budget table columns
  const budgetColumns = [
    {
      header: 'Budget Name',
      accessorKey: 'name',
      cell: (name: string, row: any) => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {row.scope || 'Organization'} · {row.period}
          </div>
        </div>
      ),
    },
    {
      header: 'Organization',
      accessorKey: 'organizations',
      cell: (org: any) => (
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {org?.name ?? '—'}
        </span>
      ),
    },
    {
      header: 'Limit',
      accessorKey: 'amount',
      cell: (v: number, row: any) => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatUSD(v)}</div>
          {row.hard_limit && (
            <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>HARD LIMIT</span>
          )}
        </div>
      ),
    },
    {
      header: 'Spend / Utilization',
      accessorKey: 'current_spend',
      cell: (spend: number, row: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{formatUSD(spend)}</div>
          <UtilizationBar pct={row.utilization_pct} status={row.status} />
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (status: string) => (
        <span className={`${styles.badge} ${STATUS_CLASS[status] ?? styles.badgeHealthy}`}>{status}</span>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: (v: string) => <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatDate(v)}</span>,
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (id: string, row: any) => (
        <button
          className={`${styles.btnSmall} ${row.hard_limit ? styles.btnSmallDanger : ''}`}
          disabled={togglingId === id}
          onClick={() => setConfirm({ id, name: row.name, nextActive: !row.hard_limit })}
          title={row.hard_limit ? 'Disable hard-limit enforcement' : 'Enable hard-limit enforcement'}
        >
          {row.hard_limit ? <PowerOff size={12} /> : <Power size={12} />}
          {row.hard_limit ? 'Disable Hard Limit' : 'Enable Hard Limit'}
        </button>
      ),
    },
  ];

  // Alerts table columns
  const alertColumns = [
    {
      header: 'Severity',
      accessorKey: 'severity',
      cell: (v: string) => (
        <span className={`${styles.badge} ${SEVERITY_CLASS[v] ?? styles.severityInfo}`}>
          {v}
        </span>
      ),
    },
    {
      header: 'Organization',
      accessorKey: 'organizations',
      cell: (org: any) => org?.name ?? <span style={{ color: 'var(--color-text-muted)' }}>System</span>,
    },
    {
      header: 'Title',
      accessorKey: 'title',
      cell: (v: string) => <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{v}</span>,
    },
    {
      header: 'Message',
      accessorKey: 'message',
      cell: (v: string) => <span style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 300, display: 'block' }}>{v}</span>,
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: (v: string) => <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'replace' }}>{v?.replace(/_/g, ' ')}</span>,
    },
    {
      header: 'Read',
      accessorKey: 'is_read',
      cell: (v: boolean) => v
        ? <CheckCircle size={14} style={{ color: '#22c55e' }} />
        : <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>Unread</span>,
    },
    {
      header: 'Date',
      accessorKey: 'created_at',
      cell: (v: string) => <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatDate(v)}</span>,
    },
  ];

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Budgets & Alerts</h1>
          <p className={styles.subtitle}>
            Monitor budget utilization and alerts across all organizations.
          </p>
        </div>
        <button
          className={styles.btnSecondary}
          onClick={() => fetchAll()}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spin : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><PiggyBank size={13} /> Active Budgets</div>
          <div className={styles.kpiValue}>{summary?.total_budgets ?? '—'}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><DollarSign size={13} /> Total Allocated</div>
          <div className={styles.kpiValue}>{summary ? formatUSD(summary.total_allocated_usd) : '—'}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><AlertTriangle size={13} /> Exceeded</div>
          <div className={`${styles.kpiValue} ${summary?.exceeded_count > 0 ? styles.kpiValueDanger : ''}`}>
            {summary?.exceeded_count ?? '—'}
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><TrendingUp size={13} /> Critical (≥90%)</div>
          <div className={`${styles.kpiValue} ${summary?.critical_count > 0 ? styles.kpiValueWarning : ''}`}>
            {summary?.critical_count ?? '—'}
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Bell size={13} /> Unread Alerts</div>
          <div className={`${styles.kpiValue} ${unreadCount > 0 ? styles.kpiValueWarning : styles.kpiValueGreen}`}>
            {isLoading ? '—' : unreadCount}
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'budgets' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('budgets')}
        >
          Budgets ({budgets.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'alerts' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts {unreadCount > 0 && `(${unreadCount} unread)`}
        </button>
      </div>

      {/* ── Budgets Tab ───────────────────────────────────── */}
      {activeTab === 'budgets' && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search budget or org…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
          <div className={styles.tableCard}>
            <DataTable
              data={budgets}
              columns={budgetColumns}
              isLoading={isLoading}
              emptyMessage="No budgets found."
            />
          </div>
        </>
      )}

      {/* ── Alerts Tab ────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className={styles.tableCard}>
          <DataTable
            data={alerts}
            columns={alertColumns}
            isLoading={isLoading}
            emptyMessage="No alerts recorded."
          />
        </div>
      )}

      {/* ── Confirm Modal ─────────────────────────────────── */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: 28, maxWidth: 420, width: '100%'
          }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>
              {confirm.nextActive ? 'Enable' : 'Disable'} Hard Limit?
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
              {confirm.nextActive
                ? `"${confirm.name}" will start hard-blocking requests once its limit is reached.`
                : `"${confirm.name}" will stop hard-blocking requests — spend can exceed the limit without being enforced.`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleToggle}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius)',
                  background: confirm.nextActive ? '#16a34a' : '#ef4444',
                  border: 'none', color: '#fff', fontWeight: 500, cursor: 'pointer'
                }}
              >
                Confirm
              </button>
              <button className={styles.btnSecondary} onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
