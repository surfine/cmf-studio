// The built page, served by `vite preview`: on its own (the kit's standalone
// adapter) and inside a stand-in desk that speaks the bridge.

import { expect, type FrameLocator, type Locator, type Page, test } from "@playwright/test";
import { openInHost } from "./host.ts";
import { picture } from "./picture.ts";

// Software WebGL on a busy machine: a device takes seconds to parse and paint.
test.setTimeout(240_000);
const LOAD = { timeout: 120_000 };

type Root = Page | FrameLocator;

const status = (root: Root): Locator => root.locator("[data-cmf-status]");
const canvas = (root: Root): Locator => root.locator(".cmf-preview-stage canvas");
const stage = (root: Root): Locator => root.locator(".cmf-preview-stage");

async function modelShown(root: Root): Promise<void> {
  await expect(status(root)).toHaveText(/Model updated|Live material updated/, LOAD);
  await expect(canvas(root)).toBeVisible();
}

async function chooseModel(root: Root, id: string): Promise<void> {
  await root.locator("[data-cmf-model]").selectOption(id);
}

/** Waits until the stage stops changing (the camera's move has settled). */
async function settled(page: Page, target: Locator): Promise<string> {
  let previous = "";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { hash } = await picture(page, target);
    if (hash === previous) return hash;
    previous = hash;
    await page.waitForTimeout(400);
  }
  return previous;
}

