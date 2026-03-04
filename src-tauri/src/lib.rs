mod api;
mod db;
mod local_usage;
mod models;

use db::Database;
use models::*;
use chrono::{Datelike, Timelike};
use std::collections::{HashMap, HashSet};
use tauri::Manager;

struct AppState {
    db: Database,
}

fn build_dashboard(records: &[UsageRecord], limit_status: Option<LimitStatus>) -> UsageDashboard {
    let now = chrono::Utc::now();
    let today = now.format("%Y-%m-%d").to_string();

    let mut daily_map: HashMap<String, (u64, u64, u64, f64, u64)> = HashMap::new();
    let mut model_map: HashMap<String, (u64, u64, u64, f64, u64)> = HashMap::new();
    let mut hourly_map: HashMap<String, (u64, f64, u64)> = HashMap::new();
    let mut heatmap_raw: HashMap<(u8, u8), (u64, u64)> = HashMap::new();
    let mut session_map: HashMap<String, (String, u64, f64, u64, HashSet<String>)> = HashMap::new();

    let mut total_cost = 0.0;
    let mut total_input = 0u64;
    let mut total_output = 0u64;
    let mut total_cached = 0u64;
    let mut today_cost = 0.0;
    let mut today_tokens = 0u64;
    let mut today_requests = 0u64;
    let mut total_duration = 0u64;
    let mut duration_count = 0u64;

    // Week comparison
    let week_start = (now - chrono::Duration::days(now.weekday().num_days_from_monday() as i64))
        .format("%Y-%m-%d")
        .to_string();
    let last_week_start = (now
        - chrono::Duration::days(now.weekday().num_days_from_monday() as i64 + 7))
    .format("%Y-%m-%d")
    .to_string();
    let mut this_week = (0.0f64, 0u64, 0u64);
    let mut last_week = (0.0f64, 0u64, 0u64);

    for record in records {
        total_cost += record.cost_usd;
        total_input += record.input_tokens;
        total_output += record.output_tokens;
        total_cached += record.cached_input_tokens;

        if record.duration_ms > 0 {
            total_duration += record.duration_ms;
            duration_count += 1;
        }

        let date = if record.timestamp.len() >= 10 {
            record.timestamp[..10].to_string()
        } else {
            record.timestamp.clone()
        };

        // Today
        if date == today {
            today_cost += record.cost_usd;
            today_tokens +=
                record.input_tokens + record.output_tokens + record.cached_input_tokens;
            today_requests += 1;
        }

        // Week comparison
        if date >= week_start {
            this_week.0 += record.cost_usd;
            this_week.1 += record.input_tokens + record.output_tokens;
            this_week.2 += 1;
        } else if date >= last_week_start && date < week_start {
            last_week.0 += record.cost_usd;
            last_week.1 += record.input_tokens + record.output_tokens;
            last_week.2 += 1;
        }

        // Daily
        {
            let e = daily_map.entry(date).or_insert((0, 0, 0, 0.0, 0));
            e.0 += record.input_tokens;
            e.1 += record.output_tokens;
            e.2 += record.cached_input_tokens;
            e.3 += record.cost_usd;
            e.4 += 1;
        }

        // Model
        {
            let e = model_map
                .entry(record.model.clone())
                .or_insert((0, 0, 0, 0.0, 0));
            e.0 += record.input_tokens;
            e.1 += record.output_tokens;
            e.2 += record.cached_input_tokens;
            e.3 += record.cost_usd;
            e.4 += 1;
        }

        // Hourly
        if record.timestamp.len() >= 13 {
            let hour_key = record.timestamp[..13].to_string();
            let e = hourly_map.entry(hour_key).or_insert((0, 0.0, 0));
            e.0 += record.input_tokens + record.output_tokens;
            e.1 += record.cost_usd;
            e.2 += 1;
        }

        // Heatmap (day of week x hour)
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&record.timestamp) {
            let dow = dt.weekday().num_days_from_monday() as u8;
            let hour = dt.hour() as u8;
            let e = heatmap_raw.entry((dow, hour)).or_insert((0, 0));
            e.0 += record.input_tokens + record.output_tokens;
            e.1 += 1;
        }

        // Sessions
        if !record.session_id.is_empty() {
            let e = session_map
                .entry(record.session_id.clone())
                .or_insert_with(|| {
                    (record.timestamp.clone(), 0, 0.0, 0, HashSet::new())
                });
            e.1 += record.input_tokens + record.output_tokens + record.cached_input_tokens;
            e.2 += record.cost_usd;
            e.3 += 1;
            e.4.insert(record.model.clone());
        }
    }

    // Build daily summaries
    let mut daily_summaries: Vec<DailySummary> = daily_map
        .into_iter()
        .map(|(date, (inp, out, cached, cost, count))| DailySummary {
            date,
            total_input_tokens: inp,
            total_output_tokens: out,
            total_cached_tokens: cached,
            total_cost_usd: cost,
            request_count: count,
        })
        .collect();
    daily_summaries.sort_by(|a, b| a.date.cmp(&b.date));

    // Model stats
    let mut model_stats: Vec<ModelStats> = model_map
        .into_iter()
        .map(|(model, (inp, out, cached, cost, count))| ModelStats {
            model,
            total_input_tokens: inp,
            total_output_tokens: out,
            total_cached_tokens: cached,
            total_cost_usd: cost,
            request_count: count,
        })
        .collect();
    model_stats.sort_by(|a, b| b.total_cost_usd.partial_cmp(&a.total_cost_usd).unwrap());

    // Hourly
    let mut hourly_usage: Vec<HourlyUsage> = hourly_map
        .into_iter()
        .map(|(hour, (tokens, cost, requests))| HourlyUsage {
            hour,
            tokens,
            cost_usd: cost,
            requests,
        })
        .collect();
    hourly_usage.sort_by(|a, b| a.hour.cmp(&b.hour));

    // Heatmap
    let max_tokens = heatmap_raw.values().map(|v| v.0).max().unwrap_or(1) as f64;
    let mut heatmap: Vec<HeatmapCell> = Vec::with_capacity(7 * 24);
    for day in 0..7u8 {
        for hour in 0..24u8 {
            let (tokens, requests) = heatmap_raw.get(&(day, hour)).copied().unwrap_or((0, 0));
            heatmap.push(HeatmapCell {
                day,
                hour,
                value: if max_tokens > 0.0 { tokens as f64 / max_tokens } else { 0.0 },
                tokens,
                requests,
            });
        }
    }
    // heatmap is ready

    // Cache hit rate
    let all_input = total_input + total_cached;
    let cache_hit_rate = if all_input > 0 {
        total_cached as f64 / all_input as f64
    } else {
        0.0
    };

    // Efficiency score: output/input ratio (higher = more productive)
    let efficiency_score = if total_input > 0 {
        total_output as f64 / total_input as f64
    } else {
        0.0
    };

    // Monthly projection based on daily average
    let days_with_data = daily_summaries.len().max(1) as f64;
    let daily_avg_cost = total_cost / days_with_data;
    let monthly_projection = daily_avg_cost * 30.0;

    // Week comparison
    let cost_change_percent = if last_week.0 > 0.0 {
        ((this_week.0 - last_week.0) / last_week.0) * 100.0
    } else {
        0.0
    };

    let week_comparison = WeekComparison {
        this_week_cost: this_week.0,
        last_week_cost: last_week.0,
        this_week_tokens: this_week.1,
        last_week_tokens: last_week.1,
        this_week_requests: this_week.2,
        last_week_requests: last_week.2,
        cost_change_percent,
    };

    // Sessions (top 20 by cost)
    let mut sessions: Vec<SessionSummary> = session_map
        .into_iter()
        .map(|(id, (start, tokens, cost, count, models))| SessionSummary {
            session_id: id,
            start_time: start,
            total_tokens: tokens,
            total_cost_usd: cost,
            request_count: count,
            models_used: models.into_iter().collect(),
        })
        .collect();
    sessions.sort_by(|a, b| b.total_cost_usd.partial_cmp(&a.total_cost_usd).unwrap());
    sessions.truncate(20);

    // Recent requests (last 50)
    let mut recent: Vec<UsageRecord> = records.to_vec();
    recent.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    recent.truncate(50);

    let avg_response_time_ms = if duration_count > 0 {
        total_duration as f64 / duration_count as f64
    } else {
        0.0
    };

    let total_requests = records.len() as u64;

    UsageDashboard {
        total_cost_usd: total_cost,
        total_input_tokens: total_input,
        total_output_tokens: total_output,
        total_cached_tokens: total_cached,
        total_requests,
        cache_hit_rate,
        daily_summaries,
        model_stats,
        limit_status,
        today_cost_usd: today_cost,
        today_tokens,
        today_requests,
        hourly_usage,
        recent_requests: recent,
        heatmap,
        week_comparison,
        monthly_projection,
        efficiency_score,
        sessions,
        avg_response_time_ms,
    }
}

