import type { DailySummary } from "../lib/types";
import { useState, useMemo } from "react";

type Period = "week" | "month" | "year";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0)
    return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>--</span>;
  if (previous === 0)
    return <span style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>New</span>;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  return (
    <span style={{ color: isUp ? "var(--red)" : "var(--green)", fontSize: 12, fontWeight: 600 }}>
      {isUp ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
}

function getPeriodRanges(
  period: Period,
  offset: number
): { currentStart: string; currentEnd: string; prevStart: string; prevEnd: string; label: string; prevLabel: string } {
  const now = new Date();
  let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;
  let label: string, prevLabel: string;

  if (period === "week") {
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0
    currentEnd = new Date(now);
    currentStart = new Date(now);
    currentStart.setDate(now.getDate() - dayOfWeek - offset * 7);
    currentEnd.setDate(currentStart.getDate() + 6);
    prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() + 6);
    label = offset === 0 ? "This week" : `${offset}w ago`;
    prevLabel = offset === 0 ? "Last week" : `${offset + 1}w ago`;
  } else if (period === "month") {
    currentStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    currentEnd = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
    prevStart = new Date(now.getFullYear(), now.getMonth() - offset - 1, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth() - offset, 0);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    label = months[currentStart.getMonth()];
    prevLabel = months[prevStart.getMonth()];
  } else {
    currentStart = new Date(now.getFullYear() - offset, 0, 1);
    currentEnd = new Date(now.getFullYear() - offset, 11, 31);
    prevStart = new Date(now.getFullYear() - offset - 1, 0, 1);
    prevEnd = new Date(now.getFullYear() - offset - 1, 11, 31);
    label = String(currentStart.getFullYear());
    prevLabel = String(prevStart.getFullYear());
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { currentStart: fmt(currentStart), currentEnd: fmt(currentEnd), prevStart: fmt(prevStart), prevEnd: fmt(prevEnd), label, prevLabel };
}

function sumRange(data: DailySummary[], start: string, end: string) {
  let cost = 0, tokens = 0, requests = 0;
  for (const d of data) {
    if (d.date >= start && d.date <= end) {
      cost += d.total_cost_usd;
      tokens += d.total_input_tokens + d.total_output_tokens;
      requests += d.request_count;
    }
  }
  return { cost, tokens, requests };
}

export default function WeekCompare({ data }: { data: DailySummary[] }) {
  const [period, setPeriod] = useState<Period>("week");
  const [offset, setOffset] = useState(0);

  const { currentStart, currentEnd, prevStart, prevEnd, label, prevLabel } = useMemo(
    () => getPeriodRanges(period, offset),
    [period, offset]
  );

  const current = useMemo(() => sumRange(data, currentStart, currentEnd), [data, currentStart, currentEnd]);
  const previous = useMemo(() => sumRange(data, prevStart, prevEnd), [data, prevStart, prevEnd]);

  const rows: { label: string; curr: number; prev: number; fmt: (n: number) => string }[] = [
    { label: "Cost", curr: current.cost, prev: previous.cost, fmt: (n) => "$" + n.toFixed(2) },
    { label: "Tokens", curr: current.tokens, prev: previous.tokens, fmt: formatTokens },
    { label: "Requests", curr: current.requests, prev: previous.requests, fmt: (n) => String(n) },
  ];

  return (
    <div
      className="animate-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
        flex: 1,
        minWidth: 340,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Period Compare</h3>
        <div style={{ display: "flex", gap: 2, background: "var(--bg-primary)", borderRadius: 7, padding: 2 }}>
          {(["week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setOffset(0); }}
              style={{
                padding: "3px 10px",
                borderRadius: 5,
                border: "none",
                background: period === p ? "var(--bg-card-hover)" : "transparent",
                color: period === p ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: period === p ? 600 : 400,
                textTransform: "capitalize",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button
          onClick={() => setOffset(offset + 1)}
          style={{
            padding: "4px 10px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text-secondary)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          &larr; Older
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
        <button
          onClick={() => setOffset(Math.max(0, offset - 1))}
          disabled={offset === 0}
          style={{
            padding: "4px 10px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: offset === 0 ? "var(--text-muted)" : "var(--text-secondary)",
            fontSize: 11,
            cursor: offset === 0 ? "default" : "pointer",
            opacity: offset === 0 ? 0.4 : 1,
          }}
        >
          Newer &rarr;
        </button>
      </div>

      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 60 }}>{row.label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right", minWidth: 60 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{prevLabel}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{row.fmt(row.prev)}</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 60 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{row.fmt(row.curr)}</div>
            </div>
            <div style={{ minWidth: 45, textAlign: "right" }}>
              <ChangeIndicator current={row.curr} previous={row.prev} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
