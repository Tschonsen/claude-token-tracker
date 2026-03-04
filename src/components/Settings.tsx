import { useState } from "react";

interface Props {
  apiKey: string;
  budget: number;
  autoRefresh: boolean;
  onSave: (key: string, budget: number, autoRefresh: boolean) => void;
  onClose: () => void;
}

function InputField({
  label,
  hint,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          color: "var(--text-secondary)",
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--text-primary)",
          fontSize: 14,
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      {hint && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function Settings({ apiKey, budget, autoRefresh, onSave, onClose }: Props) {
  const [key, setKey] = useState(apiKey);
  const [budgetVal, setBudgetVal] = useState(String(budget || ""));
  const [autoRef, setAutoRef] = useState(autoRefresh);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="animate-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 32,
          width: 440,
          maxWidth: "90vw",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Settings</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 24px" }}>
          Configure your token tracker
        </p>

        <InputField
          label="Anthropic Admin API Key"
          hint="Optional. Starts with sk-ant-admin-... for organization usage data."
          type="password"
          value={key}
          onChange={setKey}
          placeholder="sk-ant-admin-..."
        />

        <InputField
          label="Daily Budget (USD)"
          hint="Set a daily spending limit. Leave empty to disable."
          type="number"
          value={budgetVal}
          onChange={setBudgetVal}
          placeholder="e.g. 5.00"
        />

        {/* Auto Refresh Toggle */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                Auto Refresh
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Update data every 30 seconds
              </div>
            </div>
            <button
              onClick={() => setAutoRef(!autoRef)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                background: autoRef ? "var(--green)" : "var(--border)",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: autoRef ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              transition: "all 0.15s",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave(key, parseFloat(budgetVal) || 0, autoRef)
            }
            style={{
              padding: "8px 20px",
              background: "linear-gradient(135deg, var(--accent), #b8956a)",
              border: "none",
              borderRadius: 8,
              color: "#000",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
