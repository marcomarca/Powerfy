import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import type {
  AutomationAction,
  BatteryState,
  ProcessMatchState,
  ProcessTarget,
  RuntimeFacts,
  Trigger,
} from "@power-manager/contracts";
import { ProcessMatcher, RuleEngine } from "@power-manager/rule-engine";
import { Notification } from "electron";
import { logger } from "../logging/Logger";
import type { NativeHostClient } from "../native-host/NativeHostClient";
import type { SettingsStore } from "../settings/SettingsStore";
import type { FixedBrightnessManager } from "./FixedBrightnessManager";

export class SchedulerCoordinator extends EventEmitter {
  private settingsStore: SettingsStore;
  private nativeClient: NativeHostClient;
  private fixedBrightness: FixedBrightnessManager;
  private ruleEngine = new RuleEngine();
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  private activeRuleIds: string[] = [];

  private facts: RuntimeFacts = {
    now: new Date().toISOString(),
    powerSource: "ac",
    batteryPercentage: null,
    activeSchemeId: null,
    runningProcesses: {},
    displayState: "on",
    lidState: "open",
    sessionGeneration: 1,
    automationGeneration: 1,
  };

  constructor(
    settingsStore: SettingsStore,
    nativeClient: NativeHostClient,
    fixedBrightness: FixedBrightnessManager,
  ) {
    super();
    this.settingsStore = settingsStore;
    this.nativeClient = nativeClient;
    this.fixedBrightness = fixedBrightness;
  }

  public init(): void {
    this.bindNativeEvents();
    this.settingsStore.on("settingsChanged", () => {
      this.syncWatchTargets();
      this.evaluate();
    });
  }

  public getFacts(): RuntimeFacts {
    return { ...this.facts };
  }

  public getActiveRuleIds(): string[] {
    return [...this.activeRuleIds];
  }

  public async initialSync(): Promise<void> {
    try {
      const active = await this.nativeClient.getActiveScheme();
      const battery = await this.nativeClient.getBatteryState();

      this.facts.activeSchemeId = active?.id || null;
      this.facts.powerSource = battery.isOnAc ? "ac" : "battery";
      this.facts.batteryPercentage = battery.percentage;

      // Ensure settings has baselineSchemeId initialized if null
      const settings = this.settingsStore.getSettings();
      if (!settings.baselineSchemeId && this.facts.activeSchemeId) {
        this.settingsStore.updateSettings({ baselineSchemeId: this.facts.activeSchemeId });
      }

      await this.syncWatchTargets();
      const matchStates = await this.nativeClient.reconcileProcesses();
      this.facts.runningProcesses = matchStates;

      this.evaluate({ type: "appStarted" });
    } catch (err: any) {
      logger.error(`Scheduler initialSync error: ${err.message}`);
    }
  }

  public async setManualScheme(schemeId: string): Promise<void> {
    const settings = this.settingsStore.getSettings();

    // 1. If scheduler is enabled and policy is active, register manual override lease
    if (settings.schedulerEnabled) {
      this.ruleEngine.manualOverride.setOverride(
        schemeId,
        settings.manualOverridePolicy,
        this.facts.automationGeneration,
      );
    }

    // 2. If no persistent rules apply or policy is disabled, update baseline
    this.settingsStore.updateSettings({ baselineSchemeId: schemeId });

    // 3. Apply scheme natively
    try {
      await this.nativeClient.setActiveScheme(schemeId);
      this.facts.activeSchemeId = schemeId;
      this.fixedBrightness.triggerCheck();
      this.evaluate();
    } catch (err: any) {
      logger.error(`Manual scheme change failed: ${err.message}`);
      throw err;
    }
  }

  public evaluate(edgeEvent?: Trigger): void {
    const settings = this.settingsStore.getSettings();
    this.facts.now = new Date().toISOString();

    if (!settings.schedulerEnabled) {
      this.clearBoundaryTimer();
      this.activeRuleIds = [];
      return;
    }

    const baseline = settings.baselineSchemeId || this.facts.activeSchemeId || "";
    const result = this.ruleEngine.evaluate(settings.rules, this.facts, baseline, edgeEvent);

    this.activeRuleIds = result.activeRuleIds;
    if (result.generationChanged) {
      this.facts.automationGeneration++;
      logger.info(
        `Automation generation incremented to ${this.facts.automationGeneration} (Active rules: [${result.activeRuleIds.join(", ")}])`,
      );
    }

    // Apply desired power scheme if changed
    if (result.schemeId && result.schemeId !== this.facts.activeSchemeId) {
      logger.info(
        `Scheduler: Activating desired power scheme ${result.schemeId} (previously ${this.facts.activeSchemeId})`,
      );
      this.nativeClient
        .setActiveScheme(result.schemeId)
        .then(() => {
          this.facts.activeSchemeId = result.schemeId;
          this.emit("schemeChanged", result.schemeId);
          this.fixedBrightness.triggerCheck();
        })
        .catch((err) => {
          logger.error(`Scheduler setActiveScheme error: ${err.message}`);
        });
    }

    // Execute actions
    for (const action of result.executedActions) {
      this.executeAction(action);
    }

    // Schedule next boundary timer
    this.scheduleNextBoundary(result.nextBoundaryTimeMs);
  }

