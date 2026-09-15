import type { AppSettings } from "@power-manager/contracts";
import { useI18n } from "../../hooks/useI18n";

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function NotificationsTab({ settings, onUpdate }: Props) {
  const { t } = useI18n();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* OSD Master Enable */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.notificationsTab.osdEnabled")}</div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.osd.enabled}
            onChange={(e) =>
              onUpdate({
                osd: { ...settings.osd, enabled: e.target.checked },
              })
            }
          />
          <span className="switch-slider" />
        </label>
      </div>

      {settings.osd.enabled && (
        <>
          {/* Show Icon in OSD */}
          <div
            className="card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{t("settings.notificationsTab.showIcon")}</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.osd.showIcon}
                onChange={(e) =>
                  onUpdate({
                    osd: { ...settings.osd, showIcon: e.target.checked },
                  })
                }
              />
              <span className="switch-slider" />
            </label>
          </div>

          {/* Show Scheme Name in OSD */}
          <div
            className="card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{t("settings.notificationsTab.showSchemeName")}</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.osd.showSchemeName}
                onChange={(e) =>
                  onUpdate({
                    osd: { ...settings.osd, showSchemeName: e.target.checked },
                  })
                }
              />
              <span className="switch-slider" />
            </label>
          </div>

          {/* Duration */}
          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>{t("settings.notificationsTab.duration")}</span>
              <span>{(settings.osd.durationMs / 1000).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="1000"
              max="5000"
              step="500"
              value={settings.osd.durationMs}
              onChange={(e) =>
                onUpdate({
                  osd: { ...settings.osd, durationMs: Number(e.target.value) },
                })
              }
            />
          </div>

          {/* Opacity */}
          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>{t("settings.notificationsTab.opacity")}</span>
              <span>{Math.round(settings.osd.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={settings.osd.opacity}
              onChange={(e) =>
                onUpdate({
                  osd: { ...settings.osd, opacity: Number(e.target.value) },
                })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
