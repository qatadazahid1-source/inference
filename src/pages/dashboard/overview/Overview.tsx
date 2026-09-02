import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { KPICard } from '../../../components/dashboard/KPICard/KPICard';
import type { CostOverTime, ModelAnalytics } from '../../../api/services/dashboard.service';
import { useAnalytics, useApiUsage } from '../../../hooks/queries/useDashboard';
import styles from './Overview.module.css';

const chartColors = {
  green: '#22c55e',
  teal: '#14b8a6',
  emerald: '#10b981',
  grid: 'rgba(64, 80, 85, 0.3)',
  text: '#64748b',
};

// Palette used to color one line per provider in the Cost Over Time chart.
// Providers are supplied dynamically by the backend (whichever the org
// actually has usage for), so lines are assigned colors by index rather than
// hardcoding openai/anthropic/google.
const providerLineColors = [
  '#22c55e', '#14b8a6', '#10b981', '#3b82f6', '#a855f7',
  '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
];

// Prettify a raw provider key (e.g. "google_ai") for chart legend labels.
function formatProviderName(provider: string): string {
  return provider
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Overview() {
  // Server state now flows through React Query. `useAnalytics` fetches
  // /api/analytics once (polling every 5s) and derives the overview KPIs,
  // cost-over-time series, and top-models data. `useApiUsage` fetches the
  // recent activity logs. Auth + error normalization come from the shared
  // axiosClient (Phase A).
  const analyticsQuery = useAnalytics(30);
  const usageQuery = useApiUsage(10);

  const overview = analyticsQuery.data?.overview ?? null;
  const chartData: CostOverTime[] = analyticsQuery.data?.costOverTime ?? [];
  const topModels: ModelAnalytics[] = analyticsQuery.data?.modelAnalytics ?? [];
  // Providers the org actually has usage for — drives one chart line each,
  // instead of three hardcoded openai/anthropic/google series.
  const providers: string[] = analyticsQuery.data?.providers ?? [];
  const usageLogs = usageQuery.data ?? [];

  // Preserve the original UX: show the loading screen only on the initial load
  // (before any overview data exists), and surface the first error message.
  const isLoading = analyticsQuery.isLoading || usageQuery.isLoading;
  const error = analyticsQuery.error ?? usageQuery.error;

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

  const kpiData = overview ? [
    { label: 'Total Spend (30d)', value: formatCurrency(overview.totalSpend), trend: 0, trendDirection: 'up' as const, icon: 'DollarSign' },
    { label: 'API Requests', value: overview.totalRequests.toLocaleString(), trend: 0, trendDirection: 'up' as const, icon: 'Activity' },
    { label: 'Avg Latency', value: `${overview.avgLatency}ms`, trend: 0, trendDirection: 'down' as const, icon: 'Zap' },
    { label: 'Total Tokens', value: overview.totalTokens.toLocaleString(), trend: 0, trendDirection: 'up' as const, icon: 'Activity' },
  ] : [
    { label: 'Total Spend (30d)', value: '$0.00', trend: 0, trendDirection: 'up' as const, icon: 'DollarSign' },
    { label: 'API Requests', value: '0', trend: 0, trendDirection: 'up' as const, icon: 'Activity' },
    { label: 'Avg Latency', value: '0ms', trend: 0, trendDirection: 'down' as const, icon: 'Zap' },
    { label: 'Total Tokens', value: '0', trend: 0, trendDirection: 'up' as const, icon: 'Activity' },
  ];

  if (isLoading && !overview) {
    return <div style={{ color: chartColors.text, padding: '2rem' }}>Loading dashboard data...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444', padding: '2rem' }}>Error loading data: {error.message}</div>;
  }

  return (
    <div>
      <div className={styles.kpiGrid}>
        {kpiData.map((kpi) => (
          <KPICard key={kpi.label} data={kpi} />
        ))}
      </div>

      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Cost Over Time</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartColors.text }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: chartColors.text }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card-hover)',
                    border: '1px solid rgba(64,80,85,0.5)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Legend />
                {providers.map((provider, i) => (
                  <Line
                    key={provider}
                    type="monotone"
                    dataKey={provider}
                    stroke={providerLineColors[i % providerLineColors.length]}
                    strokeWidth={2}
                    dot={false}
                    name={formatProviderName(provider)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: chartColors.text }}>
              No data available
            </div>
          )}
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top Models by Cost</h3>
          {topModels.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topModels} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: chartColors.text }} />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 11, fill: chartColors.text }} width={110} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card-hover)',
                    border: '1px solid rgba(64,80,85,0.5)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="total_cost" fill={chartColors.green} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: chartColors.text }}>
              No data available
            </div>
          )}
        </div>
      </div>

      <div className={styles.tableSection}>
        <h3 className={styles.tableTitle}>Recent API Activity</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {usageLogs.length > 0 ? (
                usageLogs.map((log: any, i: number) => (
                  <tr key={i}>
                    <td>{log.provider}</td>
                    <td>{log.model}</td>
                    <td>{log.total_tokens.toLocaleString()}</td>
                    <td className={styles.cost}>${log.cost_usd.toFixed(4)}</td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: chartColors.text, padding: '2rem 0' }}>
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
