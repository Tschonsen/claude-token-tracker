import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { UsageDashboard } from "./lib/types";
import StatusBar from "./components/StatusBar";
import TodayStats from "./components/TodayStats";
import CostSummary from "./components/CostSummary";
import UsageChart from "./components/UsageChart";
import ModelBreakdown from "./components/ModelBreakdown";
import CacheStats from "./components/CacheStats";
import RecentRequests from "./components/RecentRequests";
import Heatmap from "./components/Heatmap";
import WeekCompare from "./components/WeekCompare";
import Insights from "./components/Insights";
import Settings from "./components/Settings";

type TimeRange = "today" | "7d" | "30d" | "all";

function filterByRange(data: UsageDashboard, range: TimeRange): UsageDashboard {
  if (range === "all") return data;

  const now = new Date();
  let cutoff: string;
  if (range === "today") {
    cutoff = now.toISOString().slice(0, 10);
  } else if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    cutoff = d.toISOString().slice(0, 10);
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    cutoff = d.toISOString().slice(0, 10);
  }

  return {
    ...data,
    daily_summaries: data.daily_summaries.filter((d) => d.date >= cutoff),
    recent_requests: data.recent_requests.filter((r) => r.timestamp.slice(0, 10) >= cutoff),
  };
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title="Toggle theme (T)"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 6px",
        background: isDark ? "#18181b" : "#e4e4e7",
        border: `1px solid ${isDark ? "#27272a" : "#d4d4d8"}`,
        borderRadius: 20,
        cursor: "pointer",
        position: "relative",
        width: 52,
        height: 26,
      }}
    >
      <span style={{ fontSize: 12, position: "absolute", left: 6, top: 4, opacity: isDark ? 0.3 : 1 }}>
        {"\u2600"}
      </span>
      <span style={{ fontSize: 12, position: "absolute", right: 6, top: 4, opacity: isDark ? 1 : 0.3 }}>
        {"\u263E"}
      </span>
      <span
        style={{
          position: "absolute",
          left: isDark ? 28 : 4,
          top: 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: isDark ? "#fafafa" : "#18181b",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function HelpModal({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const shortcuts = [
    ["R", "Refresh data"],
    ["S", "Open settings"],
    ["T", "Toggle theme"],
    ["M", "Toggle menu"],
    ["1", "Today"],
    ["2", "Last 7 days"],
    ["3", "Last 30 days"],
    ["4", "All time"],
    ["Esc", "Close modal"],
  ];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 28,
          width: 340,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Keyboard Shortcuts</h3>
        {shortcuts.map(([key, desc]) => (
          <div
            key={key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
            }}
          >
            <span
              style={{
                padding: "1px 8px",
                background: isDark ? "#27272a" : "#e4e4e7",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {key}
            </span>
            <span style={{ color: "var(--text-secondary)" }}>{desc}</span>
          </div>
        ))}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              padding: "6px 20px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [data, setData] = useState<UsageDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [budget, setBudget] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onlineRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem("anthropic_api_key");
    if (saved) setApiKey(saved);
    const savedBudget = localStorage.getItem("daily_budget");
    if (savedBudget) setBudget(parseFloat(savedBudget));
    const savedAutoRefresh = localStorage.getItem("auto_refresh");
    if (savedAutoRefresh !== null) setAutoRefresh(savedAutoRefresh === "true");
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") setTheme("light");
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<UsageDashboard>("get_combined_usage", {
        apiKey: apiKey || null,
      });
      setData(result);
      setLastRefresh(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refresh]);

  // Online check
  const checkOnline = useCallback(async () => {
    try {
      const online = await invoke<boolean>("check_online");
      setIsOnline(online);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    checkOnline();
    onlineRef.current = setInterval(checkOnline, 15000);
    return () => { if (onlineRef.current) clearInterval(onlineRef.current); };
  }, [checkOnline]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "r" || e.key === "R") refresh();
      if (e.key === "s" || e.key === "S") setShowSettings((v) => !v);
      if (e.key === "t" || e.key === "T") setTheme((v) => (v === "dark" ? "light" : "dark"));
      if (e.key === "m" || e.key === "M") setMenuOpen((v) => !v);
      if (e.key === "?" || e.key === "/") setShowHelp((v) => !v);
      if (e.key === "Escape") { setShowSettings(false); setShowHelp(false); setMenuOpen(false); }
      if (e.key === "1") setTimeRange("today");
      if (e.key === "2") setTimeRange("7d");
      if (e.key === "3") setTimeRange("30d");
      if (e.key === "4") setTimeRange("all");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [refresh]);

  const handleSaveSettings = (key: string, newBudget: number, newAutoRefresh: boolean) => {
    setApiKey(key);
    setBudget(newBudget);
    setAutoRefresh(newAutoRefresh);
    localStorage.setItem("anthropic_api_key", key);
    localStorage.setItem("daily_budget", String(newBudget));
    localStorage.setItem("auto_refresh", String(newAutoRefresh));
    setShowSettings(false);
  };

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const content = await invoke<string>(format === "csv" ? "export_csv" : "export_json");
      const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `claude-usage.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  };

  const filtered = data ? filterByRange(data, timeRange) : null;

  const isDark = theme === "dark";
  const bg = isDark ? "#09090b" : "#f8f8fa";
  const headerBg = isDark ? "rgba(9,9,11,0.8)" : "rgba(248,248,250,0.8)";
  const textColor = isDark ? "#fafafa" : "#18181b";
  const mutedColor = isDark ? "#71717a" : "#a1a1aa";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: textColor,
        transition: "background 0.3s, color 0.3s",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: headerBg,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${isDark ? "#27272a" : "#e4e4e7"}`,
          padding: "8px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Left: Logo + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "linear-gradient(135deg, #d4a574, #b8956a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 800,
                color: "#000",
              }}
            >
              C
            </div>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                Claude Token Tracker
              </h1>
              <span style={{ fontSize: 10, color: mutedColor }}>
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Center: Status badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              background: isDark ? "#18181b" : "#e4e4e7",
              border: `1px solid ${isDark ? "#27272a" : "#d4d4d8"}`,
              borderRadius: 20,
              fontSize: 11,
            }}
          >
            {autoRefresh && (
              <>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)" }} className="pulse" />
                <span style={{ color: "var(--green)", fontWeight: 600 }}>Live</span>
                <span style={{ color: "var(--border)", margin: "0 2px" }}>{"\u00B7"}</span>
              </>
            )}
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isOnline ? "var(--green)" : "var(--red)",
                boxShadow: `0 0 6px ${isOnline ? "var(--green)" : "var(--red)"}`,
              }}
            />
            <span style={{ color: isOnline ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* Right: Hamburger + slide-out menu */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ThemeToggle isDark={isDark} onToggle={() => setTheme(isDark ? "light" : "dark")} />

            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                padding: "5px 10px",
                background: isDark ? "#18181b" : "#e4e4e7",
                border: `1px solid ${isDark ? "#27272a" : "#d4d4d8"}`,
                borderRadius: 7,
                color: textColor,
                fontSize: 14,
                cursor: "pointer",
                lineHeight: 1,
              }}
              title="Menu (M)"
            >
              {menuOpen ? "\u2715" : "\u2630"}
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out menu panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 260,
          background: isDark ? "#18181b" : "#f0f0f3",
          borderLeft: `1px solid ${isDark ? "#27272a" : "#d4d4d8"}`,
          zIndex: 60,
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Menu</span>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: mutedColor,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Time Range */}
        <div style={{ fontSize: 10, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Time Range
        </div>
        <div style={{ display: "flex", gap: 2, background: isDark ? "#09090b" : "#e4e4e7", borderRadius: 7, padding: 2, marginBottom: 12 }}>
          {([["today", "Today"], ["7d", "7D"], ["30d", "30D"], ["all", "All"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              style={{
                padding: "5px 0",
                flex: 1,
                borderRadius: 5,
                border: "none",
                background: timeRange === key ? (isDark ? "#27272a" : "#fff") : "transparent",
                color: timeRange === key ? textColor : mutedColor,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: timeRange === key ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ fontSize: 10, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Actions
        </div>
        {([
          { label: loading ? "Refreshing..." : "Refresh", key: "R", onClick: refresh, disabled: loading },
          { label: "Export CSV", key: "Shift", onClick: () => handleExport("csv"), disabled: exporting },
          { label: "Export JSON", key: "", onClick: () => handleExport("json"), disabled: exporting },
          { label: "Settings", key: "S", onClick: () => { setShowSettings(true); setMenuOpen(false); }, disabled: false },
          { label: "Help", key: "?", onClick: () => { setShowHelp(true); setMenuOpen(false); }, disabled: false },
        ] as const).map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            disabled={item.disabled}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              background: isDark ? "#27272a" : "#e4e4e7",
              border: "none",
              borderRadius: 7,
              color: item.disabled ? mutedColor : textColor,
              fontSize: 12,
              cursor: item.disabled ? "default" : "pointer",
              opacity: item.disabled ? 0.5 : 1,
              width: "100%",
              textAlign: "left",
            }}
          >
            <span>{item.label}</span>
            {item.key && (
              <span style={{ fontSize: 10, color: mutedColor, fontFamily: "monospace" }}>{item.key}</span>
            )}
          </button>
        ))}
      </div>

      {/* Menu backdrop */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "rgba(0,0,0,0.3)",
          }}
        />
      )}

      {/* Content */}
      <div style={{ padding: "16px 24px 40px", maxWidth: 1200, margin: "0 auto" }}>
        {error && (
          <div
            className="animate-in"
            style={{
              background: "var(--red-dim)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 10,
              padding: "8px 14px",
              marginBottom: 12,
              color: "var(--red)",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {loading && !data ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }} className="pulse">
              <span style={{ color: "var(--accent)", fontSize: 20, fontWeight: 700 }}>C</span>
            </div>
            <span style={{ color: mutedColor, fontSize: 13 }}>Loading usage data...</span>
          </div>
        ) : filtered ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <StatusBar status={data?.limit_status ?? null} />
            <TodayStats data={data!} budget={budget} />
            <CostSummary data={data!} />
            <UsageChart data={filtered.daily_summaries} />

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <ModelBreakdown data={data!.model_stats} />
              <CacheStats data={data!} />
            </div>

            <Heatmap data={data!.heatmap} />

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <WeekCompare data={data!.daily_summaries} />
              <Insights data={data!} />
            </div>

            <RecentRequests records={filtered.recent_requests} />

            {/* Help hint */}
            <div
              style={{ textAlign: "center", padding: "8px 0", fontSize: 10, color: mutedColor, cursor: "pointer" }}
              onClick={() => setShowHelp(true)}
            >
              Press ? for keyboard shortcuts
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: mutedColor, fontSize: 14 }}>
            No data available. Make sure Claude Code is installed.
          </div>
        )}
      </div>

      {showSettings && (
        <Settings
          apiKey={apiKey}
          budget={budget}
          autoRefresh={autoRefresh}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} isDark={isDark} />}
    </div>
  );
}

export default App;
