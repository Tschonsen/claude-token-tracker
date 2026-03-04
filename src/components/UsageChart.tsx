import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { DailySummary } from "../lib/types";
import { useState } from "react";

function formatDate(d: string) {
  const parts = d.split("-");
  if (parts.length === 3) return parts[2] + "." + parts[1];
  return d;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

type ViewMode = "tokens" | "cost" | "requests";

export default function UsageChart({ data }: { data: DailySummary[] }) {
  const [mode, setMode] = useState<ViewMode>("tokens");

  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    input: d.total_input_tokens,
    output: d.total_output_tokens,
    cached: d.total_cached_tokens,
    cost: parseFloat(d.total_cost_usd.toFixed(4)),
    requests: d.request_count,
  }));

  const tabs: { key: ViewMode; label: string }[] = [
    { key: "tokens", label: "Tokens" },
    { key: "cost", label: "Cost" },
    { key: "requests", label: "Requests" },
  ];

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
          marginBottom: 20,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Daily Usage
        </h3>
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "var(--bg-primary)",
            borderRadius: 8,
            padding: 2,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "none",
                background: mode === tab.key ? "var(--bg-card-hover)" : "transparent",
                color:
                  mode === tab.key ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: mode === tab.key ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        {mode === "requests" ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
            <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            />
            <Bar dataKey="requests" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : mode === "cost" ? (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
            <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => "$" + v}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
              formatter={((v: number | undefined) => ["$" + (v ?? 0).toFixed(4), "Cost"]) as any}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="var(--accent)"
              fill="url(#colorCost)"
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCached" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
            <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatTokens}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
              formatter={((v: number | undefined, name: string | undefined) => [
                formatTokens(v ?? 0),
                (name ?? "").charAt(0).toUpperCase() + (name ?? "").slice(1),
              ]) as any}
            />
            <Area
              type="monotone"
              dataKey="cached"
              stroke="#4ade80"
              fill="url(#colorCached)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="input"
              stroke="#60a5fa"
              fill="url(#colorInput)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="output"
              stroke="#a78bfa"
              fill="url(#colorOutput)"
              strokeWidth={2}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>

      {/* Legend */}
      {mode === "tokens" && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 20,
            marginTop: 12,
          }}
        >
          {[
            { label: "Cached", color: "#4ade80" },
            { label: "Input", color: "#60a5fa" },
            { label: "Output", color: "#a78bfa" },
          ].map((l) => (
            <div
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: l.color,
                }}
              />
              {l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
