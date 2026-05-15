"use strict";

const { spawn } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const nodeBin = process.execPath;
const children = [];
let shuttingDown = false;
const imgbedPort = process.env.IMG_BED_PORT || "3001";
const imgbedBaseUrl = process.env.IMG_BED_BASE_URL || `http://127.0.0.1:${imgbedPort}`;

const launch = (label, script, extraEnv = {}) => {
  const child = spawn(nodeBin, [path.join(rootDir, script)], {
    cwd: rootDir,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: "inherit",
    windowsHide: true,
  });

  children.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const other of children) {
      if (other !== child && !other.killed) {
        other.kill(signal || "SIGTERM");
      }
    }
    process.exit(code ?? (signal ? 1 : 0));
  });

  child.on("error", (error) => {
    console.error(`[${label}] ${error.message}`);
  });

  return child;
};

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

launch("imgbed", "imgbed-server.js", {
  IMG_BED_PORT: imgbedPort,
});

launch("server", "server.js", {
  IMG_BED_BASE_URL: imgbedBaseUrl,
});
