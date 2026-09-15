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

    const pct = options.percentage !== null ? Math.max(0, Math.min(100, options.percentage)) : 100;
    const fillWidth = Math.max(1, Math.round((pct / 100) * 14));
    const schemeColor = options.schemeColor || "#3b82f6";
    const bodyColor = options.style === "solid" ? "#ffffff" : "#e2e8f0";

    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <!-- Battery Outer Body -->
        <rect x="4" y="9" width="22" height="14" rx="3" fill="none" stroke="${bodyColor}" stroke-width="2.2" />
        <!-- Battery Terminal Tip -->
        <rect x="27" y="13" width="2" height="6" rx="1" fill="${bodyColor}" />
        <!-- Battery Fill Level -->
        <rect x="6.5" y="11.5" width="${fillWidth * 1.2}" height="9" rx="1.5" fill="${options.isCharging ? "#22c55e" : pct <= 20 ? "#ef4444" : schemeColor}" />
        <!-- Scheme Accent Dot -->
        <circle cx="24" cy="7" r="4" fill="${schemeColor}" stroke="#0f172a" stroke-width="1" />
        ${
          options.isCharging
            ? `<path d="M 14 6 L 10 16 L 14 16 L 12 24 L 18 14 L 14 14 Z" fill="#fbbf24" stroke="#000000" stroke-width="0.8" />`
            : ""
        }
      </svg>
    `.trim();

    const img = nativeImage.createFromBuffer(Buffer.from(svg), { scaleFactor: 2.0 });
    this.cache.set(key, img);
    return img;
  }
}
