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
const projectPath = path.resolve(__dirname, "../native/PowerManager.NativeHost/PowerManager.NativeHost.csproj");
const outputDir = path.resolve(__dirname, "../apps/desktop/resources/native");

console.log(`[build-native] Using dotnet: ${dotnet}`);
const args = [
  "publish",
  projectPath,
  "-c",
  "Release",
  "-r",
  "win-x64",
  "--self-contained",
  "true",
  "/p:PublishSingleFile=true",
  "-o",
  outputDir,
];

const result = spawnSync(dotnet, args, { stdio: "inherit" });
if (result.status !== 0) {
  process.exit(result.status || 1);
}
