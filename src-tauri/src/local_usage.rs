use crate::models::{LimitStatus, UsageRecord};
use serde_json::Value;
use std::path::PathBuf;

fn get_claude_telemetry_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude").join("telemetry"))
}

pub struct ParsedRecord {
    pub record: UsageRecord,
    pub request_id: String,
}

fn parse_api_success(event_data: &Value, metadata: &Value) -> Option<ParsedRecord> {
    let model = metadata
        .get("model")
        .and_then(|v| v.as_str())
        .or_else(|| event_data.get("model").and_then(|v| v.as_str()))
        .unwrap_or("unknown")
        .to_string();

    let input_tokens = metadata.get("inputTokens").and_then(|v| v.as_u64()).unwrap_or(0);
    let output_tokens = metadata.get("outputTokens").and_then(|v| v.as_u64()).unwrap_or(0);
    let cached_input_tokens = metadata.get("cachedInputTokens").and_then(|v| v.as_u64()).unwrap_or(0);
    let cost_usd = metadata.get("costUSD").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let duration_ms = metadata.get("durationMs").and_then(|v| v.as_u64()).unwrap_or(0);
    let session_id = event_data.get("session_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let query_source = metadata.get("querySource").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let request_id = metadata.get("requestId").and_then(|v| v.as_str()).unwrap_or("").to_string();

    let timestamp = event_data.get("client_timestamp").and_then(|v| v.as_str()).unwrap_or("").to_string();

    Some(ParsedRecord {
        record: UsageRecord {
            timestamp,
            model,
            input_tokens,
            output_tokens,
            cached_input_tokens,
            cost_usd,
            duration_ms,
            session_id,
            query_source,
            source: "local".to_string(),
        },
        request_id,
    })
}

fn parse_limit_status(event_data: &Value, metadata: &Value) -> Option<LimitStatus> {
    let status = metadata.get("status").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
    let hours_till_reset = metadata.get("hoursTillReset").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let timestamp = event_data.get("client_timestamp").and_then(|v| v.as_str()).unwrap_or("").to_string();
    Some(LimitStatus { status, hours_till_reset, timestamp })
}

pub struct LocalData {
    pub parsed: Vec<ParsedRecord>,
    pub limit_status: Option<LimitStatus>,
}

pub fn read_local_usage() -> LocalData {
    let telemetry_dir = match get_claude_telemetry_dir() {
        Some(d) => d,
        None => return LocalData { parsed: vec![], limit_status: None },
    };

    if !telemetry_dir.exists() {
        return LocalData { parsed: vec![], limit_status: None };
    }

    let mut parsed = Vec::new();
    let mut latest_limit: Option<(String, LimitStatus)> = None;

    let pattern = telemetry_dir.join("1p_failed_events.*.json").to_string_lossy().to_string();

    if let Ok(paths) = glob::glob(&pattern) {
        for entry in paths.flatten() {
            if let Ok(content) = std::fs::read_to_string(&entry) {
                for line in content.lines() {
                    let line = line.trim();
                    if line.is_empty() { continue; }
                    let event: Value = match serde_json::from_str(line) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };
                    let event_data = match event.get("event_data") {
                        Some(d) => d,
                        None => continue,
                    };
                    let event_name = match event_data.get("event_name").and_then(|v| v.as_str()) {
                        Some(n) => n,
                        None => continue,
                    };
                    let metadata: Value = event_data
                        .get("additional_metadata")
                        .and_then(|v| v.as_str())
                        .and_then(|s| serde_json::from_str(s).ok())
                        .unwrap_or(Value::Null);

                    match event_name {
                        "tengu_api_success" => {
                            if let Some(pr) = parse_api_success(event_data, &metadata) {
                                parsed.push(pr);
                            }
                        }
                        "tengu_claudeai_limits_status_changed" => {
                            if let Some(ls) = parse_limit_status(event_data, &metadata) {
                                let ts = ls.timestamp.clone();
                                match &latest_limit {
                                    Some((prev_ts, _)) if ts > *prev_ts => latest_limit = Some((ts, ls)),
                                    None => latest_limit = Some((ts, ls)),
                                    _ => {}
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    parsed.sort_by(|a, b| a.record.timestamp.cmp(&b.record.timestamp));

    LocalData {
        parsed,
        limit_status: latest_limit.map(|(_, ls)| ls),
    }
}
