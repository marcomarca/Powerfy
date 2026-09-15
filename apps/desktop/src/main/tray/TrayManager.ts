import { exec } from "node:child_process";
import { EventEmitter } from "node:events";
import { getStableColorForGuid } from "@power-manager/shared";
import { Menu, Tray, app } from "electron";
import { logger } from "../logging/Logger";
import type { NativeHostClient } from "../native-host/NativeHostClient";
import type { SettingsStore } from "../settings/SettingsStore";
import { TrayIconRenderer } from "./TrayIconRenderer";

export class TrayManager extends EventEmitter {
  private tray: Tray | null = null;
  private settingsStore: SettingsStore;
  private nativeClient: NativeHostClient;
  private currentSchemeId: string | null = null;
  private batteryPercent: number | null = null;
  private isOnAc = true;
  private isCharging = false;

  constructor(settingsStore: SettingsStore, nativeClient: NativeHostClient) {
    super();
    this.settingsStore = settingsStore;
    this.nativeClient = nativeClient;
  }

  public init(): void {
    const initialIcon = TrayIconRenderer.render({
      percentage: 100,
      isOnAc: true,
      isCharging: false,
      schemeColor: "#3b82f6",
      style: "outline",
      showPercentage: true,
    });

    this.tray = new Tray(initialIcon);
    this.tray.setToolTip("Powerfy");

    this.tray.on("click", (_event, bounds) => {
      this.emit("togglePopup", bounds);
    });

    this.tray.on("right-click", () => {
      this.buildContextMenu();
    });

    this.settingsStore.on("settingsChanged", () => this.updateIcon());
    this.updateIcon();
  }

  public updateState(state: {
    activeSchemeId?: string | null;
    batteryPercent?: number | null;
    isOnAc?: boolean;
    isCharging?: boolean;
  }): void {
    if (state.activeSchemeId !== undefined) this.currentSchemeId = state.activeSchemeId;
    if (state.batteryPercent !== undefined) this.batteryPercent = state.batteryPercent;
    if (state.isOnAc !== undefined) this.isOnAc = state.isOnAc;
    if (state.isCharging !== undefined) this.isCharging = state.isCharging;

    this.updateIcon();
  }

  private updateIcon(): void {
    if (!this.tray) return;

    const settings = this.settingsStore.getSettings();
    let schemeColor = "#1ed8f5";
    if (this.currentSchemeId) {
      schemeColor =
        settings.tray.schemeColors[this.currentSchemeId] ||
        getStableColorForGuid(this.currentSchemeId);
    }

    const icon = TrayIconRenderer.render({
      percentage: this.batteryPercent,
      isOnAc: this.isOnAc,
      isCharging: this.isCharging,
      schemeColor,
      style: settings.tray.style,
      showPercentage: settings.tray.showBatteryPercentage,
    });

    this.tray.setImage(icon);

    const tooltip = `Powerfy - ${this.batteryPercent !== null ? `${this.batteryPercent}% · ` : ""}${this.isOnAc ? "Conectado" : "Batería"}`;
    this.tray.setToolTip(tooltip);
  }

  public getBounds() {
    return this.tray?.getBounds();
  }

  private buildContextMenu(): void {
    if (!this.tray) return;

    const settings = this.settingsStore.getSettings();
    const isEs = settings.language === "es";

    const contextMenu = Menu.buildFromTemplate([
      {
        label: isEs ? "Abrir" : "Open",
        click: () => this.emit("openPopup"),
      },
      {
        label: isEs ? "Automatizaciones" : "Automations",
        click: () => this.emit("openSettings", "automations"),
      },
      {
        label: isEs ? "Ajustes" : "Settings",
        click: () => this.emit("openSettings", "general"),
      },
      { type: "separator" },
      {
        label: isEs ? "Iniciar con Windows" : "Start with Windows",
        type: "checkbox",
        checked: settings.startWithWindows,
        click: (item) => {
          this.settingsStore.updateSettings({ startWithWindows: item.checked });
          this.emit("toggleStartWithWindows", item.checked);
        },
      },
      {
        label: isEs ? "Apagar pantalla" : "Turn off display",
        click: () => {
          this.nativeClient.turnOffDisplay().catch((err) => {
            logger.error(`TurnOffDisplay from tray context menu failed: ${err.message}`);
          });
        },
      },
      {
        label: isEs ? "Opciones de energía de Windows" : "Windows Power Options",
        click: () => {
          exec("control.exe /name Microsoft.PowerOptions", (err) => {
            if (err) logger.error(`Failed to open power options: ${err.message}`);
          });
        },
      },
      { type: "separator" },
      {
        label: isEs ? "Acerca de" : "About",
        click: () => this.emit("openSettings", "about"),
      },
      {
        label: isEs ? "Salir" : "Exit",
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.popUpContextMenu(contextMenu);
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
