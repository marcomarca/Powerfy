import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type {
  BatteryState,
  BrightnessDisplay,
  NativeEvent,
  NativeRequest,
  NativeResponse,
  PowerScheme,
  ProcessMatchState,
  ProcessTarget,
  SystemCapabilities,
} from "@power-manager/contracts";
import { logger } from "../logging/Logger";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class NativeHostClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private restartAttempts = 0;
  private maxRestarts = 3;
  private isShuttingDown = false;
  private status: "connected" | "connecting" | "unavailable" | "degraded" = "connecting";

  constructor() {
    super();
  }

  public getStatus(): "connected" | "connecting" | "unavailable" | "degraded" {
    return this.status;
  }

  public async start(): Promise<boolean> {
    if (this.isShuttingDown) return false;
    this.status = "connecting";
    this.emit("statusChanged", this.status);

    const hostPath = this.resolveHostExecutable();
    logger.info(`Starting NativeHost from: ${hostPath.command} ${hostPath.args.join(" ")}`);

    try {
      this.process = spawn(hostPath.command, hostPath.args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: {
          ...process.env,
          DOTNET_ROOT: "C:\\Users\\Rescate\\.dotnet",
          PATH: `C:\\Users\\Rescate\\.dotnet;${process.env.PATH || ""}`,
        },
      });

      if (!this.process.stdout || !this.process.stdin || !this.process.stderr) {
        throw new Error("Failed to open standard IO streams for NativeHost process.");
      }

      const rl = readline.createInterface({
        input: this.process.stdout,
        terminal: false,
      });

      rl.on("line", (line) => this.handleStdoutLine(line));

      this.process.stderr.on("data", (data) => {
        const text = data.toString().trim();
        if (text) {
          logger.info(`[NativeHost] ${text}`);
        }
      });

      this.process.on("exit", (code, signal) => {
        logger.warn(`NativeHost exited with code=${code}, signal=${signal}`);
        this.cleanupProcess();
        if (!this.isShuttingDown) {
          this.handleUnexpectedExit();
        }
      });

      this.process.on("error", (err) => {
        logger.error(`NativeHost process error: ${err.message}`);
      });

      // Perform handshake
      const helloResult = await this.sendRequest<{ protocolVersion: number; hostVersion: string }>(
        "system.hello",
        { protocolVersion: 1 },
      );

      logger.info(
        `NativeHost connected: protocolVersion=${helloResult.protocolVersion}, hostVersion=${helloResult.hostVersion}`,
      );

      this.status = "connected";
      this.restartAttempts = 0;
      this.emit("statusChanged", this.status);
      return true;
    } catch (err: any) {
      logger.error(`Failed to start/handshake NativeHost: ${err.message}`);
      this.cleanupProcess();
      this.handleUnexpectedExit();
      return false;
    }
  }

  private resolveHostExecutable(): { command: string; args: string[] } {
    let appPath = process.cwd();
    try {
      // Dynamic require electron app to avoid hard crash in unit tests
      const { app } = require("electron");
      if (app && typeof app.getAppPath === "function") {
        appPath = app.getAppPath();
      }
    } catch {
      // Fallback to process.cwd()
    }

    // 1. Packaged extraResources (installed app)
    if (process.resourcesPath) {
      const packagedExe = path.join(process.resourcesPath, "native", "PowerManager.NativeHost.exe");
      if (fs.existsSync(packagedExe)) {
        return { command: packagedExe, args: [] };
      }
    }

    // 2. Local published binary in apps/desktop/resources/native/
    const localPublishedExe = path.join(
      appPath,
      "resources",
      "native",
      "PowerManager.NativeHost.exe",
    );
    if (fs.existsSync(localPublishedExe)) {
      return { command: localPublishedExe, args: [] };
    }

    // 3. Bin/Release or Bin/Debug build in native/PowerManager.NativeHost/bin/
    const releaseExe = path.resolve(
      appPath,
      "../../native/PowerManager.NativeHost/bin/Release/net10.0-windows10.0.22621.0/win-x64/PowerManager.NativeHost.exe",
    );
    if (fs.existsSync(releaseExe)) {
      return { command: releaseExe, args: [] };
    }

    const debugExe = path.resolve(
      appPath,
      "../../native/PowerManager.NativeHost/bin/Debug/net10.0-windows10.0.22621.0/win-x64/PowerManager.NativeHost.exe",
    );
    if (fs.existsSync(debugExe)) {
      return { command: debugExe, args: [] };
    }

    // 4. Fallback dotnet run on csproj
    const csprojPath = path.resolve(
      appPath,
      "../../native/PowerManager.NativeHost/PowerManager.NativeHost.csproj",
    );
    return {
      command: "dotnet",
      args: ["run", "--project", csprojPath, "--no-build"],
    };
  }

  private handleStdoutLine(line: string): void {
    if (!line.trim()) return;

    try {
      const msg = JSON.parse(line) as NativeResponse | NativeEvent;
      if (msg.type === "response") {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(msg.id);
          if (msg.ok) {
            pending.resolve(msg.result);
          } else {
            pending.reject(new Error(`[${msg.error.code}] ${msg.error.message}`));
          }
        }
      } else if (msg.type === "event") {
        this.emit("event", msg.event, msg.data);
        this.emit(msg.event, msg.data);
        if (msg.event === "brightness.changed") {
          this.emit("brightnessChanged", msg.data);
        }
      }
    } catch (err: any) {
      logger.error(`Failed to parse NDJSON line from NativeHost: ${line} - ${err.message}`);
    }
  }

  public sendRequest<T = unknown>(method: string, params?: unknown, timeoutMs = 3000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin || this.status === "unavailable") {
        return reject(new Error("NativeHost is not connected."));
      }

      const id = String(++this.requestCounter);
      const req: NativeRequest = {
        type: "request",
        id,
        method,
        params,
      };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        logger.warn(`NativeHost request timeout for method='${method}', id=${id}`);
        reject(new Error(`Request timeout for method='${method}'`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        this.process.stdin.write(`${JSON.stringify(req)}\n`, "utf8");
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  private handleUnexpectedExit(): void {
    if (this.isShuttingDown) return;

    // Fail all pending requests
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timer);
      req.reject(new Error("NativeHost process terminated."));
    }
    this.pendingRequests.clear();

    if (this.restartAttempts < this.maxRestarts) {
      this.restartAttempts++;
      const delays = [500, 1500, 5000];
      const delay = delays[this.restartAttempts - 1] ?? 5000;
      logger.warn(
        `Restarting NativeHost (attempt ${this.restartAttempts}/${this.maxRestarts}) in ${delay}ms...`,
      );

      this.status = "connecting";
      this.emit("statusChanged", this.status);

      setTimeout(() => {
        this.start().then((ok) => {
          if (ok) {
            this.emit("reconnected");
          }
        });
      }, delay);
    } else {
      logger.error("NativeHost exceeded maximum restart attempts. Entering degraded mode.");
      this.status = "degraded";
      this.emit("statusChanged", this.status);
    }
  }

  private cleanupProcess(): void {
    if (this.process) {
      try {
        this.process.removeAllListeners();
        this.process.kill();
      } catch {
        // Ignore
      }
      this.process = null;
    }
  }

  public stop(): void {
    this.isShuttingDown = true;
    this.cleanupProcess();
    this.status = "unavailable";
    this.emit("statusChanged", this.status);
  }

  // High-level RPC methods
  public getCapabilities(): Promise<SystemCapabilities> {
    return this.sendRequest<SystemCapabilities>("system.getCapabilities");
  }

  public listSchemes(): Promise<PowerScheme[]> {
    return this.sendRequest<PowerScheme[]>("power.listSchemes");
  }

  public getActiveScheme(): Promise<PowerScheme | null> {
    return this.sendRequest<PowerScheme | null>("power.getActiveScheme");
  }

  public setActiveScheme(schemeId: string): Promise<{ success: boolean; schemeId: string }> {
    return this.sendRequest<{ success: boolean; schemeId: string }>("power.setActiveScheme", {
      schemeId,
    });
  }

  public getBatteryState(): Promise<BatteryState> {
    return this.sendRequest<BatteryState>("battery.getState");
  }

  public listDisplays(): Promise<BrightnessDisplay[]> {
    return this.sendRequest<BrightnessDisplay[]>("brightness.listDisplays");
  }

  public getBrightness(displayId?: string): Promise<{ displayId: string; value: number }> {
    return this.sendRequest<{ displayId: string; value: number }>("brightness.get", { displayId });
  }

  public setBrightness(
    value: number,
    displayId?: string,
  ): Promise<{ displayId: string; value: number }> {
    return this.sendRequest<{ displayId: string; value: number }>("brightness.set", {
      value,
      displayId,
    });
  }

  public turnOffDisplay(): Promise<{ success: boolean; status?: string; message?: string }> {
    return this.sendRequest<{ success: boolean; status?: string; message?: string }>(
      "display.turnOff",
      undefined,
      15000,
    );
  }

  public cancelDisplayOff(): Promise<{ success: boolean }> {
    return this.sendRequest<{ success: boolean }>("display.cancelOff");
  }

  public getDisplayOffState(): Promise<{ isActive: boolean; state: string }> {
    return this.sendRequest<{ isActive: boolean; state: string }>("display.getOffState");
  }

  public setWatchTargets(targets: ProcessTarget[]): Promise<{ targetsCount: number }> {
    return this.sendRequest<{ targetsCount: number }>("process.setWatchTargets", { targets });
  }

  public reconcileProcesses(): Promise<Record<string, ProcessMatchState>> {
    return this.sendRequest<Record<string, ProcessMatchState>>("process.reconcile");
  }

  public ping(): Promise<{ pong: number }> {
    return this.sendRequest<{ pong: number }>("diagnostics.ping");
  }
}
