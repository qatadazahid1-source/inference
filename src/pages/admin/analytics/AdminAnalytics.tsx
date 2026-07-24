import { useState, useEffect } from 'react';
import { BarChart2, Users, Building2, Zap, DollarSign, RefreshCw, Link } from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './AdminAnalytics.module.css';

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#c97b3c',
  google: '#4285f4',
  mistral: '#9b59b6',
  cohere: '#e74c3c',
  unknown: '#6b7280',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [topOrgs, setTopOrgs] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = async () => {
    setIsRefreshing(true);
    try {
      const [ov, tr, orgs, prov] = await Promise.all([
        adminService.getAnalyticsOverview(),
        adminService.getAnalyticsUsageTrend(),
        adminService.getAnalyticsTopOrgs(),
        adminService.getAnalyticsProviderBreakdown(),
      ]);
      setOverview(ov);
      setTrend(tr);
      setTopOrgs(orgs);
      setProviders(prov);
    } catch (err) {
      console.error('[Analytics] fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Sparkline helpers
  const maxRequests = Math.max(...trend.map(d => d.requests), 1);
  const trendFirst = trend[0]?.date?.slice(5) ?? '';
  const trendLast = trend[trend.length - 1]?.date?.slice(5) ?? '';

  // Provider bar helpers
  const maxProviderSpend = Math.max(...providers.map(p => p.spend), 1);

  // Top orgs table columns
  const orgColumns = [
    { header: '#', accessorKey: '_rank', cell: (_: any, row: any) => topOrgs.indexOf(row) + 1 },
    { header: 'Organization', accessorKey: 'name' },
    { header: 'Requests (Month)', accessorKey: 'requests', cell: (v: number) => formatNumber(v) },
    { header: 'Spend (Month)', accessorKey: 'spend', cell: (v: number) => formatUSD(v) },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Platform Analytics</h1>
          <p className={styles.subtitle}>
            Real-time platform metrics — usage, spend, and activity across all organizations.
          </p>
        </div>
        <button
          className={styles.btnSecondary}
          onClick={fetchAll}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spin : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Building2 size={13} /> Organizations</div>
          <div className={styles.kpiValue}>
            {isLoading ? '—' : formatNumber(overview?.total_organizations ?? 0)}
          </div>
          <div className={styles.kpiSub}>Total registered</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Users size={13} /> Users</div>
          <div className={styles.kpiValue}>
            {isLoading ? '—' : formatNumber(overview?.total_users ?? 0)}
          </div>
          <div className={styles.kpiSub}>All accounts</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Link size={13} /> Active Integrations</div>
          <div className={styles.kpiValue}>
            {isLoading ? '—' : formatNumber(overview?.active_integrations ?? 0)}
          </div>
          <div className={styles.kpiSub}>Live AI providers</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><Zap size={13} /> Requests (This Month)</div>
          <div className={styles.kpiValue}>
            {isLoading ? '—' : formatNumber(overview?.monthly_api_requests ?? 0)}
          </div>
          <div className={styles.kpiSub}>{formatNumber(overview?.monthly_tokens_used ?? 0)} tokens</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><DollarSign size={13} /> Spend (This Month)</div>
          <div className={styles.kpiValue}>
            {isLoading ? '—' : formatUSD(overview?.monthly_spend_usd ?? 0)}
          </div>
          <div className={styles.kpiSub}>Across all providers</div>
        </div>
      </div>

      {/* ── Charts Row ─────────────────────────────────────── */}
      <div className={styles.chartsRow}>
        {/* Sparkline: Daily requests (30 days) */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>
              <BarChart2 size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Daily Requests — Last 30 Days
            </h2>
          </div>
          <div className={styles.chartBody}>
            {isLoading ? (
              <div className={styles.skeleton} style={{ height: 80 }} />
            ) : trend.length === 0 ? (
              <p className={styles.empty}>No data for this period.</p>
            ) : (
              <div className={styles.trendChart}>
                <div className={styles.sparklineWrapper}>
                  {trend.map((d, i) => (
                    <div
                      key={i}
                      className={styles.sparkBar}
                      style={{ height: `${Math.max(4, (d.requests / maxRequests) * 80)}px` }}
                      title={`${d.date}: ${d.requests} requests, ${formatUSD(d.spend)}`}
                    />
                  ))}
                </div>
                <div className={styles.trendLabels}>
                  <span>{trendFirst}</span>
                  <span>{trendLast}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Provider Breakdown Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Provider Spend — This Month</h2>
          </div>
          <div className={styles.chartBody}>
            {isLoading ? (
              <div className={styles.barChart}>
                {[1, 2, 3].map(i => <div key={i} className={styles.skeleton} style={{ height: 12, marginBottom: 8 }} />)}
              </div>
            ) : providers.length === 0 ? (
              <p className={styles.empty}>No provider data.</p>
            ) : (
              <div className={styles.barChart}>
                {providers.map((p) => (
                  <div key={p.provider} className={styles.barRow}>
                    <span className={styles.barLabel}>{p.provider}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${(p.spend / maxProviderSpend) * 100}%`,
                          background: PROVIDER_COLORS[p.provider.toLowerCase()] ?? '#16a34a',
                        }}
                      />
                    </div>
                    <span className={styles.barValue}>{formatUSD(p.spend)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Orgs Table ─────────────────────────────────── */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>Top Organizations by Spend — This Month</h2>
        </div>
        <DataTable
          data={topOrgs}
          columns={orgColumns}
          isLoading={isLoading}
          emptyMessage="No API usage recorded this month."
        />
      </div>
    </div>
  );
}