#[tauri::command]
fn get_local_usage(state: tauri::State<'_, AppState>) -> UsageDashboard {
    let local = local_usage::read_local_usage();

    // Persist to SQLite
    let records: Vec<UsageRecord> = local.parsed.iter().map(|p| p.record.clone()).collect();
    let req_ids: Vec<String> = local.parsed.iter().map(|p| p.request_id.clone()).collect();
    state.db.upsert_records(&records, &req_ids);

    // Read all from DB (includes historical data)
    let all_records = state.db.get_all_records();
    build_dashboard(&all_records, local.limit_status)
}

#[tauri::command]
async fn get_api_usage(api_key: String) -> Result<UsageDashboard, String> {
    let records = api::fetch_api_usage(&api_key).await?;
    Ok(build_dashboard(&records, None))
}

#[tauri::command]
fn get_combined_usage(
    _api_key: Option<String>,
    state: tauri::State<'_, AppState>,
) -> UsageDashboard {
    let local = local_usage::read_local_usage();

    // Persist to SQLite
    let records: Vec<UsageRecord> = local.parsed.iter().map(|p| p.record.clone()).collect();
    let req_ids: Vec<String> = local.parsed.iter().map(|p| p.request_id.clone()).collect();
    state.db.upsert_records(&records, &req_ids);

    // Read all from DB
    let all_records = state.db.get_all_records();
    build_dashboard(&all_records, local.limit_status)
}

#[tauri::command]
fn export_csv(state: tauri::State<'_, AppState>) -> String {
    let records = state.db.get_all_records();
    let mut csv = String::from("timestamp,model,input_tokens,output_tokens,cached_input_tokens,cost_usd,duration_ms,session_id,query_source\n");
    for r in &records {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{}\n",
            r.timestamp, r.model, r.input_tokens, r.output_tokens,
            r.cached_input_tokens, r.cost_usd, r.duration_ms, r.session_id, r.query_source
        ));
    }
    csv
}

#[tauri::command]
fn export_json(state: tauri::State<'_, AppState>) -> String {
    let records = state.db.get_all_records();
    serde_json::to_string_pretty(&records).unwrap_or_default()
}

#[tauri::command]
async fn check_online() -> bool {
    match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(client) => client
            .head("https://api.anthropic.com")
            .send()
            .await
            .is_ok(),
        Err(_) => false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize database in app data directory
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            let db = Database::new(&data_dir).expect("failed to initialize database");
            app.manage(AppState { db });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_local_usage,
            get_api_usage,
            get_combined_usage,
            export_csv,
            export_json,
            check_online,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
