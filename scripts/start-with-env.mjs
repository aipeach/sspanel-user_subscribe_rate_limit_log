import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function applyEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) {
      continue;
    }

    const match = raw.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2] ?? "";

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const cwd = process.cwd();
applyEnvFile(path.join(cwd, ".env"));

const passthroughArgs = process.argv.slice(2);
const hasPortArg = passthroughArgs.some((arg) => arg === "-p" || arg === "--port" || arg.startsWith("--port="));

const nextArgs = ["node_modules/next/dist/bin/next", "start", ...passthroughArgs];
if (!hasPortArg && process.env.PORT) {
  nextArgs.push("-p", process.env.PORT);
}

const child = spawn(process.execPath, nextArgs, {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("启动失败:", error);
  process.exit(1);
});
