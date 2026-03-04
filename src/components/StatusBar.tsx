import type { LimitStatus } from "../lib/types";

function formatResetTime(status: LimitStatus): string {
  // Calculate absolute reset time from the timestamp + hours_till_reset
  try {
    const eventTime = new Date(status.timestamp);
    const resetTime = new Date(eventTime.getTime() + status.hours_till_reset * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = resetTime.getTime() - now.getTime();

    if (diffMs <= 0) return "Reset already passed";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `~${hours}h ${minutes}m`;
    return `~${minutes}m`;
  } catch {
    // Fallback to raw hours_till_reset
    if (status.hours_till_reset < 1) {
      return `~${Math.round(status.hours_till_reset * 60)}m`;
    }
    return `~${status.hours_till_reset.toFixed(0)}h`;
  }
}

function formatEventAge(timestamp: string): string {
  try {
    const eventTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - eventTime.getTime();
    const minutes = Math.round(diffMs / (1000 * 60));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

export default function StatusBar({ status }: { status: LimitStatus | null }) {
  // No limit data available
  if (!status) {
    return (
      <div
        className="animate-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--text-muted)",
              opacity: 0.4,
            }}
          />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Claude Max
          </span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          No limit status available yet
        </span>
      </div>
    );
  }

  const isAllowed = status.status === "allowed";
  const isLimited = !isAllowed;
  const color = isAllowed ? "var(--green)" : "var(--red)";
  const bg = isAllowed ? "var(--green-dim)" : "var(--red-dim)";
  const borderColor = isAllowed ? "rgba(74, 222, 128, 0.25)" : "rgba(248, 113, 113, 0.25)";
  const eventAge = formatEventAge(status.timestamp);

  return (
    <div
      className="animate-in"
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: "12px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
          className={isAllowed ? "pulse" : ""}
        />
        <span style={{ fontSize: 14, fontWeight: 600, color }}>
          {isAllowed ? "Active" : "Rate Limited"}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          &middot; Claude Max
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {isLimited && status.hours_till_reset > 0 && (
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Reset in{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {formatResetTime(status)}
            </span>
          </span>
        )}
        {eventAge && (
          <span
            style={{ fontSize: 10, color: "var(--text-muted)" }}
            title={`Last status update from Claude Code telemetry: ${status.timestamp}`}
          >
            updated {eventAge}
          </span>
        )}
      </div>
    </div>
  );
}
