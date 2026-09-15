import type {
  AppSettings,
  BatteryState,
  BrightnessDisplay,
  PowerScheme,
  RuntimeFacts,
  SystemCapabilities,
} from "@power-manager/contracts";
import { contextBridge, ipcRenderer } from "electron";

export interface PowerManagerAPI {
  getStateSnapshot: () => Promise<{
    schemes: PowerScheme[];
    activeSchemeId: string | null;
    battery: BatteryState;
    displays: BrightnessDisplay[];
    primaryDisplayId: string | null;
    currentBrightness: number | null;
    capabilities: SystemCapabilities;
    settings: AppSettings;
    facts: RuntimeFacts;
    activeRuleIds: string[];
    nativeStatus: "connected" | "connecting" | "unavailable" | "degraded";
  }>;
  setActiveScheme: (schemeId: string) => Promise<{ success: boolean; schemeId: string }>;
  setBrightness: (
    value: number,
    displayId?: string,
  ) => Promise<{ displayId: string; value: number }>;
  turnOffDisplay: () => Promise<{ success: boolean }>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
  getSettings: () => Promise<AppSettings>;
  openSettings: (tab?: string) => Promise<boolean>;
  openWindowsPowerOptions: () => Promise<boolean>;
  openLogFolder: () => Promise<boolean>;
  closePopup: () => Promise<boolean>;
  selectExecutableDialog: () => Promise<string | null>;
  getDiagnostics: () => Promise<{
    appVersion: string;
    electronVersion: string;
    nodeVersion: string;
    osVersion: string;
    activeSchemeGuid: string | null;
    powerSource: string;
    batteryPercentage: number | null;
    nativeStatus: string;
    activeRuleIds: string[];
    logFolder: string;
  }>;
  onNavigateTab: (callback: (tab: string) => void) => () => void;
  onOsdPayload: (
    callback: (payload: {
      schemeName: string;
      schemeColor: string;
      showIcon: boolean;
      opacity: number;
    }) => void,
  ) => () => void;
  onBrightnessChanged: (
    callback: (data: { displayId: string; value: number }) => void,
  ) => () => void;
}

const api: PowerManagerAPI = {
  getStateSnapshot: () => ipcRenderer.invoke("getStateSnapshot"),
  setActiveScheme: (schemeId: string) => ipcRenderer.invoke("setActiveScheme", schemeId),
  setBrightness: (value: number, displayId?: string) =>
    ipcRenderer.invoke("setBrightness", value, displayId),
  turnOffDisplay: () => ipcRenderer.invoke("turnOffDisplay"),
  updateSettings: (partial: Partial<AppSettings>) => ipcRenderer.invoke("updateSettings", partial),
  getSettings: () => ipcRenderer.invoke("getSettings"),
  openSettings: (tab?: string) => ipcRenderer.invoke("openSettings", tab),
  openWindowsPowerOptions: () => ipcRenderer.invoke("openWindowsPowerOptions"),
  openLogFolder: () => ipcRenderer.invoke("openLogFolder"),
  closePopup: () => ipcRenderer.invoke("closePopup"),
  selectExecutableDialog: () => ipcRenderer.invoke("selectExecutableDialog"),
  getDiagnostics: () => ipcRenderer.invoke("getDiagnostics"),
  onNavigateTab: (callback) => {
    const handler = (_event: any, tab: string) => callback(tab);
    ipcRenderer.on("navigateTab", handler);
    return () => ipcRenderer.removeListener("navigateTab", handler);
  },
  onOsdPayload: (callback) => {
    const handler = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on("osdPayload", handler);
    return () => ipcRenderer.removeListener("osdPayload", handler);
  },
  onBrightnessChanged: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on("brightnessChanged", handler);
    return () => ipcRenderer.removeListener("brightnessChanged", handler);
  },
};

contextBridge.exposeInMainWorld("powerManager", api);
