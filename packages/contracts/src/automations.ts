export type ProcessMatchMode = "path" | "name";

export interface ProcessTarget {
  match: ProcessMatchMode;
  value: string;
}

export interface ProcessMatchState {
  target: ProcessTarget;
  isRunning: boolean;
  pids: number[];
  matchedPath?: string;
}

export type StatefulTriggerType =
  | "processRunning"
  | "timeWindow"
  | "acConnected"
  | "onBattery"
  | "batteryBelow"
  | "batteryAbove"
  | "activeSchemeIs"
  | "lidClosed"
  | "displayOff";

export type EdgeTriggerType =
  | "processStarted"
  | "processStopped"
  | "atTime"
  | "schemeChanged"
  | "suspend"
  | "resume"
  | "appStarted"
  | "acChanged"
  | "batteryThresholdCrossed"
  | "lidChanged"
  | "displayChanged";

export type TriggerType = StatefulTriggerType | EdgeTriggerType;

export type Trigger =
  | { type: "processRunning"; target: ProcessTarget }
  | { type: "timeWindow"; days: number[]; start: string; end: string }
  | { type: "acConnected" }
  | { type: "onBattery" }
  | { type: "batteryBelow"; percentage: number; hysteresis?: number }
  | { type: "batteryAbove"; percentage: number; hysteresis?: number }
  | { type: "activeSchemeIs"; schemeId: string }
  | { type: "lidClosed" }
  | { type: "displayOff" }
  | { type: "processStarted"; target: ProcessTarget }
  | { type: "processStopped"; target: ProcessTarget }
  | { type: "atTime"; time: string; days?: number[] }
  | { type: "schemeChanged"; fromSchemeId?: string; toSchemeId?: string }
  | { type: "suspend" }
  | { type: "resume" }
  | { type: "appStarted" }
  | { type: "acChanged"; toAc: boolean }
  | { type: "batteryThresholdCrossed"; percentage: number; direction: "above" | "below" }
  | { type: "lidChanged"; toState: "open" | "closed" }
  | { type: "displayChanged"; toState: "on" | "off" | "dimmed" };

export interface TriggerGroup {
  operator: "any";
  items: Trigger[];
}

export type Condition =
  | { type: "powerSource"; isAc: boolean }
  | { type: "batteryPercentage"; operator: "gte" | "lte" | "gt" | "lt"; value: number }
  | { type: "activeScheme"; schemeId: string }
  | { type: "processRunning"; target: ProcessTarget }
  | { type: "timeWindow"; days: number[]; start: string; end: string };

export interface ConditionGroup {
  operator: "all";
  items: Condition[];
}

export type AutomationAction =
  | { type: "setPowerScheme"; schemeId: string }
  | { type: "setBrightness"; value: number; displayId?: string }
  | { type: "turnOffDisplay" }
  | { type: "showOsd"; message?: string; schemeId?: string }
  | { type: "showNotification"; title: string; body: string }
  | { type: "launchProgram"; executablePath: string; arguments?: string[] };

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number; // 0..100
  order: number; // Stable tie-breaker
  exclusive: boolean; // Ignore lower priority rules when active
  when: TriggerGroup;
  conditions: ConditionGroup;
  actions: AutomationAction[];
  cooldownMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeFacts {
  now: string; // ISO string
  powerSource: "ac" | "battery" | "unknown";
  batteryPercentage: number | null;
  activeSchemeId: string | null;
  runningProcesses: Record<string, ProcessMatchState>;
  displayState: "on" | "dimmed" | "off" | "unknown";
  lidState: "open" | "closed" | "unknown";
  sessionGeneration: number;
  automationGeneration: number;
}

export interface PowerSchemeLease {
  sourceId: string; // Rule ID or override ID
  schemeId: string;
  priority: number;
  order: number;
  activatedAt: number;
  exclusive: boolean;
}

export interface BrightnessLease {
  sourceId: string;
  displayId?: string;
  value: number;
  priority: number;
  order: number;
  activatedAt: number;
}

export interface DesiredState {
  schemeId: string;
  brightness?: { displayId?: string; value: number };
  activeLeases: PowerSchemeLease[];
  executedActions: AutomationAction[];
}
