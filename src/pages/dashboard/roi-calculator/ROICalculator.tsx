import { useState, useMemo, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import styles from './ROICalculator.module.css';

const chartColors = {
  green: '#22c55e',
  grid: 'rgba(64, 80, 85, 0.3)',
  text: '#64748b',
};

// Puts the sign before the dollar symbol for negative values
// (-$1,234 instead of $-1,234), which is the standard financial format.
function formatCurrency(n: number): string {
  const abs = Math.abs(n).toLocaleString();
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

// Strips leading zeros from a raw numeric input string before parsing,
// so the DOM never gets a chance to render "07" or "0480" even momentarily
// — e.g. "040" -> 40, "0" stays "0", "07.5" -> 7.5.
function sanitizeNumericInput(raw: string): number {
  const cleaned = raw.replace(/^0+(?=\d)/, '');
  return cleaned === '' ? 0 : Number(cleaned);
}

export function ROICalculator() {
  const [hourlyRate, setHourlyRate] = useState(50);
  const [hoursPerWeek, setHoursPerWeek] = useState(20);
  const [numEmployees, setNumEmployees] = useState(10);
  const [aiCost, setAiCost] = useState(1200);
  const [errorReduction, setErrorReduction] = useState(500);
  const [isExporting, setIsExporting] = useState(false);
  const resultCardRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const timeValue = hoursPerWeek * hourlyRate * 4.33 * numEmployees;
    const totalValue = timeValue + errorReduction;
    const netGain = totalValue - aiCost;
    const roiPercent = aiCost > 0 ? Math.round((netGain / aiCost) * 100) : 0;
    const annualProjected = netGain * 12;
    return { timeValue, totalValue, netGain, roiPercent, annualProjected };
  }, [hourlyRate, hoursPerWeek, numEmployees, aiCost, errorReduction]);

  const monthlyProjection = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: `M${i + 1}`,
      cumulative: results.netGain * (i + 1),
    }));
  }, [results.netGain]);

  const handleExportPDF = async () => {
    if (!resultCardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      // Render the result card (ROI %, breakdown grid, chart) into a canvas
      // at 2x scale for crisp text/lines on screens with higher DPI.
      const canvas = await html2canvas(resultCardRef.current, {
        backgroundColor: '#0e1619',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');

      // Fit the captured image onto a standard A4 page, preserving aspect ratio.
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

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
                value={String(hourlyRate)}
                onChange={(e) => setHourlyRate(Math.max(0, sanitizeNumericInput(e.target.value)))}
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

            <div className={styles.formGroup}>
              <label className={styles.label}>Number of employees using AI</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={String(numEmployees)}
                onChange={(e) => setNumEmployees(Math.max(0, sanitizeNumericInput(e.target.value)))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>AI Cost per month ($)</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={String(aiCost)}
                onChange={(e) => setAiCost(Math.max(0, sanitizeNumericInput(e.target.value)))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Error reduction value ($/month)</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={String(errorReduction)}
                onChange={(e) => setErrorReduction(Math.max(0, sanitizeNumericInput(e.target.value)))}
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
            <div className={styles.roiValue}>{results.roiPercent}%</div>
            <div className={styles.roiLabel}>Return on Investment</div>

            <div className={styles.breakdownGrid}>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Monthly Value Generated</div>
                <div className={styles.breakdownValue}>${results.totalValue.toLocaleString()}</div>
              </div>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Monthly AI Cost</div>
                <div className={styles.breakdownValue}>${aiCost.toLocaleString()}</div>
              </div>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Net Monthly Gain</div>
                <div className={styles.breakdownValue}>{formatCurrency(results.netGain)}</div>
              </div>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Annual Projected ROI</div>
                <div className={styles.breakdownValue}>{formatCurrency(results.annualProjected)}</div>
              </div>
            </div>

            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartColors.text }} />
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
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke={chartColors.green}
                    fill={chartColors.green}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.buttonRow}>
            <button className={styles.secondaryBtn} onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? 'Generating PDF…' : 'Export as PDF'}
            </button>
            <button className={styles.secondaryBtn} onClick={() => alert('Share Report coming soon')}>
              Share Report
            </button>
          </div>

          <div className={styles.formula}>
            ROI = ((Monthly Value Generated − Monthly AI Cost) / Monthly AI Cost) × 100
          </div>
        </div>
      </div>
    </div>
  );
}
