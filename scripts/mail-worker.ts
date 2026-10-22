import { db } from "../lib/db";
import { deliverLead } from "../lib/mail";
let running = false;
async function tick() {
  if (running || process.env.SITE_MODE !== "public") return;
  running = true;
  try {
    const leads = await db.lead.findMany({
      where: {
        demo: false,
        deliveries: {
          some: { status: { in: ["pending", "failed"] }, attempts: { lt: 5 } },
        },
      },
      take: 30,
    });
    for (const l of leads) await deliverLead(l.id, 5);
  } catch {
    console.error("Mail queue unavailable; retry on next tick.");
  } finally {
    running = false;
  }
}
await tick();
const timer = setInterval(() => void tick(), 60000);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    clearInterval(timer);
    await db.$disconnect();
    process.exit(0);
  });
