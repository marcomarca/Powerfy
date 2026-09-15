import { beforeEach, describe, expect, test } from "bun:test";
import type { AutomationRule, RuntimeFacts } from "../../packages/contracts/src/index";
import { RuleEngine } from "../../packages/rule-engine/src/RuleEngine";
import { BatteryHysteresisEvaluator } from "../../packages/rule-engine/src/evaluators/BatteryHysteresis";
import { ProcessMatcher } from "../../packages/rule-engine/src/evaluators/ProcessMatcher";
import { TimeWindowEvaluator } from "../../packages/rule-engine/src/evaluators/TimeWindowEvaluator";

describe("RuleEngine Core Test Suite", () => {
  let engine: RuleEngine;
  let baseFacts: RuntimeFacts;

  beforeEach(() => {
    engine = new RuleEngine();
    baseFacts = {
      now: "2026-09-14T10:00:00.000Z", // Monday 10:00
      powerSource: "ac",
      batteryPercentage: 80,
      activeSchemeId: "scheme_balanced",
      runningProcesses: {},
      displayState: "on",
      lidState: "open",
      sessionGeneration: 1,
      automationGeneration: 1,
    };
  });

  test("30.1: Gaming + Time Window scenario", () => {
    const ruleTimeWindow: AutomationRule = {
      id: "rule_work_hours",
      name: "Work hours Balanced",
      enabled: true,
      priority: 40,
      order: 1,
      exclusive: false,
      when: {
        operator: "any",
        items: [{ type: "timeWindow", days: [1, 2, 3, 4, 5], start: "08:00", end: "18:00" }],
      },
      conditions: { operator: "all", items: [] },
      actions: [{ type: "setPowerScheme", schemeId: "scheme_balanced" }],
      cooldownMs: 0,
      createdAt: "",
      updatedAt: "",
    };

    const ruleGame: AutomationRule = {
      id: "rule_game",
      name: "Game Extreme",
      enabled: true,
      priority: 80,
      order: 2,
      exclusive: false,
      when: {
        operator: "any",
        items: [{ type: "processRunning", target: { match: "name", value: "game.exe" } }],
      },
      conditions: { operator: "all", items: [] },
      actions: [{ type: "setPowerScheme", schemeId: "scheme_extreme" }],
      cooldownMs: 0,
      createdAt: "",
      updatedAt: "",
    };

    const rules = [ruleTimeWindow, ruleGame];

    // 10:00 - Work hours active, game not running -> Balanced
    const res1 = engine.evaluate(rules, baseFacts, "scheme_power_saver");
    expect(res1.schemeId).toBe("scheme_balanced");
    expect(res1.activeRuleIds).toContain("rule_work_hours");

    // 10:30 - Game launches -> Extreme wins by priority 80 vs 40
    const factsWithGame: RuntimeFacts = {
      ...baseFacts,
      runningProcesses: {
        "name:game.exe": {
          target: { match: "name", value: "game.exe" },
          isRunning: true,
          pids: [1234],
        },
      },
    };
    const res2 = engine.evaluate(rules, factsWithGame, "scheme_power_saver");
    expect(res2.schemeId).toBe("scheme_extreme");
    expect(res2.activeRuleIds).toContain("rule_game");
    expect(res2.activeRuleIds).toContain("rule_work_hours");

    // 11:30 - Game exits -> Restores Balanced
    const res3 = engine.evaluate(rules, baseFacts, "scheme_power_saver");
    expect(res3.schemeId).toBe("scheme_balanced");

    // 19:00 - Outside work hours -> Restores baseline (scheme_power_saver)
    const factsEvening: RuntimeFacts = {
      ...baseFacts,
      now: "2026-09-14T19:00:00.000Z",
    };
    const res4 = engine.evaluate(rules, factsEvening, "scheme_power_saver");
    expect(res4.schemeId).toBe("scheme_power_saver");
    expect(res4.activeRuleIds.length).toBe(0);
  });

  test("30.2: Two processes (Game priority 80 vs Discord priority 30)", () => {
    const ruleGame: AutomationRule = {
      id: "rule_game",
      name: "Game Extreme",
      enabled: true,
      priority: 80,
      order: 1,
      exclusive: false,
      when: {
        operator: "any",
        items: [{ type: "processRunning", target: { match: "name", value: "game.exe" } }],
      },
      conditions: { operator: "all", items: [] },
      actions: [{ type: "setPowerScheme", schemeId: "scheme_extreme" }],
      cooldownMs: 0,
      createdAt: "",
      updatedAt: "",
    };

    const ruleDiscord: AutomationRule = {
      id: "rule_discord",
      name: "Discord Balanced",
      enabled: true,
      priority: 30,
      order: 2,
      exclusive: false,
      when: {
        operator: "any",
        items: [{ type: "processRunning", target: { match: "name", value: "discord.exe" } }],
      },
      conditions: { operator: "all", items: [] },
      actions: [{ type: "setPowerScheme", schemeId: "scheme_balanced" }],
      cooldownMs: 0,
      createdAt: "",
      updatedAt: "",
    };

    const rules = [ruleGame, ruleDiscord];

    // Game opens -> Extreme
    const factsGame: RuntimeFacts = {
      ...baseFacts,
      runningProcesses: {
        "name:game.exe": {
          target: { match: "name", value: "game.exe" },
          isRunning: true,
          pids: [100],
        },
      },
    };
    expect(engine.evaluate(rules, factsGame, "scheme_default").schemeId).toBe("scheme_extreme");

    // Discord also opens -> Extreme still wins
    const factsBoth: RuntimeFacts = {
      ...baseFacts,
      runningProcesses: {
        "name:game.exe": {
          target: { match: "name", value: "game.exe" },
          isRunning: true,
          pids: [100],
        },
        "name:discord.exe": {
          target: { match: "name", value: "discord.exe" },
          isRunning: true,
          pids: [200],
        },
      },
    };
    expect(engine.evaluate(rules, factsBoth, "scheme_default").schemeId).toBe("scheme_extreme");

    // Game closes -> Drops to Discord (Balanced)
    const factsDiscordOnly: RuntimeFacts = {
      ...baseFacts,
      runningProcesses: {
        "name:discord.exe": {
          target: { match: "name", value: "discord.exe" },
          isRunning: true,
          pids: [200],
        },
      },
    };
    expect(engine.evaluate(rules, factsDiscordOnly, "scheme_default").schemeId).toBe(
      "scheme_balanced",
    );

    // Discord closes -> Drops to baseline
    expect(engine.evaluate(rules, baseFacts, "scheme_default").schemeId).toBe("scheme_default");
  });

  test("30.3: Manual Override expiration via automationGeneration", () => {
    const ruleGame: AutomationRule = {
      id: "rule_game",
      name: "Game Extreme",
      enabled: true,
      priority: 80,
      order: 1,
      exclusive: false,
      when: {
        operator: "any",
        items: [{ type: "processRunning", target: { match: "name", value: "game.exe" } }],
      },
      conditions: { operator: "all", items: [] },
      actions: [{ type: "setPowerScheme", schemeId: "scheme_extreme" }],
      cooldownMs: 0,
      createdAt: "",
      updatedAt: "",
    };

    const factsGame: RuntimeFacts = {
      ...baseFacts,
      automationGeneration: 5,
      runningProcesses: {
        "name:game.exe": {
          target: { match: "name", value: "game.exe" },
          isRunning: true,
          pids: [100],
        },
      },
    };

    // Game active -> Extreme
    expect(engine.evaluate([ruleGame], factsGame, "scheme_baseline").schemeId).toBe(
      "scheme_extreme",
    );

    // User manually sets Balanced with untilAutomationStateChanges policy
    engine.manualOverride.setOverride("scheme_balanced", "untilAutomationStateChanges", 5);

    // Override wins with priority 1000
    expect(engine.evaluate([ruleGame], factsGame, "scheme_baseline").schemeId).toBe(
      "scheme_balanced",
    );

    // Game exits -> generation increments to 6 -> override automatically expires -> baseline restored
    const factsGameExited: RuntimeFacts = {
      ...baseFacts,
      automationGeneration: 6,
      runningProcesses: {},
    };
    expect(engine.evaluate([ruleGame], factsGameExited, "scheme_baseline").schemeId).toBe(
      "scheme_baseline",
    );
  });

  test("30.4: Battery priority threshold vs Game", () => {
    const ruleBatteryLow: AutomationRule = {
      id: "rule_battery_low",
      name: "Battery Low",
      enabled: true,
      priority: 90,
      order: 1,
      exclusive: false,
      when: {
        operator: "any",
        items: [{ type: "batteryBelow", percentage: 20 }],
      },
      conditions: { operator: "all", items: [] },
      actions: [{ type: "setPowerScheme", schemeId: "scheme_eco" }],
      cooldownMs: 0,
      createdAt: "",
      updatedAt: "",
    };

    const ruleGame: AutomationRule = {
      id: "rule_game",
      name: "Game Extreme",
      enabled: true,
      priority: 80,
      order: 2,
      exclusive: false,
      when: {
        operator: "any",
        items: [{ type: "processRunning", target: { match: "name", value: "game.exe" } }],
      },
      conditions: { operator: "all", items: [] },
      actions: [{ type: "setPowerScheme", schemeId: "scheme_extreme" }],
      cooldownMs: 0,
      createdAt: "",
      updatedAt: "",
    };

    const factsGameLowBat: RuntimeFacts = {
      ...baseFacts,
      powerSource: "battery",
      batteryPercentage: 15,
      runningProcesses: {
        "name:game.exe": {
          target: { match: "name", value: "game.exe" },
          isRunning: true,
          pids: [100],
        },
      },
    };

    // Eco wins by priority 90 vs 80
    const res = engine.evaluate([ruleBatteryLow, ruleGame], factsGameLowBat, "scheme_balanced");
    expect(res.schemeId).toBe("scheme_eco");
  });

  test("Battery Hysteresis prevents flapping", () => {
    const evaluator = new BatteryHysteresisEvaluator();

    // 1. Initial 25% -> Inactive
    expect(evaluator.evaluateBelow("r1", 25, 20, 2)).toBe(false);

    // 2. Drops to 20% -> Activates
    expect(evaluator.evaluateBelow("r1", 20, 20, 2)).toBe(true);

    // 3. Jumps to 21% (within hysteresis 20+2=22) -> Remains active!
    expect(evaluator.evaluateBelow("r1", 21, 20, 2)).toBe(true);

    // 4. Reaches 22% -> Deactivates
    expect(evaluator.evaluateBelow("r1", 22, 20, 2)).toBe(false);
  });

  test("TimeWindow midnight crossover evaluation", () => {
    // Mon 22:00 to Tue 02:00
    const config = { days: [1], start: "22:00", end: "02:00" };

    // Mon 23:30 -> Active
    const monNight = new Date("2026-09-14T23:30:00"); // Mon
    expect(TimeWindowEvaluator.isWindowActive(config, monNight)).toBe(true);

    // Tue 01:30 -> Active (started yesterday Mon)
    const tueEarly = new Date("2026-09-15T01:30:00"); // Tue
    expect(TimeWindowEvaluator.isWindowActive(config, tueEarly)).toBe(true);

    // Tue 02:30 -> Inactive
    const tueLate = new Date("2026-09-15T02:30:00"); // Tue
    expect(TimeWindowEvaluator.isWindowActive(config, tueLate)).toBe(false);
  });

  test("ProcessMatcher path normalization and multi-instance", () => {
    const target = { match: "path" as const, value: "C:\\Program Files\\Game\\Game.exe" };
    const facts: RuntimeFacts = {
      ...baseFacts,
      runningProcesses: {
        "path:c:\\program files\\game\\game.exe": {
          target,
          isRunning: true,
          pids: [1001, 1002],
          matchedPath: "C:/Program Files/Game/Game.exe",
        },
      },
    };

    expect(ProcessMatcher.isTargetRunning(target, facts)).toBe(true);
  });
});
