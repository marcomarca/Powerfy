import { getStableColorForGuid } from "@power-manager/shared";
import { useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { usePowerState } from "../hooks/usePowerState";

export function PopupApp() {
  const { t } = useI18n();
  const { state, refresh } = usePowerState();
  const [switchingSchemeId, setSwitchingSchemeId] = useState<string | null>(null);
  const [brightnessVal, setBrightnessVal] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {
    if (window.powerManager?.onBrightnessChanged) {
      return window.powerManager.onBrightnessChanged(
        (data: { displayId: string; value: number }) => {
          if (!isDragging) {
            setBrightnessVal(data.value);
          }
        },
      );
    }
  }, [isDragging]);

  useEffect(() => {
    if (state?.currentBrightness !== undefined && state.currentBrightness !== null && !isDragging) {
      setBrightnessVal(state.currentBrightness);
    }
  }, [state?.currentBrightness, isDragging]);

  if (!state) {
    return (
      <div
        style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-secondary)" }}
      >
        Cargando...
      </div>
    );
  }

  const battery = state.battery || {
    present: false,
    percentage: null,
    isCharging: false,
    isOnAc: true,
  };
  const schemes = state.schemes || [];
  const activeSchemeId = state.activeSchemeId || null;
  const displays = state.displays || [];
  const primaryDisplayId = state.primaryDisplayId || null;
  const settings = state.settings || { tray: { schemeColors: {} } };
  const currentBrightness = brightnessVal ?? state.currentBrightness ?? 100;
  const hasBattery = Boolean(battery.present);

  const handleSchemeClick = async (schemeId: string) => {
    if (schemeId === activeSchemeId || switchingSchemeId) return;

    setSwitchingSchemeId(schemeId);
    setErrorToast(null);

    try {
      await window.powerManager.setActiveScheme(schemeId);
      await refresh();
    } catch (_err: any) {
      setErrorToast(t("power.errorSwitching"));
    } finally {
      setSwitchingSchemeId(null);
    }
  };

  const handleBrightnessChange = (val: number) => {
    setBrightnessVal(val);
    window.powerManager.setBrightness(val, primaryDisplayId || undefined);
  };

  const handleTurnOffDisplay = async () => {
    try {
      await window.powerManager.turnOffDisplay();
      window.powerManager.closePopup();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSettings = () => {
    window.powerManager.openSettings("general");
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-color)",
        padding: "var(--space-4)",
        gap: "var(--space-3)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header: Battery & Settings button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "var(--space-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "16px" }}>
            {hasBattery ? (battery.isCharging ? "⚡" : "🔋") : "🔌"}
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>
              {hasBattery && battery.percentage !== null
                ? `${battery.percentage}%`
                : t("battery.noBattery")}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              {hasBattery
                ? battery.isCharging
                  ? t("battery.charging")
                  : battery.isOnAc
                    ? t("battery.connected")
                    : t("battery.onBattery")
                : t("battery.connected")}
            </div>
          </div>
        </div>

        <button className="btn-icon" onClick={handleOpenSettings} title={t("settings.title")}>
          ⚙️
        </button>
      </div>

      {/* Error Toast */}
      {errorToast && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.2)",
            color: "var(--danger)",
            padding: "var(--space-2)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
          }}
        >
          {errorToast}
        </div>
      )}

      {/* Power Schemes List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
          flex: 1,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "0.5px",
          }}
        >
          {t("power.title")}
        </div>

        {schemes.map((scheme: any) => {
          const isActive = scheme.id === activeSchemeId;
          const isPending = scheme.id === switchingSchemeId;
          const color =
            settings?.tray?.schemeColors?.[scheme.id] || getStableColorForGuid(scheme.id);

          return (
            <button
              key={scheme.id}
              onClick={() => handleSchemeClick(scheme.id)}
              disabled={isPending}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                background: isActive ? "var(--bg-active)" : "transparent",
                border: isActive ? "1px solid var(--border-color)" : "1px solid transparent",
                textAlign: "left",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontWeight: isActive ? 600 : 400 }}>{scheme.name}</span>
              </div>

              {isActive && <span className="badge badge-success">{t("power.active")}</span>}
              {isPending && (
                <span style={{ fontSize: "11px", color: "var(--accent)" }}>
                  {t("power.switching")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Brightness Slider */}
      {displays.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "var(--space-3)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
            }}
          >
            <span>{t("brightness.title")}</span>
            <span style={{ color: "var(--text-primary)" }}>{currentBrightness}%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span>☀️</span>
            <input
              type="range"
              min="0"
              max="100"
              value={currentBrightness}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Screen Off Action */}
      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)" }}>
        <button
          className="btn-secondary"
          onClick={handleTurnOffDisplay}
          style={{ width: "100%", justifyContent: "center" }}
        >
          🖥️ {t("display.turnOff")}
        </button>
      </div>
    </div>
  );
}
