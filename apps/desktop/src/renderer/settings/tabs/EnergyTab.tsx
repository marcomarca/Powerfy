import type { AppSettings } from "@power-manager/contracts";
import { useI18n } from "../../hooks/useI18n";

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function EnergyTab({ settings, onUpdate }: Props) {
  const { t } = useI18n();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Global Hotkey */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.energy.hotkey")}</div>
        </div>
        <input
          type="text"
          className="input-text"
          style={{ width: "160px" }}
          value={settings.hotkey}
          onChange={(e) => onUpdate({ hotkey: e.target.value })}
        />
      </div>

      {/* Manual Override Policy */}
      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
      >
        <div style={{ fontWeight: 600 }}>{t("settings.energy.manualOverride")}</div>
        <select
          value={settings.manualOverridePolicy}
          onChange={(e) => onUpdate({ manualOverridePolicy: e.target.value as any })}
        >
          <option value="untilAutomationStateChanges">
            {t("settings.energy.overrideUntilAutomationChange")}
          </option>
          <option value="for15Minutes">{t("settings.energy.override15m")}</option>
          <option value="for30Minutes">{t("settings.energy.override30m")}</option>
          <option value="for60Minutes">{t("settings.energy.override60m")}</option>
          <option value="untilAppRestart">{t("settings.energy.overrideUntilRestart")}</option>
          <option value="untilCancelled">{t("settings.energy.overrideUntilCancelled")}</option>
          <option value="disabled">{t("settings.energy.overrideDisabled")}</option>
        </select>
      </div>

      {/* Windows Power Options Link */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("power.openPowerOptions")}</div>
        </div>
        <button
          className="btn-secondary"
          onClick={() => window.powerManager.openWindowsPowerOptions()}
        >
          ⚙️ Abrir
        </button>
      </div>
    </div>
  );
}
