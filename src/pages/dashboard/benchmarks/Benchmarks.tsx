import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Button } from '../../../components/ui/Button/Button';
import styles from './Benchmarks.module.css';

const costData = [
  { model: 'GPT-4o', cost: 10 },
  { model: 'Claude 3.5', cost: 8 },
  { model: 'Gemini 1.5', cost: 3.5 },
  { model: 'GPT-4o-mini', cost: 0.15 },
  { model: 'Mistral Large', cost: 4 },
  { model: 'Claude 3 Haiku', cost: 0.25 },
];

const latencyData = [
  { model: 'GPT-4o', latency: 820 },
  { model: 'Claude 3.5', latency: 650 },
  { model: 'Gemini 1.5', latency: 1120 },
  { model: 'GPT-4o-mini', latency: 420 },
  { model: 'Mistral Large', latency: 890 },
  { model: 'Claude 3 Haiku', latency: 380 },
];

const tpsData = [
  { model: 'GPT-4o', tps: 45 },
  { model: 'Claude 3.5', tps: 38 },
  { model: 'Gemini 1.5', tps: 28 },
  { model: 'GPT-4o-mini', tps: 120 },
  { model: 'Mistral Large', tps: 35 },
  { model: 'Claude 3 Haiku', tps: 95 },
];

const mockBenchmarksData = [
  { model: 'GPT-4o', provider: 'OpenAI', costIn: 10.00, costOut: 30.00, latency: 820, tps: 45, quality: 9 },
  { model: 'Claude 3.5', provider: 'Anthropic', costIn: 8.00, costOut: 24.00, latency: 650, tps: 38, quality: 9 },
  { model: 'Gemini 1.5', provider: 'Google AI', costIn: 3.50, costOut: 10.50, latency: 1120, tps: 28, quality: 8 },
  { model: 'GPT-4o-mini', provider: 'OpenAI', costIn: 0.15, costOut: 0.60, latency: 420, tps: 120, quality: 7 },
  { model: 'Mistral Large', provider: 'Mistral AI', costIn: 4.00, costOut: 12.00, latency: 890, tps: 35, quality: 8 },
  { model: 'Claude 3 Haiku', provider: 'Anthropic', costIn: 0.25, costOut: 1.25, latency: 380, tps: 95, quality: 7 },
];

const tooltipStyle = {
  background: '#1a2529',
  border: '1px solid rgba(64,80,85,0.5)',
  borderRadius: 6,
  fontSize: 13,
};

const gridColor = 'rgba(64, 80, 85, 0.3)';
const textColor = '#64748b';
const barGreen = '#22c55e';
const barTeal = '#14b8a6';
const barEmerald = '#10b981';

interface BenchmarkRow {
  model: string;
  provider: string;
  costIn: number;
  costOut: number;
  latency: number;
  tps: number;
  quality: number;
}

export function Benchmarks() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Benchmarks</h1>
        <Button>Add Comparison</Button>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>24</div>
          <div className={styles.statLabel}>Models Tracked</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>420ms</div>
          <div className={styles.statLabel}>Avg Latency</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>$2.84</div>
          <div className={styles.statLabel}>Avg Cost / 1M Tokens</div>
        </div>
      </div>

      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Cost per 1M Tokens by Model</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="model" tick={{ fontSize: 12, fill: textColor }} />
            <YAxis tick={{ fontSize: 12, fill: textColor }} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f8fafc' }} />
            <Bar dataKey="cost" fill={barGreen} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Latency Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={latencyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: textColor }} />
              <YAxis type="category" dataKey="model" tick={{ fontSize: 12, fill: textColor }} width={110} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="latency" fill={barTeal} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Tokens per Second</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tpsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: textColor }} />
              <YAxis type="category" dataKey="model" tick={{ fontSize: 12, fill: textColor }} width={110} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="tps" fill={barEmerald} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Model</th>
              <th>Provider</th>
              <th>Cost/1M Input</th>
              <th>Cost/1M Output</th>
              <th>Latency</th>
              <th>Tokens/s</th>
              <th>Quality Score</th>
            </tr>
          </thead>
          <tbody>
            {mockBenchmarksData.map((row: BenchmarkRow) => (
              <tr key={row.model}>
                <td>{row.model}</td>
                <td>{row.provider}</td>
                <td>${row.costIn.toFixed(2)}</td>
                <td>${row.costOut.toFixed(2)}</td>
                <td>{row.latency}ms</td>
                <td>{row.tps}</td>
                <td className={styles.score}>{row.quality}/10</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
