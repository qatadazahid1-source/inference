import { useState } from 'react';
import { axiosClient } from '../../../../lib/axios';
import {
  Cloud, Database, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Play, X, ChevronDown, ChevronRight, Loader2
} from 'lucide-react';
import styles from './PricePerTokenSync.module.css';

type DiffStatus = 'new' | 'same' | 'changed' | 'conflict' | 'duplicate' | 'invalid' | 'pending';

interface StagingRow {
  provider: string;
  model: string;
  input_cost_per_1k: number | null;
  output_cost_per_1k: number | null;
  source_type: string;
  source_name: string;
  db_input_cost: number | null;
  db_output_cost: number | null;
  db_source_type: string | null;
  incoming_priority: number;
  existing_priority: number | null;
  conflict_note: string | null;
  status: DiffStatus;
}

interface DiffCounts {
  new: number;
  same: number;
  changed: number;
  conflict: number;
  duplicate: number;
  invalid: number;
  applied?: number;
  skipped?: number;
  pending?: number;
}

interface ImportSummary {
  importId: string;
  fetch: {
    totalFetched: number;
    staged: number;
    pending: number;
    invalidInFetch: number;
    duplicatesInFetch: number;
  };
  diff: {
    counts: DiffCounts;
  };
}

type Step = 'idle' | 'fetching' | 'preview' | 'applying' | 'done' | 'cancelled';

