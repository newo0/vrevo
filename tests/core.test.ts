import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";
import { SMTPServer } from "smtp-server";
import geometry from "../data/geometry.json";
import { leadSchema, plotPatch } from "../lib/validation";
process.env.CHECKPOINT_DISABLE = "1";
process.env.DATABASE_URL = "file:./storage/unit-test.db";
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "2526";
process.env.SMTP_SECURE = "false";
process.env.SMTP_FROM = "site@example.test";
const { db } = await import("../lib/db");
const { passwordHash, verifyPassword } = await import("../lib/auth");
const { deliverLead } = await import("../lib/mail");
before(() => {
  mkdirSync("storage", { recursive: true });
  rmSync("storage/unit-test.db", { force: true });
  for (const args of [
    ["prisma", "db", "push", "--skip-generate"],
    ["tsx", "scripts/seed.ts"],
  ]) {
    const r = spawnSync("node_modules/.bin/" + args[0], args.slice(1), {
      env: process.env,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
  }
});
after(async () => {
  await db.$disconnect();
});
test("source geometry uses unique ids and exactly the ten explicit sold labels", async () => {
  assert.equal(
    new Set(geometry.plots.map((p) => p.id)).size,
    geometry.plots.length,
  );
  const sold = await db.plot.findMany({ where: { status: "sold" } });
  assert.deepEqual(
    sold.map((p) => Number(p.number)).sort((a, b) => a - b),
    [68, 69, 70, 71, 72, 99, 100, 101, 102, 103],
  );
  assert.equal(geometry.plots.filter((p) => p.number === "134").length, 2);
  assert.ok(geometry.plots.every((p) => p.points.length >= 3));
  assert.ok(
    (await db.plot.findMany()).every(
      (p) => p.priceRub === null && p.areaM2 === null,
    ),
  );
});
test("strict form and status validation reject unknown states and consent bypass", () => {
  const payload = {
    requestKey: crypto.randomUUID(),
    phone: "8 (911) 123-45-67",
    kind: "viewing",
    consent: true,
    source: "test",
    pageUrl: "http://localhost/",
    website: "",
  };
  assert.equal(leadSchema.parse(payload).phone, "+79111234567");
  assert.equal(
    leadSchema.safeParse({ ...payload, consent: false }).success,
    false,
  );
  assert.equal(
    leadSchema.safeParse({ ...payload, phone: "123" }).success,
    false,
  );
  assert.equal(
    leadSchema.safeParse({ ...payload, website: "spam" }).success,
    false,
  );
  assert.equal(
    plotPatch.safeParse({
      status: "unknown",
      areaM2: null,
      priceRub: null,
      description: null,
      cadastralNumber: null,
      electricityKw: 15,
    }).success,
    false,
  );
});
test("password hash is salted and rejects incorrect passwords", () => {
  const a = passwordHash("a-secure-password-for-test"),
    b = passwordHash("a-secure-password-for-test");
  assert.notEqual(a, b);
  assert.ok(verifyPassword("a-secure-password-for-test", a));
  assert.equal(verifyPassword("wrong", a), false);
});
test("content and plot changes survive an independent database connection and repeat seeding", async () => {
  await db.plot.update({
    where: { id: "plot-17" },
    data: { status: "reserved", priceRub: 1250000, areaM2: 1050 },
  });
  const result = spawnSync("node_modules/.bin/tsx", ["scripts/seed.ts"], {
    env: process.env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
  const second = new PrismaClient({
    adapter: new PrismaLibSQL({ url: process.env.DATABASE_URL! }),
  });
  const p = await second.plot.findUniqueOrThrow({ where: { id: "plot-17" } });
  assert.equal(p.status, "reserved");
  assert.equal(p.priceRub, 1250000);
  await second.$disconnect();
});
test("partial SMTP failure persists the lead, retries only failed recipient", async () => {
  const received: string[] = [];
  let fail = true;
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS"],
    onRcptTo(address, session, cb) {
      void session;
      if (address.address === "two@example.test" && fail) {
        fail = false;
        return cb(new Error("Temporary test rejection"));
      }
      cb();
    },
    onData(stream, session, cb) {
      stream.on("data", () => {});
      stream.on("end", () => {
        received.push(session.envelope.rcptTo[0].address);
        cb();
      });
    },
  });
  await new Promise<void>((resolve) =>
    server.listen(2526, "127.0.0.1", resolve),
  );
  try {
    const l = await db.lead.create({
      data: {
        requestKey: crypto.randomUUID(),
        payloadHash: "test",
        phone: "+79110000000",
        kind: "viewing",
        source: "unit test",
        pageUrl: "http://localhost/",
        utm: "{}",
        demo: false,
        deliveries: {
          create: [
            { recipient: "one@example.test" },
            { recipient: "two@example.test" },
          ],
        },
      },
    });
    await deliverLead(l.id);
    let d = await db.delivery.findMany({
      where: { leadId: l.id },
      orderBy: { recipient: "asc" },
    });
    assert.deepEqual(
      d.map((x) => x.status),
      ["sent", "failed"],
    );
    assert.equal(await db.lead.count({ where: { id: l.id } }), 1);
    await deliverLead(l.id);
    d = await db.delivery.findMany({
      where: { leadId: l.id },
      orderBy: { recipient: "asc" },
    });
    assert.deepEqual(
      d.map((x) => x.status),
      ["sent", "sent"],
    );
    assert.deepEqual(
      d.map((x) => x.attempts),
      [1, 2],
    );
    assert.deepEqual(received, ["one@example.test", "two@example.test"]);
  } finally {
    await new Promise<void>((resolve) => server.close(resolve));
  }
});
