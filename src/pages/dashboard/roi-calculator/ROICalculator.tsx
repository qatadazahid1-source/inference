import { useState, useMemo, useRef, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAnalytics } from '../../../hooks/queries/useDashboard';
import { useEntitlements } from '../../../context/EntitlementsContext';
import { Button } from '../../../components/ui/Button/Button';
import { chartTheme } from '../../../utils/chartColors';
import styles from './ROICalculator.module.css';

// ─── INPUT CAPS ─────────────────────────────────────────────────────────────
// Prevents scientific-notation / overflow values from breaking the UI.
const MAX_HOURLY_RATE    = 10_000;      // $10,000/hr
const MAX_EMPLOYEES      = 100_000;     // 100k employees
const MAX_AI_COST        = 10_000_000;  // $10M/month
const MAX_ERROR_REDUCTION = 10_000_000;

// BUG 2 FIX: Standard weeks-per-month constant (industry convention).
// Using a precise constant avoids floating-point drift in the multiplication.
const WEEKS_PER_MONTH = 4.33;

// ─── FORMATTERS ─────────────────────────────────────────────────────────────

// BUG 3 FIX: Caps display at readable ranges rather than falling through to
// scientific notation (e.g. $1.23T instead of 1.23e+12).
// BUG 2 FIX: Always rounds to whole dollars — no cents in output.
function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  let formatted: string;
  if (abs >= 1e12)     formatted = `${(abs / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9) formatted = `${(abs / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) formatted = `${(abs / 1e6).toFixed(2)}M`;
  else                 formatted = Math.round(abs).toLocaleString();
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

// BUG 5 FIX: Sanitizes employee / whole-number fields.
// Strips EVERYTHING except digits — rejects floats, exponents, negatives.
function sanitizeIntInput(raw: string): number {
  const digitsOnly = raw.replace(/[^0-9]/g, '');
  if (digitsOnly === '' || digitsOnly === '0') return 0;
  return Math.min(parseInt(digitsOnly, 10), MAX_EMPLOYEES);
}

// BUG 3 FIX: Sanitizes decimal currency fields — rejects exponent notation
// and clamps to the given cap.
function sanitizeNumericInput(raw: string, cap: number = MAX_AI_COST): number {
  if (/[eE]/.test(raw)) return 0;  // reject scientific notation
  const cleaned = raw.replace(/^0+(?=\d)/, '');
  const val = cleaned === '' ? 0 : Number(cleaned);
  if (!isFinite(val) || isNaN(val)) return 0;
  return Math.min(Math.max(0, val), cap);
}

// BUG 1 FIX: Returns a display-friendly ROI string.
// Zero cost + positive gain  -> "∞" (infinite ROI, zero spend)
// Zero cost + no/negative gain -> "N/A"
// Normal case                -> "{n}%"
function formatROI(roiPercent: number, aiCost: number, netGain: number): string {
  if (aiCost === 0) return netGain > 0 ? '\u221e' : 'N/A';
  return `${roiPercent}%`;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export function ROICalculator() {
  const entitlements = useEntitlements();
  const hasFeature = entitlements.hasFeature('roi_calculator');

  // Actual measured AI spend for the org over the last 30 days.
  const { data: analytics } = useAnalytics(30);
  const measuredSpend = analytics?.overview.totalSpend ?? null;

  const [hourlyRate, setHourlyRate]     = useState(50);
  const [hoursPerWeek, setHoursPerWeek] = useState(20);
  const [numEmployees, setNumEmployees] = useState(10);
  const [aiCost, setAiCost]             = useState<number | null>(null);
  const aiCostEdited                    = useRef(false);
  const [errorReduction, setErrorReduction] = useState(500);
  const [isExporting, setIsExporting]   = useState(false);
  const resultCardRef                   = useRef<HTMLDivElement>(null);

  // Seed the AI-cost field from real measured spend the first time analytics
  // resolve, unless the user has already typed their own value.
  useEffect(() => {
    if (aiCostEdited.current) return;
    if (measuredSpend !== null && measuredSpend > 0) {
      setAiCost(Math.round(measuredSpend));
    }
  }, [measuredSpend]);

  const effectiveAiCost = aiCost ?? (measuredSpend !== null ? Math.round(measuredSpend) : 0);

  const handleAiCostChange = (raw: string) => {
    aiCostEdited.current = true;
    setAiCost(sanitizeNumericInput(raw, MAX_AI_COST));
  };

  const results = useMemo(() => {
    // BUG 2 FIX: Multiply by WEEKS_PER_MONTH constant and round to whole dollars.
    const timeValue      = Math.round(hoursPerWeek * hourlyRate * WEEKS_PER_MONTH * numEmployees);
    const totalValue     = timeValue + errorReduction;
    const netGain        = totalValue - effectiveAiCost;
    // BUG 1 FIX: roiPercent stays 0 when cost=0; the display layer handles ∞/N/A.
    const roiPercent     = effectiveAiCost > 0
      ? Math.round((netGain / effectiveAiCost) * 100)
      : 0;
    const annualProjected = Math.round(netGain * 12);
    return { timeValue, totalValue, netGain, roiPercent, annualProjected };
  }, [hourlyRate, hoursPerWeek, numEmployees, effectiveAiCost, errorReduction]);

  // BUG 4 FIX: Detect all-zero state to force a flat chart baseline.
  const allZero = results.netGain === 0;

  const monthlyProjection = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: `M${i + 1}`,
      cumulative: Math.round(results.netGain * (i + 1)),
    }));
  }, [results.netGain]);

  const handleExportPDF = async () => {
    if (!resultCardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(resultCardRef.current, {
        backgroundColor: 'var(--color-bg)',
        scale: 2,
        useCORS: true,
      });
      const imgData    = canvas.toDataURL('image/png');
      const pdf        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth  = pdf.internal.pageSize.getWidth();
      const margin     = 10;
      const imgWidth   = pageWidth - margin * 2;
      const imgHeight  = (canvas.height * imgWidth) / canvas.width;
      pdf.setFontSize(16);
      pdf.text('ROI Summary Report', margin, margin + 5);
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, margin + 11);
      pdf.addImage(imgData, 'PNG', margin, margin + 16, imgWidth, imgHeight);
      pdf.save(`roi-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Something went wrong generating the PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!entitlements.isLoading && !hasFeature) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>ROI Calculator</h1>
        <div className={styles.inputCard} style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>ROI Calculator Feature Locked</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: 460, margin: '0 auto 24px' }}>
            Interactive AI Return on Investment (ROI) modeling and projection tools are not available on your current plan. Upgrade your plan to unlock the ROI Calculator.
          </p>
          <Button onClick={() => window.location.href = '/pricing'}>Upgrade Plan</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>ROI Calculator</h1>

      <div className={styles.layout}>
        <div className={styles.leftPanel}>
          <div className={styles.inputCard}>
            <h2 className={styles.sectionTitle}>ROI Inputs</h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Hourly rate of employees ($)</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={MAX_HOURLY_RATE}
                value={String(hourlyRate)}
                onChange={(e) =>
                  setHourlyRate(Math.min(MAX_HOURLY_RATE, Math.max(0, sanitizeNumericInput(e.target.value, MAX_HOURLY_RATE))))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Hours saved per week</label>
              <div className={styles.sliderRow}>
                <input
                  className={styles.slider}
                  type="range"
                  min={0}
                  max={40}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                />
                <span className={styles.sliderValue}>{hoursPerWeek}h</span>
              </div>
            </div>

            {/*
              BUG 5 FIX: type="text" + inputMode="numeric" + pattern="[0-9]*"
              prevents the browser accepting scientific notation (2.34e+21),
              decimal points, or negative values. The native type="number" input
              silently accepts exponent strings which then parse to astronomical
              values; switching to text with a numeric keyboard pattern blocks this.
            */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Number of employees using AI</label>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={String(numEmployees)}
                onChange={(e) => setNumEmployees(sanitizeIntInput(e.target.value))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>AI Cost per month ($)</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={MAX_AI_COST}
                value={String(effectiveAiCost)}
                onChange={(e) => handleAiCostChange(e.target.value)}
              />
              {!aiCostEdited.current && measuredSpend !== null && measuredSpend > 0 && (
                <span className={styles.hint}>Seeded from your measured 30-day AI spend</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Error reduction value ($/month)</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={MAX_ERROR_REDUCTION}
                value={String(errorReduction)}
                onChange={(e) =>
                  setErrorReduction(Math.min(MAX_ERROR_REDUCTION, Math.max(0, sanitizeNumericInput(e.target.value, MAX_ERROR_REDUCTION))))
                }
              />
            </div>

            <button className={styles.calcBtn} onClick={() => alert('ROI calculated!')}>
              Calculate ROI
            </button>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 20 }}>Your ROI Summary</h2>

          <div className={styles.resultCard} ref={resultCardRef}>
            {/* BUG 1 FIX: ∞ when cost=0 and gain>0; N/A when cost=0 and no gain */}
            <div className={styles.roiValue}>
              {formatROI(results.roiPercent, effectiveAiCost, results.netGain)}
            </div>
            <div className={styles.roiLabel}>Return on Investment</div>

            <div className={styles.breakdownGrid}>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Monthly Value Generated</div>
                {/* BUG 2 FIX: formatCurrency rounds to whole dollars — no decimal drift */}
                <div className={styles.breakdownValue}>{formatCurrency(results.totalValue)}</div>
              </div>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Monthly AI Cost</div>
                <div className={styles.breakdownValue}>{formatCurrency(effectiveAiCost)}</div>
              </div>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Net Monthly Gain</div>
                <div className={styles.breakdownValue}>{formatCurrency(results.netGain)}</div>
              </div>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Annual Projected ROI</div>
                {/* BUG 3 FIX: T/B/M suffix format prevents text overflow on large values */}
                <div className={styles.breakdownValue}>{formatCurrency(results.annualProjected)}</div>
              </div>
            </div>

            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} />
                  {/*
                    BUG 4 FIX: When allZero=true, force domain [0, 1] so Recharts
                    shows a clean flat line at 0 instead of auto-generating phantom
                    1/2/3/4 tick marks from its default auto-scale logic.
                  */}
                  <YAxis
                    tick={{ fontSize: 11, fill: chartTheme.text }}
                    domain={allZero ? [0, 1] : ['auto', 'auto']}
                    tickFormatter={(v: number) => (allZero ? '$0' : formatCurrency(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: chartTheme.surface,
                      border: `1px solid ${chartTheme.border}`,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                    }}
                    labelStyle={{ color: '#f8fafc' }}
                    formatter={(v: number) => [formatCurrency(v), 'Cumulative Gain']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke={chartTheme.primary}
                    fill={chartTheme.primary}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.buttonRow}>
            <button className={styles.secondaryBtn} onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? 'Generating PDF\u2026' : 'Export as PDF'}
            </button>
            <button className={styles.secondaryBtn} onClick={() => alert('Share Report coming soon')}>
              Share Report
            </button>
          </div>

          <div className={styles.formula}>
            ROI = ((Monthly Value Generated \u2212 Monthly AI Cost) / Monthly AI Cost) \u00d7 100
          </div>
        </div>
      </div>
    </div>
  );
}
