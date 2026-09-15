import { logger } from "../logging/Logger";
import type { NativeHostClient } from "../native-host/NativeHostClient";

/**
 * Manages the display-off feature by delegating entirely to the NativeHost C# process.
 * The NativeHost uses the native VIDEOIDLE path to physically turn off displays
 * while keeping the system active via PowerCreateRequest.
 *
 * This replaces the previous implementation that used fullscreen black overlay windows
 * and brightness=0, which did not actually turn off the display backlight.
 */
export class BlackoutWindowManager {
  private nativeClient: NativeHostClient;

  constructor(nativeClient: NativeHostClient) {
    this.nativeClient = nativeClient;
  }

  public isActive(): boolean {
    // State is tracked on the native side
    return false;
  }

  public async activate(): Promise<{ success: boolean }> {
    try {
      logger.info("Requesting native display-off via NativeHost (VIDEOIDLE path)...");
      const result = await this.nativeClient.turnOffDisplay();
      logger.info(`Native display-off result: ${JSON.stringify(result)}`);
      return { success: result.success };
    } catch (err: any) {
      logger.error(`Native display-off request failed: ${err.message}`);
      return { success: false };
    }
  }

  public async dismiss(): Promise<void> {
    try {
      await this.nativeClient.cancelDisplayOff();
    } catch (err: any) {
      logger.warn(`Cancel display-off failed: ${err.message}`);
    }
  }
}
