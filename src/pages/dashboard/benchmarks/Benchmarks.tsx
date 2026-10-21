import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Plus, CheckCircle2, AlertTriangle, Layers, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';
import { chartTheme } from '../../../utils/chartColors';
import { GridContainer, GridItem } from '../../../components/layout/Grid';
import { KPICard, type ExtendedKpiData } from '../../../components/dashboard/KPICard/KPICard';
import { useEntitlements } from '../../../context/EntitlementsContext';
import axiosClient from '../../../lib/axios';
import { ChooseSubmissionTypeModal, AddProviderModal, AddModelModal, type SubmissionModalMode } from './SubmissionModals';
import { MySubmissions } from './MySubmissions';
import styles from './Benchmarks.module.css';

export interface CuratedModel {
  id: string;
  provider: string;
  model: string;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  context_window?: number | null;
  access_tier?: string;
  is_active: boolean;
  benchmark_rank?: number;
  is_benchmark_featured?: boolean;
}

export interface UserAddedModel {
  id: string;
  submission_id: string;
  approved_model_pricing_id?: string | null;
  provider: string;
  model: string;
  display_name: string;
  docs_url?: string | null;
  context_window?: number | null;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  is_usable: boolean;
  is_routing_supported: boolean;
  usability_note: string;
  approved_at?: string;
  created_at: string;
}

interface BenchmarksApiResponse {
  data: {
    curated: CuratedModel[];
    user_added: UserAddedModel[];
    total_curated: number;
    total_user_added: number;
    max_curated_limit: number;
  } | CuratedModel[];
}

