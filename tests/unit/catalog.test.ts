// What the catalogue promises about each device: its own official finishes,
// the parts it really has, and the assets and views it ships with.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MODELS } from "../../src/model/catalog.ts";
import { assetUrlFor, isCameraView, modelSpec, viewsFor } from "../../src/model/models.ts";

const spec = (id: string) => {
  const found = MODELS.find((model) => model.id === id);
  if (!found) throw new Error(`${id} is not registered`);
  return found;
};
const finishes = (id: string) => spec(id).colors.map((color) => color.id);
const parts = (id: string) => spec(id).parts.map((part) => part.id);

describe("each device offers only its own official finishes", () => {
  it.each([
    ["iphone-17-standard", ["black17", "lavender17", "mistBlue17", "sage17", "white17"], "17"],
    ["iphone-17-pro", ["cosmicOrange17Pro", "deepBlue17Pro", "silver17Pro"], "17Pro"],
    ["iphone-air", ["spaceBlackAir", "cloudWhiteAir", "lightGoldAir", "skyBlueAir"], "Air"],
    ["iphone-17e", ["black17e", "white17e", "softPink17e"], "17e"],
    ["macbook-neo", ["silverNeo", "blushNeo", "citrusNeo", "indigoNeo"], "Neo"],
  ])("%s", (id, expected, suffix) => {
    expect(finishes(id)).toEqual(expect.arrayContaining(expected));
    // A finish from another device would end in that device's suffix.
    for (const finish of finishes(id)) expect(finish.endsWith(suffix)).toBe(true);
  });
});

describe("parts", () => {
  it("the iPhone 17 covers every serviceable exterior part", () => {
    expect(parts("iphone-17-standard")).toEqual(
      expect.arrayContaining([
        "volumeUp",
        "volumeDown",
        "actionButton",
        "cameraControl",
        "sideButton",
        "simTray",
        "usbC",
      ]),
    );
  });

  it("no phone offers a separately coloured camera area or lens rings", () => {
    for (const model of MODELS.filter((entry) => entry.id.startsWith("iphone"))) {
      expect(model.parts.map((part) => part.labelKey)).not.toContain("cmf_part_camera_plate");
      expect(model.parts.map((part) => part.labelKey)).not.toContain("cmf_part_camera_rings");
      for (const preset of Object.values(model.presets)) expect(preset).not.toHaveProperty("cameraPlate");
    }
  });

  it("the eSIM Pro and Air have no SIM tray; the 17e has neither a SIM tray nor Camera Control", () => {
    expect(parts("iphone-17-pro")).not.toContain("simTray");
    expect(parts("iphone-air")).not.toContain("simTray");
    expect(parts("iphone-17e")).not.toContain("simTray");
    expect(parts("iphone-17e")).not.toContain("cameraControl");
  });

  it("the MacBook Neo is split into Apple's self-service parts, trackpad included", () => {
    expect(parts("macbook-neo")).toEqual(["lid", "topCase", "bottomCase", "keycaps", "trackpad", "usbC"]);
  });

  it("the Duo has its own parts, hinge and camera plateau included", () => {
    expect(parts("iphone-duo")).toEqual(["frame", "hinge", "backGlass", "cameraPlateau", "sideButton"]);
  });
});

describe("assets and views", () => {
  const publicFile = (path: string) => fileURLToPath(new URL(`../../public/${path}`, import.meta.url));

  it("every device and pose names an asset that ships in the package", () => {
    for (const model of MODELS) {
      for (const pose of model.poses?.map((entry) => entry.id) ?? ["closed"]) {
        expect(existsSync(publicFile(assetUrlFor(model, pose)))).toBe(true);
      }
    }
  });

  it("the Pro Max is a size of the Pro, and the old Pro Max id still opens the Pro", () => {
    expect(spec("iphone-17-pro").poses?.find((pose) => pose.id === "pro-max")?.asset).toBe(
      "assets/iphone-17-pro-max.usdz",
    );
    expect(modelSpec("iphone-17-pro-max").id).toBe("iphone-17-pro");
  });

  it("the MacBook ships closed and open assets and drives its own motion view", () => {
    const neo = spec("macbook-neo");
    expect(neo.poses?.find((pose) => pose.id === "closed")?.asset).toBe("assets/macbook-neo-closed.usdz");
    expect(neo.poses?.find((pose) => pose.id === "open")?.asset).toBe("assets/macbook-neo-open.usdz");
    expect(viewsFor(neo, "open")[0]?.name).toBe("motion");
  });

  it("the Duo is the scene viewer with named angles; the 18 Pro is a three.js model turned to face forward", () => {
    const duo = spec("iphone-duo");
    expect(duo.renderer).toBe("lotus");
    expect(viewsFor(duo, "half").map((view) => view.name)).toEqual(["front", "back", "left", "right"]);
    const pro18 = spec("iphone-18-pro");
    expect(pro18.renderer).toBeUndefined();
    expect(pro18.spin).toBe(Math.PI);
  });

  it("every three.js device's views are camera views with a usable frame", () => {
    for (const model of MODELS.filter((entry) => entry.renderer !== "lotus")) {
      for (const view of viewsFor(model, model.poses?.[0]?.id ?? "closed")) {
        expect(isCameraView(view)).toBe(true);
        if (isCameraView(view)) expect(view.frame).toBeGreaterThan(0);
      }
    }
  });
});
