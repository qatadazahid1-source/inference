import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { KPICard } from '../../../components/dashboard/KPICard/KPICard';
import { DashboardService, DashboardOverview, CostOverTime, ModelAnalytics, ApiUsageLog } from '../../../api/services/dashboard.service';
import { useDataPolling } from '../../../hooks/useDataPolling';
import { useAuth } from '../../../hooks/useAuth';
import styles from './Overview.module.css';

const chartColors = {
  green: '#22c55e',
  teal: '#14b8a6',
  emerald: '#10b981',
  grid: 'rgba(64, 80, 85, 0.3)',
  text: '#64748b',
};

export function Overview() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<CostOverTime[]>([]);
  const [usageLogs, setUsageLogs] = useState<ApiUsageLog[]>([]);
  const [topModels, setTopModels] = useState<ModelAnalytics[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const [overviewData, costData, modelsData, usageData] = await Promise.all([
        DashboardService.getOverview(user.id),
        DashboardService.getCostOverTime(user.id, 30),
        DashboardService.getModelAnalytics(user.id),
        DashboardService.getApiUsage(user.id, 10),
      ]);
      setOverview(overviewData);
      setChartData(costData);
      setTopModels(modelsData);
      setUsageLogs(usageData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useDataPolling(fetchData, 5000);

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

  const kpiData = overview ? [
    { label: 'Total Spend (30d)', value: formatCurrency(overview.totalSpend), trend: 0, trendDirection: 'up' as const, icon: 'DollarSign' },
    { label: 'API Requests', value: overview.totalRequests.toString(), trend: 0, trendDirection: 'up' as const, icon: 'Activity' },
    { label: 'Avg Latency', value: `${overview.avgLatency}ms`, trend: 0, trendDirection: 'down' as const, icon: 'Zap' },
    { label: 'Time Saved', value: `${overview.timeSavedHours.toFixed(1)}h`, trend: 0, trendDirection: 'up' as const, icon: 'Activity' },
  ] : [
    { label: 'Total Spend (30d)', value: '$0.00', trend: 0, trendDirection: 'up' as const, icon: 'DollarSign' },
    { label: 'API Requests', value: '0', trend: 0, trendDirection: 'up' as const, icon: 'Activity' },
    { label: 'Avg Latency', value: '0ms', trend: 0, trendDirection: 'down' as const, icon: 'Zap' },
    { label: 'Time Saved', value: '0.0h', trend: 0, trendDirection: 'up' as const, icon: 'Activity' },
  ];

  if (isLoading && !overview) {
    return <div style={{ color: chartColors.text, padding: '2rem' }}>Loading dashboard data...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444', padding: '2rem' }}>Error loading data: {error}</div>;
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
                    background: '#1a2529',
                    border: '1px solid rgba(64,80,85,0.5)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Legend />
                <Line type="monotone" dataKey="openai" stroke={chartColors.green} strokeWidth={2} dot={false} name="OpenAI" />
                <Line type="monotone" dataKey="anthropic" stroke={chartColors.teal} strokeWidth={2} dot={false} name="Anthropic" />
                <Line type="monotone" dataKey="google" stroke={chartColors.emerald} strokeWidth={2} dot={false} name="Google AI" />
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
                    background: '#1a2529',
                    border: '1px solid rgba(64,80,85,0.5)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="cost" fill={chartColors.green} radius={[0, 4, 4, 0]} />
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
