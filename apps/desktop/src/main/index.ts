import { exec } from "node:child_process";
import os from "node:os";
import { getStableColorForGuid } from "@power-manager/shared";
import { app, dialog, ipcMain, shell } from "electron";
import { StartupManager } from "./app/StartupManager";
import { logger } from "./logging/Logger";
import { NativeHostClient } from "./native-host/NativeHostClient";
import { FixedBrightnessManager } from "./scheduler/FixedBrightnessManager";
import { SchedulerCoordinator } from "./scheduler/SchedulerCoordinator";
import { SettingsStore } from "./settings/SettingsStore";
import { HotkeyManager } from "./shortcuts/HotkeyManager";
import { TrayManager } from "./tray/TrayManager";
import { BlackoutWindowManager } from "./windows/BlackoutWindowManager";
import { OsdWindowManager } from "./windows/OsdWindowManager";
import { PopupWindowManager } from "./windows/PopupWindowManager";
import { SettingsWindowManager } from "./windows/SettingsWindowManager";

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  logger.info("Another instance is already running. Exiting...");
  app.quit();
  process.exit(0);
}

class MainApp {
  private settingsStore: SettingsStore;
  private nativeClient: NativeHostClient;
  private fixedBrightness: FixedBrightnessManager;
  private scheduler: SchedulerCoordinator;
  private startupManager: StartupManager;
  private hotkeyManager: HotkeyManager;
  private trayManager: TrayManager;
  private popupManager: PopupWindowManager;
  private settingsManager: SettingsWindowManager;
  private osdManager: OsdWindowManager;
  private blackoutManager: BlackoutWindowManager;

  constructor() {
    this.settingsStore = new SettingsStore();
    this.nativeClient = new NativeHostClient();
    this.fixedBrightness = new FixedBrightnessManager(this.settingsStore, this.nativeClient);
    this.scheduler = new SchedulerCoordinator(
      this.settingsStore,
      this.nativeClient,
      this.fixedBrightness,
    );
    this.startupManager = new StartupManager();
    this.hotkeyManager = new HotkeyManager(this.settingsStore);
    this.trayManager = new TrayManager(this.settingsStore);
    this.popupManager = new PopupWindowManager();
    this.settingsManager = new SettingsWindowManager();
    this.osdManager = new OsdWindowManager(this.settingsStore);
    this.blackoutManager = new BlackoutWindowManager(this.nativeClient);
  }

