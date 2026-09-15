import fs from "node:fs";
import path from "node:path";
import { app, nativeImage } from "electron";
import type { NativeImage } from "electron";
import { logger } from "../logging/Logger";

export interface TrayRenderOptions {
  percentage: number | null;
  isOnAc: boolean;
  isCharging: boolean;
  schemeColor: string;
  style: "outline" | "solid";
  showPercentage: boolean;
}

export class TrayIconRenderer {
  private static cachedIcons = new Map<string, NativeImage>();

  public static render(options: TrayRenderOptions): NativeImage {
    const key = `${options.percentage}_${options.isOnAc}_${options.isCharging}_${options.schemeColor}_${options.style}_${options.showPercentage}`;
    const cached = this.cachedIcons.get(key);
    if (cached && !cached.isEmpty()) {
      return cached;
    }

    const iconPath = this.resolveIconPath();
    if (iconPath) {
      const img = nativeImage.createFromPath(iconPath);
      if (!img.isEmpty()) {
        this.cachedIcons.set(key, img);
        return img;
      }
    }

    // Fallback: Generate a crisp 32x32 RGBA bitmap with Powerfy colors
    const fallback = this.generateFallbackBitmap(options.schemeColor);
    this.cachedIcons.set(key, fallback);
    return fallback;
  }

  private static resolveIconPath(): string | null {
    const candidateNames = [
      "powerfy_tray_icon_32.png",
      "powerfy_tray_icon.ico",
      "powerfy_tray_icon_16.png",
      "powerfy_app_icon_64.png",
      "powerfy_app_icon.ico",
    ];

    const baseDirs = [
      path.join(app.getAppPath(), "resources", "icons"),
      path.join(app.getAppPath(), "apps", "desktop", "resources", "icons"),
      path.join(process.cwd(), "resources", "icons"),
      path.join(process.cwd(), "apps", "desktop", "resources", "icons"),
      path.join(process.resourcesPath || "", "icons"),
      path.join(process.resourcesPath || "", "resources", "icons"),
    ];

    for (const dir of baseDirs) {
      for (const name of candidateNames) {
        const fullPath = path.join(dir, name);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    }

    logger.warn("No physical branding icon found in search paths, using RGBA bitmap fallback.");
    return null;
  }

  private static generateFallbackBitmap(schemeColor: string): NativeImage {
    const width = 32;
    const height = 32;
    const buffer = Buffer.alloc(width * height * 4, 0);

    // Parse schemeColor hex (default #1ED8F5)
    let r = 30;
    let g = 216;
    let b = 245;
    if (schemeColor.startsWith("#") && schemeColor.length === 7) {
      r = Number.parseInt(schemeColor.slice(1, 3), 16) || 30;
      g = Number.parseInt(schemeColor.slice(3, 5), 16) || 216;
      b = Number.parseInt(schemeColor.slice(5, 7), 16) || 245;
    }

    // Draw a stylized energy bolt symbol
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dx = x - 16;
        const dy = y - 16;
        const distSq = dx * dx + dy * dy;

        // Outer ring
        if (distSq >= 100 && distSq <= 169) {
          buffer[idx] = 201; // Armor gray
          buffer[idx + 1] = 209;
          buffer[idx + 2] = 221;
          buffer[idx + 3] = 255;
        } else if (distSq < 100) {
          // Inner core glow
          buffer[idx] = r;
          buffer[idx + 1] = g;
          buffer[idx + 2] = b;
          buffer[idx + 3] = 255;
        }
      }
    }

    return nativeImage.createFromBitmap(buffer, { width, height });
  }
}
