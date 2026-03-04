import type { UsageRecord } from "../lib/types";
import { useState } from "react";

function shortModel(name: string): string {
  if (name.includes("opus")) return "Opus";
  if (name.includes("sonnet")) return "Sonnet";
  if (name.includes("haiku")) return "Haiku";
  return name.length > 10 ? name.slice(0, 10) + "..." : name;
}

function modelColor(name: string): string {
  if (name.includes("opus")) return "#d4a574";
  if (name.includes("sonnet")) return "#60a5fa";
  if (name.includes("haiku")) return "#4ade80";
  return "#a78bfa";
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return ts;
  }
}

function formatDate(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function RecentRequests({ records }: { records: UsageRecord[] }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? records.filter(
        (r) =>
          r.model.toLowerCase().includes(search.toLowerCase()) ||
          r.timestamp.includes(search) ||
          r.session_id.toLowerCase().includes(search.toLowerCase())
      )
    : records;
  const shown = expanded ? filtered : filtered.slice(0, 15);

  return (
    <div
      className="animate-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>
          Recent Requests
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 400,
              marginLeft: 8,
            }}
          >
            {filtered.length}{search ? ` / ${records.length}` : ""} total
          </span>
        </h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search model, date, session..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "4px 10px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-primary)",
              fontSize: 11,
              width: 200,
              outline: "none",
            }}
          />
          {filtered.length > 15 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: "4px 10px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-muted)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {expanded ? "Show less" : "Show all"}
            </button>
          )}
        </div>
      </div>

      {/* Table Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 70px 1fr 80px 80px 70px 60px",
          gap: 8,
          padding: "8px 0",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <span>Time</span>
        <span>Date</span>
        <span>Model</span>
        <span style={{ textAlign: "right" }}>Input</span>
        <span style={{ textAlign: "right" }}>Output</span>
        <span style={{ textAlign: "right" }}>Cost</span>
        <span style={{ textAlign: "right" }}>Speed</span>
      </div>

      {/* Rows */}
      {shown.map((r, i) => {
        const totalTokens = r.input_tokens + r.output_tokens;
        const speed =
          r.duration_ms > 0
            ? ((r.output_tokens / r.duration_ms) * 1000).toFixed(0)
            : "-";

        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 70px 1fr 80px 80px 70px 60px",
              gap: 8,
              padding: "8px 0",
              borderBottom:
                i < shown.length - 1 ? "1px solid var(--border)" : "none",
              fontSize: 13,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-card-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 12 }}>
              {formatTime(r.timestamp)}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
              {formatDate(r.timestamp)}
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  padding: "1px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  background: modelColor(r.model) + "18",
                  color: modelColor(r.model),
                }}
              >
                {shortModel(r.model)}
              </span>
            </span>
            <span
              style={{
                textAlign: "right",
                fontFamily: "monospace",
                fontSize: 12,
                color: "var(--blue)",
              }}
            >
              {formatTokens(r.input_tokens)}
            </span>
            <span
              style={{
                textAlign: "right",
                fontFamily: "monospace",
                fontSize: 12,
                color: "var(--purple)",
              }}
            >
              {formatTokens(r.output_tokens)}
            </span>
            <span
              style={{
                textAlign: "right",
                fontFamily: "monospace",
                fontSize: 12,
                color: "var(--accent)",
              }}
            >
              ${r.cost_usd.toFixed(3)}
            </span>
            <span
              style={{
                textAlign: "right",
                fontFamily: "monospace",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              {speed !== "-" ? speed + "/s" : "-"}
            </span>
          </div>
        );
      })}

      {records.length === 0 && (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          No requests recorded yet
        </div>
      )}
    </div>
  );
}
