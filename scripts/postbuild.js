import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = 3099;
const serverPath = path.resolve("dist/server/index.mjs");

if (!fs.existsSync(serverPath)) {
  console.error("Server build artifact not found at", serverPath);
  process.exit(1);
}

// 1. Copy files from dist/public to dist root so static hosts find them at /
const publicDir = path.resolve("dist/public");
const distDir = path.resolve("dist");

if (fs.existsSync(publicDir)) {
  for (const item of fs.readdirSync(publicDir)) {
    const src = path.join(publicDir, item);
    const dest = path.join(distDir, item);
    fs.cpSync(src, dest, { recursive: true });
  }
}

// 2. Start server briefly to render index.html shell
const server = spawn("node", [serverPath], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});

function cleanup() {
  try {
    server.kill("SIGTERM");
  } catch {}
}

process.on("exit", cleanup);
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

let attempts = 0;
const maxAttempts = 20;

function tryFetch() {
  attempts++;
  http
    .get(`http://127.0.0.1:${PORT}/`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (data && data.length > 0) {
          fs.writeFileSync(path.join(distDir, "index.html"), data, "utf-8");
          if (fs.existsSync(publicDir)) {
            fs.writeFileSync(path.join(publicDir, "index.html"), data, "utf-8");
          }
          console.log(`[postbuild] Generated dist/index.html (${data.length} bytes)`);
        }
        cleanup();
        process.exit(0);
      });
    })
    .on("error", () => {
      if (attempts < maxAttempts) {
        setTimeout(tryFetch, 100);
      } else {
        console.warn("[postbuild] Could not reach ephemeral SSR server to generate index.html");
        cleanup();
        process.exit(0);
      }
    });
}

setTimeout(tryFetch, 200);
