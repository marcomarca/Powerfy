import type { AppSettings } from "@power-manager/contracts";
import { useState } from "react";
import { useI18n } from "../../hooks/useI18n";

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function UpdatesTab({ settings, onUpdate }: Props) {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCheck = () => {
    setChecking(true);
    setMessage(null);
    setTimeout(() => {
      setChecking(false);
      setMessage(t("settings.updatesTab.upToDate"));
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Current Version */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.updatesTab.currentVersion")}</div>
        </div>
        <span className="badge badge-info">v1.0.0 (Win-x64)</span>
      </div>

      {/* Auto Check */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.updatesTab.autoCheck")}</div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.autoCheckUpdates}
            onChange={(e) => onUpdate({ autoCheckUpdates: e.target.checked })}
          />
          <span className="switch-slider" />
        </label>
      </div>

      {/* Check Now */}
      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>GitHub Releases</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              Canal de distribución oficial
            </div>
          </div>
          <button className="btn-primary" onClick={handleCheck} disabled={checking}>
            {checking ? "Comprobando..." : t("settings.updatesTab.checkNow")}
          </button>
        </div>

        {message && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--success)",
              background: "rgba(34, 197, 94, 0.1)",
              padding: "var(--space-2)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            ✓ {message}
          </div>
        )}
      </div>
    </div>
  );
}
