import { useEffect, useState } from "react";
import logoSymbol from "../../assets/powerfy_app_icon_128.png";
import { useI18n } from "../../hooks/useI18n";

export function AboutTab() {
  const { t } = useI18n();
  const [diag, setDiag] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (window.powerManager?.getDiagnostics) {
      window.powerManager.getDiagnostics().then((res: any) => setDiag(res));
    }
  }, []);

  const handleCopy = () => {
    if (!diag) return;
    const text = JSON.stringify(diag, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLogs = () => {
    window.powerManager?.openLogFolder();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Product Banner */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          background:
            "linear-gradient(135deg, rgba(6, 27, 70, 0.9) 0%, rgba(14, 86, 194, 0.25) 100%)",
          border: "1px solid var(--border-color)",
          padding: "var(--space-4)",
        }}
      >
        <img
          src={logoSymbol}
          alt="Powerfy Master Logo"
          style={{
            width: "64px",
            height: "64px",
            objectFit: "contain",
            filter: "drop-shadow(0 0 12px rgba(30, 216, 245, 0.4))",
          }}
        />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <h2
              style={{ fontSize: "18px", fontWeight: 800, color: "var(--brand-cyan)", margin: 0 }}
            >
              Powerfy
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                background: "rgba(30, 216, 245, 0.15)",
                color: "var(--brand-cyan)",
                border: "1px solid rgba(30, 216, 245, 0.3)",
              }}
            >
              v1.0.0
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Gestor nativo de esquemas de energía, automatizaciones y brillo para Windows 11
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            Rust Native Host · Electron GUI · Clean-Room Implementation · MIT License
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      {diag && (
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>{t("settings.aboutTab.diagnostic")}</span>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button className="btn-secondary" onClick={handleOpenLogs}>
                📂 {t("settings.aboutTab.openLogs")}
              </button>
              <button className="btn-primary" onClick={handleCopy}>
                {copied
                  ? `✓ ${t("settings.aboutTab.copied")}`
                  : `📋 ${t("settings.aboutTab.copyDiagnostic")}`}
              </button>
            </div>
          </div>

          <pre
            style={{
              background: "var(--bg-secondary)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(diag, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
