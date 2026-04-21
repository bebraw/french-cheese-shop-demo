import { spawn } from "node:child_process";
import { resolve } from "node:path";

const wranglerPath = resolve("node_modules/.bin/wrangler");

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

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
