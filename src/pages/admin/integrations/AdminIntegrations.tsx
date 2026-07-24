import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, Plug, ToggleLeft, ToggleRight,
  Database, ShieldAlert,
} from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './AdminIntegrations.module.css';

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#c97b3c',
  google: '#4285f4',
  mistral: '#9b59b6',
  cohere: '#e74c3c',
  unknown: '#6b7280',
};

const STATUS_BADGE: Record<string, string> = {
  active: styles.badgeActive,
  inactive: styles.badgeInactive,
  error: styles.badgeError,
};

function formatDate(iso: string) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString();
}

export function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; display_name: string; provider: string; nextStatus: 'active' | 'inactive' } | null>(null);

  const fetchIntegrations = useCallback(async (q = search, p = providerFilter, s = statusFilter) => {
    setIsRefreshing(true);
    try {
      const data = await adminService.getIntegrations(q, p, s);
      setIntegrations(data);
    } catch (err) {
      console.error('[AdminIntegrations] fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, providerFilter, statusFilter]);

  useEffect(() => { fetchIntegrations(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchIntegrations(search, providerFilter, statusFilter), 350);
    return () => clearTimeout(t);
  }, [search, providerFilter, statusFilter]);

  const handleToggle = async () => {
    if (!confirm) return;
    setTogglingId(confirm.id);
    setConfirm(null);
    try {
      await adminService.updateIntegrationStatus(confirm.id, confirm.nextStatus);
      await fetchIntegrations();
    } catch (err) {
      console.error('[AdminIntegrations] toggle error:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    {
      header: 'Provider',
      accessorKey: 'provider',
      cell: (p: string) => (
        <div className={styles.providerCell}>
          <div
            className={styles.providerDot}
            style={{ background: PROVIDER_COLORS[p?.toLowerCase()] ?? PROVIDER_COLORS.unknown }}
          />
          {p}
        </div>
      ),
    },
    {
      header: 'Integration Name',
      accessorKey: 'display_name',
      cell: (name: string, row: any) => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
            API Preview: {row.api_key_preview || '—'}
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
      header: 'Status',
      accessorKey: 'status',
      cell: (status: string) => (
        <span className={`${styles.badge} ${STATUS_BADGE[status] ?? styles.badgeInactive}`}>
          {status}
        </span>
      ),
    },
    {
      header: 'Last Sync',
      accessorKey: 'last_sync_at',
      cell: (v: string, row: any) => (
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatDate(v)}</div>
          {row.error_message && (
            <span style={{ fontSize: 10, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <ShieldAlert size={10} /> {row.error_message}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (id: string, row: any) => {
        const isSuspended = row.status === 'inactive';
        return (
          <button
            className={`${styles.btnSmall} ${!isSuspended ? styles.btnSmallDanger : ''}`}
            disabled={togglingId === id}
            onClick={() => setConfirm({
              id,
              display_name: row.display_name,
              provider: row.provider,
              nextStatus: isSuspended ? 'active' : 'inactive',
            })}
            title={isSuspended ? 'Reactivate integration' : 'Suspend integration'}
          >
            {isSuspended ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {isSuspended ? 'Reactivate' : 'Suspend'}
          </button>
        );
      },
    },
  ];

  const activeCount = integrations.filter(i => row => row.status === 'active').length; // or calculate from overall
  const openaiCount = integrations.filter(i => i.provider?.toLowerCase() === 'openai').length;
  const anthropicCount = integrations.filter(i => i.provider?.toLowerCase() === 'anthropic').length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Integrations</h1>
          <p className={styles.subtitle}>
            Monitor and manage AI provider integrations across all customer organizations.
          </p>
        </div>
        <button
          className={styles.btnSecondary}
          onClick={() => fetchIntegrations()}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spin : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* KPI Row */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Plug size={13} /> Total Integrations</div>
          <div className={styles.kpiValue}>{isLoading ? '—' : integrations.length}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Plug size={13} /> OpenAI</div>
          <div className={styles.kpiValue}>{isLoading ? '—' : openaiCount}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Plug size={13} /> Anthropic</div>
          <div className={styles.kpiValue}>{isLoading ? '—' : anthropicCount}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Database size={13} /> Total Providers</div>
          <div className={styles.kpiValue}>
            {isLoading ? '—' : new Set(integrations.map(i => i.provider)).size}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search integration or org…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={providerFilter}
          onChange={e => setProviderFilter(e.target.value)}
        >
          <option value="all">All Providers</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google</option>
          <option value="mistral">Mistral</option>
          <option value="cohere">Cohere</option>
        </select>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Suspended</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <DataTable
          data={integrations}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No AI integrations found."
        />
      </div>

      {/* Confirm Modal */}
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
              {confirm.nextStatus === 'active' ? 'Reactivate' : 'Suspend'} Integration?
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
              {confirm.nextStatus === 'active'
                ? `"${confirm.display_name}" (${confirm.provider}) will be reactivated and proxy requests can proceed.`
                : `"${confirm.display_name}" (${confirm.provider}) will be suspended. Proxy calls using this integration will be blocked instantly.`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleToggle}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius)',
                  background: confirm.nextStatus === 'active' ? '#16a34a' : '#ef4444',
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
