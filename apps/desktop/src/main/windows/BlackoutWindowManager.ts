import { BrowserWindow, powerSaveBlocker, screen } from "electron";
import { logger } from "../logging/Logger";
import type { NativeHostClient } from "../native-host/NativeHostClient";

export class BlackoutWindowManager {
  private windows: BrowserWindow[] = [];
  private nativeClient: NativeHostClient;
  private savedBrightness: number | null = null;
  private powerBlockerId: number | null = null;
  private isDismissing = false;

  constructor(nativeClient: NativeHostClient) {
    this.nativeClient = nativeClient;
  }

  public isActive(): boolean {
    return this.windows.length > 0;
  }

  public async activate(): Promise<{ success: boolean }> {
    if (this.isActive()) {
      return { success: true };
    }

    try {
      logger.info("Activating Blackout active screen blanking mode...");

      // 1. Prevent system sleep while blackout is active
      if (!this.powerBlockerId || !powerSaveBlocker.isStarted(this.powerBlockerId)) {
        this.powerBlockerId = powerSaveBlocker.start("prevent-app-suspension");
      }

      // 2. Query and save current display brightness
      try {
        const b = await this.nativeClient.getBrightness();
        this.savedBrightness = b.value ?? 75;
      } catch (err) {
        logger.warn(`Could not snapshot brightness before blackout: ${err}`);
        this.savedBrightness = 75;
      }

      // 3. Lower display hardware brightness to 0%
      try {
        await this.nativeClient.setBrightness(0);
      } catch (err) {
        logger.warn(`Could not set brightness to 0 during blackout: ${err}`);
      }

      // 4. Create fullscreen pure-black overlay windows on every connected display
      const displays = screen.getAllDisplays();
      this.isDismissing = false;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100vw;
              height: 100vh;
              background-color: #000000;
              overflow: hidden;
              cursor: none;
              user-select: none;
            }
          </style>
        </head>
        <body>
          <script>
            const startTime = Date.now();
            let startX = null;
            let startY = null;
            const threshold = 18;

            window.addEventListener('mousemove', (e) => {
              // Ignore initial mouse release bounce within first 400ms
              if (Date.now() - startTime < 400) return;

              if (startX === null) {
                startX = e.screenX;
                startY = e.screenY;
                return;
              }

              const dist = Math.hypot(e.screenX - startX, e.screenY - startY);
              if (dist > threshold) {
                window.close();
              }
            });

            window.addEventListener('mousedown', () => {
              if (Date.now() - startTime > 350) {
                window.close();
              }
            });

            window.addEventListener('keydown', () => {
              window.close();
            });
          </script>
        </body>
        </html>
      `.trim();

      const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

      for (const d of displays) {
        const win = new BrowserWindow({
          x: d.bounds.x,
          y: d.bounds.y,
          width: d.bounds.width,
          height: d.bounds.height,
          frame: false,
          show: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          fullscreen: true,
          simpleFullscreen: true,
          backgroundColor: "#000000",
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        });

        win.setMenu(null);
        win.loadURL(dataUri);

        win.once("ready-to-show", () => {
          win.show();
          win.focus();
        });

        win.on("closed", () => {
          this.dismiss();
        });

        this.windows.push(win);
      }

      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to activate Blackout mode: ${err.message}`);
      await this.dismiss();
      return { success: false };
    }
  }

  public async dismiss(): Promise<void> {
    if (this.isDismissing) return;
    this.isDismissing = true;

    logger.info("Dismissing Blackout mode, restoring brightness and session state...");

    // 1. Destroy all overlay windows
    const currentWindows = [...this.windows];
    this.windows = [];

    for (const win of currentWindows) {
      if (!win.isDestroyed()) {
        try {
          win.destroy();
        } catch {
          // Window may already be closing
        }
      }
    }

    // 2. Restore previous brightness
    if (this.savedBrightness !== null) {
      try {
        await this.nativeClient.setBrightness(this.savedBrightness);
      } catch (err) {
        logger.warn(`Failed to restore brightness after blackout: ${err}`);
      }
      this.savedBrightness = null;
    }

    // 3. Release system power execution blocker
    if (this.powerBlockerId !== null && powerSaveBlocker.isStarted(this.powerBlockerId)) {
      try {
        powerSaveBlocker.stop(this.powerBlockerId);
      } catch {
        // Ignored
      }
      this.powerBlockerId = null;
    }

    this.isDismissing = false;
  }
}
