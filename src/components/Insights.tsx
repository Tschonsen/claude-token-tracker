import type { UsageDashboard } from "../lib/types";

export default function Insights({ data }: { data: UsageDashboard }) {
  const avgResponseSec = data.avg_response_time_ms / 1000;

  return (
    <div
      className="animate-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
        flex: 1,
        minWidth: 280,
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
        Insights
      </h3>

      {/* Monthly Projection */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Monthly Projection
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--orange)", letterSpacing: "-0.03em" }}>
          ${data.monthly_projection.toFixed(2)}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          based on avg daily spend
        </div>
      </div>

      {/* Efficiency Score */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Efficiency Score
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--purple)" }}>
            {data.efficiency_score.toFixed(2)}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>output/input ratio</span>
        </div>
        <div
          style={{
            width: "100%",
            height: 4,
            background: "var(--bg-primary)",
            borderRadius: 2,
            marginTop: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(data.efficiency_score * 20, 100)}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--purple), var(--blue))",
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      {/* Avg Response Time */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Avg Response Time
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--blue)" }}>
            {avgResponseSec.toFixed(1)}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>seconds</span>
        </div>
      </div>

      {/* Sessions */}
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Top Sessions
        </div>
        {data.sessions.slice(0, 5).map((s, i) => (
          <div
            key={s.session_id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 0",
              borderBottom: i < Math.min(data.sessions.length, 5) - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div>
              <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-secondary)" }}>
                {s.session_id.slice(0, 8)}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>
                {s.request_count} req
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
              ${s.total_cost_usd.toFixed(2)}
            </span>
          </div>
        ))}
        {data.sessions.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No sessions yet</div>
        )}
      </div>
    </div>
  );
}
