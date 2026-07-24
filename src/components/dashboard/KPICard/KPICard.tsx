import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import type { KpiData } from '../../../types/dashboard.types';
import styles from './KPICard.module.css';

interface KPICardProps {
  data: KpiData;
}

const iconMap: Record<string, React.ReactNode> = {
  DollarSign: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>,
  Target: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  TrendingUp: <TrendingUp size={20} />,
  Clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Plug: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z"/></svg>,
  PiggyBank: <PiggyBank size={20} />,
};

export function KPICard({ data }: KPICardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.iconCircle}>
          {iconMap[data.icon] ?? <TrendingUp size={20} />}
        </div>
        {data.trend > 0 && (
          <span className={`${styles.trendBadge} ${data.trendDirection === 'up' ? styles.trendUp : styles.trendDown}`}>
            {data.trendDirection === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {data.trend}%
          </span>
        )}
      </div>
      <span className={styles.label}>{data.label}</span>
      <span className={styles.value}>{data.value}</span>
    </div>
  );
}
