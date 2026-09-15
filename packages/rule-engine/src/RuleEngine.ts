import type {
  AutomationAction,
  AutomationRule,
  Condition,
  DesiredState,
  PowerSchemeLease,
  RuntimeFacts,
  Trigger,
} from "@power-manager/contracts";
import { ManualOverrideManager } from "./ManualOverrideManager";
import { PowerSchemeArbiter } from "./ResourceArbiter";
import { BatteryHysteresisEvaluator } from "./evaluators/BatteryHysteresis";
import { ProcessMatcher } from "./evaluators/ProcessMatcher";
import { TimeWindowEvaluator } from "./evaluators/TimeWindowEvaluator";

export class RuleEngine {
  private batteryHysteresis = new BatteryHysteresisEvaluator();
  public manualOverride = new ManualOverrideManager();
  private previouslyActiveRuleIds = new Set<string>();
  private leaseActivationTimes = new Map<string, number>();

  /**
   * Evaluates all rules against current RuntimeFacts and returns DesiredState.
   */
  public evaluate(
    rules: AutomationRule[],
    facts: RuntimeFacts,
    baselineSchemeId: string,
    edgeEvent?: Trigger,
  ): DesiredState & {
    nextBoundaryTimeMs: number | null;
    activeRuleIds: string[];
    generationChanged: boolean;
  } {
    const nowDate = new Date(facts.now);
    const nowMs = nowDate.getTime();
    const activeLeases: PowerSchemeLease[] = [];
    const executedActions: AutomationAction[] = [];
    const currentActiveRuleIds = new Set<string>();
    const timeBoundaryCandidates: number[] = [];

    // 1. Evaluate individual rules
    for (const rule of rules) {
      if (!rule.enabled) continue;

      // Evaluate Conditions (AND)
      const conditionsMet = this.evaluateConditionGroup(rule.conditions.items, facts, nowDate);
      if (!conditionsMet) continue;

      // Evaluate Triggers (OR)
      const { triggerMatched, isEdgeTrigger } = this.evaluateTriggerGroup(
        rule.id,
        rule.when.items,
        facts,
        nowDate,
        edgeEvent,
      );

      // Collect time boundary candidates for timers
      for (const trigger of rule.when.items) {
        if (trigger.type === "timeWindow") {
          const nextBoundary = TimeWindowEvaluator.getNextWindowBoundary(trigger, nowDate);
          timeBoundaryCandidates.push(nextBoundary);
        }
      }

      if (triggerMatched) {
        currentActiveRuleIds.add(rule.id);

        let activatedAt = this.leaseActivationTimes.get(rule.id);
        if (!activatedAt) {
          activatedAt = nowMs;
          this.leaseActivationTimes.set(rule.id, activatedAt);
        }

        // Process actions
        for (const action of rule.actions) {
          if (action.type === "setPowerScheme") {
            if (!isEdgeTrigger) {
              // Stateful lease
              activeLeases.push({
                sourceId: rule.id,
                schemeId: action.schemeId,
                priority: rule.priority,
                order: rule.order,
                activatedAt,
                exclusive: rule.exclusive,
              });
            } else {
              // Edge trigger execution
              executedActions.push(action);
            }
          } else {
            // Other actions (brightness, display off, notifications, osd)
            executedActions.push(action);
          }
        }
      } else {
        this.leaseActivationTimes.delete(rule.id);
      }
    }

    // 2. Add manual override lease if active
    const overrideLease = this.manualOverride.getLease(facts, nowMs);
    if (overrideLease) {
      activeLeases.push(overrideLease);
    }

    // 3. Resolve power scheme via arbiter
    const { winningSchemeId, activeLeases: eligibleLeases } = PowerSchemeArbiter.resolve(
      activeLeases,
      baselineSchemeId,
    );

    // 4. Check if active rule set changed (increments automation generation)
    let generationChanged = false;
    if (
      currentActiveRuleIds.size !== this.previouslyActiveRuleIds.size ||
      [...currentActiveRuleIds].some((id) => !this.previouslyActiveRuleIds.has(id))
    ) {
      generationChanged = true;
      this.previouslyActiveRuleIds = new Set(currentActiveRuleIds);
    }

    // 5. Calculate next boundary
    timeBoundaryCandidates.sort((a, b) => a - b);
    const nextBoundaryTimeMs = timeBoundaryCandidates[0] ?? null;

    return {
      schemeId: winningSchemeId,
      activeLeases: eligibleLeases,
      executedActions,
      nextBoundaryTimeMs,
      activeRuleIds: [...currentActiveRuleIds],
      generationChanged,
    };
  }

