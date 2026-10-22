import { db } from "../lib/db";
import { passwordHash } from "../lib/auth";
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 14) {
  console.error(
    "Set ADMIN_PASSWORD (at least 14 characters) through a secure environment variable.",
  );
  process.exit(1);
}
await db.admin.upsert({
  where: { id: "admin" },
  update: { passwordHash: passwordHash(password), bootstrap: false },
  create: {
    id: "admin",
    passwordHash: passwordHash(password),
    bootstrap: false,
  },
});
await db.session.deleteMany();
console.log("Administrator created/updated; sessions revoked.");
await db.$disconnect();
