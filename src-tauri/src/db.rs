use crate::models::UsageRecord;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(data_dir: &PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(data_dir).map_err(|e| e.to_string())?;
        let db_path = data_dir.join("usage.db");
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS usage_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                model TEXT NOT NULL,
                input_tokens INTEGER NOT NULL,
                output_tokens INTEGER NOT NULL,
                cached_input_tokens INTEGER NOT NULL,
                cost_usd REAL NOT NULL,
                duration_ms INTEGER NOT NULL,
                session_id TEXT NOT NULL DEFAULT '',
                query_source TEXT NOT NULL DEFAULT '',
                source TEXT NOT NULL,
                request_id TEXT UNIQUE
            );
            CREATE INDEX IF NOT EXISTS idx_timestamp ON usage_records(timestamp);
            CREATE INDEX IF NOT EXISTS idx_session ON usage_records(session_id);
            CREATE INDEX IF NOT EXISTS idx_model ON usage_records(model);",
        )
        .map_err(|e| e.to_string())?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    pub fn upsert_records(&self, records: &[UsageRecord], request_ids: &[String]) {
        let conn = self.conn.lock().unwrap();
        for (record, req_id) in records.iter().zip(request_ids.iter()) {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO usage_records
                 (timestamp, model, input_tokens, output_tokens, cached_input_tokens, cost_usd, duration_ms, session_id, query_source, source, request_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    record.timestamp,
                    record.model,
                    record.input_tokens,
                    record.output_tokens,
                    record.cached_input_tokens,
                    record.cost_usd,
                    record.duration_ms,
                    record.session_id,
                    record.query_source,
                    record.source,
                    req_id,
                ],
            );
        }
    }

    pub fn get_all_records(&self) -> Vec<UsageRecord> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT timestamp, model, input_tokens, output_tokens, cached_input_tokens, cost_usd, duration_ms, session_id, query_source, source
                 FROM usage_records ORDER BY timestamp ASC",
            )
            .unwrap();

        stmt.query_map([], |row| {
            Ok(UsageRecord {
                timestamp: row.get(0)?,
                model: row.get(1)?,
                input_tokens: row.get(2)?,
                output_tokens: row.get(3)?,
                cached_input_tokens: row.get(4)?,
                cost_usd: row.get(5)?,
                duration_ms: row.get(6)?,
                session_id: row.get(7)?,
                query_source: row.get(8)?,
                source: row.get(9)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect()
    }

    pub fn get_record_count(&self) -> usize {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM usage_records", [], |row| {
            row.get::<_, usize>(0)
        })
        .unwrap_or(0)
    }
}