  private executeAction(action: AutomationAction): void {
    switch (action.type) {
      case "setPowerScheme":
        if (action.schemeId !== this.facts.activeSchemeId) {
          this.nativeClient
            .setActiveScheme(action.schemeId)
            .then(() => {
              this.facts.activeSchemeId = action.schemeId;
              this.emit("schemeChanged", action.schemeId);
              this.fixedBrightness.triggerCheck();
            })
            .catch((err) => logger.error(`Action setPowerScheme error: ${err.message}`));
        }
        break;

      case "setBrightness":
        this.nativeClient
          .setBrightness(action.value, action.displayId)
          .catch((err) => logger.error(`Action setBrightness error: ${err.message}`));
        break;

      case "turnOffDisplay":
        this.emit("turnOffDisplay");
        break;

      case "showOsd":
        this.emit("showOsd", action.message, action.schemeId);
        break;

      case "showNotification":
        try {
          if (Notification.isSupported()) {
            new Notification({ title: action.title, body: action.body }).show();
          }
        } catch (err: any) {
          logger.error(`Action showNotification error: ${err.message}`);
        }
        break;

      case "launchProgram":
        if (action.executablePath) {
          try {
            spawn(action.executablePath, action.arguments || [], {
              detached: true,
              stdio: "ignore",
              shell: false,
            }).unref();
            logger.info(`Action launchProgram: spawned ${action.executablePath}`);
          } catch (err: any) {
            logger.error(`Action launchProgram error: ${err.message}`);
          }
        }
        break;
    }
  }

  private scheduleNextBoundary(nextBoundaryMs: number | null): void {
    this.clearBoundaryTimer();

    if (!nextBoundaryMs) return;

    const delay = Math.max(1000, nextBoundaryMs - Date.now() + 200); // 200ms buffer past boundary
    this.boundaryTimer = setTimeout(() => {
      logger.debug("Scheduler boundary timer triggered re-evaluation.");
      this.evaluate();
    }, delay);
  }

  private clearBoundaryTimer(): void {
    if (this.boundaryTimer) {
      clearTimeout(this.boundaryTimer);
      this.boundaryTimer = null;
    }
  }

  private async syncWatchTargets(): Promise<void> {
    const settings = this.settingsStore.getSettings();
    const targets: ProcessTarget[] = [];
    const seen = new Set<string>();

    for (const rule of settings.rules) {
      for (const trigger of rule.when.items) {
        if (
          trigger.type === "processRunning" ||
          trigger.type === "processStarted" ||
          trigger.type === "processStopped"
        ) {
          const key = ProcessMatcher.targetToKey(trigger.target);
          if (!seen.has(key)) {
            seen.add(key);
            targets.push(trigger.target);
          }
        }
      }
      for (const cond of rule.conditions.items) {
        if (cond.type === "processRunning") {
          const key = ProcessMatcher.targetToKey(cond.target);
          if (!seen.has(key)) {
            seen.add(key);
            targets.push(cond.target);
          }
        }
      }
    }

    try {
      await this.nativeClient.setWatchTargets(targets);
    } catch (err: any) {
      logger.error(`syncWatchTargets error: ${err.message}`);
    }
  }

  private bindNativeEvents(): void {
    this.nativeClient.on("power.activeSchemeChanged", (data: { schemeId: string }) => {
      this.facts.activeSchemeId = data.schemeId;
      this.emit("schemeChanged", data.schemeId);
      this.fixedBrightness.triggerCheck();
      this.evaluate({ type: "schemeChanged", toSchemeId: data.schemeId });
    });

    this.nativeClient.on("power.sourceChanged", (data: { isOnAc: boolean }) => {
      this.facts.powerSource = data.isOnAc ? "ac" : "battery";
      this.emit("powerSourceChanged", data.isOnAc);
      this.fixedBrightness.triggerCheck();
      this.evaluate({ type: "acChanged", toAc: data.isOnAc });
    });

    this.nativeClient.on("battery.changed", (battery: BatteryState) => {
      this.facts.batteryPercentage = battery.percentage;
      this.facts.powerSource = battery.isOnAc ? "ac" : "battery";
      this.emit("batteryChanged", battery);
      this.evaluate();
    });

    this.nativeClient.on(
      "process.runningStateChanged",
      (states: Record<string, ProcessMatchState>) => {
        this.facts.runningProcesses = states;
        this.emit("processesChanged", states);
        this.evaluate();
      },
    );

    this.nativeClient.on("process.started", (data: { pid: number; path: string; name: string }) => {
      this.evaluate({
        type: "processStarted",
        target: { match: "path", value: data.path || data.name },
      });
    });

    this.nativeClient.on(
      "process.stopped",
      (data: { pid: number; path?: string; name?: string }) => {
        this.evaluate({
          type: "processStopped",
          target: { match: "path", value: data.path || data.name || "" },
        });
      },
    );

    this.nativeClient.on("system.suspend", () => {
      this.evaluate({ type: "suspend" });
    });

    this.nativeClient.on("system.resume", () => {
      this.facts.sessionGeneration++;
      this.nativeClient.reconcileProcesses().catch(() => {});
      this.fixedBrightness.triggerCheck();
      this.evaluate({ type: "resume" });
    });

    this.nativeClient.on(
      "display.stateChanged",
      (data: { state: "on" | "dimmed" | "off" | "unknown" }) => {
        this.facts.displayState = data.state;
        if (data.state !== "unknown") {
          this.evaluate({ type: "displayChanged", toState: data.state });
        }
      },
    );

    this.nativeClient.on("lid.stateChanged", (data: { state: "open" | "closed" | "unknown" }) => {
      this.facts.lidState = data.state;
      if (data.state !== "unknown") {
        this.evaluate({ type: "lidChanged", toState: data.state });
      }
    });
  }

  public destroy(): void {
    this.clearBoundaryTimer();
  }
}
