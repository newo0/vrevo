import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { db } from "../lib/db";
import { passwordHash } from "../lib/auth";
if (!(await db.admin.count())) {
  if (process.env.SITE_MODE === "public")
    throw new Error(
      "Create a permanent account with admin:create before public launch.",
    );
  const password = randomBytes(24).toString("base64url");
  await mkdir("storage", { recursive: true });
  await writeFile("storage/local-admin-password", password + "\n", {
    mode: 0o600,
    flag: "wx",
  });
  await db.admin.create({
    data: {
      id: "admin",
      passwordHash: passwordHash(password),
      bootstrap: true,
    },
  });
  console.log(
    "Local demo administrator created. Password is in ignored storage/local-admin-password (mode 600). Rotate with admin:create before public launch.",
  );
} else console.log("Existing administrator preserved.");
await db.$disconnect();
