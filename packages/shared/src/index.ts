export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number,
): { (...args: TArgs): void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: TArgs) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

export function generateId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const PRESET_SCHEME_COLORS = [
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
];

export function getStableColorForGuid(guid: string): string {
  let hash = 0;
  const clean = guid.toLowerCase().replace(/[^a-f0-9]/g, "");
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + (clean.charCodeAt(i) || 0);
    hash |= 0;
  }
  const index = Math.abs(hash) % PRESET_SCHEME_COLORS.length;
  return PRESET_SCHEME_COLORS[index] ?? "#3b82f6";
}

export function formatTimeHHmm(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function parseTimeHHmm(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(":");
  const hours = parts[0] ? Number.parseInt(parts[0], 10) : 0;
  const minutes = parts[1] ? Number.parseInt(parts[1], 10) : 0;
  return {
    hours: Number.isNaN(hours) ? 0 : Math.max(0, Math.min(23, hours)),
    minutes: Number.isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes)),
  };
}

export function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}
