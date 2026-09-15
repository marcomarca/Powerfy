export class BatteryHysteresisEvaluator {
  private activeBelowRules = new Set<string>();
  private activeAboveRules = new Set<string>();

  public evaluateBelow(
    ruleId: string,
    percentage: number | null,
    threshold: number,
    hysteresis = 2,
  ): boolean {
    if (percentage === null) {
      this.activeBelowRules.delete(ruleId);
      return false;
    }

    const wasActive = this.activeBelowRules.has(ruleId);
    if (wasActive) {
      // Deactivate only when exceeding threshold + hysteresis
      if (percentage >= threshold + hysteresis) {
        this.activeBelowRules.delete(ruleId);
        return false;
      }
      return true;
    }

    // Activate when reaching or below threshold
    if (percentage <= threshold) {
      this.activeBelowRules.add(ruleId);
      return true;
    }

    return false;
  }

  public evaluateAbove(
    ruleId: string,
    percentage: number | null,
    threshold: number,
    hysteresis = 2,
  ): boolean {
    if (percentage === null) {
      this.activeAboveRules.delete(ruleId);
      return false;
    }

    const wasActive = this.activeAboveRules.has(ruleId);
    if (wasActive) {
      // Deactivate only when dropping to threshold - hysteresis
      if (percentage <= threshold - hysteresis) {
        this.activeAboveRules.delete(ruleId);
        return false;
      }
      return true;
    }

    // Activate when reaching or above threshold
    if (percentage >= threshold) {
      this.activeAboveRules.add(ruleId);
      return true;
    }

    return false;
  }

  public reset(): void {
    this.activeBelowRules.clear;
    this.activeAboveRules.clear();
  }
}
