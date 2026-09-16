import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const viteBin = path.join(projectDir, "node_modules", "vite", "bin", "vite.js");
const startingPort = Number.parseInt(process.env.BACKEND_PORT || "3001", 10);

if (!Number.isInteger(startingPort) || startingPort < 1 || startingPort > 65535) {
  throw new Error("BACKEND_PORT must be a valid TCP port.");
}

const isPortAvailable = (port) =>
  new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
      } else {
        reject(error);
      }
    });
    probe.listen(port, () => {
      probe.close(() => resolve(true));
    });
  });

const findAvailablePort = async (firstPort) => {
  for (let port = firstPort; port <= 65535; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available backend port found at or above ${firstPort}.`);
};

const backendPort = await findAvailablePort(startingPort);
const developmentEnv = {
  ...process.env,
  PORT: String(backendPort),
  BACKEND_PORT: String(backendPort),
};

if (backendPort !== startingPort) {
  console.log(`Backend port ${startingPort} is unavailable; using ${backendPort}.`);
}

const server = spawn(process.execPath, ["index.js"], {
  cwd: projectDir,
  env: developmentEnv,
  stdio: "inherit",
});
const vite = spawn(process.execPath, [viteBin], {
  cwd: projectDir,
  env: developmentEnv,
  stdio: "inherit",
});

const children = [server, vite];
let stopping = false;

const stopChild = (child, signal) => {
  if (child.exitCode !== null || child.killed) return;

  if (process.platform === "win32") {
    const taskkill = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    taskkill.unref();
  } else {
    child.kill(signal);
  }
};

const stop = (signal) => {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => stopChild(child, signal));
};

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

children.forEach((child) => {
  child.on("exit", (code) => {
    if (!stopping) {
      stop("SIGTERM");
      process.exitCode = code ?? 1;
    }
  });
});
