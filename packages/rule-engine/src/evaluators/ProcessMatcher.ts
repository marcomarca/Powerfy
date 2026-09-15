import type { ProcessTarget, RuntimeFacts } from "@power-manager/contracts";

export class ProcessMatcher {
  public static normalizePath(p: string): string {
    return p.replace(/\//g, "\\").toLowerCase().trim();
  }

  public static targetToKey(target: ProcessTarget): string {
    return `${target.match}:${this.normalizePath(target.value)}`;
  }

  public static isTargetRunning(target: ProcessTarget, facts: RuntimeFacts): boolean {
    const key = this.targetToKey(target);
    const state = facts.runningProcesses[key];
    if (state?.isRunning && state.pids.length > 0) {
      return true;
    }

    // Direct search fallback in runningProcesses
    const targetVal = this.normalizePath(target.value);
    for (const pState of Object.values(facts.runningProcesses)) {
      if (!pState.isRunning || pState.pids.length === 0) continue;

      if (target.match === "path") {
        if (pState.matchedPath && this.normalizePath(pState.matchedPath) === targetVal) {
          return true;
        }
        if (
          pState.target.match === "path" &&
          this.normalizePath(pState.target.value) === targetVal
        ) {
          return true;
        }
      } else if (target.match === "name") {
        const nameVal = targetVal.endsWith(".exe") ? targetVal : `${targetVal}.exe`;
        if (pState.target.match === "name" && this.normalizePath(pState.target.value) === nameVal) {
          return true;
        }
        if (pState.matchedPath) {
          const exeName = this.normalizePath(pState.matchedPath.split("\\").pop() ?? "");
          if (exeName === nameVal) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
