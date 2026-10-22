import { db } from "../lib/db";
import { deliverLead } from "../lib/mail";
// "sending" after a crash requires manual SMTP verification before resetting; avoids automatic duplicate mail.
for (const lead of await db.lead.findMany({
  where: {
    demo: false,
    deliveries: { some: { status: { in: ["pending", "failed"] } } },
  },
}))
  await deliverLead(lead.id);
console.log("Pending and failed recipients processed.");
await db.$disconnect();
