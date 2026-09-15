const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function findDotnet() {
  const candidates = [
    "dotnet",
    process.env.DOTNET_ROOT ? path.join(process.env.DOTNET_ROOT, "dotnet.exe") : null,
    process.env.DOTNET_ROOT ? path.join(process.env.DOTNET_ROOT, "dotnet") : null,
    "C:\\Users\\Rescate\\.dotnet\\dotnet.exe",
    "C:\\Program Files\\dotnet\\dotnet.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const res = spawnSync(candidate, ["--version"], { stdio: "ignore" });
      if (res.status === 0) {
        return candidate;
      }
    } catch {
      // Continue
    }
  }
  return "dotnet";
}

const dotnet = findDotnet();
const slnPath = path.resolve(__dirname, "../PowerManager.slnx");

console.log(`[test-native] Using dotnet: ${dotnet}`);
const args = ["test", slnPath];

const result = spawnSync(dotnet, args, { stdio: "inherit" });
if (result.status !== 0) {
  process.exit(result.status || 1);
}
