import { useEffect, useState } from "react";
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
        style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}
      >
        <div style={{ fontSize: "36px" }}>⚡</div>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700 }}>PowerManager</h2>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Gestor nativo de esquemas de energía y automatizaciones para Windows 11
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            v1.0.0 · Clean-Room Implementation · Windows 11 x64
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