export function PricePerTokenSync() {
  const [step, setStep] = useState<Step>('idle');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [diffDetail, setDiffDetail] = useState<{ counts: DiffCounts; grouped: Record<DiffStatus, StagingRow[]> } | null>(null);
  const [applyReport, setApplyReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['new', 'changed', 'conflict']));

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Step 1: Fetch from PricePerToken MCP
  const handleFetch = async () => {
    setStep('fetching');
    setError(null);
    setImportSummary(null);
    setDiffDetail(null);
    setApplyReport(null);

    try {
      const { data } = await axiosClient.post('/api/admin/pricing/pricepertoken/fetch');
      setImportSummary(data);

      // Load full diff detail
      const { data: detail } = await axiosClient.get(`/api/admin/pricing/pricepertoken/diff/${data.importId}`);
      setDiffDetail(detail);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Fetch failed');
      setStep('idle');
    }
  };

  // Step 2: Apply to database
  const handleApply = async () => {
    if (!importSummary?.importId) return;
    setStep('applying');
    setError(null);

    try {
      const { data } = await axiosClient.post(
        `/api/admin/pricing/pricepertoken/apply/${importSummary.importId}`,
        { applyNew: true, applyChanges: true, applyConflicts: false }
      );
      setApplyReport(data.report);
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Apply failed');
      setStep('preview');
    }
  };

  // Cancel / discard
  const handleCancel = async () => {
    if (importSummary?.importId) {
      try {
        await axiosClient.post(`/api/admin/pricing/pricepertoken/cancel/${importSummary.importId}`);
      } catch (_) { /* silent */ }
    }
    setStep('idle');
    setImportSummary(null);
    setDiffDetail(null);
    setApplyReport(null);
    setError(null);
  };

  const fmt = (v: number | null) =>
    v === null || v === undefined ? '—' : `$${Number(v).toFixed(6)}`;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.icon}><Cloud size={20} /></div>
          <div>
            <h2 className={styles.title}>Price Per Token MCP</h2>
            <p className={styles.subtitle}>
              Free public data source — no API key required.
              Fetch → Preview → Review → Apply to database.
            </p>
          </div>
        </div>

        {step === 'idle' && (
          <button className={styles.btnFetch} onClick={handleFetch}>
            <RefreshCw size={16} />
            Fetch from Price Per Token
          </button>
        )}

        {step === 'fetching' && (
          <button className={styles.btnFetch} disabled>
            <Loader2 size={16} className={styles.spin} />
            Fetching…
          </button>
        )}

        {(step === 'preview' || step === 'applying') && (
          <div className={styles.headerActions}>
            <button className={styles.btnCancel} onClick={handleCancel} disabled={step === 'applying'}>
              <X size={16} /> Cancel Import
            </button>
            <button className={styles.btnApply} onClick={handleApply} disabled={step === 'applying'}>
              {step === 'applying'
                ? <><Loader2 size={16} className={styles.spin} /> Applying…</>
                : <><Database size={16} /> Apply to Database</>
              }
            </button>
          </div>
        )}

        {step === 'done' && (
          <button className={styles.btnFetch} onClick={handleFetch}>
            <RefreshCw size={16} /> Fetch Again
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Fetch / Import Summary */}
      {importSummary && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Import Summary</h3>
          <div className={styles.statsGrid}>
            <Stat label="Total Fetched" value={importSummary.fetch.totalFetched} />
            <Stat label="Staged" value={importSummary.fetch.staged} />
            <Stat label="New" value={diffDetail?.counts.new ?? 0} color="green" />
            <Stat label="Same Price" value={diffDetail?.counts.same ?? 0} color="gray" />
            <Stat label="Price Changed" value={diffDetail?.counts.changed ?? 0} color="orange" />
            <Stat label="Conflicts" value={diffDetail?.counts.conflict ?? 0} color="red" />
            <Stat label="Duplicates" value={diffDetail?.counts.duplicate ?? 0} color="gray" />
            <Stat label="Invalid" value={diffDetail?.counts.invalid ?? 0} color="red" />
          </div>
          <p className={styles.importId}>Import ID: <code>{importSummary.importId}</code></p>
        </div>
      )}

      {/* Rules Banner */}
      {step === 'preview' && diffDetail && (
        <div className={styles.rulesBanner}>
          <Play size={14} />
          <span>
            <strong>Apply rules:</strong> NEW → insert &nbsp;|&nbsp;
            SAME → no change &nbsp;|&nbsp;
            CHANGED (higher-priority source) → update + audit log &nbsp;|&nbsp;
            CONFLICTS → <strong>skipped, manual review required</strong>
          </span>
        </div>
      )}

      {/* Apply Report */}
      {step === 'done' && applyReport && (
        <div className={styles.reportSection}>
          <h3 className={styles.sectionTitle}>
            <CheckCircle2 size={18} color="#22c55e" /> Apply Complete
          </h3>
          <div className={styles.statsGrid}>
            <Stat label="Inserted (New)" value={applyReport.inserted} color="green" />
            <Stat label="Updated (Changed)" value={applyReport.updated} color="orange" />
            <Stat label="No Change (Same)" value={applyReport.kept} color="gray" />
            <Stat label="Skipped (Conflicts)" value={applyReport.skipped} color="red" />
            <Stat label="Errors" value={applyReport.errors?.length ?? 0} color="red" />
          </div>
          {applyReport.errors?.length > 0 && (
            <div className={styles.errorList}>
              <strong>Errors:</strong>
              {applyReport.errors.map((e: any, i: number) => (
                <div key={i} className={styles.errorItem}>
                  {e.provider}/{e.model}: {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diff Detail — Grouped by status */}
      {diffDetail && step === 'preview' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Diff Preview</h3>

          {(['changed', 'conflict', 'new', 'same', 'duplicate', 'invalid'] as DiffStatus[]).map(status => {
            const rows = diffDetail.grouped[status] || [];
            if (rows.length === 0) return null;
            const isExpanded = expandedGroups.has(status);

            return (
              <div key={status} className={styles.group}>
                <button
                  className={`${styles.groupHeader} ${styles[`groupHeader_${status}`]}`}
                  onClick={() => toggleGroup(status)}
                >
                  <StatusIcon status={status} />
                  <span className={styles.groupLabel}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className={styles.groupCount}>{rows.length}</span>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {isExpanded && (
                  <div className={styles.groupRows}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Provider</th>
                          <th>Model</th>
                          <th>Incoming Input</th>
                          <th>Incoming Output</th>
                          {(status === 'changed' || status === 'conflict') && <>
                            <th>DB Input</th>
                            <th>DB Output</th>
                            <th>Source Priority</th>
                          </>}
                          {status === 'conflict' && <th>Note</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 100).map((row, i) => (
                          <tr key={i}>
                            <td><span className={styles.provider}>{row.provider}</span></td>
                            <td className={styles.modelCell}>{row.model}</td>
                            <td>{fmt(row.input_cost_per_1k)}</td>
                            <td>{fmt(row.output_cost_per_1k)}</td>
                            {(status === 'changed' || status === 'conflict') && <>
                              <td className={styles.dbVal}>{fmt(row.db_input_cost)}</td>
                              <td className={styles.dbVal}>{fmt(row.db_output_cost)}</td>
                              <td>
                                <span className={styles.priority}>
                                  Incoming: {row.incoming_priority} vs DB: {row.existing_priority ?? '?'}
                                </span>
                              </td>
                            </>}
                            {status === 'conflict' && (
                              <td className={styles.conflictNote}>{row.conflict_note}</td>
                            )}
                          </tr>
                        ))}
                        {rows.length > 100 && (
                          <tr>
                            <td colSpan={10} className={styles.truncated}>
                              … and {rows.length - 100} more rows (apply to see all)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue} style={{ color: colorMap[color || 'default'] }}>{value.toLocaleString()}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: DiffStatus }) {
  switch (status) {
    case 'new':      return <CheckCircle2 size={16} color="#22c55e" />;
    case 'same':     return <CheckCircle2 size={16} color="#6b7280" />;
    case 'changed':  return <RefreshCw size={16} color="#f59e0b" />;
    case 'conflict': return <AlertTriangle size={16} color="#ef4444" />;
    case 'duplicate': return <XCircle size={16} color="#9ca3af" />;
    case 'invalid':  return <XCircle size={16} color="#ef4444" />;
    default:         return null;
  }
}

const STATUS_LABELS: Record<DiffStatus, string> = {
  new:       'New Models',
  same:      'Same Price (No Change)',
  changed:   'Price Changed',
  conflict:  'Conflicts (Manual Review Required)',
  duplicate: 'Duplicates in Fetch (Skipped)',
  invalid:   'Invalid (Missing Data)',
  pending:   'Pending',
};

const colorMap: Record<string, string> = {
  green:   '#22c55e',
  orange:  '#f59e0b',
  red:     '#ef4444',
  gray:    '#9ca3af',
  default: 'inherit',
};
