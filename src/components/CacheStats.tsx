import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { UsageDashboard } from "../lib/types";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function CacheStats({ data }: { data: UsageDashboard }) {
  const cached = data.total_cached_tokens;
  const uncached = data.total_input_tokens;
  const total = cached + uncached;

  const pieData = [
    { name: "Cached", value: cached, color: "#4ade80" },
    { name: "Uncached", value: uncached, color: "#60a5fa" },
  ];

  const savedPercent = total > 0 ? ((cached / total) * 100).toFixed(0) : "0";

  return (
    <div
      className="animate-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
        flex: 1,
        minWidth: 260,
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
        Cache Efficiency
      </h3>
      {total === 0 ? (
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
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                  formatter={((v: number | undefined) => [formatTokens(v ?? 0), "Tokens"]) as any}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--green)",
                }}
              >
                {savedPercent}%
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                hit rate
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: 8,
            }}
          >
            {[
              { label: "Cached", value: cached, color: "#4ade80" },
              { label: "Uncached", value: uncached, color: "#60a5fa" },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    justifyContent: "center",
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: item.color,
                    }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {item.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: item.color,
                  }}
                >
                  {formatTokens(item.value)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
