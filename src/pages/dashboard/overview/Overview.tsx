import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { GridContainer, GridItem } from '../../../components/layout/Grid';
import { KPICard, type ExtendedKpiData } from '../../../components/dashboard/KPICard/KPICard';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button/Button';
import type { CostOverTime, ModelAnalytics } from '../../../api/services/dashboard.service';
import { useAnalytics, useApiUsage } from '../../../hooks/queries/useDashboard';
import { chartTheme, getProviderColor } from '../../../utils/chartColors';
import styles from './Overview.module.css';

function formatProviderName(provider: string): string {
  return provider
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type PeriodOption = 7 | 30 | 90;

export function Overview() {
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<PeriodOption>(30);

  const analyticsQuery = useAnalytics(selectedDays);
  const usageQuery = useApiUsage(10);

  const overview = analyticsQuery.data?.overview ?? null;
  const chartData: CostOverTime[] = analyticsQuery.data?.costOverTime ?? [];
  const topModels: ModelAnalytics[] = analyticsQuery.data?.modelAnalytics ?? [];
  const providers: string[] = analyticsQuery.data?.providers ?? [];
  const usageLogs = usageQuery.data ?? [];

  const isLoading = analyticsQuery.isLoading || usageQuery.isLoading;
  const error = analyticsQuery.error ?? usageQuery.error;

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

  // Construct KPI data with dominant emphasis on Total Spend
  const kpiData: ExtendedKpiData[] = overview
    ? [
        {
          label: `Total Spend (${selectedDays}d)`,
          value: formatCurrency(overview.totalSpend),
          isPrimary: true,
          trendText: `${selectedDays}d window`,
          icon: 'DollarSign',
        },
        {
          label: 'API Requests',
          value: overview.totalRequests.toLocaleString(),
          trendText: `${selectedDays}d window`,
          icon: 'Activity',
        },
        {
          label: 'Avg Latency',
          value: `${overview.avgLatency}ms`,
          trendText: 'real-time avg',
          icon: 'Zap',
        },
        {
          label: 'Total Tokens',
          value: overview.totalTokens.toLocaleString(),
          trendText: `${selectedDays}d window`,
          icon: 'Activity',
        },
      ]
    : [
        { label: `Total Spend (${selectedDays}d)`, value: '$0.00', isPrimary: true, icon: 'DollarSign' },
        { label: 'API Requests', value: '0', icon: 'Activity' },
        { label: 'Avg Latency', value: '0ms', icon: 'Zap' },
        { label: 'Total Tokens', value: '0', icon: 'Activity' },
      ];

  if (isLoading && !overview) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.headerRow}>
          <div className={styles.headerTitleGroup}>
            <h1 className={styles.pageHeading}>Overview</h1>
            <p className={styles.pageSubheading}>Loading real-time API spend & performance telemetry...</p>
          </div>
        </div>
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.stateCard}>
          <div style={{ color: 'var(--color-error)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
            Telemetry Connection Error: {error.message}
          </div>
          <p className={styles.emptyText}>
            Unable to communicate with the analytics engine. Verify backend connection or retry data query.
          </p>
          <Button variant="secondary" size="sm" onClick={() => { analyticsQuery.refetch(); usageQuery.refetch(); }}>
            Retry Telemetry Fetch
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header & Date Range Control */}
      <div className={styles.headerRow}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.pageHeading}>Overview</h1>
          <p className={styles.pageSubheading}>Real-time AI API spend, usage telemetry, and model cost allocation.</p>
        </div>

        <div className={styles.dateRangePicker} role="group" aria-label="Select Date Range">
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              className={`${styles.rangeBtn} ${selectedDays === days ? styles.rangeBtnActive : ''}`}
              onClick={() => setSelectedDays(days)}
              aria-pressed={selectedDays === days}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: KPI Grid (3 cols per card) */}
      <GridContainer>
        {kpiData.map((kpi) => (
          <GridItem key={kpi.label} span={3}>
            <KPICard data={kpi} />
          </GridItem>
        ))}
      </GridContainer>

      {/* Row 2: Core Visualizations (8 cols primary chart, 4 cols secondary breakdown) */}
      <GridContainer>
        {/* Primary Time-Series Chart (8 columns) */}
        <GridItem span={8}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitleRow}>
              <h2 className={styles.chartTitle}>Cost Over Time</h2>
              <span className={styles.chartSubtitle}>{selectedDays}-day daily spend breakdown</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartTheme.text, fontFamily: 'var(--font-mono)' }} interval={Math.floor(chartData.length / 6)} />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartTheme.text, fontFamily: 'var(--font-mono)' }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: chartTheme.surface,
                      border: `1px solid ${chartTheme.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                    }}
                    formatter={(val: any) => [`$${Number(val).toFixed(4)}`, 'Cost']}
                    labelStyle={{ color: '#C8C8C8', marginBottom: 4 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-mono)', paddingTop: 10 }} />
                  {providers.length > 0 ? (
                    providers.map((provider) => (
                      <Line
                        key={provider}
                        type="monotone"
                        dataKey={provider}
                        stroke={getProviderColor(provider)}
                        strokeWidth={2}
                        dot={false}
                        name={formatProviderName(provider)}
                      />
                    ))
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="daily_cost"
                      stroke={chartTheme.primary}
                      strokeWidth={2}
                      dot={false}
                      name="Total Spend ($)"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.stateCard} style={{ padding: '40px 20px' }}>
                <span className={styles.emptyTitle}>No Time-Series Data</span>
                <span className={styles.emptyText}>No API costs recorded in the selected {selectedDays}-day period.</span>
              </div>
            )}
          </div>
        </GridItem>

        {/* Secondary Breakdown: Top Models by Cost (4 columns) */}
        <GridItem span={4}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitleRow}>
              <h2 className={styles.chartTitle}>Top Models by Cost</h2>
              <span className={styles.chartSubtitle}>Model spend allocation</span>
            </div>
            {topModels.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topModels} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: chartTheme.text, fontFamily: 'var(--font-mono)' }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <YAxis type="category" dataKey="model" tick={{ fontSize: 11, fill: chartTheme.text, fontFamily: 'var(--font-mono)' }} width={100} />
                  <Tooltip
                    contentStyle={{
                      background: chartTheme.surface,
                      border: `1px solid ${chartTheme.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                    }}
                    formatter={(val: any) => [`$${Number(val).toFixed(4)}`, 'Total Cost']}
                  />
                  <Bar dataKey="total_cost" radius={[0, 2, 2, 0]}>
                    {topModels.map((entry) => (
                      <Cell key={entry.model} fill={getProviderColor(entry.model)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.stateCard} style={{ padding: '40px 20px' }}>
                <span className={styles.emptyTitle}>No Model Activity</span>
                <span className={styles.emptyText}>Model cost telemetry will appear here as requests are executed.</span>
              </div>
            )}
          </div>
        </GridItem>
      </GridContainer>

      {/* Row 3: Deep Dive Table (12 columns) */}
      <GridContainer>
        <GridItem span={12}>
          <div className={styles.tableCard}>
            <div className={styles.tableHeaderRow}>
              <div>
                <h2 className={styles.chartTitle}>Recent API Activity</h2>
                <span className={styles.chartSubtitle}>Canonical log of recent inference requests</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/api-usage')}>
                View Full Logs →
              </Button>
            </div>

            {usageLogs.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Provider</TableHeaderCell>
                    <TableHeaderCell>Model</TableHeaderCell>
                    <TableHeaderCell align="right">Tokens</TableHeaderCell>
                    <TableHeaderCell align="right">Cost (USD)</TableHeaderCell>
                    <TableHeaderCell align="right">Timestamp</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usageLogs.map((log: any, index: number) => (
                    <TableRow key={log.id ?? index}>
                      <TableCell numeric>{formatProviderName(log.provider)}</TableCell>
                      <TableCell numeric>{log.model}</TableCell>
                      <TableCell numeric align="right">{log.total_tokens.toLocaleString()}</TableCell>
                      <TableCell numeric align="right" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                        ${log.cost_usd.toFixed(4)}
                      </TableCell>
                      <TableCell numeric muted align="right">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className={styles.stateCard}>
                <div className={styles.emptyTitle}>No Recent Activity</div>
                <p className={styles.emptyText}>
                  No API inference telemetry recorded yet. Test an inference request in Playground to verify logging.
                </p>
                <Button variant="primary" size="sm" onClick={() => navigate('/dashboard/playground')}>
                  Launch Playground
                </Button>
              </div>
            )}
          </div>
        </GridItem>
      </GridContainer>
    </div>
  );
}
