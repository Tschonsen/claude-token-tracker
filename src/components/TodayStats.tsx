import type { UsageDashboard } from "../lib/types";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function TodayStats({
  data,
  budget,
}: {
  data: UsageDashboard;
  budget: number;
}) {
  const budgetPercent = budget > 0 ? Math.min((data.today_cost_usd / budget) * 100, 100) : 0;
  const overBudget = budget > 0 && data.today_cost_usd > budget;

  return (
    <div
      className="animate-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: budget > 0 ? 16 : 0,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Today
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: overBudget ? "var(--red)" : "var(--accent)",
              }}
            >
              ${data.today_cost_usd.toFixed(2)}
            </span>
            {budget > 0 && (
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                / ${budget.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 32, paddingTop: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              {formatTokens(data.today_tokens)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tokens</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              {data.today_requests}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>requests</div>
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      {budget > 0 && (
        <div>
          <div
            style={{
              width: "100%",
              height: 6,
              background: "var(--bg-primary)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${budgetPercent}%`,
                height: "100%",
                borderRadius: 3,
                background: overBudget
                  ? "linear-gradient(90deg, var(--orange), var(--red))"
                  : "linear-gradient(90deg, var(--accent), var(--green))",
                transition: "width 0.5s ease",
              }}
            />
          </div>
          {overBudget && (
            <div style={{ fontSize: 12, color: "var(--red)", marginTop: 6 }}>
              Budget exceeded by ${(data.today_cost_usd - budget).toFixed(2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
