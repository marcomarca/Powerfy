import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { type AppSettings, DEFAULT_SETTINGS } from "@power-manager/contracts";
import { deepClone } from "@power-manager/shared";
import { app } from "electron";
import { logger } from "../logging/Logger";

export class SettingsStore extends EventEmitter {
  private settingsPath: string;
  private backupPath: string;
  private settings: AppSettings;

  constructor() {
    super();
    const userDataDir = app?.getPath("userData") || process.cwd();
    this.settingsPath = path.join(userDataDir, "settings.json");
    this.backupPath = path.join(userDataDir, "settings.json.bak");
    this.settings = this.loadSettings();
  }

  public getSettings(): AppSettings {
    return deepClone(this.settings);
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    const updated = {
      ...this.settings,
      ...partial,
      tray: { ...this.settings.tray, ...(partial.tray || {}) },
      osd: { ...this.settings.osd, ...(partial.osd || {}) },
      fixedBrightness: { ...this.settings.fixedBrightness, ...(partial.fixedBrightness || {}) },
    };

    this.settings = updated;
    this.saveSettings(this.settings);
    this.emit("settingsChanged", this.getSettings());
    return this.getSettings();
  }

  private loadSettings(): AppSettings {
    if (!fs.existsSync(this.settingsPath)) {
      logger.info("No existing settings found. Initializing with defaults.");
      this.saveSettings(DEFAULT_SETTINGS);
      return deepClone(DEFAULT_SETTINGS);
    }

    try {
      const data = fs.readFileSync(this.settingsPath, "utf8");
      const parsed = JSON.parse(data);
      const migrated = this.migrate(parsed);
      return migrated;
    } catch (err: any) {
      logger.error(`Error reading settings.json: ${err.message}. Attempting backup recovery...`);
      return this.recoverFromBackup();
    }
  }

  private recoverFromBackup(): AppSettings {
    if (fs.existsSync(this.backupPath)) {
      try {
        const backupData = fs.readFileSync(this.backupPath, "utf8");
        const parsed = JSON.parse(backupData);
        logger.info("Successfully recovered settings from backup.");
        const migrated = this.migrate(parsed);
        this.saveSettings(migrated);
        return migrated;
      } catch (backupErr: any) {
        logger.error(`Backup recovery failed: ${backupErr.message}. Resetting to defaults.`);
      }
    }

    this.saveSettings(DEFAULT_SETTINGS);
    return deepClone(DEFAULT_SETTINGS);
  }

  private migrate(raw: any): AppSettings {
    const current = { ...DEFAULT_SETTINGS, ...raw };

    if (!current.schemaVersion || current.schemaVersion < 1) {
      current.schemaVersion = 1;
    }

    if (current.hotkey === "Alt+Pause") {
      current.hotkey = "Alt+P";
    }

    // Deep merge nested structs with defaults to prevent undefined access
    current.tray = { ...DEFAULT_SETTINGS.tray, ...(raw.tray || {}) };
    current.osd = { ...DEFAULT_SETTINGS.osd, ...(raw.osd || {}) };
    current.fixedBrightness = {
      ...DEFAULT_SETTINGS.fixedBrightness,
      ...(raw.fixedBrightness || {}),
    };
    current.rules = Array.isArray(raw.rules) ? raw.rules : [];

    return current;
  }

  private saveSettings(settings: AppSettings): void {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPath = `${this.settingsPath}.tmp`;
    const json = JSON.stringify(settings, null, 2);

    try {
      // 1. Write to temp file
      fs.writeFileSync(tempPath, json, "utf8");

      // 2. Create backup if primary settings file exists
      if (fs.existsSync(this.settingsPath)) {
        try {
          fs.copyFileSync(this.settingsPath, this.backupPath);
        } catch {
          // Non-fatal if backup copy fails
        }
      }

      // 3. Rename temp to primary (atomic write)
      fs.renameSync(tempPath, this.settingsPath);
    } catch (err: any) {
      logger.error(`Failed to save settings atomically: ${err.message}`);
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore
        }
      }
    }
  }
}
