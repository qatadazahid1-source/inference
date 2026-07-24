-- Migration: AI ROI Data Models & Calculation Logic

-- 1. cost_configs
CREATE TABLE IF NOT EXISTS public.cost_configs (
  model TEXT PRIMARY KEY,
  input_price_per_1k NUMERIC NOT NULL,
  output_price_per_1k NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cost configs are viewable by everyone" ON public.cost_configs FOR SELECT USING (true);

-- 2. usage_logs
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID, -- Optional, if teams are implemented
  project_id TEXT, -- Optional
  model TEXT NOT NULL REFERENCES public.cost_configs(model),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 1,
  cost_usd NUMERIC NOT NULL DEFAULT 0, -- Stored calculation to optimize queries
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage" ON public.usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to calculate cost_usd on insert
CREATE OR REPLACE FUNCTION public.calculate_usage_cost()
RETURNS TRIGGER AS $$
DECLARE
  config public.cost_configs%ROWTYPE;
BEGIN
  SELECT * INTO config FROM public.cost_configs WHERE model = NEW.model;
  IF FOUND THEN
    NEW.cost_usd := (NEW.input_tokens * config.input_price_per_1k / 1000.0) + (NEW.output_tokens * config.output_price_per_1k / 1000.0);
  END IF;
  NEW.total_tokens := NEW.input_tokens + NEW.output_tokens;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_usage_insert_calculate_cost ON public.usage_logs;
CREATE TRIGGER on_usage_insert_calculate_cost
  BEFORE INSERT ON public.usage_logs
  FOR EACH ROW EXECUTE FUNCTION public.calculate_usage_cost();


-- 3. task_logs
CREATE TABLE IF NOT EXISTS public.task_logs (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manual_time_minutes NUMERIC NOT NULL,
  ai_time_minutes NUMERIC NOT NULL,
  ai_cost_usd NUMERIC NOT NULL DEFAULT 0, -- Associate cost with task if possible
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their tasks" ON public.task_logs FOR ALL USING (auth.uid() = user_id);

-- 4. budgets
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_budget NUMERIC NOT NULL,
  current_spend NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);


-- 5. roi_settings
CREATE TABLE IF NOT EXISTS public.roi_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_rate NUMERIC NOT NULL DEFAULT 50.00,
  calculation_model TEXT NOT NULL DEFAULT 'time_saved', -- time_saved, automation, revenue
  baseline_revenue NUMERIC NOT NULL DEFAULT 0,
  ai_revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roi_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their roi settings" ON public.roi_settings FOR ALL USING (auth.uid() = user_id);


-- ==========================================
-- RPC Functions for Dashboard Aggregations
-- ==========================================

-- Function to get high level overview KPI
CREATE OR REPLACE FUNCTION get_dashboard_overview(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  total_spend NUMERIC;
  total_requests INTEGER;
  time_saved_hours NUMERIC;
  val_generated NUMERIC;
  avg_latency_ms NUMERIC := 450; -- Default placeholder for latency if not explicitly tracked
  roi_percent NUMERIC := 0;
  settings public.roi_settings%ROWTYPE;
BEGIN
  -- Get 30d spend
  SELECT COALESCE(SUM(cost_usd), 0), COALESCE(SUM(request_count), 0)
  INTO total_spend, total_requests
  FROM public.usage_logs
  WHERE user_id = target_user_id AND timestamp >= now() - interval '30 days';

  -- Get Time Saved (Tasks)
  SELECT COALESCE(SUM(manual_time_minutes - ai_time_minutes) / 60.0, 0)
  INTO time_saved_hours
  FROM public.task_logs
  WHERE user_id = target_user_id AND timestamp >= now() - interval '30 days';

  -- Get ROI Settings
  SELECT * INTO settings FROM public.roi_settings WHERE user_id = target_user_id;
  IF NOT FOUND THEN
    settings.hourly_rate := 50.00;
    settings.calculation_model := 'time_saved';
  END IF;

  -- Calculate Value Generated based on model
  IF settings.calculation_model = 'time_saved' THEN
    val_generated := time_saved_hours * settings.hourly_rate;
  ELSIF settings.calculation_model = 'automation' THEN
    -- Manual Cost - AI Cost
    -- Assuming Manual Cost = manual_time_hours * hourly_rate
    SELECT COALESCE(SUM(manual_time_minutes)/60.0 * settings.hourly_rate, 0) - COALESCE(SUM(ai_cost_usd), 0)
    INTO val_generated
    FROM public.task_logs WHERE user_id = target_user_id AND timestamp >= now() - interval '30 days';
  ELSIF settings.calculation_model = 'revenue' THEN
    val_generated := settings.ai_revenue - settings.baseline_revenue;
  ELSE
    val_generated := 0;
  END IF;

  -- Calculate ROI %
  IF total_spend > 0 THEN
    roi_percent := ((val_generated - total_spend) / total_spend) * 100.0;
  ELSE
    roi_percent := 0;
  END IF;

  RETURN json_build_object(
    'totalSpend', total_spend,
    'totalRequests', total_requests,
    'avgLatency', avg_latency_ms,
    'timeSavedHours', time_saved_hours,
    'valueGenerated', val_generated,
    'roiPercent', roi_percent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get cost over time (Daily)
CREATE OR REPLACE FUNCTION get_cost_over_time(target_user_id UUID, days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT 
      date_trunc('day', timestamp)::date as date,
      model,
      SUM(cost_usd) as daily_cost
    FROM public.usage_logs
    WHERE user_id = target_user_id AND timestamp >= now() - (days || ' days')::interval
    GROUP BY 1, 2
    ORDER BY 1 ASC
  ) t;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get model analytics
CREATE OR REPLACE FUNCTION get_model_analytics(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT 
      model,
      SUM(cost_usd) as total_cost,
      SUM(request_count) as requests,
      SUM(total_tokens) as tokens
    FROM public.usage_logs
    WHERE user_id = target_user_id AND timestamp >= now() - interval '30 days'
    GROUP BY model
    ORDER BY total_cost DESC
  ) t;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get alert conditions
CREATE OR REPLACE FUNCTION get_user_alerts(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  alerts JSONB := '[]'::jsonb;
  budget_record public.budgets%ROWTYPE;
  usage_pct NUMERIC;
  today_cost NUMERIC;
  avg_cost_7d NUMERIC;
  today_requests INTEGER;
  avg_requests_7d NUMERIC;
BEGIN
  -- Budget Alerts
  SELECT * INTO budget_record FROM public.budgets WHERE user_id = target_user_id LIMIT 1;
  IF FOUND AND budget_record.total_budget > 0 THEN
    -- Recalculate current spend just in case
    SELECT COALESCE(SUM(cost_usd), 0) INTO budget_record.current_spend FROM public.usage_logs WHERE user_id = target_user_id AND timestamp >= date_trunc('month', now());
    
    usage_pct := (budget_record.current_spend / budget_record.total_budget) * 100;
    IF usage_pct >= 100 THEN
      alerts := alerts || jsonb_build_object('id', md5(target_user_id::text || '_budget_critical'), 'type', 'budget', 'severity', 'critical', 'title', 'Budget Exceeded', 'message', 'You have exceeded 100% of your budget.', 'time', now());
    ELSIF usage_pct >= 80 THEN
      alerts := alerts || jsonb_build_object('id', md5(target_user_id::text || '_budget_warning'), 'type', 'budget', 'severity', 'warning', 'title', 'Budget Warning', 'message', 'You have used over 80% of your budget.', 'time', now());
    END IF;
  END IF;

  -- Cost Spike (Anomaly Detection)
  SELECT COALESCE(SUM(cost_usd), 0) INTO today_cost FROM public.usage_logs WHERE user_id = target_user_id AND timestamp >= date_trunc('day', now());
  SELECT COALESCE(SUM(cost_usd)/7.0, 0) INTO avg_cost_7d FROM public.usage_logs WHERE user_id = target_user_id AND timestamp >= now() - interval '7 days' AND timestamp < date_trunc('day', now());
  
  IF today_cost > (avg_cost_7d * 1.5) AND today_cost > 5 THEN
    alerts := alerts || jsonb_build_object('id', md5(target_user_id::text || '_cost_spike_' || date_trunc('day', now())::text), 'type', 'cost_spike', 'severity', 'warning', 'title', 'Cost Spike Detected', 'message', 'Today''s cost is over 50% higher than your 7-day average.', 'time', now());
  END IF;

  -- Usage Spike
  SELECT COALESCE(SUM(request_count), 0) INTO today_requests FROM public.usage_logs WHERE user_id = target_user_id AND timestamp >= date_trunc('day', now());
  SELECT COALESCE(SUM(request_count)/7.0, 1) INTO avg_requests_7d FROM public.usage_logs WHERE user_id = target_user_id AND timestamp >= now() - interval '7 days' AND timestamp < date_trunc('day', now());
  
  IF today_requests > (avg_requests_7d * 1.3) AND today_requests > 50 THEN
    alerts := alerts || jsonb_build_object('id', md5(target_user_id::text || '_usage_spike_' || date_trunc('day', now())::text), 'type', 'usage_spike', 'severity', 'info', 'title', 'High API Usage', 'message', 'API requests are up 30% compared to average.', 'time', now());
  END IF;

  RETURN alerts::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Insert Seed Configuration
INSERT INTO public.cost_configs (model, input_price_per_1k, output_price_per_1k)
VALUES 
  ('gpt-4o', 0.005, 0.015),
  ('gpt-3.5-turbo', 0.0005, 0.0015),
  ('claude-3-opus', 0.015, 0.075),
  ('claude-3-sonnet', 0.003, 0.015),
  ('gemini-1.5-pro', 0.0035, 0.0105)
ON CONFLICT (model) DO UPDATE 
SET input_price_per_1k = EXCLUDED.input_price_per_1k, output_price_per_1k = EXCLUDED.output_price_per_1k;

-- Function to get recent API usage logs
CREATE OR REPLACE FUNCTION get_api_usage(target_user_id UUID, row_limit INTEGER DEFAULT 100)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT 
      id,
      model,
      input_tokens,
      output_tokens,
      total_tokens,
      cost_usd,
      timestamp
    FROM public.usage_logs
    WHERE user_id = target_user_id
    ORDER BY timestamp DESC
    LIMIT row_limit
  ) t;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

