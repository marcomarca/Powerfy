import type {
  ManualOverridePolicy,
  ManualOverrideState,
  PowerSchemeLease,
  RuntimeFacts,
} from "@power-manager/contracts";

export class ManualOverrideManager {
  private state: ManualOverrideState = {
    active: false,
    schemeId: null,
    policy: "untilAutomationStateChanges",
    createdGeneration: 0,
    createdAt: 0,
    expiresAt: null,
  };

  public setOverride(
    schemeId: string,
    policy: ManualOverridePolicy,
    currentGeneration: number,
    now = Date.now(),
  ): void {
    if (policy === "disabled") {
      this.cancel();
      return;
    }

    let expiresAt: number | null = null;
    if (policy === "for15Minutes") {
      expiresAt = now + 15 * 60 * 1000;
    } else if (policy === "for30Minutes") {
      expiresAt = now + 30 * 60 * 1000;
    } else if (policy === "for60Minutes") {
      expiresAt = now + 60 * 60 * 1000;
    }

    this.state = {
      active: true,
      schemeId,
      policy,
      createdGeneration: currentGeneration,
      createdAt: now,
      expiresAt,
    };
  }

  public cancel(): void {
    this.state = {
      active: false,
      schemeId: null,
      policy: "untilAutomationStateChanges",
      createdGeneration: 0,
      createdAt: 0,
      expiresAt: null,
    };
  }

  public getState(): ManualOverrideState {
    return { ...this.state };
  }

  public getLease(facts: RuntimeFacts, now = Date.now()): PowerSchemeLease | null {
    if (!this.state.active || !this.state.schemeId) {
      return null;
    }

    // Check expiration based on policy
    if (this.state.policy === "untilAutomationStateChanges") {
      if (facts.automationGeneration !== this.state.createdGeneration) {
        this.cancel();
        return null;
      }
    } else if (this.state.expiresAt !== null && now >= this.state.expiresAt) {
      this.cancel();
      return null;
    }

    return {
      sourceId: "manual_override",
      schemeId: this.state.schemeId,
      priority: 1000, // Reserved internal high priority
      order: 0,
      activatedAt: this.state.createdAt,
      exclusive: false,
    };
  }
}
