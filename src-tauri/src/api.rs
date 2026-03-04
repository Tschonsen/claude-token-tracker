use crate::models::UsageRecord;
use reqwest::Client;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct UsageReportResponse {
    data: Vec<UsageBucket>,
    #[serde(default)]
    has_more: bool,
    #[serde(default)]
    next_page: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UsageBucket {
    #[serde(default)]
    bucket_start_time: String,
    #[serde(default)]
    model: Option<String>,
    #[serde(default)]
    uncached_input_tokens: u64,
    #[serde(default)]
    cache_creation_input_tokens: u64,
    #[serde(default)]
    cache_read_input_tokens: u64,
    #[serde(default)]
    output_tokens: u64,
}

// Pricing per 1M tokens (approximate)
fn estimate_cost(model: &str, input: u64, cached: u64, output: u64) -> f64 {
    let (input_price, cached_price, output_price) = match model {
        m if m.contains("opus") => (15.0, 1.5, 75.0),
        m if m.contains("sonnet") => (3.0, 0.3, 15.0),
        m if m.contains("haiku") => (0.25, 0.025, 1.25),
        _ => (3.0, 0.3, 15.0), // default to sonnet pricing
    };

    (input as f64 * input_price + cached as f64 * cached_price + output as f64 * output_price)
        / 1_000_000.0
}

pub async fn fetch_api_usage(api_key: &str) -> Result<Vec<UsageRecord>, String> {
    let client = Client::new();
    let mut all_records = Vec::new();

    // Fetch last 30 days
    let end = chrono::Utc::now();
    let start = end - chrono::Duration::days(30);

    let url = "https://api.anthropic.com/v1/organizations/usage_report/messages";

    let mut page: Option<String> = None;

    loop {
        let mut req = client
            .get(url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .query(&[
                ("starting_at", start.to_rfc3339()),
                ("ending_at", end.to_rfc3339()),
                ("bucket_width", "1d".to_string()),
                ("group_by", "model".to_string()),
            ]);

        if let Some(ref p) = page {
            req = req.query(&[("page", p.as_str())]);
        }

        let resp = req.send().await.map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, body));
        }

        let report: UsageReportResponse = resp.json().await.map_err(|e| e.to_string())?;

        for bucket in &report.data {
            let model = bucket
                .model
                .clone()
                .unwrap_or_else(|| "unknown".to_string());
            let total_input = bucket.uncached_input_tokens + bucket.cache_creation_input_tokens;
            let cached = bucket.cache_read_input_tokens;
            let output = bucket.output_tokens;
            let cost = estimate_cost(&model, total_input, cached, output);

            let date = if bucket.bucket_start_time.len() >= 10 {
                bucket.bucket_start_time[..10].to_string()
            } else {
                bucket.bucket_start_time.clone()
            };

            all_records.push(UsageRecord {
                timestamp: date,
                model,
                input_tokens: total_input,
                output_tokens: output,
                cached_input_tokens: cached,
                cost_usd: cost,
                duration_ms: 0,
                session_id: String::new(),
                query_source: String::new(),
                source: "api".to_string(),
            });
        }

        if report.has_more {
            page = report.next_page;
        } else {
            break;
        }
    }

    Ok(all_records)
}
