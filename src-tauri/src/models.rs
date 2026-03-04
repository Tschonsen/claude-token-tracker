use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageRecord {
    pub timestamp: String,
    pub model: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cached_input_tokens: u64,
    pub cost_usd: f64,
    pub duration_ms: u64,
    pub session_id: String,
    pub query_source: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailySummary {
    pub date: String,
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub total_cached_tokens: u64,
    pub total_cost_usd: f64,
    pub request_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelStats {
    pub model: String,
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub total_cached_tokens: u64,
    pub total_cost_usd: f64,
    pub request_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimitStatus {
    pub status: String,
    pub hours_till_reset: f64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyUsage {
    pub hour: String,
    pub tokens: u64,
    pub cost_usd: f64,
    pub requests: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeatmapCell {
    pub day: u8,   // 0=Mon, 6=Sun
    pub hour: u8,  // 0-23
    pub value: f64, // normalized 0-1
    pub tokens: u64,
    pub requests: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeekComparison {
    pub this_week_cost: f64,
    pub last_week_cost: f64,
    pub this_week_tokens: u64,
    pub last_week_tokens: u64,
    pub this_week_requests: u64,
    pub last_week_requests: u64,
    pub cost_change_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub session_id: String,
    pub start_time: String,
    pub total_tokens: u64,
    pub total_cost_usd: f64,
    pub request_count: u64,
    pub models_used: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageDashboard {
    pub total_cost_usd: f64,
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub total_cached_tokens: u64,
    pub total_requests: u64,
    pub cache_hit_rate: f64,
    pub daily_summaries: Vec<DailySummary>,
    pub model_stats: Vec<ModelStats>,
    pub limit_status: Option<LimitStatus>,
    pub today_cost_usd: f64,
    pub today_tokens: u64,
    pub today_requests: u64,
    pub hourly_usage: Vec<HourlyUsage>,
    pub recent_requests: Vec<UsageRecord>,
    pub heatmap: Vec<HeatmapCell>,
    pub week_comparison: WeekComparison,
    pub monthly_projection: f64,
    pub efficiency_score: f64,
    pub sessions: Vec<SessionSummary>,
    pub avg_response_time_ms: f64,
}
