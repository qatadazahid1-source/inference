import { TrendingUp, TrendingDown, DollarSign, Activity, Zap, Clock, Target, PiggyBank, FileText } from 'lucide-react';
import type { KpiData } from '../../../types/dashboard.types';
import styles from './KPICard.module.css';

export interface ExtendedKpiData {
  label: string;
  value: string;
  icon: string;
  trend?: number;
  trendDirection?: 'up' | 'down';
  trendText?: string;
  trendValence?: 'positive' | 'negative' | 'neutral';
  isPrimary?: boolean;
}

interface KPICardProps {
  data: ExtendedKpiData;
}

const iconMap: Record<string, React.ReactNode> = {
  DollarSign: <DollarSign size={18} />,
  Target: <Target size={18} />,
  TrendingUp: <TrendingUp size={18} />,
  Clock: <Clock size={18} />,
  Plug: <Activity size={18} />,
  PiggyBank: <PiggyBank size={18} />,
  Activity: <Activity size={18} />,
  Zap: <Zap size={18} />,
  FileText: <FileText size={18} />,
};

export function KPICard({ data }: KPICardProps) {
  const isPrimary = data.isPrimary ?? false;
  const hasTrend = typeof data.trend === 'number' && data.trend !== 0;

  // Determine trend color valence:
  // positive = green (#22c55e), negative = red (#ef4444), neutral = slate (#909090)
  let valenceClass = styles.neutralTrend;
  if (data.trendValence === 'positive') {
    valenceClass = styles.positiveTrend;
  } else if (data.trendValence === 'negative') {
    valenceClass = styles.negativeTrend;
  } else if (hasTrend) {
    valenceClass = data.trendDirection === 'down' ? styles.positiveTrend : styles.negativeTrend;
  }

  const ariaText = `${data.label}: ${data.value}. ${data.trendText ?? (hasTrend ? `${data.trend! > 0 ? '+' : ''}${data.trend}% ${data.trendDirection}` : 'Live period')}`;

  return (
    <div
      className={`${styles.card} ${isPrimary ? styles.primaryCard : ''}`}
      role="region"
      aria-label={ariaText}
    >
      <div className={styles.topRow}>
        <div className={`${styles.iconCircle} ${isPrimary ? styles.primaryIconCircle : ''}`} aria-hidden="true">
          {iconMap[data.icon] ?? <Activity size={18} />}
        </div>
        {hasTrend ? (
          <span className={`${styles.trendBadge} ${valenceClass}`} aria-hidden="true">
            {data.trendDirection === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {data.trend! > 0 ? `+${data.trend}%` : `${data.trend}%`}
          </span>
        ) : (
          <span className={`${styles.trendBadge} ${styles.neutralTrend}`} aria-hidden="true">
            {data.trendText ?? 'Live period'}
          </span>
        )}
      </div>
      <span className={styles.label}>{data.label}</span>
      <span className={`${styles.value} ${isPrimary ? styles.primaryValue : ''}`}>{data.value}</span>
    </div>
  );
}
