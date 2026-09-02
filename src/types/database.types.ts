// AUTO-GENERATED from Supabase schema — do not manually edit
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts

export type MemberRole = 'owner' | 'admin' | 'manager' | 'analyst' | 'viewer'
export type MemberStatus = 'active' | 'invited' | 'suspended'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused'
export type BillingCycle = 'monthly' | 'annual'
export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded'
export type PaymentType = 'card' | 'bank_account' | 'paypal'
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'azure' | 'cohere' | 'mistral' | 'replicate' | 'bedrock' | 'groq' | 'huggingface'
export type IntegrationStatus = 'active' | 'inactive' | 'error'
export type BudgetScope = 'organization' | 'team' | 'project' | 'provider' | 'model'
export type BudgetPeriod = 'monthly' | 'quarterly' | 'annual'
export type AlertType = 'budget_threshold' | 'cost_anomaly' | 'model_price_change' | 'goal_achieved' | 'security'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertCondition = 'budget_percent' | 'cost_spike' | 'daily_cost' | 'model_latency'
export type ReportType = 'executive_summary' | 'engineering' | 'finance' | 'compliance' | 'benchmark' | 'custom'
export type ReportFormat = 'pdf' | 'csv' | 'xlsx'
export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed'
export type LoginStatus = 'success' | 'failed' | 'blocked'
export type TFAMethod = 'totp' | 'sms' | 'webauthn'

