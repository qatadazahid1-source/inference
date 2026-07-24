import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, Plus, FileText, Download,
  Trash2, X, AlertTriangle, FileSpreadsheet,
} from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './AdminReports.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  engineering: 'Engineering Detail',
  finance: 'Financial/ROI Report',
  compliance: 'Compliance Audit',
  benchmark: 'Provider Benchmark',
  custom: 'Custom Query',
};

// ─── Generate Report Modal ────────────────────────────────────────────────────
function GenerateReportModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (payload: { organization_id: string; name: string; type: string; format: string }) => Promise<void>;
}) {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('executive_summary');
  const [reportFormat, setReportFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    adminService.getOrganizations().then(setOrgs);
  }, []);

  // Autofill name based on selections
  useEffect(() => {
    const orgName = orgs.find(o => o.id === selectedOrgId)?.name || 'Platform';
    const typeLabel = REPORT_TYPE_LABELS[reportType] || 'Report';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    setReportName(`${orgName} - ${typeLabel} (${dateStr})`);
  }, [selectedOrgId, reportType, orgs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;
    setIsGenerating(true);
    try {
      await onGenerate({
        organization_id: selectedOrgId,
        name: reportName,
        type: reportType,
        format: reportFormat,
      });
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        background: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderRadius: 12, width: '100%', maxWidth: 480, overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--color-border)'
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Generate Platform Report
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div className={styles.formGroup}>
            <label>Target Organization</label>
            <select
              className={styles.select}
              required
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
            >
              <option value="">Select Organization...</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Report Type</label>
            <select
              className={styles.select}
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            >
              <option value="executive_summary">Executive Summary</option>
              <option value="engineering">Engineering Detail</option>
              <option value="finance">Financial / ROI</option>
              <option value="compliance">Compliance Audit</option>
              <option value="benchmark">Provider Benchmark</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Format</label>
            <select
              className={styles.select}
              value={reportFormat}
              onChange={e => setReportFormat(e.target.value)}
            >
              <option value="pdf">PDF Document</option>
              <option value="csv">CSV Sheet</option>
              <option value="xlsx">Excel Workbook</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Report Title</label>
            <input
              type="text"
              className={styles.input}
              required
              value={reportName}
              onChange={e => setReportName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button className={styles.btnSecondary} type="button" onClick={onClose}>Cancel</button>
            <button className={styles.btnPrimary} type="submit" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchReports = useCallback(async (q = search, t = typeFilter, s = statusFilter) => {
    setIsRefreshing(true);
    try {
      const data = await adminService.getReports(q, t, s);
      setReports(data);
    } catch (err) {
      console.error('[AdminReports] fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => { fetchReports(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchReports(search, typeFilter, statusFilter), 350);
    return () => clearTimeout(t);
  }, [search, typeFilter, statusFilter]);

  const handleGenerate = async (payload: any) => {
    await adminService.generateReport(payload);
    await fetchReports();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    const targetId = confirmDelete.id;
    setConfirmDelete(null);
    try {
      await adminService.deleteReport(targetId);
      await fetchReports();
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      header: 'Report Name',
      accessorKey: 'name',
      cell: (name: string, row: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {row.format === 'pdf' ? (
            <FileText size={20} style={{ color: '#ef4444' }} />
          ) : (
            <FileSpreadsheet size={20} style={{ color: '#16a34a' }} />
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {REPORT_TYPE_LABELS[row.type] || row.type} · {row.format.toUpperCase()}
            </div>
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
      header: 'Date Range',
      accessorKey: 'date_range_start',
      cell: (_v: string, row: any) => (
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {row.date_range_start ? formatDate(row.date_range_start) : '—'}
          {row.date_range_end ? ` → ${formatDate(row.date_range_end)}` : ''}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (status: string) => (
        <span className={`${styles.badge} ${status === 'ready' ? styles.badgeReady : styles.badgePending}`}>
          {status}
        </span>
      ),
    },
    {
      header: 'Generated At',
      accessorKey: 'created_at',
      cell: (v: string) => <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatDate(v)}</span>,
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (id: string, row: any) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {/* NOTE: this schema has no file storage — reports are DB rows
              with a JSON data_snapshot, not downloadable PDF/CSV files.
              A download button was removed here since row.file_url never
              existed on the real table and always produced a dead link. */}
          <button
            className={`${styles.btnSmall} ${styles.btnSmallDanger}`}
            disabled={deletingId === id}
            onClick={() => setConfirmDelete({ id, name: row.name })}
            title="Delete report log"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports Archive</h1>
          <p className={styles.subtitle}>
            View and generate executive summaries, compliance audits, and billing reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowGenerateModal(true)}
          >
            <Plus size={16} /> Generate Report
          </button>
          <button
            className={styles.btnSecondary}
            onClick={() => fetchReports()}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? styles.spin : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><FileText size={13} /> Total Reports</div>
          <div className={styles.kpiValue}>{isLoading ? '—' : reports.length}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><FileText size={13} /> PDF Documents</div>
          <div className={styles.kpiValue}>{isLoading ? '—' : reports.filter(r => r.format === 'pdf').length}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><FileSpreadsheet size={13} /> Spreadsheets</div>
          <div className={styles.kpiValue}>{isLoading ? '—' : reports.filter(r => r.format !== 'pdf').length}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><FileText size={13} /> Exec Summaries</div>
          <div className={styles.kpiValue}>{isLoading ? '—' : reports.filter(r => r.type === 'executive_summary').length}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search reports or org…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="executive_summary">Executive Summary</option>
          <option value="engineering">Engineering Detail</option>
          <option value="finance">Financial / ROI</option>
          <option value="compliance">Compliance Audit</option>
        </select>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="ready">Ready</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <DataTable
          data={reports}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No reports found."
        />
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateReportModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerate}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: 28, maxWidth: 420, width: '100%'
          }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>
              Delete Report?
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
              Are you sure you want to delete the report record for "{confirmDelete.name}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius)',
                  background: '#ef4444', border: 'none', color: '#fff',
                  fontWeight: 500, cursor: 'pointer'
                }}
              >
                Delete
              </button>
              <button className={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
