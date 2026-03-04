import type { UsageDashboard } from "../lib/types";
import Sparkline from "./Sparkline";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function Card({
  label,
  value,
  sub,
  color,
  bg,
  delay,
  sparkData,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg: string;
  delay: number;
  sparkData?: number[];
}) {
  return (
    <div
      className="animate-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 20px",
        flex: 1,
        minWidth: 160,
        animationDelay: `${delay}ms`,
        animationFillMode: "backwards",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            fontSize: 14,
            color,
          }}
        >
          {label === "Total Cost"
            ? "$"
            : label === "Input"
              ? "I"
              : label === "Output"
                ? "O"
                : "%"}
        </div>
        {sparkData && sparkData.length >= 2 && (
          <Sparkline data={sparkData} color={color} />
        )}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      {sub && (
        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function CostSummary({ data }: { data: UsageDashboard }) {
  const last14 = data.daily_summaries.slice(-14);
  const costSpark = last14.map((d) => d.total_cost_usd);
  const inputSpark = last14.map((d) => d.total_input_tokens);
  const outputSpark = last14.map((d) => d.total_output_tokens);
  const cacheSpark = last14.map((d) => {
    const total = d.total_input_tokens + d.total_cached_tokens;
    return total > 0 ? d.total_cached_tokens / total : 0;
  });

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Card
        label="Total Cost"
        value={"$" + data.total_cost_usd.toFixed(2)}
        sub={`${data.total_requests} total requests`}
        color="var(--accent)"
        bg="var(--accent-glow)"
        delay={0}
        sparkData={costSpark}
      />
      <Card
        label="Input"
        value={formatTokens(data.total_input_tokens)}
        sub="uncached tokens"
        color="var(--blue)"
        bg="var(--blue-dim)"
        delay={50}
        sparkData={inputSpark}
      />
      <Card
        label="Output"
        value={formatTokens(data.total_output_tokens)}
        sub="generated tokens"
        color="var(--purple)"
        bg="var(--purple-dim)"
        delay={100}
        sparkData={outputSpark}
      />
      <Card
        label="Cache Rate"
        value={(data.cache_hit_rate * 100).toFixed(1) + "%"}
        sub={formatTokens(data.total_cached_tokens) + " cached"}
        color="var(--green)"
        bg="var(--green-dim)"
        delay={150}
        sparkData={cacheSpark}
      />
    </div>
  );
}
