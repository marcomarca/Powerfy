import { EventEmitter } from "node:events";
import { globalShortcut } from "electron";
import { logger } from "../logging/Logger";
import type { SettingsStore } from "../settings/SettingsStore";

export class HotkeyManager extends EventEmitter {
  private settingsStore: SettingsStore;
  private currentHotkey: string | null = null;

  constructor(settingsStore: SettingsStore) {
    super();
    this.settingsStore = settingsStore;
    this.settingsStore.on("settingsChanged", (settings) => {
      if (settings.hotkey !== this.currentHotkey) {
        this.register(settings.hotkey);
      }
    });
  }

  public register(hotkey: string): boolean {
    this.unregister();

    if (!hotkey) return true;

    // Normalize or fallback invalid key names
    let normalized = hotkey.trim();
    if (normalized.includes("Pause")) {
      normalized = normalized.replace("Pause", "P");
    }

    try {
      const ok = globalShortcut.register(normalized, () => {
        logger.info(`Global hotkey '${normalized}' triggered.`);
        this.emit("hotkeyTriggered");
      });

      if (ok) {
        this.currentHotkey = normalized;
        logger.info(`Global hotkey '${normalized}' successfully registered.`);
        return true;
      }

      logger.warn(`Global hotkey '${normalized}' could not be registered (maybe occupied).`);
      return false;
    } catch (err: any) {
      logger.error(`Error registering hotkey '${normalized}': ${err.message}`);
      return false;
    }
  }

  public unregister(): void {
    if (this.currentHotkey) {
      try {
        globalShortcut.unregister(this.currentHotkey);
      } catch {
        // Ignore
      }
      this.currentHotkey = null;
    }
  }

  public destroy(): void {
    this.unregister();
  }
}
