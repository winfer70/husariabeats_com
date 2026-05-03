/*
 * admin/src/app/settings/page.tsx — Site settings page (client component).
 *
 * Fetches settings from /api/settings on mount.
 * Inline edits:
 *   - auto_release_enabled: clickable toggle → PUT /api/settings
 *   - release_min_gap_hours: number input onBlur → PUT /api/settings
 *   - release_daily_limit: number input onBlur → PUT /api/settings
 *
 * All writes optimistic — revert + toast on API error.
 */
"use client";

import { useEffect, useState, useCallback } from "react";

type SettingsMap = Record<string, string>;

const SETTING_LABELS: Record<string, string> = {
  auto_release_enabled:   "Auto Release",
  release_min_gap_hours:  "Min Gap Between Releases (hours)",
  release_daily_limit:    "Max Releases Per Day",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState<Record<string, boolean>>({});
  const [toast, setToast]       = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err" = "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /** Fetch all settings from /api/settings (returns flat {key: value} dict). */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      const data: SettingsMap = await res.json();
      setSettings(typeof data === "object" && data !== null ? data : {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  /**
   * PUT a single setting key/value.
   * Optimistically updates local state; reverts on API error.
   *
   * @param key      - Setting key to update.
   * @param value    - New string value.
   * @param prevVal  - Previous value for rollback.
   */
  async function putSetting(key: string, value: string, prevVal: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaving(prev => ({ ...prev, [key]: true }));

    try {
      const res = await fetch("/api/settings", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }
      const updated: SettingsMap = await res.json();
      setSettings(updated);
      showToast(`${key} saved.`, "ok");
    } catch (e) {
      setSettings(prev => ({ ...prev, [key]: prevVal }));
      showToast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  }

  const keys = Object.keys(settings);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Settings</h1>
      </div>

      {toast && (
        <div className={toast.type === "ok" ? "success-box" : "error-box"} style={{ marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}
      {loading && <p style={{ color: "#a89a92" }}>Loading…</p>}
      {error   && <div className="error-box"><strong>Could not load settings — </strong>{error}</div>}

      {!loading && !error && (
        <div className="card">
          {keys.length === 0 ? (
            <p style={{ color: "#a89a92", textAlign: "center", padding: 24 }}>No settings found.</p>
          ) : (
            keys.map(key => {
              const val  = settings[key];
              const prev = val;
              const label = SETTING_LABELS[key] ?? key;
              const isSaving = saving[key];

              // Kill switch toggle
              if (key === "auto_release_enabled") {
                const isOn = val === "true";
                return (
                  <div className="settings-row" key={key} style={{ opacity: isSaving ? 0.5 : 1 }}>
                    <span className="settings-key">{label}</span>
                    <button
                      className="toggle-wrapper"
                      disabled={isSaving}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      onClick={() => putSetting(key, isOn ? "false" : "true", prev)}
                      aria-label={`Toggle ${key}: currently ${isOn ? "ON" : "OFF"}`}
                    >
                      <span className={`toggle-indicator ${isOn ? "on" : "off"}`} aria-hidden="true" />
                      <span className="toggle-label" style={{ color: isOn ? "#c9a96e" : "#6b5a50" }}>
                        {isSaving ? "Saving…" : isOn ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>
                );
              }

              // Number inputs (gap hours + daily limit)
              if (key === "release_min_gap_hours" || key === "release_daily_limit") {
                return (
                  <div className="settings-row" key={key} style={{ opacity: isSaving ? 0.5 : 1 }}>
                    <span className="settings-key">{label}</span>
                    <input
                      key={`${key}-${val}`}
                      type="number"
                      defaultValue={val}
                      min={key === "release_daily_limit" ? 1 : 0}
                      disabled={isSaving}
                      style={{ width: 80, background: "#1e1a17", border: "1px solid #3a3028",
                               color: "#e8ddd5", borderRadius: 4, padding: "4px 8px", fontSize: 14,
                               textAlign: "center" }}
                      onBlur={e => {
                        const newVal = e.target.value.trim();
                        if (newVal && newVal !== prev) putSetting(key, newVal, prev);
                      }}
                      aria-label={label}
                    />
                  </div>
                );
              }

              // Generic display for any other keys
              return (
                <div className="settings-row" key={key}>
                  <span className="settings-key">{label}</span>
                  <span className="settings-value">{val ?? "—"}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
