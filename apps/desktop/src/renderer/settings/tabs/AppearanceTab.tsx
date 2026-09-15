import type { AppSettings, PowerScheme } from "@power-manager/contracts";
import { PRESET_SCHEME_COLORS, getStableColorForGuid } from "@power-manager/shared";
import { useI18n } from "../../hooks/useI18n";

interface Props {
  settings: AppSettings;
  schemes: PowerScheme[];
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function AppearanceTab({ settings, schemes, onUpdate }: Props) {
  const { t } = useI18n();

  const handleSchemeColorChange = (schemeId: string, color: string) => {
    const updatedColors = {
      ...settings.tray.schemeColors,
      [schemeId]: color,
    };
    onUpdate({
      tray: {
        ...settings.tray,
        schemeColors: updatedColors,
      },
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Icon Style */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.appearance.iconStyle")}</div>
        </div>
        <select
          style={{ width: "160px" }}
          value={settings.tray.style}
          onChange={(e) =>
            onUpdate({
              tray: { ...settings.tray, style: e.target.value as "outline" | "solid" },
            })
          }
        >
          <option value="outline">{t("settings.appearance.iconOutline")}</option>
          <option value="solid">{t("settings.appearance.iconSolid")}</option>
        </select>
      </div>

      {/* Show Battery Percentage */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.appearance.showPercentage")}</div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.tray.showBatteryPercentage}
            onChange={(e) =>
              onUpdate({
                tray: { ...settings.tray, showBatteryPercentage: e.target.checked },
              })
            }
          />
          <span className="switch-slider" />
        </label>
      </div>

      {/* Scheme Color Pickers */}
      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      >
        <div style={{ fontWeight: 600 }}>{t("settings.appearance.schemeColors")}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {schemes.map((scheme) => {
            const currentColor =
              settings.tray.schemeColors[scheme.id] || getStableColorForGuid(scheme.id);

            return (
              <div
                key={scheme.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-2)",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span>{scheme.name}</span>

                <div style={{ display: "flex", gap: "var(--space-1)" }}>
                  {PRESET_SCHEME_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      onClick={() => handleSchemeColorChange(scheme.id, c)}
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: c,
                        border: currentColor === c ? "2px solid #ffffff" : "2px solid transparent",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