test.describe("on its own page", () => {
  test("loads without a console error and paints a real model", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./?lang=en");
    await modelShown(page);
    const shot = await picture(page, canvas(page));
    expect(shot.colours, "the canvas is not a flat fill").toBeGreaterThan(40);
    expect(errors).toEqual([]);
  });

  test("every device, view and finish changes the picture", async ({ page }) => {
    await page.goto("./?lang=en");
    await modelShown(page);
    let last = await settled(page, stage(page));

    for (const id of ["iphone-17-pro", "iphone-air", "iphone-17e", "iphone-18-pro", "macbook-neo"]) {
      await chooseModel(page, id);
      await expect(status(page)).toHaveText(/Model updated/, LOAD);
      const now = await settled(page, stage(page));
      expect(now, `${id} draws a different picture`).not.toBe(last);
      // A switch never keeps a view name the new device does not have.
      await expect(page.locator('[data-cmf-view][aria-pressed="true"]')).toHaveCount(1);
      last = now;
    }

    await chooseModel(page, "iphone-17-standard");
    await expect(status(page)).toHaveText(/Model updated/, LOAD);
    last = await settled(page, stage(page));
    const views = page.locator("[data-cmf-view]");
    const count = await views.count();
    expect(count).toBeGreaterThan(3);
    for (let index = 1; index < Math.min(count, 4); index += 1) {
      await views.nth(index).click();
      await expect(views.nth(index)).toHaveAttribute("aria-pressed", "true");
      const now = await settled(page, stage(page));
      expect(now, "a named view moves the camera").not.toBe(last);
      last = now;
    }

    await page.locator("[data-cmf-view]").first().click();
    last = await settled(page, stage(page));
    const unselected = page.locator("[data-cmf-color]:not(.is-selected)").first();
    const chip = page.locator(`[data-cmf-color="${await unselected.getAttribute("data-cmf-color")}"]`);
    await chip.click();
    await expect(status(page)).toHaveText(/Live material updated/);
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(await settled(page, stage(page)), "a finish repaints the model").not.toBe(last);
  });

  test("a device that fails to load leaves the last working model on screen", async ({ page }) => {
    await page.goto("./?lang=en");
    await modelShown(page);
    await expect(page.locator("[data-cmf-pose]")).toHaveCount(0);
    const before = await settled(page, stage(page));
    await page.route("**/iphone-air.usdz", (route) =>
      route.request().method() === "HEAD" ? route.continue() : route.fulfill({ status: 500, body: "" }),
    );
    await chooseModel(page, "iphone-air");
    await expect(status(page)).toHaveText(/Model update failed/, LOAD);
    await expect(canvas(page)).toBeVisible();
    expect(await settled(page, stage(page))).toBe(before);
  });

  test("on a phone the toolbar uses its short labels", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./?lang=en");
    for (const id of ["reset-view", "export", "export-views"]) {
      await expect(page.locator(`[data-cmf-${id}] .mobile-control-short`)).toBeVisible();
      await expect(page.locator(`[data-cmf-${id}] .mobile-control-long`)).toBeHidden();
    }
  });

  test("the MacBook's lid opens and closes", async ({ page }) => {
    await page.goto("./?lang=en");
    await modelShown(page);
    await chooseModel(page, "macbook-neo");
    await expect(status(page)).toHaveText(/Model updated/, LOAD);
    const fold = page.locator("#cmf-fold");
    const before = await settled(page, stage(page));
    const start = Number(await fold.inputValue());
    await page.locator(".cmf-motion-play").click();
    await expect.poll(async () => Number(await fold.inputValue()), { timeout: 30_000 }).not.toBe(start);
    await expect(page.locator(".cmf-motion-play")).toHaveText("Play", { timeout: 30_000 });
    expect(await settled(page, stage(page)), "the lid moved").not.toBe(before);
    await page.locator("[data-cmf-pose]").selectOption("half");
    await expect(page.locator(".cmf-motion-controls output")).toHaveText("50%", { timeout: 30_000 });
  });

  test("the Duo opens in its own scene viewer and folds", async ({ page }) => {
    await page.goto("./?lang=en");
    await modelShown(page);
    await chooseModel(page, "iphone-duo");
    await expect(status(page)).toHaveText(/Drag the device to turn it/, LOAD);
    await expect(canvas(page)).toBeHidden();
    const viewer = page.locator(".cmf-duo-frame");
    await expect(viewer).toBeVisible();
    // The scene viewer is its own document; its picture is the frame's.
    const before = await settled(page, viewer);
    await page.locator("[data-cmf-pose]").selectOption("open");
    await expect(page.locator(".cmf-motion-controls output")).toHaveText("100%", { timeout: 30_000 });
    expect(await settled(page, viewer), "the Duo unfolded").not.toBe(before);
    await expect(page.locator("[data-cmf-export]")).toBeDisabled();
    // The fold video is the other thing Play produces: it sits on Play's row.
    await expect(page.locator(".cmf-motion-controls .cmf-duo-video")).toBeEnabled();
  });

  test("with no model asset and no server, nothing that needs a model is offered", async ({ page }) => {
    await page.route("**/*.usdz", (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto("./?lang=en");
    await expect(page.locator("[data-cmf-capabilities]")).toHaveText("Interactive model and export unavailable", LOAD);
    await expect(page.locator(".cmf-preview-empty")).toHaveText("This environment cannot build the USDZ model.");
    await expect(page.locator("[data-cmf-export]")).toBeDisabled();
    await expect(page.locator("[data-cmf-export-views]")).toBeDisabled();
    await expect(page.locator("[data-cmf-reset-view]")).toBeDisabled();
  });
});