const tooltipStyle = {
  background: chartTheme.surface,
  border: `1px solid ${chartTheme.border}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
};

function shortLabel(model: string) {
  return model.length > 15 ? model.slice(0, 14) + '\u2026' : model;
}

export function Benchmarks() {
  const entitlements = useEntitlements();
  const hasFeature = entitlements.hasFeature('benchmarks');

  const [curated, setCurated]       = useState<CuratedModel[]>([]);
  const [userAdded, setUserAdded]   = useState<UserAddedModel[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Submission modal state
  const [modalMode, setModalMode]           = useState<SubmissionModalMode>('none');
  const [submissionsKey, setSubmissionsKey] = useState(0);

  const knownProviders = useMemo(() => {
    const allProviders = [
      ...curated.map(m => m.provider),
      ...userAdded.map(m => m.provider),
    ];
    return [...new Set(allProviders)].sort();
  }, [curated, userAdded]);

  const fetchBenchmarks = useCallback(async () => {
    if (!hasFeature) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get<BenchmarksApiResponse>('/api/benchmarks');
      const payload = res.data?.data;

      if (payload && typeof payload === 'object' && 'curated' in payload) {
        setCurated(payload.curated || []);
        setUserAdded(payload.user_added || []);
      } else if (Array.isArray(payload)) {
        setCurated(payload.slice(0, 20));
        setUserAdded([]);
      } else {
        setCurated([]);
        setUserAdded([]);
      }
    } catch (err: any) {
      console.error('Benchmarks: failed to load benchmark data', err);
      const errMsg = err?.data?.error || err?.response?.data?.error || err?.message || 'Could not load model pricing benchmark data.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [hasFeature]);

  useEffect(() => {
    if (hasFeature) {
      void fetchBenchmarks();
    } else {
      setIsLoading(false);
    }
  }, [hasFeature, fetchBenchmarks]);

  if (!entitlements.isLoading && !hasFeature) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Benchmarks</h1>
        </div>
        <div className={styles.tableCard} style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Model Benchmarks Locked</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: 460, margin: '0 auto 24px' }}>
            Comprehensive model performance, latency, and token pricing benchmarks are not available on your current plan. Upgrade your subscription to unlock model benchmarking.
          </p>
          <Button onClick={() => window.location.href = '/pricing'}>Upgrade Plan</Button>
        </div>
      </div>
    );
  }

  // ── Derived chart data for System-Curated Models (Max 20) ───────────────────
  const costData = useMemo(() =>
    curated.map((m) => ({
      model: shortLabel(m.model),
      'Input/1M':  parseFloat((m.input_cost_per_1k  * 1000).toFixed(4)),
      'Output/1M': parseFloat((m.output_cost_per_1k * 1000).toFixed(4)),
    })),
    [curated]
  );

  // ── Summary stats ──────────────────────────────────────────────────────────
  const allActiveForStats = useMemo(() => [
    ...curated,
    ...userAdded.filter(u => u.is_usable),
  ], [curated, userAdded]);

  const avgInputCostPer1M = useMemo(() => {
    if (allActiveForStats.length === 0) return 0;
    const sum = allActiveForStats.reduce((acc, m) => acc + m.input_cost_per_1k * 1000, 0);
    return sum / allActiveForStats.length;
  }, [allActiveForStats]);

  const avgOutputCostPer1M = useMemo(() => {
    if (allActiveForStats.length === 0) return 0;
    const sum = allActiveForStats.reduce((acc, m) => acc + m.output_cost_per_1k * 1000, 0);
    return sum / allActiveForStats.length;
  }, [allActiveForStats]);

  const kpiCardsData: ExtendedKpiData[] = useMemo(() => [
    {
      label: 'Curated Models',
      value: isLoading ? '—' : `${curated.length} of 20`,
      icon: 'Activity',
      isPrimary: true,
      trendText: 'System premium selection',
    },
    {
      label: 'Added by You',
      value: isLoading ? '—' : String(userAdded.length),
      icon: 'Layers',
      trendText: userAdded.some(m => m.is_usable) ? `${userAdded.filter(m => m.is_usable).length} ready for benchmarks` : 'Custom org catalog',
    },
    {
      label: 'Avg Input / 1M Tokens',
      value: isLoading ? '—' : `$${avgInputCostPer1M.toFixed(2)}`,
      icon: 'Zap',
      trendText: 'Live benchmark rates',
    },
  ], [isLoading, curated.length, userAdded, avgInputCostPer1M]);

  const scrollToMySubmissions = () => {
    const el = document.getElementById('my-submissions-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1>Benchmarks</h1>
          <p className={styles.sectionSubtitle}>
            Comparative token rates across system-curated premium models and custom organization additions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button
            variant="ghost"
            onClick={() => setModalMode('choose')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            id="benchmark-add-model-header-btn"
          >
            <Plus size={15} /> Add Model / Provider
          </Button>
          <Button onClick={() => void fetchBenchmarks()} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Submission Modals ───────────────────────────────────────── */}
      <ChooseSubmissionTypeModal
        isOpen={modalMode === 'choose'}
        onClose={() => setModalMode('none')}
        onChoose={(type) => setModalMode(type)}
      />
      <AddProviderModal
        isOpen={modalMode === 'provider'}
        onClose={() => setModalMode('none')}
        onSuccess={() => {
          setSubmissionsKey(k => k + 1);
          void fetchBenchmarks();
        }}
      />
      <AddModelModal
        isOpen={modalMode === 'model'}
        onClose={() => setModalMode('none')}
        onSuccess={() => {
          setSubmissionsKey(k => k + 1);
          void fetchBenchmarks();
        }}
        knownProviders={knownProviders}
      />

      {/* ── KPI Summary Cards ──────────────────────────────────────── */}
      <GridContainer style={{ marginBottom: 32 }}>
        {kpiCardsData.map((kpi) => (
          <GridItem key={kpi.label} span={4}>
            <KPICard data={kpi} />
          </GridItem>
        ))}
      </GridContainer>

      {/* ── Loading / Error States ─────────────────────────────────── */}
      {isLoading && (
        <div className={styles.emptyState}>Loading benchmark models from catalog…</div>
      )}
      {!isLoading && error && (
        <div className={styles.errorState}>{error}</div>
      )}

      {/* ── SECTION A: System-Curated Models ───────────────────────── */}
      {!isLoading && !error && (
        <section className={styles.sectionBlock} aria-labelledby="curated-models-heading">
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionHeadingGroup}>
              <h2 id="curated-models-heading" className={styles.sectionTitle}>
                System-Curated Models
              </h2>
              <span className={styles.curatedBadge}>
                <Sparkles size={13} /> Showing {curated.length} of max 20 premium models
              </span>
            </div>
            <span className={styles.liveTag}>CANONICAL RATES</span>
          </div>
          <p className={styles.sectionSubtitle} style={{ marginBottom: 20 }}>
            Top admin-selected flagship models across major providers, prioritized for industry benchmarking.
          </p>

          {curated.length === 0 ? (
            <div className={styles.tableCard}>
              <div className={styles.emptyState}>
                No curated models configured. Platform admins can feature up to 20 models in the{' '}
                <a href="/admin/pricing" style={{ color: 'var(--silver)' }}>Admin Pricing</a> panel.
              </div>
            </div>
          ) : (
            <>
              {/* Cost comparison chart (Max 20 models) */}
              <div className={styles.chartCard}>
                <div className={styles.chartTitleRow}>
                  <h3 className={styles.chartTitle}>Cost per 1M Tokens (Curated Models)</h3>
                  <span className={styles.liveTag}>LIVE</span>
                </div>
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart data={costData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis
                      dataKey="model"
                      tick={{ fontSize: 11, fill: chartTheme.text }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f8fafc' }} />
                    <Bar dataKey="Input/1M"  fill={chartTheme.text}     radius={[2, 2, 0, 0]} name="Input Cost / 1M" />
                    <Bar dataKey="Output/1M" fill={chartTheme.primary}  radius={[2, 2, 0, 0]} name="Output Cost / 1M" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Curated Models Table */}
              <div className={styles.tableCard}>
                <div className={styles.chartTitleRow} style={{ marginBottom: 16 }}>
                  <h3 className={styles.chartTitle} style={{ margin: 0 }}>System-Curated Model Comparison</h3>
                  <span className={styles.liveTag}>LIVE PRICING</span>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Model</th>
                      <th>Provider</th>
                      <th>Input / 1M Tokens</th>
                      <th>Output / 1M Tokens</th>
                      <th>Context Window</th>
                      <th>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curated.map((row, index) => (
                      <tr key={row.id}>
                        <td style={{ width: 40 }}>
                          <span className={styles.rankBadge}>{row.benchmark_rank || index + 1}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
                          {row.model}
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{row.provider}</span>
                        </td>
                        <td style={{ color: 'var(--silver)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          ${(row.input_cost_per_1k * 1000).toFixed(2)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
                          ${(row.output_cost_per_1k * 1000).toFixed(2)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {row.context_window ? `${(row.context_window / 1000).toFixed(0)}k tokens` : '—'}
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {row.access_tier || 'basic'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── SECTION B: Added by You ─────────────────────────────────── */}
      {!isLoading && !error && (
        <section className={styles.sectionBlock} aria-labelledby="added-by-you-heading">
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionHeadingGroup}>
              <h2 id="added-by-you-heading" className={styles.sectionTitle}>
                Added by You
              </h2>
              <span className={styles.userBadge}>
                <Layers size={13} /> {userAdded.length} Custom Approved Models
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={() => setModalMode('model')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              id="benchmark-submit-model-section-btn"
            >
              <Plus size={14} /> Submit Model
            </Button>
          </div>
          <p className={styles.sectionSubtitle} style={{ marginBottom: 20 }}>
            Models submitted by your team and approved by platform administrators for custom benchmarking.
          </p>

          {userAdded.length === 0 ? (
            <div className={styles.emptyAddedByYou}>
              <div className={styles.emptyIconWrapper}>
                <Layers size={24} />
              </div>
              <h3 className={styles.emptyTitle}>No user-added models have been approved yet</h3>
              <p className={styles.emptySubtitle}>
                Add new or proprietary models from providers not in the standard catalog. Once reviewed and approved by an administrator, your models will appear here with live token tracking.
              </p>
              <div className={styles.emptyActions}>
                <Button onClick={() => setModalMode('model')} id="benchmark-empty-add-model-btn">
                  <Plus size={15} style={{ marginRight: 6 }} /> Add Model
                </Button>
                <button
                  type="button"
                  className={styles.pendingLink}
                  onClick={scrollToMySubmissions}
                >
                  View pending & rejected submissions below ↓
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Model Identifier</th>
                    <th>Provider</th>
                    <th>Input / 1M Tokens</th>
                    <th>Output / 1M Tokens</th>
                    <th>Benchmark Status</th>
                    <th>Approved At</th>
                  </tr>
                </thead>
                <tbody>
                  {userAdded.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {row.display_name}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {row.model}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{row.provider}</span>
                      </td>
                      <td style={{ color: 'var(--silver)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        ${(row.input_cost_per_1k * 1000).toFixed(2)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
                        ${(row.output_cost_per_1k * 1000).toFixed(2)}
                      </td>
                      <td>
                        {row.is_usable ? (
                          <span className={styles.usableTag} title={row.usability_note}>
                            <CheckCircle2 size={12} /> Ready for Benchmarks
                          </span>
                        ) : (
                          <span className={styles.unsupportedTag} title={row.usability_note}>
                            <AlertTriangle size={12} /> {row.usability_note}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {row.approved_at ? new Date(row.approved_at).toLocaleDateString() : 'Recently'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── My Submissions Panel ────────────────────────────────────── */}
      <div id="my-submissions-section">
        <MySubmissions key={submissionsKey} />
      </div>
    </div>
  );
}
