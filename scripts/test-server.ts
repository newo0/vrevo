import { spawnSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
process.env.CHECKPOINT_DISABLE = "1";
process.env.DATABASE_URL = "file:./storage/e2e-test.db";
process.env.SITE_MODE = "demo";
process.env.SITE_URL = "http://localhost:3100";
process.env.ALLOW_INSECURE_LOCAL_COOKIE = "1";
process.env.ADMIN_PASSWORD = randomBytes(24).toString("hex");
mkdirSync("storage", { recursive: true });
rmSync("storage/e2e-test.db", { force: true });
writeFileSync("storage/test-admin-password", process.env.ADMIN_PASSWORD, {
  mode: 0o600,
});
for (const [bin, ...args] of [
  ["prisma", "db", "push", "--skip-generate"],
  ["tsx", "scripts/seed.ts"],
  ["tsx", "scripts/create-admin.ts"],
]) {
  const r = spawnSync("node_modules/.bin/" + bin, args, {
    env: process.env,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const child = spawn(
  "node_modules/.bin/next",
  ["start", "--hostname", "0.0.0.0", "--port", "3100"],
  { env: process.env, stdio: "inherit" },
);
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => process.exit(code ?? 0));
