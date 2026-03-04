import type { HeatmapCell } from "../lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function getColor(value: number): string {
  if (value === 0) return "var(--bg-primary)";
  if (value < 0.15) return "rgba(212, 165, 116, 0.15)";
  if (value < 0.3) return "rgba(212, 165, 116, 0.3)";
  if (value < 0.5) return "rgba(212, 165, 116, 0.5)";
  if (value < 0.7) return "rgba(212, 165, 116, 0.7)";
  return "rgba(212, 165, 116, 0.9)";
}

export default function Heatmap({ data }: { data: HeatmapCell[] }) {
  const cellMap = new Map<string, HeatmapCell>();
  for (const cell of data) {
    cellMap.set(`${cell.day}-${cell.hour}`, cell);
  }

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
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
        Peak Hours
      </h3>

      <div style={{ overflowX: "auto" }}>
        {/* Hour labels */}
        <div style={{ display: "flex", gap: 2, marginLeft: 36, marginBottom: 4 }}>
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <span
              key={h}
              style={{
                width: 3 * 18 + 2 * 2,
                fontSize: 10,
                color: "var(--text-muted)",
                textAlign: "left",
              }}
            >
              {h.toString().padStart(2, "0")}
            </span>
          ))}
        </div>

        {/* Grid */}
        {DAYS.map((day, dayIdx) => (
          <div key={day} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
            <span
              style={{
                width: 32,
                fontSize: 10,
                color: "var(--text-muted)",
                textAlign: "right",
                paddingRight: 4,
              }}
            >
              {day}
            </span>
            {HOURS.map((hour) => {
              const cell = cellMap.get(`${dayIdx}-${hour}`);
              const value = cell?.value ?? 0;
              const tokens = cell?.tokens ?? 0;
              const requests = cell?.requests ?? 0;
              return (
                <div
                  key={hour}
                  title={`${day} ${hour}:00 - ${formatTokens(tokens)} tokens, ${requests} req`}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    background: getColor(value),
                    border: "1px solid rgba(255,255,255,0.03)",
                    cursor: "default",
                    transition: "transform 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 12,
            marginLeft: 36,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Less</span>
          {[0, 0.15, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <div
              key={v}
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: v === 0 ? "var(--bg-primary)" : getColor(v),
                border: "1px solid rgba(255,255,255,0.03)",
              }}
            />
          ))}
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>More</span>
        </div>
      </div>
    </div>
  );
}
