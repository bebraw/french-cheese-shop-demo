import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const devVarsPath = resolve(".dev.vars");
const wranglerPath = resolve("node_modules/.bin/wrangler");
const previousDevVars = existsSync(devVarsPath) ? readFileSync(devVarsPath, "utf8") : null;

writeFileSync(
  devVarsPath,
  [
    "SUPERVISOR_SEARCH_BASIC_AUTH_USERNAME=test-user",
    "SUPERVISOR_SEARCH_BASIC_AUTH_PASSWORD=test-pass",
    "SUPERVISOR_SEARCH_USE_SAMPLE_DATA=true",
  ].join("\n"),
  "utf8",
);

const child = spawn(
  wranglerPath,
  [
    "dev",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    "8788",
    "--inspector-ip",
    "127.0.0.1",
    "--inspector-port",
    "9230",
    "--log-level",
    "error",
    "--show-interactive-dev-session=false",
  ],
  {
    env: {
      ...process.env,
      HOME: process.cwd(),
      CHOKIDAR_USEPOLLING: "1",
      CHOKIDAR_INTERVAL: "200",
    },
    stdio: "inherit",
  },
);

let cleanedUp = false;

function cleanup() {
  if (cleanedUp) {
    return;
  }

  cleanedUp = true;

  if (previousDevVars === null) {
    if (existsSync(devVarsPath)) {
      unlinkSync(devVarsPath);
    }
    return;
  }

  writeFileSync(devVarsPath, previousDevVars, "utf8");
}

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

child.on("exit", (code, signal) => {
  cleanup();

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