test.describe("inside a desk", () => {
  test("menu commands run, and the View menu marks the current view", async ({ page }) => {
    await openInHost(page, { serverCanExport: false });
    const app = page.frameLocator("#app");
    await modelShown(app);
    const menu = () => page.evaluate(() => (window as unknown as { __host: { menu: unknown } }).__host.menu);
    // A visit opens on the back view, as the desk window did.
    await expect.poll(menu).toMatchObject({ checked: { "cmf-view-front": false, "cmf-view-back": true } });

    const run = (action: string) =>
      page.evaluate(
        (name) =>
          (
            window as unknown as {
              __host: { endpoint: { call(m: string, p: object): Promise<{ handled: boolean }> } };
            }
          ).__host.endpoint.call("menu.command", { action: name }),
        action,
      );
    expect(await run("cmf-view-front")).toEqual({ handled: true });
    await expect(app.locator('[data-cmf-view="01-front"]')).toHaveAttribute("aria-pressed", "true");
    await expect.poll(menu).toMatchObject({ checked: { "cmf-view-front": true, "cmf-view-back": false } });

    const finishes = () => app.locator(".cmf-part-current span:last-child").allTextContents();
    const before = (await finishes()).join();
    let shuffled = before;
    for (let tries = 0; tries < 5 && shuffled === before; tries += 1) {
      expect(await run("cmf-shuffle")).toEqual({ handled: true });
      shuffled = (await finishes()).join();
    }
    expect(shuffled, "Shuffle repaints the parts").not.toBe(before);
    expect(await run("cmf-reset")).toEqual({ handled: true });
    await expect(status(app)).toHaveText("CMF recipe reset.");
    expect(await run("some-other-window-action")).toEqual({ handled: false });

    // Dragging the model leaves every named view: the menus then mark none.
    const box = await canvas(app).boundingBox();
    if (!box) throw new Error("canvas has no box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 30, { steps: 8 });
    await page.mouse.up();
    await expect(app.locator('[data-cmf-view][aria-pressed="true"]')).toHaveCount(0);
    await expect.poll(menu).toMatchObject({ checked: { "cmf-view-front": false, "cmf-view-back": false } });
  });

  test("suspend stops drawing and resume repaints", async ({ page }) => {
    await openInHost(page, { serverCanExport: false });
    const app = page.frameLocator("#app");
    await modelShown(app);
    const call = (method: string) =>
      page.evaluate(
        (name) =>
          (
            window as unknown as { __host: { endpoint: { call(m: string, p: object): Promise<unknown> } } }
          ).__host.endpoint.call(name, {}),
        method,
      );
    await call("lifecycle.suspend");
    // While suspended the frame schedules no animation frames of its own.
    const frames = await page.frames()[1]?.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let count = 0;
          const original = window.requestAnimationFrame.bind(window);
          window.requestAnimationFrame = (callback) => {
            count += 1;
            return original(callback);
          };
          setTimeout(() => {
            window.requestAnimationFrame = original;
            resolve(count);
          }, 1500);
        }),
    );
    expect(frames).toBe(0);
    await call("lifecycle.resume");
    await expect(canvas(app)).toBeVisible();
    expect((await picture(page, canvas(app))).colours).toBeGreaterThan(40);
  });

  test("Export Views hands the desk one PNG per view", async ({ page }) => {
    await openInHost(page, { serverCanExport: false });
    const app = page.frameLocator("#app");
    await modelShown(app);
    const views = await app.locator("[data-cmf-view]").count();
    await app.locator("[data-cmf-export-views]").click();
    await expect(status(app)).toHaveText("Views exported.", LOAD);
    const files = await page.evaluate(
      () => (window as unknown as { __host: { files: { name: string; mime: string; size: number }[] } }).__host.files,
    );
    expect(files).toHaveLength(views);
    for (const file of files) {
      expect(file.mime).toBe("image/png");
      expect(file.name).toMatch(/^iphone-17-standard-cmf-studio-.+\.png$/);
      // A black silhouette compresses to almost nothing; a lit device does not.
      expect(file.size).toBeGreaterThan(20_000);
    }
  });

  test("export goes to the desk as a file, and is offered as the capability says", async ({ page }) => {
    await openInHost(page, { serverCanExport: false });
    const app = page.frameLocator("#app");
    await modelShown(app);
    await expect(app.locator("[data-cmf-export]")).toBeEnabled();
    await app.locator("[data-cmf-export]").click();
    await expect(status(app)).toHaveText("USDZ exported.", LOAD);
    const files = await page.evaluate(
      () => (window as unknown as { __host: { files: { name: string; mime: string; size: number }[] } }).__host.files,
    );
    expect(files).toEqual([
      expect.objectContaining({ name: "iphone-17-standard-cmf-studio.usdz", mime: "model/vnd.usdz+zip" }),
    ]);
    expect(files[0]?.size).toBeGreaterThan(1_000_000);
  });

  test("without the model asset, a desk that can export on its server still offers export", async ({ page }) => {
    await page.route("**/*.usdz", (route) => route.fulfill({ status: 404, body: "" }));
    await openInHost(page, { serverCanExport: true });
    const app = page.frameLocator("#app");
    await expect(app.locator("[data-cmf-capabilities]")).toHaveText("Interactive model and export unavailable", LOAD);
    await expect(app.locator("[data-cmf-export]")).toBeEnabled();
    await expect(app.locator("[data-cmf-export-views]")).toBeDisabled();
  });
});
