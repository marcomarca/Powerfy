import { useEffect, useState } from "react";
import logoIcon from "../assets/powerfy_app_icon_64.png";
import { useI18n } from "../hooks/useI18n";
import { usePowerState } from "../hooks/usePowerState";
import { AboutTab } from "./tabs/AboutTab";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { AutomationsTab } from "./tabs/AutomationsTab";
import { BrightnessTab } from "./tabs/BrightnessTab";
import { EnergyTab } from "./tabs/EnergyTab";
import { GeneralTab } from "./tabs/GeneralTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { UpdatesTab } from "./tabs/UpdatesTab";

interface Props {
  initialTab?: string;
}

export function SettingsApp({ initialTab = "general" }: Props) {
  const { t } = useI18n();
  const { state, refresh } = usePowerState();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (window.powerManager?.onNavigateTab) {
      return window.powerManager.onNavigateTab((tab: string) => {
        setActiveTab(tab);
      });
    }
  }, []);

  if (!state) {
    return (
      <div
        style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-secondary)" }}
      >
        Cargando ajustes...
      </div>
    );
  }

  const { settings, schemes, displays } = state;

  const handleUpdate = async (partial: any) => {
    await window.powerManager.updateSettings(partial);
    await refresh();
  };

  const navItems = [
    { id: "general", label: t("settings.tabs.general"), icon: "⚙️" },
    { id: "appearance", label: t("settings.tabs.appearance"), icon: "🎨" },
    { id: "energy", label: t("settings.tabs.energy"), icon: "⚡" },
    { id: "brightness", label: t("settings.tabs.brightness"), icon: "☀️" },
    { id: "notifications", label: t("settings.tabs.notifications"), icon: "🔔" },
    { id: "automations", label: t("settings.tabs.automations"), icon: "🤖" },
    { id: "updates", label: t("settings.tabs.updates"), icon: "🔄" },
    { id: "about", label: t("settings.tabs.about"), icon: "ℹ️" },
  ];

  return (
    <div
      style={{ display: "flex", width: "100vw", height: "100vh", background: "var(--bg-primary)" }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "220px",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          padding: "var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
        }}
      >
        <div
          style={{
            padding: "var(--space-2)",
            fontSize: "15px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            color: "var(--brand-cyan)",
          }}
        >
          <img
            src={logoIcon}
            alt="Powerfy Logo"
            style={{ width: "24px", height: "24px", objectFit: "contain" }}
          />
          <span>Powerfy</span>
        </div>

        <div
          style={{
            marginTop: "var(--space-2)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "var(--bg-active)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "var(--space-4)" }}>
          {navItems.find((n) => n.id === activeTab)?.label}
        </h1>

        {activeTab === "general" && <GeneralTab settings={settings} onUpdate={handleUpdate} />}
        {activeTab === "appearance" && (
          <AppearanceTab settings={settings} schemes={schemes} onUpdate={handleUpdate} />
        )}
        {activeTab === "energy" && <EnergyTab settings={settings} onUpdate={handleUpdate} />}
        {activeTab === "brightness" && (
          <BrightnessTab settings={settings} displays={displays} onUpdate={handleUpdate} />
        )}
        {activeTab === "notifications" && (
          <NotificationsTab settings={settings} onUpdate={handleUpdate} />
        )}
        {activeTab === "automations" && (
          <AutomationsTab settings={settings} schemes={schemes} onUpdate={handleUpdate} />
        )}
        {activeTab === "updates" && <UpdatesTab settings={settings} onUpdate={handleUpdate} />}
        {activeTab === "about" && <AboutTab />}
      </div>
    </div>
  );
}