  public async start(): Promise<void> {
    logger.info("Initializing PowerManager Electron Main...");

    // 1. Start NativeHost
    await this.nativeClient.start();

    // 2. Initialize subsystems
    this.scheduler.init();
    this.trayManager.init();

    // 3. Register global hotkey
    const settings = this.settingsStore.getSettings();
    if (settings.hotkey) {
      this.hotkeyManager.register(settings.hotkey);
    }

    // 4. Bind Tray UI events
    this.trayManager.on("togglePopup", (bounds) => {
      this.popupManager.toggle(bounds);
    });
    this.trayManager.on("openPopup", () => {
      this.popupManager.show(this.trayManager.getBounds());
    });
    this.trayManager.on("openSettings", (tab: string) => {
      this.settingsManager.show(tab);
    });
    this.trayManager.on("toggleStartWithWindows", (enabled: boolean) => {
      this.startupManager.applySetting(enabled);
    });
    this.trayManager.on("turnOffDisplay", async () => {
      this.popupManager.hide();
      await this.blackoutManager.activate();
    });

    // 5. Bind Scheme & Hotkey events
    this.scheduler.on("turnOffDisplay", async () => {
      await this.blackoutManager.activate();
    });
    this.scheduler.on("schemeChanged", (schemeId: string) => {
      this.nativeClient.listSchemes().then((schemes) => {
        const active = schemes.find((s) => s.id === schemeId);
        const name = active?.name || `Esquema ${schemeId.substring(0, 8)}`;
        const color = settings.tray.schemeColors[schemeId] || getStableColorForGuid(schemeId);
        this.trayManager.updateState({ activeSchemeId: schemeId });
        this.osdManager.showOsd(name, color);
      });
    });

    this.scheduler.on("batteryChanged", (battery) => {
      this.trayManager.updateState({
        batteryPercent: battery.percentage,
        isOnAc: battery.isOnAc,
        isCharging: battery.isCharging,
      });
    });

    this.scheduler.on("showOsd", (message, schemeId) => {
      const sId = schemeId || this.scheduler.getFacts().activeSchemeId || "";
      const color = settings.tray.schemeColors[sId] || getStableColorForGuid(sId);
      this.osdManager.showOsd(message || "PowerManager", color);
    });

    this.nativeClient.on("brightnessChanged", (data) => {
      logger.info(`Brightness changed event: display=${data.displayId}, value=${data.value}%`);
      this.popupManager.send("brightnessChanged", data);
      this.settingsManager.send("brightnessChanged", data);
    });

    this.hotkeyManager.on("hotkeyTriggered", async () => {
      try {
        const schemes = await this.nativeClient.listSchemes();
        if (schemes.length === 0) return;

        const currentActive = this.scheduler.getFacts().activeSchemeId;
        const currentIndex = schemes.findIndex((s) => s.id === currentActive);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % schemes.length : 0;
        const nextScheme = schemes[nextIndex];

        if (nextScheme) {
          logger.info(
            `Hotkey scheme switch: ${currentActive} -> ${nextScheme.id} (${nextScheme.name})`,
          );
          await this.scheduler.setManualScheme(nextScheme.id);
        }
      } catch (err: any) {
        logger.error(`Hotkey scheme cycling error: ${err.message}`);
      }
    });

    // 6. Setup IPC handlers
    this.setupIpcHandlers();

    // 7. Initial state sync
    await this.scheduler.initialSync();

    // 8. Handle startup mode
    if (!this.startupManager.isStartupMode()) {
      logger.info("Normal startup: ready in system tray.");
    } else {
      logger.info("Silent startup mode active: tray icon only.");
    }
  }

