import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ModelStats } from "../lib/types";

const COLORS = ["#d4a574", "#60a5fa", "#a78bfa", "#4ade80", "#fb923c"];

function shortModel(name: string): string {
  if (name.includes("opus")) return "Opus";
  if (name.includes("sonnet")) return "Sonnet";
  if (name.includes("haiku")) return "Haiku";
  return name.length > 12 ? name.slice(0, 12) + "..." : name;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function ModelBreakdown({ data }: { data: ModelStats[] }) {
  const chartData = data.map((m) => ({
    name: shortModel(m.model),
    cost: parseFloat(m.total_cost_usd.toFixed(2)),
    requests: m.request_count,
    fullName: m.model,
  }));

  return (
    <div
      className="animate-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
        flex: 1,
        minWidth: 300,
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
        Models
      </h3>
      {chartData.length === 0 ? (
        <div
          style={{
            color: "var(--text-muted)",
            padding: 40,
            textAlign: "center",
            fontSize: 13,
          }}
        >
          No data
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 44)}>
            <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
              <XAxis
                type="number"
                stroke="#52525b"
                fontSize={11}
                tickFormatter={(v) => "$" + v}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#52525b"
                fontSize={12}
                width={60}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
                formatter={((v: number | undefined) => ["$" + (v ?? 0).toFixed(2), "Cost"]) as any}
              />
              <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Model details */}
          <div style={{ marginTop: 16 }}>
            {data.map((m, i) => (
              <div
                key={m.model}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom:
                    i < data.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS[i % COLORS.length],
                    }}
                  >
                    {shortModel(m.model)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginLeft: 8,
                    }}
                  >
                    {m.request_count} requests
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {formatTokens(m.total_input_tokens + m.total_output_tokens + m.total_cached_tokens)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                    tokens
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
