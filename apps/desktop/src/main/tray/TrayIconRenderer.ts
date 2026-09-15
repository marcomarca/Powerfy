import { nativeImage } from "electron";
import type { NativeImage } from "electron";

export interface TrayRenderOptions {
  percentage: number | null;
  isOnAc: boolean;
  isCharging: boolean;
  schemeColor: string;
  style: "outline" | "solid";
  showPercentage: boolean;
}

export class TrayIconRenderer {
  private static cache = new Map<string, NativeImage>();

  public static render(options: TrayRenderOptions): NativeImage {
    const key = `${options.percentage}_${options.isOnAc}_${options.isCharging}_${options.schemeColor}_${options.style}_${options.showPercentage}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const isDesktop = options.percentage === null;
    const pct = options.percentage !== null ? Math.max(0, Math.min(100, options.percentage)) : 100;
    const fillWidth = Math.max(1, Math.round((pct / 100) * 14));
    const schemeColor = options.schemeColor || "#1ed8f5";
    const bodyColor = options.style === "solid" ? "#ffffff" : "#c9d1dd";

    let svg = "";
    if (isDesktop) {
      // Desktop / No Battery: stylized Powerfy energy core
      svg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <!-- Powerfy Desktop Symbol -->
          <circle cx="16" cy="16" r="11" fill="none" stroke="${bodyColor}" stroke-width="2" />
          <path d="M 17 6 L 11 17 L 16 17 L 15 26 L 22 15 L 17 15 Z" fill="${schemeColor}" />
          <!-- Scheme Accent Dot -->
          <circle cx="24" cy="8" r="3.5" fill="${schemeColor}" stroke="#061b46" stroke-width="1.2" />
        </svg>
      `.trim();
    } else {
      // Laptop / Battery mode
      svg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <!-- Battery Outer Body -->
          <rect x="4" y="9" width="22" height="14" rx="3" fill="none" stroke="${bodyColor}" stroke-width="2.2" />
          <!-- Battery Terminal Tip -->
          <rect x="27" y="13" width="2" height="6" rx="1" fill="${bodyColor}" />
          <!-- Battery Fill Level -->
          <rect x="6.5" y="11.5" width="${fillWidth * 1.2}" height="9" rx="1.5" fill="${options.isCharging ? "#22c55e" : pct <= 20 ? "#ff2636" : schemeColor}" />
          <!-- Scheme Accent Dot -->
          <circle cx="24" cy="7" r="4" fill="${schemeColor}" stroke="#061b46" stroke-width="1" />
          ${
            options.isCharging
              ? `<path d="M 15 6 L 11 16 L 15 16 L 13 24 L 19 14 L 15 14 Z" fill="#fbbf24" stroke="#000000" stroke-width="0.8" />`
              : ""
          }
        </svg>
      `.trim();
    }

    const img = nativeImage.createFromBuffer(Buffer.from(svg), { scaleFactor: 2.0 });
    this.cache.set(key, img);
    return img;
  }
}
