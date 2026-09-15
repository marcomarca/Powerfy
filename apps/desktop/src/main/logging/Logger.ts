import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export class Logger {
  private logDir: string;
  private logFile: string;
  private maxSizeBytes = 5 * 1024 * 1024; // 5MB
  private maxFiles = 3;

  constructor() {
    this.logDir = path.join(app?.getPath("userData") || process.cwd(), "logs");
    this.logFile = path.join(this.logDir, "app.log");
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch {
        // Ignore
      }
    }
  }

  public getLogFolder(): string {
    return this.logDir;
  }

  public log(level: "INFO" | "WARN" | "ERROR" | "DEBUG", message: string, meta?: unknown): void {
    const timestamp = new Date().toISOString();
    let metaStr = "";
    if (meta !== undefined) {
      try {
        metaStr = ` ${typeof meta === "object" ? JSON.stringify(meta) : String(meta)}`;
      } catch {
        metaStr = " [Unserializable meta]";
      }
    }

    const line = `[${timestamp}] [${level}] ${message}${metaStr}\n`;

    // Always output to console
    if (level === "ERROR") {
      console.error(line.trim());
    } else if (level === "WARN") {
      console.warn(line.trim());
    } else {
      console.log(line.trim());
    }

    this.appendToFile(line);
  }

  public info(message: string, meta?: unknown): void {
    this.log("INFO", message, meta);
  }

  public warn(message: string, meta?: unknown): void {
    this.log("WARN", message, meta);
  }

  public error(message: string, meta?: unknown): void {
    this.log("ERROR", message, meta);
  }

  public debug(message: string, meta?: unknown): void {
    this.log("DEBUG", message, meta);
  }

  private appendToFile(line: string): void {
    try {
      this.ensureDir();
      this.checkRotate();
      fs.appendFileSync(this.logFile, line, "utf8");
    } catch {
      // Avoid throwing in logger
    }
  }

  private checkRotate(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size >= this.maxSizeBytes) {
          for (let i = this.maxFiles - 1; i >= 1; i--) {
            const oldPath = path.join(this.logDir, `app.${i}.log`);
            const newPath = path.join(this.logDir, `app.${i + 1}.log`);
            if (fs.existsSync(oldPath)) {
              fs.renameSync(oldPath, newPath);
            }
          }
          fs.renameSync(this.logFile, path.join(this.logDir, "app.1.log"));
        }
      }
    } catch {
      // Ignore rotation error
    }
  }
}

export const logger = new Logger();
