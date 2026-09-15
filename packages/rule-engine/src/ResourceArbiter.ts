import type { BrightnessLease, PowerSchemeLease } from "@power-manager/contracts";

export class PowerSchemeArbiter {
  public static resolve(
    leases: PowerSchemeLease[],
    baselineSchemeId: string,
  ): {
    winningSchemeId: string;
    winningLease: PowerSchemeLease | null;
    activeLeases: PowerSchemeLease[];
  } {
    if (leases.length === 0) {
      return {
        winningSchemeId: baselineSchemeId,
        winningLease: null,
        activeLeases: [],
      };
    }

    // Check if any active lease is exclusive
    const exclusiveLeases = leases.filter((l) => l.exclusive);
    let eligibleLeases = [...leases];

    if (exclusiveLeases.length > 0) {
      // Find maximum exclusive priority
      const maxExclusivePriority = Math.max(...exclusiveLeases.map((l) => l.priority));
      // Only keep leases whose priority is >= maxExclusivePriority
      eligibleLeases = eligibleLeases.filter((l) => l.priority >= maxExclusivePriority);
    }

    // Sort by priority DESC, order ASC, activatedAt ASC
    eligibleLeases.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.activatedAt - b.activatedAt;
    });

    const winner = eligibleLeases[0];
    return {
      winningSchemeId: winner ? winner.schemeId : baselineSchemeId,
      winningLease: winner ?? null,
      activeLeases: eligibleLeases,
    };
  }
}

export class BrightnessArbiter {
  public static resolve(
    leases: BrightnessLease[],
    fallbackValue: number | null,
  ): { winningValue: number | null; winningLease: BrightnessLease | null } {
    if (leases.length === 0) {
      return { winningValue: fallbackValue, winningLease: null };
    }

    const sorted = [...leases].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.order !== b.order) return a.order - b.order;
      return a.activatedAt - b.activatedAt;
    });

    const winner = sorted[0];
    return {
      winningValue: winner ? winner.value : fallbackValue,
      winningLease: winner ?? null,
    };
  }
}
