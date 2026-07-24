import { useState, useMemo } from 'react';
import {
  LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { DashboardService, CostOverTime, ModelAnalytics, ApiUsageLog } from '../../../api/services/dashboard.service';
import { useDataPolling } from '../../../hooks/useDataPolling';
import { useAuth } from '../../../hooks/useAuth';
import { exportToCSV } from '../../../utils/exportUtils';
import styles from './CostAnalytics.module.css';

const chartColors = {
  green: '#22c55e',
  teal: '#14b8a6',
  emerald: '#10b981',
  grid: 'rgba(64, 80, 85, 0.3)',
  text: '#64748b',
};



const pieColors = ['#22c55e', '#14b8a6', '#10b981', '#64748b', '#475569'];

// Same palette reused for the daily-spend line chart, since the set of
// providers shown there is now dynamic rather than three fixed names.
const lineColors = ['#22c55e', '#14b8a6', '#10b981', '#f59e0b', '#a855f7', '#64748b'];

// Standard 2-decimal formatting rounds any amount under half a cent down to
// "$0.00", which made real spend (e.g. $0.0001) look like zero on the KPI
// cards. This shows more decimals for small amounts so the real number is
// always visible, while staying compact for normal-sized spend.
function formatSmartCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs === 0) return '$0.00';
  if (abs < 0.01) {
    // Sub-cent: show up to 6 significant decimal places, trimmed of
    // trailing zeros (e.g. $0.0001, $0.000068), but never collapse to $0.00.
    const trimmed = abs.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.0');
    return `${sign}$${trimmed}`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

export function CostAnalytics() {
  const { user } = useAuth();
  type SortKey = 'date' | 'provider' | 'model' | 'inputTokens' | 'outputTokens' | 'totalTokens' | 'costUsd';
  type SortDir = 'asc' | 'desc';
  
  const [activeTab, setActiveTab] = useState<string>('30D');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [dailySpend, setDailySpend] = useState<CostOverTime[]>([]);
  const [topModels, setTopModels] = useState<ModelAnalytics[]>([]);
  const [usageLogsWithDates, setUsageLogsWithDates] = useState<ApiUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getDays = () => {
    switch (activeTab) {
      case '7D': return 7;
      case '90D': return 90;
      case 'YTD': return 365;
      case '30D':
      default: return 30;
    }
  };

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const days = getDays();
      const [costData, modelsData, usageData] = await Promise.all([
        DashboardService.getCostOverTime(user.id, days),
        DashboardService.getModelAnalytics(user.id),
        DashboardService.getApiUsage(user.id, 500),
      ]);
      setDailySpend(costData);
      setTopModels(modelsData);
      setUsageLogsWithDates(usageData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useDataPolling(fetchData, 5000);

  // Group topModels by model for the pie chart
  const providerCostData = useMemo(() => {
    return topModels.map(tm => ({
      name: tm.model,
      value: tm.total_cost
    }));
  }, [topModels]);

  // Derive which providers actually have data in the daily chart, instead
  // of assuming a fixed set (openai/anthropic/google) — a connected
  // provider like Groq wouldn't have matched those before, and any newly
  // connected provider should show up here automatically.
  const chartProviders = useMemo(() => {
    const known = new Set(['date', 'daily_cost']);
    const providers = new Set<string>();
    dailySpend.forEach((day) => {
      Object.keys(day).forEach((key) => {
        if (!known.has(key)) providers.add(key);
      });
    });
    return Array.from(providers);
  }, [dailySpend]);

  const totalSpend = dailySpend.reduce((acc, curr) => acc + (curr.daily_cost || 0), 0);
  const avgDailyCost = dailySpend.length ? totalSpend / dailySpend.length : 0;
  const highestDay = dailySpend.length ? Math.max(...dailySpend.map(d => d.daily_cost || 0)) : 0;
  
  const totalTokens = usageLogsWithDates.reduce((acc, log) => acc + log.total_tokens, 0);
  const costPer1k = totalTokens > 0 ? (totalSpend / totalTokens) * 1000 : 0;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedLogs = useMemo(() => {
    const sorted = [...usageLogsWithDates];
    sorted.sort((a: any, b: any) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return sorted;
  }, [sortKey, sortDir, usageLogsWithDates]);

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const handleExportCSV = () => {
    const exportData = sortedLogs.map(log => ({
      Date: new Date(log.timestamp).toLocaleString(),
      Model: log.model,
      InputTokens: log.input_tokens,
      OutputTokens: log.output_tokens,
      TotalTokens: log.total_tokens,
      CostUSD: log.cost_usd.toFixed(4)
    }));
    exportToCSV(exportData, 'cost_analytics_export');
  };

  if (isLoading && !dailySpend.length) {
    return <div style={{ color: chartColors.text, padding: '2rem' }}>Loading cost analytics...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Cost Analytics</h1>
        <div className={styles.dateTabs}>
          {['7D', '30D', '90D', 'YTD'].map((tab) => (
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

      <div className={styles.kpiGrid}>
        <div className={styles.chartCard}>
          <div className={styles.kpiLabel}>Total Spend</div>
          <div className={styles.kpiValue}>{formatSmartCurrency(totalSpend)}</div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.kpiLabel}>Avg Daily Cost</div>
          <div className={styles.kpiValue}>{formatSmartCurrency(avgDailyCost)}</div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.kpiLabel}>Highest Single Day</div>
          <div className={styles.kpiValue}>{formatSmartCurrency(highestDay)}</div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.kpiLabel}>Cost Per 1K Tokens</div>
          <div className={styles.kpiValue}>{formatSmartCurrency(costPer1k)}</div>
        </div>
      </div>

      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Daily Spend Trend</h3>
        {dailySpend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySpend}>
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
              {chartProviders.length > 0 ? (
                chartProviders.map((provider, index) => (
                  <Line
                    key={provider}
                    type="monotone"
                    dataKey={provider}
                    stroke={lineColors[index % lineColors.length]}
                    strokeWidth={2}
                    dot={false}
                    name={provider.charAt(0).toUpperCase() + provider.slice(1)}
                  />
                ))
              ) : (
                // No per-provider breakdown available (e.g. very old cached
                // data) — fall back to the total so the chart isn't empty.
                <Line type="monotone" dataKey="daily_cost" stroke={chartColors.green} strokeWidth={2} dot={false} name="Total" />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: chartColors.text }}>
            No cost data yet
          </div>
        )}
      </div>

      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Cost by Provider</h3>
          {providerCostData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={providerCostData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {providerCostData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1a2529',
                    border: '1px solid rgba(64,80,85,0.5)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: chartColors.text }}>
              No cost data yet
            </div>
          )}
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Cost by Model</h3>
          {topModels.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topModels} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: chartColors.text }} />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 11, fill: chartColors.text }} width={120} />
                <Tooltip
                  contentStyle={{
                    background: '#1a2529',
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
              No cost data yet
            </div>
          )}
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3 className={styles.chartTitle}>Usage Log</h3>
          <button className={styles.csvBtn} onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th onClick={() => handleSort('date')}>Date{sortIndicator('date')}</th>
                <th onClick={() => handleSort('provider')}>Provider{sortIndicator('provider')}</th>
                <th onClick={() => handleSort('model')}>Model{sortIndicator('model')}</th>
                <th onClick={() => handleSort('inputTokens')}>Input Tokens{sortIndicator('inputTokens')}</th>
                <th onClick={() => handleSort('outputTokens')}>Output Tokens{sortIndicator('outputTokens')}</th>
                <th onClick={() => handleSort('totalTokens')}>Total Tokens{sortIndicator('totalTokens')}</th>
                <th onClick={() => handleSort('costUsd')}>Cost USD{sortIndicator('costUsd')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.length > 0 ? (
                sortedLogs.map((log, i) => (
                  <tr key={i}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.provider}</td>
                    <td>{log.model}</td>
                    <td>{log.input_tokens.toLocaleString()}</td>
                    <td>{log.output_tokens.toLocaleString()}</td>
                    <td>{log.total_tokens.toLocaleString()}</td>
                    <td className={styles.costCell}>{formatSmartCurrency(log.cost_usd)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: chartColors.text, padding: '2rem 0' }}>
                    No cost data yet
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
