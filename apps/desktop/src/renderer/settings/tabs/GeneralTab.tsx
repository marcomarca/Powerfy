import type { AppSettings } from "@power-manager/contracts";
import { useI18n } from "../../hooks/useI18n";

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function GeneralTab({ settings, onUpdate }: Props) {
  const { t, setLang } = useI18n();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Language */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.general.language")}</div>
        </div>
        <select
          style={{ width: "160px" }}
          value={settings.language}
          onChange={(e) => {
            const l = e.target.value as "es" | "en";
            setLang(l);
            onUpdate({ language: l });
          }}
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Startup with Windows */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.general.startWithWindows")}</div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.startWithWindows}
            onChange={(e) => onUpdate({ startWithWindows: e.target.checked })}
          />
          <span className="switch-slider" />
        </label>
      </div>

      {/* Theme */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.general.theme")}</div>
        </div>
        <select
          style={{ width: "160px" }}
          value={settings.theme}
          onChange={(e) => {
            const theme = e.target.value as "system" | "light" | "dark";
            onUpdate({ theme });
            document.documentElement.setAttribute("data-theme", theme);
          }}
        >
          <option value="system">{t("settings.general.themeSystem")}</option>
          <option value="dark">{t("settings.general.themeDark")}</option>
          <option value="light">{t("settings.general.themeLight")}</option>
        </select>
      </div>
    </div>
  );
}