  private setupIpcHandlers(): void {
    ipcMain.handle("getStateSnapshot", async () => {
      try {
        const [schemes, activeScheme, battery, displays] = await Promise.all([
          this.nativeClient.listSchemes().catch(() => []),
          this.nativeClient.getActiveScheme().catch(() => null),
          this.nativeClient.getBatteryState().catch(() => ({
            present: false,
            percentage: null,
            isCharging: false,
            isOnAc: true,
            isFullyCharged: false,
            secondsRemaining: null,
          })),
          this.nativeClient.listDisplays().catch(() => []),
        ]);

        const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
        const currentBrightness = primaryDisplay?.current ?? null;
        const capabilities = await this.nativeClient.getCapabilities().catch(() => ({
          hasBattery: battery.present,
          supportsInternalBrightness: displays.length > 0,
          supportsLidState: true,
          supportsDisplayState: true,
          supportsPowerSchemeNotifications: true,
        }));

        return {
          schemes,
          activeSchemeId: activeScheme?.id || null,
          battery,
          displays,
          primaryDisplayId: primaryDisplay?.id || null,
          currentBrightness,
          capabilities,
          settings: this.settingsStore.getSettings(),
          facts: this.scheduler.getFacts(),
          activeRuleIds: this.scheduler.getActiveRuleIds(),
          nativeStatus: this.nativeClient.getStatus(),
        };
      } catch (err: any) {
        logger.error(`getStateSnapshot IPC error: ${err.message}`);
        return {
          schemes: [],
          activeSchemeId: null,
          battery: {
            present: false,
            percentage: null,
            isCharging: false,
            isOnAc: true,
            isFullyCharged: false,
            secondsRemaining: null,
          },
          displays: [],
          primaryDisplayId: null,
          currentBrightness: null,
          capabilities: {
            hasBattery: false,
            supportsInternalBrightness: false,
            supportsLidState: false,
            supportsDisplayState: false,
            supportsPowerSchemeNotifications: false,
          },
          settings: this.settingsStore.getSettings(),
          facts: this.scheduler.getFacts(),
          activeRuleIds: [],
          nativeStatus: this.nativeClient.getStatus(),
        };
      }
    });

    ipcMain.handle("setActiveScheme", async (_event, schemeId: string) => {
      await this.scheduler.setManualScheme(schemeId);
      return { success: true, schemeId };
    });

    ipcMain.handle("setBrightness", async (_event, value: number, displayId?: string) => {
      return this.nativeClient.setBrightness(value, displayId);
    });

    ipcMain.handle("turnOffDisplay", async () => {
      this.popupManager.hide();
      return this.blackoutManager.activate();
    });

    ipcMain.handle("updateSettings", async (_event, partial: any) => {
      const updated = this.settingsStore.updateSettings(partial);
      if (partial.startWithWindows !== undefined) {
        this.startupManager.applySetting(partial.startWithWindows);
      }
      return updated;
    });

    ipcMain.handle("getSettings", async () => {
      return this.settingsStore.getSettings();
    });

    ipcMain.handle("openSettings", async (_event, tab?: string) => {
      this.popupManager.hide();
      this.settingsManager.show(tab || "general");
      return true;
    });

    ipcMain.handle("openWindowsPowerOptions", async () => {
      exec("control.exe /name Microsoft.PowerOptions", (err) => {
        if (err) logger.error(`Failed to open Windows power options: ${err.message}`);
      });
      return true;
    });

    ipcMain.handle("openLogFolder", async () => {
      shell.openPath(logger.getLogFolder());
      return true;
    });

    ipcMain.handle("closePopup", async () => {
      this.popupManager.hide();
      return true;
    });

    ipcMain.handle("selectExecutableDialog", async () => {
      const res = await dialog.showOpenDialog({
        title: "Seleccionar ejecutable",
        filters: [{ name: "Ejecutables", extensions: ["exe"] }],
        properties: ["openFile"],
      });
      if (!res.canceled && res.filePaths[0]) {
        return res.filePaths[0];
      }
      return null;
    });

    ipcMain.handle("getDiagnostics", async () => {
      const facts = this.scheduler.getFacts();
      return {
        appVersion: app.getVersion() || "1.0.0",
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        osVersion: `${os.type()} ${os.release()} (${os.arch()})`,
        activeSchemeGuid: facts.activeSchemeId,
        powerSource: facts.powerSource,
        batteryPercentage: facts.batteryPercentage,
        nativeStatus: this.nativeClient.getStatus(),
        activeRuleIds: this.scheduler.getActiveRuleIds(),
        logFolder: logger.getLogFolder(),
      };
    });
  }

  public handleSecondInstance(): void {
    logger.info("Second instance launched: focusing/toggling popup.");
    this.popupManager.toggle(this.trayManager.getBounds());
  }

  public shutdown(): void {
    logger.info("Shutting down PowerManager...");
    this.blackoutManager.dismiss();
    this.hotkeyManager.destroy();
    this.trayManager.destroy();
    this.popupManager.destroy();
    this.settingsManager.destroy();
    this.osdManager.destroy();
    this.scheduler.destroy();
    this.fixedBrightness.destroy();
    this.nativeClient.stop();
  }
}

let mainAppInstance: MainApp | null = null;

app.whenReady().then(async () => {
  mainAppInstance = new MainApp();
  await mainAppInstance.start();
});

app.on("second-instance", () => {
  mainAppInstance?.handleSecondInstance();
});

app.on("will-quit", () => {
  mainAppInstance?.shutdown();
});

app.on("window-all-closed", () => {
  // Prevent Electron from quitting when windows are closed (runs in tray)
});
