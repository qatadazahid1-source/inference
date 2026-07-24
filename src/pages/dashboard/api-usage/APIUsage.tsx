import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DashboardService, ApiUsageLog } from '../../../api/services/dashboard.service';
import { useDataPolling } from '../../../hooks/useDataPolling';
import { useAuth } from '../../../hooks/useAuth';
import styles from './APIUsage.module.css';

const chartColors = {
  green: '#22c55e',
  grid: 'rgba(64, 80, 85, 0.3)',
  text: '#64748b',
};

export function APIUsage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('30D');
  const [usageLogs, setUsageLogs] = useState<ApiUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      // In a real setup, activeTab would filter the query limit/date range
      const usageData = await DashboardService.getApiUsage(user.id, 500);
      setUsageLogs(usageData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useDataPolling(fetchData, 5000);

  // These 4 summary cards and the provider chart are derived directly from
  // usageLogs (the real per-request data) rather than getModelAnalytics(),
  // which hardcodes `requests` and `tokens` to 0 and only has real cost data.
  const totalRequests = usageLogs.length;
  const totalTokens = usageLogs.reduce((acc, log) => acc + Number(log.total_tokens || 0), 0);
  const totalCost = usageLogs.reduce((acc, log) => acc + Number(log.cost_usd || 0), 0);

  const avgTokensPerReq = totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0;
  const avgCostPerReq = totalRequests > 0 ? (totalCost / totalRequests) : 0;

  // Group request counts by provider for the bar chart
  const requestsByProvider = usageLogs.reduce((acc: Record<string, number>, log) => {
    const provider = log.provider || 'unknown';
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});
  const barData = Object.entries(requestsByProvider).map(([name, requests]) => ({ name, requests }));

  if (isLoading && !usageLogs.length) {
    return <div style={{ color: chartColors.text, padding: '2rem' }}>Loading API usage...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>API Usage</h1>
        <div className={styles.dateTabs}>
          {['Today', '7D', '30D', 'All'].map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalRequests.toLocaleString()}</div>
          <div className={styles.statLabel}>Total Requests</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{avgTokensPerReq.toLocaleString()}</div>
          <div className={styles.statLabel}>Avg Tokens / Req</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalTokens.toLocaleString()}</div>
          <div className={styles.statLabel}>Total Tokens</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>${avgCostPerReq.toFixed(4)}</div>
          <div className={styles.statLabel}>Avg Cost / Req</div>
        </div>
      </div>

      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>API Requests by Provider</h3>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartColors.text }} />
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
              <Bar dataKey="requests" fill={chartColors.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: chartColors.text }}>
            No API usage tracked
          </div>
        )}
      </div>

      <div className={styles.tableCard}>
        <h3 className={styles.chartTitle}>API Usage Log</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Model</th>
              <th>Input Tokens</th>
              <th>Output Tokens</th>
              <th>Total Tokens</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {usageLogs.length > 0 ? (
              usageLogs.map((log: any, i: number) => (
                <tr key={i}>
                  <td>{log.provider}</td>
                  <td>{log.model}</td>
                  <td>{log.input_tokens.toLocaleString()}</td>
                  <td>{log.output_tokens.toLocaleString()}</td>
                  <td>{log.total_tokens.toLocaleString()}</td>
                  <td>${log.cost_usd.toFixed(4)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: chartColors.text, padding: '2rem 0' }}>
                  No API usage tracked
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
