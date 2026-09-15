import { app } from "electron";
import { logger } from "../logging/Logger";

export class StartupManager {
  public applySetting(enabled: boolean): void {
    if (!app.isPackaged && process.env.NODE_ENV === "development") {
      logger.info(`Skipping setLoginItemSettings in development mode (enabled=${enabled})`);
      return;
    }

    try {
      // In electron-builder portable apps, process.env.PORTABLE_EXECUTABLE_FILE points to the permanent .exe on disk
      const targetExePath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;

      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true,
        path: targetExePath,
        args: ["--startup"],
      });
      logger.info(
        `Updated Windows login item setting: openAtLogin=${enabled}, targetPath=${targetExePath}`,
      );
    } catch (err: any) {
      logger.error(`Failed to set login item settings: ${err.message}`);
    }
  }

  public isStartupMode(): boolean {
    return process.argv.includes("--startup");
  }
}