  private evaluateConditionGroup(
    conditions: Condition[],
    facts: RuntimeFacts,
    nowDate: Date,
  ): boolean {
    for (const cond of conditions) {
      if (cond.type === "powerSource") {
        const isAc = facts.powerSource === "ac";
        if (isAc !== cond.isAc) return false;
      } else if (cond.type === "batteryPercentage") {
        if (facts.batteryPercentage === null) return false;
        const p = facts.batteryPercentage;
        if (cond.operator === "gte" && p < cond.value) return false;
        if (cond.operator === "lte" && p > cond.value) return false;
        if (cond.operator === "gt" && p <= cond.value) return false;
        if (cond.operator === "lt" && p >= cond.value) return false;
      } else if (cond.type === "activeScheme") {
        if (facts.activeSchemeId !== cond.schemeId) return false;
      } else if (cond.type === "processRunning") {
        if (!ProcessMatcher.isTargetRunning(cond.target, facts)) return false;
      } else if (cond.type === "timeWindow") {
        if (!TimeWindowEvaluator.isWindowActive(cond, nowDate)) return false;
      }
    }
    return true;
  }

  private evaluateTriggerGroup(
    ruleId: string,
    triggers: Trigger[],
    facts: RuntimeFacts,
    nowDate: Date,
    edgeEvent?: Trigger,
  ): { triggerMatched: boolean; isEdgeTrigger: boolean } {
    for (const trigger of triggers) {
      // Check edge event match first
      if (edgeEvent && this.matchEdgeEvent(trigger, edgeEvent)) {
        return { triggerMatched: true, isEdgeTrigger: true };
      }

      // Check stateful triggers
      if (trigger.type === "processRunning") {
        if (ProcessMatcher.isTargetRunning(trigger.target, facts)) {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      } else if (trigger.type === "timeWindow") {
        if (TimeWindowEvaluator.isWindowActive(trigger, nowDate)) {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      } else if (trigger.type === "acConnected") {
        if (facts.powerSource === "ac") {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      } else if (trigger.type === "onBattery") {
        if (facts.powerSource === "battery") {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      } else if (trigger.type === "batteryBelow") {
        if (
          this.batteryHysteresis.evaluateBelow(
            ruleId,
            facts.batteryPercentage,
            trigger.percentage,
            trigger.hysteresis ?? 2,
          )
        ) {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      } else if (trigger.type === "batteryAbove") {
        if (
          this.batteryHysteresis.evaluateAbove(
            ruleId,
            facts.batteryPercentage,
            trigger.percentage,
            trigger.hysteresis ?? 2,
          )
        ) {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      } else if (trigger.type === "activeSchemeIs") {
        if (facts.activeSchemeId === trigger.schemeId) {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      } else if (trigger.type === "lidClosed") {
        if (facts.lidState === "closed") {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      } else if (trigger.type === "displayOff") {
        if (facts.displayState === "off") {
          return { triggerMatched: true, isEdgeTrigger: false };
        }
      }
    }

    return { triggerMatched: false, isEdgeTrigger: false };
  }

  private matchEdgeEvent(expected: Trigger, actual: Trigger): boolean {
    if (expected.type !== actual.type) return false;

    if (expected.type === "processStarted" && actual.type === "processStarted") {
      const expKey = ProcessMatcher.targetToKey(expected.target);
      const actKey = ProcessMatcher.targetToKey(actual.target);
      return expKey === actKey;
    }
    if (expected.type === "processStopped" && actual.type === "processStopped") {
      const expKey = ProcessMatcher.targetToKey(expected.target);
      const actKey = ProcessMatcher.targetToKey(actual.target);
      return expKey === actKey;
    }
    if (expected.type === "schemeChanged" && actual.type === "schemeChanged") {
      if (expected.toSchemeId && expected.toSchemeId !== actual.toSchemeId) return false;
      if (expected.fromSchemeId && expected.fromSchemeId !== actual.fromSchemeId) return false;
      return true;
    }
    if (expected.type === "acChanged" && actual.type === "acChanged") {
      return expected.toAc === actual.toAc;
    }
    if (expected.type === "batteryThresholdCrossed" && actual.type === "batteryThresholdCrossed") {
      return expected.percentage === actual.percentage && expected.direction === actual.direction;
    }
    if (expected.type === "suspend" && actual.type === "suspend") return true;
    if (expected.type === "resume" && actual.type === "resume") return true;
    if (expected.type === "appStarted" && actual.type === "appStarted") return true;

    return false;
  }

  public reset(): void {
    this.batteryHysteresis.reset();
    this.manualOverride.cancel();
    this.previouslyActiveRuleIds.clear();
    this.leaseActivationTimes.clear();
  }
}
