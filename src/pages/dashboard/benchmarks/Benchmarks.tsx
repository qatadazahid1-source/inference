import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Button } from '../../../components/ui/Button/Button';
import { adminService, type ModelPricing } from '../../../api/services/admin.service';
import { chartTheme } from '../../../utils/chartColors';
import { GridContainer, GridItem } from '../../../components/layout/Grid';
import { KPICard, type ExtendedKpiData } from '../../../components/dashboard/KPICard/KPICard';
import styles from './Benchmarks.module.css';

const tooltipStyle = {
  background: chartTheme.surface,
  border: `1px solid ${chartTheme.border}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
};

// Shorten model name for chart labels
function shortLabel(model: string) {
  return model.length > 14 ? model.slice(0, 13) + '\u2026' : model;
}

export function Benchmarks() {
  const [pricing, setPricing]     = useState<ModelPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    adminService.getPricing()
      .then((data) => setPricing(data.filter((m) => m.is_active)))
      .catch((err) => {
        console.error('Benchmarks: failed to load pricing', err);
        setError('Could not load model pricing data.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Derived chart data (real live pricing) ───────────────────────────────
  const costData = useMemo(() =>
    pricing.map((m) => ({
      model: shortLabel(m.model),
      'Input/1M':  parseFloat((m.input_cost_per_1k  * 1000).toFixed(4)),
      'Output/1M': parseFloat((m.output_cost_per_1k * 1000).toFixed(4)),
    })),
    [pricing]
  );

  // ── Summary stats ───────────────────────────────────────────────────────
  const avgInputCostPer1M = useMemo(() => {
    if (pricing.length === 0) return 0;
    const sum = pricing.reduce((acc, m) => acc + m.input_cost_per_1k * 1000, 0);
    return sum / pricing.length;
  }, [pricing]);

  const avgOutputCostPer1M = useMemo(() => {
    if (pricing.length === 0) return 0;
    const sum = pricing.reduce((acc, m) => acc + m.output_cost_per_1k * 1000, 0);
    return sum / pricing.length;
  }, [pricing]);

  const kpiCardsData: ExtendedKpiData[] = useMemo(() => [
    {
      label: 'Active Models',
      value: isLoading ? '—' : String(pricing.length),
      icon: 'Activity',
      isPrimary: true, // Primary operational metric for Benchmarks
      trendText: 'Live pricing catalog',
    },
    {
      label: 'Avg Input / 1M Tokens',
      value: isLoading ? '—' : `$${avgInputCostPer1M.toFixed(2)}`,
      icon: 'Zap',
      trendText: 'Live pricing catalog',
    },
    {
      label: 'Avg Output / 1M Tokens',
      value: isLoading ? '—' : `$${avgOutputCostPer1M.toFixed(2)}`,
      icon: 'DollarSign',
      trendText: 'Live pricing catalog',
    },
  ], [isLoading, pricing.length, avgInputCostPer1M, avgOutputCostPer1M]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Benchmarks</h1>
        <Button onClick={() => { setIsLoading(true); setError(null); adminService.getPricing().then((d) => setPricing(d.filter(m => m.is_active))).catch(() => setError('Refresh failed')).finally(() => setIsLoading(false)); }}>
          Refresh
        </Button>
      </div>

      {/* ── Summary stats ──────────────────────────────────────────── */}
      <GridContainer style={{ marginBottom: 32 }}>
        {kpiCardsData.map((kpi) => (
          <GridItem key={kpi.label} span={4}>
            <KPICard data={kpi} />
          </GridItem>
        ))}
      </GridContainer>

      {/* ── States ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className={styles.emptyState}>Loading model pricing from admin…</div>
      )}
      {!isLoading && error && (
        <div className={styles.errorState}>{error}</div>
      )}
      {!isLoading && !error && pricing.length === 0 && (
        <div className={styles.emptyState}>
          No active models found. Add models in the{' '}
          <a href="/admin/pricing" style={{ color: 'var(--silver)' }}>Admin Pricing</a> panel.
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────── */}
      {!isLoading && pricing.length > 0 && (
        <>
          <div className={styles.chartCard}>
            <div className={styles.chartTitleRow}>
              <h3 className={styles.chartTitle}>Cost per 1M Tokens by Model</h3>
              <span className={styles.liveTag}>LIVE</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="model" tick={{ fontSize: 11, fill: chartTheme.text }} />
                <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f8fafc' }} />
                <Bar dataKey="Input/1M"  fill={chartTheme.text}  radius={[2, 2, 0, 0]} />
                <Bar dataKey="Output/1M" fill={chartTheme.primary}  radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Performance benchmarks (no data source) ─────────────── */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Performance Benchmarks</h3>
            <div className={styles.emptyState}>
              Insufficient benchmark data. Per-model latency, throughput, and
              quality metrics are not yet tracked, so no performance comparison
              can be shown.
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────────────── */}
          <div className={styles.tableCard}>
            <div className={styles.chartTitleRow} style={{ marginBottom: 16 }}>
              <h3 className={styles.chartTitle} style={{ margin: 0 }}>Model Comparison Table</h3>
              <span className={styles.liveTag}>LIVE PRICING</span>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Provider</th>
                  <th>Input / 1M Tokens</th>
                  <th>Output / 1M Tokens</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.model}</td>
                    <td style={{ textTransform: 'capitalize' }}>{row.provider}</td>
                    <td style={{ color: 'var(--silver)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                      ${(row.input_cost_per_1k * 1000).toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      ${(row.output_cost_per_1k * 1000).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
