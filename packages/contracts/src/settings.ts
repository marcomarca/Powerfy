import type { AutomationRule } from "./automations";
import type { FixedBrightnessSettings } from "./power";

export interface TrayIconSettings {
  style: "outline" | "solid";
  colorMode: "system" | "scheme";
  showBatteryPercentage: boolean;
  schemeColors: Record<string, string>; // GUID -> hex color
}

export interface OsdSettings {
  enabled: boolean;
  showIcon: boolean;
  showSchemeName: boolean;
  durationMs: number; // default 2000
  opacity: number; // 0.2..1.0, default 0.9
  monitor: "primary" | "cursor";
}

export type ManualOverridePolicy =
  | "untilAutomationStateChanges"
  | "for15Minutes"
  | "for30Minutes"
  | "for60Minutes"
  | "untilAppRestart"
  | "untilCancelled"
  | "disabled";

export interface ManualOverrideState {
  active: boolean;
  schemeId: string | null;
  policy: ManualOverridePolicy;
  createdGeneration: number;
  createdAt: number;
  expiresAt: number | null;
}

export interface AppSettings {
  schemaVersion: number;
  language: "es" | "en";
  theme: "system" | "light" | "dark";
  startWithWindows: boolean;
  hotkey: string;
  baselineSchemeId: string | null;
  manualOverridePolicy: ManualOverridePolicy;
  tray: TrayIconSettings;
  osd: OsdSettings;
  fixedBrightness: FixedBrightnessSettings;
  schedulerEnabled: boolean;
  rules: AutomationRule[];
  autoCheckUpdates: boolean;
  autoDownloadUpdates: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  language: "es",
  theme: "system",
  startWithWindows: false,
  hotkey: "Alt+P",
  baselineSchemeId: null,
  manualOverridePolicy: "untilAutomationStateChanges",
  tray: {
    style: "outline",
    colorMode: "scheme",
    showBatteryPercentage: true,
    schemeColors: {},
  },
  osd: {
    enabled: true,
    showIcon: true,
    showSchemeName: true,
    durationMs: 2000,
    opacity: 0.9,
    monitor: "primary",
  },
  fixedBrightness: {
    enabled: false,
    displayId: null,
    value: null,
  },
  schedulerEnabled: true,
  rules: [],
  autoCheckUpdates: true,
  autoDownloadUpdates: false,
};
