import path from "node:path";
import { BrowserWindow, app } from "electron";
import { logger } from "../logging/Logger";

export class SettingsWindowManager {
  private window: BrowserWindow | null = null;

  public show(tab = "general"): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      this.window.webContents.send("navigateTab", tab);
      return;
    }

    const preloadPath = path.join(app.getAppPath(), "dist-electron/preload/index.js");
    const htmlPath = path.join(app.getAppPath(), "dist-renderer/index.html");

    this.window = new BrowserWindow({
      width: 900,
      height: 650,
      minWidth: 780,
      minHeight: 520,
      title: "PowerManager — Ajustes",
      autoHideMenuBar: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.window.webContents.on("did-fail-load", (_e, errorCode, errorDescription) => {
      logger.error(`Settings window failed to load: ${errorDescription} (${errorCode})`);
    });

    const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.window.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=settings&tab=${tab}`);
    } else {
      this.window.loadFile(htmlPath, {
        query: { view: "settings", tab },
      });
    }

    this.window.on("closed", () => {
      this.window = null;
    });
  }

  public send(channel: string, ...args: any[]): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, ...args);
    }
  }

  public destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
      this.window = null;
    }
  }
}
