import { useState } from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Spinner } from '../../../components/ui/Spinner/Spinner';
import {
  useReports,
  useGenerateReport,
  useReportSnapshot,
  useDeleteReport,
} from '../../../hooks/queries/useReports';
import { useAuth } from '../../../hooks/useAuth';
import { exportToCSV, exportToPDF, exportToXLSX } from '../../../utils/exportUtils';

import type { Report } from '../../../types/dashboard.types';
import styles from './Reports.module.css';

const tabs = ['all', 'executive', 'engineering', 'finance', 'compliance', 'custom'] as const;
type Tab = typeof tabs[number];

const formats = ['PDF', 'CSV', 'XLSX'] as const;
const frequencies = ['daily', 'weekly', 'monthly'] as const;

const teamOptions = ['Engineering', 'Finance', 'Compliance', 'Marketing', 'Operations'];
const providerOptions = ['OpenAI', 'Anthropic', 'Google AI', 'Mistral AI', 'Cohere', 'AWS Bedrock'];

function formatLabel(val: string): string {
  if (val === 'all') return 'All';
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showModal, setShowModal] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<Report['type']>('executive');
  const [formFormat, setFormFormat] = useState<Report['format']>('PDF');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [schedule, setSchedule] = useState(false);
  const [frequency, setFrequency] = useState<typeof frequencies[number]>('weekly');

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const authReady = !!user?.id;
  const reportsQuery = useReports(authReady);
  const allReports = reportsQuery.data ?? [];
  const isLoading = reportsQuery.isPending;

  const generateReport = useGenerateReport();
  const reportSnapshot = useReportSnapshot();
  const deleteReport = useDeleteReport();

  const isGenerating = generateReport.isPending;

  const filteredReports = activeTab === 'all'
    ? allReports
    : allReports.filter((r) => r.type === activeTab);

  function toggleProvider(p: string) {
    setSelectedProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function toggleTeam(t: string) {
    setSelectedTeams((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function resetForm() {
    setFormName('');
    setFormType('executive');
    setFormFormat('PDF');
    setFormStart('');
    setFormEnd('');
    setSelectedProviders([]);
    setSelectedTeams([]);
    setSchedule(false);
    setFrequency('weekly');
  }

  async function handleGenerate() {
    if (!formName.trim()) {
      alert('Please enter a report name.');
      return;
    }

    try {
      // Note: recurring/frequency are saved to the report record, but there
      // is no background scheduler yet to actually re-generate this report
      // automatically on that cadence. This generates the report once, now.
      await generateReport.mutateAsync({
        name: formName.trim(),
        type: formType,
        format: formFormat,
        dateRangeStart: formStart || undefined,
        dateRangeEnd: formEnd || undefined,
        providers: selectedProviders,
        teams: selectedTeams,
        recurring: schedule,
        frequency: schedule ? frequency : undefined,
      });
      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Something went wrong generating the report. Please try again.');
    }
  }

  async function handleDownload(report: Report) {
    setDownloadingId(report.id);
    try {
      const { data_snapshot } = await reportSnapshot.mutateAsync(report.id);

      if (data_snapshot?.isEmpty) {
        const proceed = window.confirm(
          'This report has no data — no usage logs matched the selected date range / provider filters when it was generated. Download anyway?'
        );
        if (!proceed) {
          setDownloadingId(null);
          return;
        }
      }

      if (report.format === 'CSV') {
        const rows = (data_snapshot?.rows || []).map((r: any) => ({
          Date: r.logged_at,
          Provider: r.provider,
          Model: r.model,
          InputTokens: r.input_tokens,
          OutputTokens: r.output_tokens,
          TotalTokens: r.total_tokens,
          CostUSD: r.cost_usd,
        }));
        exportToCSV(rows, report.name.replace(/\s+/g, '_'));
      } else if (report.format === 'XLSX') {
        const rows = (data_snapshot?.rows || []).map((r: any) => ({
          Date: r.logged_at,
          Provider: r.provider,
          Model: r.model,
          InputTokens: r.input_tokens,
          OutputTokens: r.output_tokens,
          TotalTokens: r.total_tokens,
          CostUSD: r.cost_usd,
        }));
        exportToXLSX(rows, report.name.replace(/\s+/g, '_'));
      } else {
        const rows = (data_snapshot?.rows || []).map((r: any) => ({
          Date: new Date(r.logged_at).toLocaleString(),
          Provider: r.provider,
          Model: r.model,
          'Total Tokens': r.total_tokens,
          'Cost USD': `$${Number(r.cost_usd).toFixed(4)}`,
        }));
        exportToPDF(rows, report.name.replace(/\s+/g, '_'));
      }
    } catch (err) {
      console.error('Failed to download report:', err);
      alert('Could not download this report. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(report: Report) {
    const confirmed = window.confirm(`Delete "${report.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(report.id);
    try {
      await deleteReport.mutateAsync(report.id);
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Could not delete this report. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  function statusBadge(status: Report['status'], isEmpty?: boolean) {
    switch (status) {
      case 'ready':
        return isEmpty
          ? <Badge variant="warning">Ready (no data)</Badge>
          : <Badge variant="success">Ready</Badge>;
      case 'generating':
        return (
          <Badge variant="warning">
            <span className={styles.statusGenerating}>
              <Spinner size="sm" />
              Generating
            </span>
          </Badge>
        );
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'scheduled':
        return <Badge variant="neutral">Scheduled</Badge>;
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Reports</h1>
        <Button onClick={() => setShowModal(true)}>
          <FileText size={16} />
          Generate Report
        </Button>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {formatLabel(tab)}
          </button>
        ))}
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Type</th>
              <th>Format</th>
              <th>Created</th>
              <th>Status</th>
              <th>Download</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <Spinner size="sm" />
                </td>
              </tr>
            ) : filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>{report.name}</td>
                  <td><Badge variant="neutral">{formatLabel(report.type)}</Badge></td>
                  <td><Badge variant="neutral">{report.format}</Badge></td>
                  <td>{report.created ? new Date(report.created).toLocaleDateString() : '—'}</td>
                  <td>{statusBadge(report.status, report.isEmpty)}</td>
                  <td>
                    {report.status === 'ready' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(report)}
                        disabled={downloadingId === report.id}
                      >
                        {downloadingId === report.id ? <Spinner size="sm" /> : <Download size={16} />}
                      </Button>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(report)}
                        disabled={report.status !== 'ready'}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(report)}
                        disabled={deletingId === report.id}
                        aria-label={`Delete ${report.name}`}
                      >
                        {deletingId === report.id ? <Spinner size="sm" /> : <Trash2 size={16} />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                  No reports generated yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Generate Report"
        size="medium"
      >
        <div className={styles.formGroup}>
          <label className={styles.label}>Report Name</label>
          <input
            className={styles.input}
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Enter report name"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Type</label>
          <select
            className={styles.select}
            value={formType}
            onChange={(e) => setFormType(e.target.value as Report['type'])}
          >
            {tabs.filter((t) => t !== 'all').map((t) => (
              <option key={t} value={t}>{formatLabel(t)}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Format</label>
          <div className={styles.radioGroup}>
            {formats.map((f) => (
              <label key={f}>
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={formFormat === f}
                  onChange={() => setFormFormat(f)}
                />
                {' '}{f}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Date Range</label>
          <div className={styles.dateRow}>
            <input
              type="date"
              className={styles.input}
              value={formStart}
              onChange={(e) => setFormStart(e.target.value)}
            />
            <input
              type="date"
              className={styles.input}
              value={formEnd}
              onChange={(e) => setFormEnd(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Providers</label>
          <div className={styles.checkboxGroup}>
            {providerOptions.map((p) => (
              <label key={p} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedProviders.includes(p)}
                  onChange={() => toggleProvider(p)}
                />
                {' '}{p}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Teams</label>
          <div className={styles.checkboxGroup}>
            {teamOptions.map((t) => (
              <label key={t} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(t)}
                  onChange={() => toggleTeam(t)}
                />
                {' '}{t}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inlineToggle}>
            <label className={styles.label} style={{ marginBottom: 0 }}>Schedule recurring</label>
            <input
              type="checkbox"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
            />
          </div>
          {schedule && (
            <select
              className={styles.select}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequencies[number])}
              style={{ marginTop: 8 }}
            >
              {frequencies.map((f) => (
                <option key={f} value={f}>{formatLabel(f)}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
