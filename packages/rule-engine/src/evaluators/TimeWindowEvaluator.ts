import { parseTimeHHmm, timeToMinutes } from "@power-manager/shared";

export interface TimeWindowConfig {
  days: number[]; // 1=Monday ... 7=Sunday
  start: string; // HH:mm
  end: string; // HH:mm
}

export class TimeWindowEvaluator {
  /**
   * Converts JS Date getDay() (0=Sun, 1=Mon, ..., 6=Sat) to ISO weekday (1=Mon ... 7=Sun)
   */
  public static getIsoDayOfWeek(date: Date): number {
    const d = date.getDay();
    return d === 0 ? 7 : d;
  }

  /**
   * Evaluates whether a given time window is active at `date`.
   */
  public static isWindowActive(config: TimeWindowConfig, date: Date): boolean {
    const currentIsoDay = this.getIsoDayOfWeek(date);
    const currentMinutes = timeToMinutes(date.getHours(), date.getMinutes());

    const { hours: startH, minutes: startM } = parseTimeHHmm(config.start);
    const { hours: endH, minutes: endM } = parseTimeHHmm(config.end);

    const startMinutes = timeToMinutes(startH, startM);
    const endMinutes = timeToMinutes(endH, endM);

    if (startMinutes <= endMinutes) {
      // Normal same-day window (e.g., 08:00 to 18:00)
      if (!config.days.includes(currentIsoDay)) {
        return false;
      }
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    // Midnight crossover window (e.g., 22:00 to 02:00)
    // 1. Started today during late evening
    if (config.days.includes(currentIsoDay) && currentMinutes >= startMinutes) {
      return true;
    }

    // 2. Started yesterday and continues into early morning today
    const prevIsoDay = currentIsoDay === 1 ? 7 : currentIsoDay - 1;
    if (config.days.includes(prevIsoDay) && currentMinutes < endMinutes) {
      return true;
    }

    return false;
  }

  /**
   * Calculates the next boundary timestamp (in ms) when the window status could change.
   */
  public static getNextWindowBoundary(config: TimeWindowConfig, date: Date): number {
    const { hours: startH, minutes: startM } = parseTimeHHmm(config.start);
    const { hours: endH, minutes: endM } = parseTimeHHmm(config.end);

    const candidates: number[] = [];

    // Check boundary candidates over a 3-day range (today, tomorrow, day after)
    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      const candidateDate = new Date(date);
      candidateDate.setDate(date.getDate() + dayOffset);
      candidateDate.setSeconds(0, 0);

      // Start candidate
      candidateDate.setHours(startH, startM, 0, 0);
      if (candidateDate.getTime() > date.getTime()) {
        candidates.push(candidateDate.getTime());
      }

      // End candidate
      candidateDate.setHours(endH, endM, 0, 0);
      if (candidateDate.getTime() > date.getTime()) {
        candidates.push(candidateDate.getTime());
      }
    }

    candidates.sort((a, b) => a - b);
    return candidates[0] ?? date.getTime() + 60_000;
  }
}
