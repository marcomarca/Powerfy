import type { AppSettings, BrightnessDisplay } from "@power-manager/contracts";
import { useI18n } from "../../hooks/useI18n";

interface Props {
  settings: AppSettings;
  displays: BrightnessDisplay[];
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function BrightnessTab({ settings, displays, onUpdate }: Props) {
  const { t } = useI18n();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Primary display */}
      {displays.length > 1 && (
        <div
          className="card"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{t("settings.brightnessTab.primaryDisplay")}</div>
          </div>
          <select
            style={{ width: "200px" }}
            value={settings.fixedBrightness.displayId || displays[0]?.id || ""}
            onChange={(e) =>
              onUpdate({
                fixedBrightness: { ...settings.fixedBrightness, displayId: e.target.value },
              })
            }
          >
            {displays.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fixed Brightness */}
      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{t("settings.brightnessTab.fixedBrightness")}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              {t("settings.brightnessTab.fixedBrightnessDesc")}
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.fixedBrightness.enabled}
              onChange={(e) =>
                onUpdate({
                  fixedBrightness: {
                    ...settings.fixedBrightness,
                    enabled: e.target.checked,
                    value: settings.fixedBrightness.value ?? 70,
                  },
                })
              }
            />
            <span className="switch-slider" />
          </label>
        </div>

        {settings.fixedBrightness.enabled && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              marginTop: "var(--space-2)",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {t("settings.brightnessTab.fixedValue")}:
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.fixedBrightness.value ?? 70}
              onChange={(e) =>
                onUpdate({
                  fixedBrightness: {
                    ...settings.fixedBrightness,
                    value: Number(e.target.value),
                  },
                })
              }
            />
            <span style={{ fontWeight: 600, width: "40px" }}>
              {settings.fixedBrightness.value ?? 70}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