export type User = {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  phone_number: string | null
  timezone: string
  language: string
  email_verified: boolean
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type Organization = {
  id: string
  name: string
  slug: string
  website: string | null
  industry: string | null
  company_size: string | null
  country: string | null
  default_currency: string
  default_timezone: string
  logo_url: string | null
  primary_color: string | null
  custom_domain: string | null
  plan_id: string | null
  billing_email: string | null
  tax_id: string | null
  billing_address: Record<string, string> | null
  lemonsqueezy_customer_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type OrganizationMember = {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  status: MemberStatus
  invited_by: string | null
  invited_at: string | null
  joined_at: string | null
  last_active_at: string | null
  created_at: string
}

export type Invitation = {
  id: string
  organization_id: string
  email: string
  role: MemberRole
  token: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  cancelled_at: string | null
  created_at: string
}

export type Plan = {
  id: string
  name: string
  slug: string
  price_monthly: number
  price_annual: number
  max_users: number | null
  max_organizations: number | null
  max_integrations: number | null
  features: Record<string, boolean>
  is_active: boolean
  created_at: string
  lemonsqueezy_variant_id_monthly: string | null
  lemonsqueezy_variant_id_annual: string | null
  // Landing page display columns (added in migration 00007)
  tagline: string | null
  is_popular: boolean
  cta_text: string | null
  cta_variant: string | null
  sort_order: number
  display_features: Array<{ text: string; included: boolean }> | null
}


export type Subscription = {
  id: string
  organization_id: string
  plan_id: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_period_start: string
  current_period_end: string
  trial_ends_at: string | null
  cancelled_at: string | null
  lemonsqueezy_subscription_id: string | null
  price_override: number | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  invoice_number: string
  organization_id: string
  subscription_id: string | null
  amount: number
  currency: string
  status: InvoiceStatus
  description: string | null
  pdf_url: string | null
  lemonsqueezy_order_id: string | null
  paid_at: string | null
  due_date: string | null
  created_at: string
}

export type PaymentMethod = {
  id: string
  organization_id: string
  type: PaymentType
  card_brand: string | null
  card_last_four: string | null
  expiry_month: number | null
  expiry_year: number | null
  is_default: boolean
  lemonsqueezy_subscription_id: string | null
  created_at: string
}

export type AIIntegration = {
  id: string
  organization_id: string
  provider: AIProvider
  display_name: string
  api_key_hash: string
  api_key_preview: string
  status: IntegrationStatus
  last_sync_at: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
  created_by: string
  created_at: string
  updated_at: string
}

export type APIUsageLog = {
  id: string
  organization_id: string
  integration_id: string | null
  provider: string
  model: string
  request_id: string | null
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  latency_ms: number | null
  task_type: string | null
  project_tag: string | null
  team_tag: string | null
  user_tag: string | null
  metadata: Record<string, unknown> | null
  logged_at: string
  created_at: string
}

export type Budget = {
  id: string
  organization_id: string
  name: string
  scope: BudgetScope
  scope_value: string | null
  amount: number
  currency: string
  period: BudgetPeriod
  alert_at_50: boolean
  alert_at_75: boolean
  alert_at_90: boolean
  alert_at_100: boolean
  hard_limit: boolean
  rollover: boolean
  is_active: boolean
  created_by: string
  created_at: string
}

export type Alert = {
  id: string
  organization_id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  metadata: Record<string, unknown> | null
  is_read: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
}

export type AlertRule = {
  id: string
  organization_id: string
  name: string
  condition_type: AlertCondition
  condition_value: number
  scope: string | null
  channels: { email: boolean; in_app: boolean; slack: boolean; sms: boolean }
  is_active: boolean
  last_triggered_at: string | null
  created_by: string
  created_at: string
}

export type NotificationPreferences = {
  id: string
  user_id: string
  budget_alerts_email: boolean
  budget_alerts_inapp: boolean
  budget_alerts_slack: boolean
  budget_alerts_sms: boolean
  cost_anomaly_email: boolean
  cost_anomaly_inapp: boolean
  cost_anomaly_slack: boolean
  cost_anomaly_sms: boolean
  weekly_digest_email: boolean
  monthly_report_email: boolean
  team_alerts_inapp: boolean
  security_alerts_email: boolean
  security_alerts_sms: boolean
  billing_alerts_email: boolean
  updated_at: string
}

export type Report = {
  id: string
  organization_id: string
  name: string
  type: ReportType
  format: ReportFormat
  parameters: Record<string, unknown>
  file_url: string | null
  file_size_bytes: number | null
  status: ReportStatus
  scheduled: boolean
  schedule_cron: string | null
  created_by: string
  created_at: string
  completed_at: string | null
}

export type SecuritySession = {
  id: string
  user_id: string
  device_name: string | null
  browser: string | null
  os: string | null
  ip_address: string | null
  location: string | null
  user_agent: string | null
  is_current: boolean
  last_active_at: string
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export type ModelPricing = {
  id: string
  provider: string
  model: string
  input_cost_per_1k: number
  output_cost_per_1k: number
  batch_input_cost: number | null
  batch_output_cost: number | null
  context_window: number | null
  is_active: boolean
  effective_from: string
  effective_to: string | null
  updated_at: string
}

export type OnboardingProgress = {
  id: string
  user_id: string
  organization_id: string | null
  current_step: number
  step_1_completed: boolean
  step_2_completed: boolean
  step_3_completed: boolean
  step_4_completed: boolean
  step_5_completed: boolean
  completed_at: string | null
  skipped_at: string | null
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User> & Pick<User, 'id' | 'email'>; Update: Partial<User>; Relationships: [] }
      profiles: { Row: { id: string, full_name: string | null, role: string | null, use_case: string | null, onboarding_completed: boolean, created_at: string, updated_at: string }; Insert: any; Update: any; Relationships: [] }
      organizations: { Row: Organization & { user_id: string | null, company_name: string | null }; Insert: Partial<Organization> & { user_id?: string, company_name?: string }; Update: Partial<Organization> & { user_id?: string, company_name?: string }; Relationships: [] }
      invitations: { Row: Invitation; Insert: Partial<Invitation> & Pick<Invitation, 'organization_id' | 'email' | 'role' | 'token' | 'invited_by'>; Update: Partial<Invitation>; Relationships: [] }
      plans: { Row: Plan; Insert: Partial<Plan> & Pick<Plan, 'name' | 'slug'>; Update: Partial<Plan>; Relationships: [] }
      subscriptions: { Row: Subscription; Insert: Partial<Subscription> & Pick<Subscription, 'organization_id' | 'plan_id'>; Update: Partial<Subscription>; Relationships: [] }
      invoices: { Row: Invoice; Insert: Partial<Invoice> & Pick<Invoice, 'invoice_number' | 'organization_id' | 'amount'>; Update: Partial<Invoice>; Relationships: [] }
      payment_methods: { Row: PaymentMethod; Insert: Partial<PaymentMethod> & Pick<PaymentMethod, 'organization_id' | 'type'>; Update: Partial<PaymentMethod>; Relationships: [] }
      ai_settings: { Row: { id: string, user_id: string, provider: string, api_key: string | null, model_preference: string | null, created_at: string, updated_at: string }; Insert: any; Update: any; Relationships: [] }
      organization_members: { Row: OrganizationMember; Insert: Partial<OrganizationMember> & Pick<OrganizationMember, 'organization_id' | 'user_id' | 'role'>; Update: Partial<OrganizationMember>; Relationships: [] }
      ai_integrations: { Row: AIIntegration; Insert: Partial<AIIntegration> & Pick<AIIntegration, 'organization_id' | 'provider' | 'display_name' | 'api_key_hash' | 'api_key_preview' | 'created_by'>; Update: Partial<AIIntegration>; Relationships: [] }
      api_usage_logs: { Row: APIUsageLog; Insert: Partial<APIUsageLog> & Pick<APIUsageLog, 'organization_id' | 'provider' | 'model' | 'input_tokens' | 'output_tokens' | 'total_tokens' | 'cost_usd'>; Update: Partial<APIUsageLog>; Relationships: [] }
      budgets: { Row: Budget; Insert: Partial<Budget> & Pick<Budget, 'organization_id' | 'name' | 'amount' | 'created_by'>; Update: Partial<Budget>; Relationships: [] }
      alerts: { Row: Alert; Insert: Partial<Alert> & Pick<Alert, 'organization_id' | 'type' | 'title' | 'message'>; Update: Partial<Alert>; Relationships: [] }
      alert_rules: { Row: AlertRule; Insert: Partial<AlertRule> & Pick<AlertRule, 'organization_id' | 'name' | 'condition_type' | 'condition_value' | 'created_by'>; Update: Partial<AlertRule>; Relationships: [] }
      notification_preferences: { Row: NotificationPreferences; Insert: Partial<NotificationPreferences> & Pick<NotificationPreferences, 'user_id'>; Update: Partial<NotificationPreferences>; Relationships: [] }
      reports: { Row: Report; Insert: Partial<Report> & Pick<Report, 'organization_id' | 'name' | 'type' | 'created_by'>; Update: Partial<Report>; Relationships: [] }
      security_sessions: { Row: SecuritySession; Insert: Partial<SecuritySession> & Pick<SecuritySession, 'user_id'>; Update: Partial<SecuritySession>; Relationships: [] }
      model_pricing: { Row: ModelPricing; Insert: Partial<ModelPricing> & Pick<ModelPricing, 'provider' | 'model' | 'input_cost_per_1k' | 'output_cost_per_1k'>; Update: Partial<ModelPricing>; Relationships: [] }
      onboarding_progress: { Row: OnboardingProgress; Insert: Partial<OnboardingProgress> & Pick<OnboardingProgress, 'user_id'>; Update: Partial<OnboardingProgress>; Relationships: [] }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
