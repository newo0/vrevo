import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { readFileSync } from "node:fs";
const password = () => readFileSync("storage/test-admin-password", "utf8");
const origin = { Origin: "http://localhost:3100" };
test("public HTML, media and responsive layout on all required widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Врево");
  await expect(page.locator(".hero-address")).toContainText("Звездочка");
  await expect(page.locator(".hero-photo img")).toBeVisible();
  expect(
    await page
      .locator(".hero-photo img")
      .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
  ).toBeTruthy();
  for (const w of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await expect(page.locator(".hero-buttons")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `storage/screenshot-${w}.png`,
      fullPage: w === 390 || w === 1440,
    });
  }
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
      )
      .toBeTruthy();
  }
  await page.locator("#plots").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "storage/plan-desktop.png" });
  await page.locator("#contacts").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "storage/form-desktop.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: "storage/site-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#plots").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "storage/plan-mobile.png" });
  await page.locator("#contacts").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "storage/form-mobile.png" });
  expect(errors).toEqual([]);
});
test("plot permalink, selection, unavailable action and empty filter", async ({
  page,
}) => {
  await page.goto("/?plot=17");
  await expect(page.locator(".plot-card h3")).toHaveText("Участок № 17");
  await page.getByRole("button", { name: "Список", exact: true }).click();
  await page.getByRole("listitem").filter({ hasText: "№ 68" }).click();
  await expect(page.locator(".plot-card h3")).toHaveText("Участок № 68");
  await expect(page.locator(".plot-card .status")).toHaveText("Продан");
  await expect(page.locator(".plot-card")).not.toContainText(
    "Оставить заявку по участку",
  );
  await page
    .getByRole("button", { name: "Посмотреть свободные", exact: true })
    .click();
  await page.getByLabel("Номер", { exact: true }).fill("9999");
  await expect(page.getByText("Нет подходящих участков")).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await expect(page.getByText("Нет подходящих участков")).not.toBeVisible();
});
test("correct plot reaches stored form; demo is honest; API idempotency and sold restrictions", async ({
  page,
  request,
}) => {
  await page.goto("/?plot=18");
  await page
    .locator(".plot-card")
    .getByRole("button", { name: "Оставить заявку по участку" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Участок № 18");
  await dialog.getByLabel("Телефон *").fill("+7 (911) 111-22-33");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Отправить тестовую заявку" })
    .click();
  await expect(dialog).toContainText("письмо менеджеру не отправлялось");
  await page.keyboard.press("Escape");
  const payload = {
    requestKey: crypto.randomUUID(),
    phone: "+79112223344",
    kind: "plot",
    plotId: "plot-19",
    consent: true,
    source: "e2e",
    pageUrl: "http://localhost:3100/",
    website: "",
  };
  const a = await request.post("/api/leads", {
    headers: origin,
    data: payload,
  });
  expect(a.status()).toBe(201);
  expect(
    (
      await request.post("/api/leads", { headers: origin, data: payload })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/leads", {
        headers: origin,
        data: {
          ...payload,
          requestKey: crypto.randomUUID(),
          plotId: "plot-68",
        },
      })
    ).status(),
  ).toBe(409);
  await request.post("/api/login", {
    headers: origin,
    data: { password: password() },
  });
  const leads = await (await request.get("/api/admin/leads")).json();
  expect(
    leads.filter(
      (l: { requestKey: string }) => l.requestKey === payload.requestKey,
    ),
  ).toHaveLength(1);
  expect(
    leads.some((l: { plotId: string }) => l.plotId === "plot-18"),
  ).toBeTruthy();
  const plot = (await (await request.get("/api/plots")).json()).plots.find(
    (p: { id: string }) => p.id === "plot-19",
  );
  expect(plot.status).toBe("available");
});
test("admin blocks anonymous edits and CSRF; status change updates public list and form", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/leads")).status()).toBe(401);
  const values = {
    status: "reserved",
    areaM2: 1200,
    priceRub: 1500000,
    description: "Уточнить доступность",
    cadastralNumber: null,
    electricityKw: 15,
  };
  expect(
    (
      await request.post("/api/admin/plots", {
        headers: origin,
        data: { id: "plot-20", values },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/admin");
  await page.getByLabel("Пароль", { exact: true }).fill(password());
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Управление посёлком" }),
  ).toBeVisible();
  expect(
    (
      await page.request.post("/api/admin/plots", {
        headers: { Origin: "https://evil.example" },
        data: { id: "plot-20", values },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/admin/plots", {
        headers: origin,
        data: { id: "plot-20", values },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/?plot=20");
  await expect(page.locator(".plot-card .status")).toHaveText("Забронирован");
  await expect(page.locator(".plot-card")).toContainText("1 500 000");
  await page
    .locator(".plot-card")
    .getByRole("button", { name: "Уточнить доступность" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Уточнение доступности");
  await page.keyboard.press("Escape");
  await page.goto("/?plot=unknown");
  await expect(page.locator(".plot-card h3")).toContainText("Начните");
});
test("gallery keyboard dialog and protected upload/content persist", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Пароль", { exact: true }).fill(password());
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Управление посёлком" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Тексты и контакты", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Описание поселка", exact: true })
    .fill("Тест редактирования: берег озера и тишина.");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByRole("status")).toContainText("Сохранено");
  await page.reload();
  await page
    .getByRole("button", { name: "Тексты и контакты", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Описание поселка", exact: true }),
  ).toHaveValue("Тест редактирования: берег озера и тишина.");
  await page.goto("/");
  await page
    .getByRole("button", { name: "Открыть фото: Врево — берег и вода" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Открыть фото: Врево — берег и вода" }),
  ).toBeFocused();
});

test("authorized image upload, media metadata and construction post workflow", async ({
  request,
}) => {
  await request.post("/api/login", {
    headers: origin,
    data: { password: password() },
  });
  const upload = await request.post("/api/admin/upload", {
    headers: origin,
    multipart: {
      file: {
        name: "test-photo.png",
        mimeType: "image/png",
        buffer: await sharp({create:{width:4,height:4,channels:3,background:'#dde6d5'}}).png().toBuffer(),
      },
    },
  });
  expect(upload.status()).toBe(200);
  const m = await upload.json();
  expect(m.published).toBe(false);
  expect((await request.get("/media/" + m.file)).status()).toBe(200);
  const values = {
    title: "Тестовое фото",
    category: "Ход строительства",
    author: "Тестовый автор",
    source: "https://example.test/photo",
    license: "Own test",
    licenseUrl: null,
    publicationStatus: "rights_confirmed",
    date: "2026-10-20",
    order: 50,
    published: true,
    visualization: false,
  };
  expect(
    (
      await request.post("/api/admin/media", {
        headers: origin,
        data: { id: m.id, values },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/admin/posts", {
        headers: origin,
        data: {
          values: {
            title: "Тестовая запись работ",
            text: "Только тестовые данные.",
            date: "2026-10-20",
            mediaId: m.id,
            published: true,
          },
        },
      })
    ).status(),
  ).toBe(200);
  const posts = await (await request.get("/api/admin/posts")).json();
  const post = posts.find(
    (p: { title: string }) => p.title === "Тестовая запись работ",
  );
  expect(post).toBeTruthy();
  expect((await request.get("/")).status()).toBe(200);
  expect(
    (
      await request.post("/api/admin/media", {
        headers: origin,
        data: { id: m.id, action: "delete" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/admin/posts", {
        headers: origin,
        data: { id: post.id, action: "delete" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/admin/media", {
        headers: origin,
        data: { id: m.id, action: "delete" },
      })
    ).status(),
  ).toBe(200);
});
