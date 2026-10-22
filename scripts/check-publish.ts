import { publicationIssues } from "../lib/site";
import { db } from "../lib/db";
const issues = await publicationIssues();
console.log(
  issues.length
    ? issues.join("\n")
    : "Publication checks passed. Verify backups, SMTP delivery and legal approval separately.",
);
await db.$disconnect();
if (issues.length) process.exitCode = 1;
