export interface UsageRecord {
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  cost_usd: number;
  duration_ms: number;
  session_id: string;
  query_source: string;
  source: string;
}

export interface DailySummary {
  date: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cached_tokens: number;
  total_cost_usd: number;
  request_count: number;
}

export interface ModelStats {
  model: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cached_tokens: number;
  total_cost_usd: number;
  request_count: number;
}

export interface LimitStatus {
  status: string;
  hours_till_reset: number;
  timestamp: string;
}

export interface HourlyUsage {
  hour: string;
  tokens: number;
  cost_usd: number;
  requests: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  value: number;
  tokens: number;
  requests: number;
}

export interface WeekComparison {
  this_week_cost: number;
  last_week_cost: number;
  this_week_tokens: number;
  last_week_tokens: number;
  this_week_requests: number;
  last_week_requests: number;
  cost_change_percent: number;
}

export interface SessionSummary {
  session_id: string;
  start_time: string;
  total_tokens: number;
  total_cost_usd: number;
  request_count: number;
  models_used: string[];
}

export interface UsageDashboard {
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cached_tokens: number;
  total_requests: number;
  cache_hit_rate: number;
  daily_summaries: DailySummary[];
  model_stats: ModelStats[];
  limit_status: LimitStatus | null;
  today_cost_usd: number;
  today_tokens: number;
  today_requests: number;
  hourly_usage: HourlyUsage[];
  recent_requests: UsageRecord[];
  heatmap: HeatmapCell[];
  week_comparison: WeekComparison;
  monthly_projection: number;
  efficiency_score: number;
  sessions: SessionSummary[];
  avg_response_time_ms: number;
}
