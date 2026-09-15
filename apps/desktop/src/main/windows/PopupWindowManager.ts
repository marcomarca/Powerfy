import path from "node:path";
import { BrowserWindow, type Rectangle, app, screen } from "electron";
import { logger } from "../logging/Logger";

export class PopupWindowManager {
  private window: BrowserWindow | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly idleTimeoutMs = 5 * 60 * 1000; // 5 minutes

  public isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  public async toggle(trayBounds?: Rectangle): Promise<void> {
    if (this.isVisible()) {
      this.hide();
    } else {
      await this.show(trayBounds);
    }
  }

  public async show(trayBounds?: Rectangle): Promise<void> {
    this.clearIdleTimer();

    if (!this.window || this.window.isDestroyed()) {
      this.createWindow();
    }

    if (!this.window) return;

    this.positionWindow(trayBounds);
    this.window.show();
    this.window.focus();
  }

  public hide(): void {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      this.window.hide();
      this.startIdleTimer();
    }
  }

  public send(channel: string, ...args: any[]): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, ...args);
    }
  }

  private createWindow(): void {
    const preloadPath = path.join(app.getAppPath(), "dist-electron/preload/index.js");
    const htmlPath = path.join(app.getAppPath(), "dist-renderer/index.html");

    this.window = new BrowserWindow({
      width: 380,
      height: 480,
      show: false,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.window.webContents.on("did-fail-load", (_e, errorCode, errorDescription) => {
      logger.error(`Popup window failed to load: ${errorDescription} (${errorCode})`);
    });

    const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.window.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=popup`);
    } else {
      this.window.loadFile(htmlPath, {
        query: { view: "popup" },
      });
    }

    this.window.on("blur", () => {
      this.hide();
    });

    this.window.on("closed", () => {
      this.window = null;
    });
  }

  private positionWindow(trayBounds?: Rectangle): void {
    if (!this.window) return;

    const [width = 380, height = 480] = this.window.getSize();
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;

    let x = workArea.x + workArea.width - width - 12;
    let y = workArea.y + workArea.height - height - 12;

    if (trayBounds) {
      // Align above or near tray bounds
      x = Math.round(trayBounds.x + trayBounds.width / 2 - width / 2);
      y = Math.round(trayBounds.y - height - 8);

      // Clamp within screen bounds
      if (x + width > workArea.x + workArea.width) {
        x = workArea.x + workArea.width - width - 8;
      }
      if (x < workArea.x) {
        x = workArea.x + 8;
      }
      if (y < workArea.y) {
        y = Math.round(trayBounds.y + trayBounds.height + 8);
      }
    }

    this.window.setPosition(x, y);
  }

  private startIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (this.window && !this.window.isDestroyed() && !this.window.isVisible()) {
        logger.info("Destroying idle popup window renderer to reclaim memory.");
        this.window.destroy();
        this.window = null;
      }
    }, this.idleTimeoutMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  public destroy(): void {
    this.clearIdleTimer();
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
      this.window = null;
    }
  }
}
