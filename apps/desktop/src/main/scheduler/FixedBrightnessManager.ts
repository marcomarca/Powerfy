import { debounce } from "@power-manager/shared";
import { logger } from "../logging/Logger";
import type { NativeHostClient } from "../native-host/NativeHostClient";
import type { SettingsStore } from "../settings/SettingsStore";

export class FixedBrightnessManager {
  private settingsStore: SettingsStore;
  private nativeClient: NativeHostClient;
  private debouncedCheck: { (): void; cancel: () => void };
  private retryCount = 0;
  private maxRetries = 2;

  constructor(settingsStore: SettingsStore, nativeClient: NativeHostClient) {
    this.settingsStore = settingsStore;
    this.nativeClient = nativeClient;

    this.debouncedCheck = debounce(() => {
      this.enforceFixedBrightness();
    }, 750);
  }

  public triggerCheck(): void {
    const settings = this.settingsStore.getSettings();
    if (!settings.fixedBrightness.enabled || settings.fixedBrightness.value === null) {
      return;
    }
    this.retryCount = 0;
    this.debouncedCheck();
  }

  private async enforceFixedBrightness(): Promise<void> {
    const settings = this.settingsStore.getSettings();
    if (!settings.fixedBrightness.enabled || settings.fixedBrightness.value === null) {
      return;
    }

    const targetValue = settings.fixedBrightness.value;
    const targetDisplayId = settings.fixedBrightness.displayId ?? undefined;

    try {
      const current = await this.nativeClient.getBrightness(targetDisplayId);
      if (current.value !== targetValue) {
        logger.info(
          `FixedBrightness: Re-applying fixed brightness (${targetValue}% vs current ${current.value}%)`,
        );
        await this.nativeClient.setBrightness(targetValue, targetDisplayId);

        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => this.enforceFixedBrightness(), 2000);
        }
      }
    } catch (err: any) {
      logger.warn(`FixedBrightness enforcement error: ${err.message}`);
    }
  }

  public destroy(): void {
    this.debouncedCheck.cancel();
  }
}
