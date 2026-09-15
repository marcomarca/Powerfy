import path from "node:path";
import { BrowserWindow, app, screen } from "electron";
import { logger } from "../logging/Logger";
import type { SettingsStore } from "../settings/SettingsStore";

export class OsdWindowManager {
  private window: BrowserWindow | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private settingsStore: SettingsStore;

  constructor(settingsStore: SettingsStore) {
    this.settingsStore = settingsStore;
  }

  public showOsd(schemeName: string, schemeColor: string): void {
    const settings = this.settingsStore.getSettings();
    if (!settings.osd.enabled) return;

    if (!this.window || this.window.isDestroyed()) {
      this.createWindow();
    }

    if (!this.window) return;

    // Send payload to OSD renderer
    this.window.webContents.send("osdPayload", {
      schemeName: settings.osd.showSchemeName ? schemeName : "",
      schemeColor,
      showIcon: settings.osd.showIcon,
      opacity: settings.osd.opacity,
    });

    this.positionWindow();
    this.window.setOpacity(settings.osd.opacity);
    this.window.showInactive();

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    this.hideTimer = setTimeout(() => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.hide();
      }
    }, settings.osd.durationMs);
  }

  private createWindow(): void {
    const preloadPath = path.join(app.getAppPath(), "dist-electron/preload/index.js");
    const htmlPath = path.join(app.getAppPath(), "dist-renderer/index.html");

    const appIconPath = path.join(app.getAppPath(), "resources/icons/powerfy_app_icon.ico");

    this.window = new BrowserWindow({
      width: 320,
      height: 90,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      focusable: false,
      skipTaskbar: true,
      resizable: false,
      show: false,
      icon: appIconPath,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.window.webContents.on("did-fail-load", (_e, errorCode, errorDescription) => {
      logger.error(`OSD window failed to load: ${errorDescription} (${errorCode})`);
    });

    this.window.setIgnoreMouseEvents(true, { forward: true });

    const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.window.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=osd`);
    } else {
      this.window.loadFile(htmlPath, {
        query: { view: "osd" },
      });
    }

    this.window.on("closed", () => {
      this.window = null;
    });
  }

  private positionWindow(): void {
    if (!this.window) return;

    const [width = 320, height = 90] = this.window.getSize();
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;

    // Center bottom of the screen
    const x = Math.round(workArea.x + (workArea.width - width) / 2);
    const y = Math.round(workArea.y + workArea.height - height - 60);

    this.window.setPosition(x, y);
  }

  public destroy(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
      this.window = null;
    }
  }
}
