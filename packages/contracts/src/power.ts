export interface PowerScheme {
  id: string; // Canonical GUID
  name: string; // Friendly name delivered by Windows
  isActive: boolean;
}

export interface BatteryState {
  present: boolean;
  percentage: number | null;
  isCharging: boolean;
  isOnAc: boolean;
  isFullyCharged: boolean;
  secondsRemaining: number | null;
}

export interface BrightnessDisplay {
  id: string;
  name: string;
  kind: "internal";
  supportedLevels: number[];
  current: number;
  isPrimary: boolean;
}

export interface FixedBrightnessSettings {
  enabled: boolean;
  displayId: string | null;
  value: number | null;
}

export interface SystemCapabilities {
  hasBattery: boolean;
  supportsInternalBrightness: boolean;
  supportsLidState: boolean;
  supportsDisplayState: boolean;
  supportsPowerSchemeNotifications: boolean;
}

export interface PowerSystemState {
  schemes: PowerScheme[];
  activeSchemeId: string | null;
  battery: BatteryState;
  displays: BrightnessDisplay[];
  primaryDisplayId: string | null;
  currentBrightness: number | null;
  capabilities: SystemCapabilities;
  nativeStatus: "connected" | "connecting" | "unavailable" | "degraded";
}
