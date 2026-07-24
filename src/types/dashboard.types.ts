export interface UsageLog {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  time: string;
  date?: string;
}

export interface DailySpend {
  date: string;
  openai: number;
  anthropic: number;
  google: number;
}

export interface Integration {
  id: string;
  provider: string;
  displayName: string;
  status: 'active' | 'error' | 'inactive';
  lastSync: string;
  totalCost: number;
  apiKey?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'analyst' | 'viewer';
  status: 'active' | 'suspended' | 'invited';
  lastActive: string;
  avatar?: string;
}

export interface Alert {
  id: string;
  type: 'budget_threshold' | 'cost_anomaly' | 'security' | 'billing' | 'info' | 'system_error';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: 'budget_percent' | 'cost_spike' | 'daily_cost' | 'model_latency' | 'error_rate' | 'token_usage';
  threshold: number;
  scope: string;
  channels: ('in_app' | 'email' | 'slack' | 'sms')[];
  enabled: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
}

export interface Budget {
  id: string;
  name: string;
  scope: 'organization' | 'team' | 'project' | 'provider' | 'model';
  scopeValue?: string;
  amount: number;
  spent: number;
  period: 'monthly' | 'quarterly' | 'annual';
  alertThresholds: number[];
  hardLimit: boolean;
}

export interface Report {
  id: string;
  name: string;
  type: 'executive' | 'engineering' | 'finance' | 'compliance' | 'custom';
  format: 'PDF' | 'CSV' | 'XLSX';
  created: string;
  status: 'ready' | 'generating' | 'failed' | 'scheduled';
  dateRange?: { start: string; end: string };
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  // True when the report generated successfully but no usage logs matched
  // the selected date range / provider filters — distinct from a failure.
  isEmpty?: boolean;
  errorMessage?: string;
}

export interface KpiData {
  label: string;
  value: string;
  trend: number;
  trendDirection: 'up' | 'down';
  icon: string;
}

export interface NotificationPreference {
  id: string;
  label: string;
  inApp: boolean;
  email: boolean;
  slack: boolean;
  sms: boolean;
}

export interface NotificationGroup {
  id: string;
  groupLabel: string;
  preferences: NotificationPreference[];
}

export interface ConnectedProvider {
  id: string;
  name: string;
  connected: boolean;
  color: string;
}
