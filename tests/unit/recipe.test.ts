// Recipes: what a device opens with, what survives a switch, and what is
// refused. Expected values are the desk window's behaviour for the same input.

import { describe, expect, it } from "vitest";
import { dataUrlToPngBlob, foldVideoFileName, viewFileName } from "../../src/export/files.ts";
import { MODELS } from "../../src/model/catalog.ts";
import { defaultViewFor, modelSpec } from "../../src/model/models.ts";
import {
  defaultRecipe,
  EMPTY_STORE,
  exportRecipe,
  forget,
  matchingPresetId,
  readStore,
  recipeInPose,
  restoreRecipe,
  saveIn,
  serviceRecipe,
  shuffleParts,
  usdzFileName,
} from "../../src/model/recipe.ts";

const random = (() => {
  let state = 7;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
})();

describe("stored recipes", () => {
  it("each model keeps its own recipe", () => {
    const air = {
      ...defaultRecipe("iphone-air"),
      parts: { ...defaultRecipe("iphone-air").parts, frame: "skyBlueAir" },
    };
    const store = saveIn(saveIn(EMPTY_STORE, air), defaultRecipe("iphone-17e"));
    expect(store.activeModel).toBe("iphone-17e");
    expect(restoreRecipe(store, "iphone-air").parts.frame).toBe("skyBlueAir");
  });

  it("a finish from another device's palette is dropped, not carried across", () => {
    const store = readStore({ activeModel: "iphone-air", recipes: { "iphone-air": { parts: { frame: "sage17" } } } });
    expect(restoreRecipe(store).parts.frame).toBe(defaultRecipe("iphone-air").parts.frame);
  });

  it("a saved pose the device does not have falls back to its first pose", () => {
    const store = readStore({ recipes: { "iphone-17-pro": { parts: {}, pose: "open" } } });
    expect(restoreRecipe(store, "iphone-17-pro").pose).toBe("pro");
  });

  it("a recipe saved by the single-model version is read into its model's slot", () => {
    const store = readStore({ model: "iphone-17-standard", parts: { frame: "sage17" } });
    expect(restoreRecipe(store).parts.frame).toBe("sage17");
  });

  it("the old Pro Max model opens as the Pro in its Pro Max size", () => {
    const store = readStore({
      activeModel: "iphone-17-pro-max",
      recipes: { "iphone-17-pro-max": { parts: { frame: "deepBlue17Pro" } } },
    });
    const recipe = restoreRecipe(store);
    expect([recipe.model, recipe.pose, recipe.parts.frame]).toEqual(["iphone-17-pro", "pro-max", "deepBlue17Pro"]);
  });

  it("anything else stored reads as an empty store", () => {
    for (const raw of [null, "x", 3, [], { recipes: "no" }]) expect(readStore(raw)).toEqual(EMPTY_STORE);
  });

  it("a folding device keeps its fold, clamped, with its pose's fold as the fallback", () => {
    const neo = readStore({ recipes: { "macbook-neo": { parts: {}, pose: "open", fold: 4 } } });
    expect(restoreRecipe(neo, "macbook-neo").fold).toBe(1);
    const duo = readStore({ recipes: { "iphone-duo": { parts: {}, pose: "half" } } });
    expect(restoreRecipe(duo, "iphone-duo").fold).toBeCloseTo(1 / 3);
  });

  it("reset forgets only the current model", () => {
    const store = forget(
      saveIn(saveIn(EMPTY_STORE, defaultRecipe("iphone-air")), defaultRecipe("iphone-17e")),
      "iphone-17e",
    );
    expect(Object.keys(store.recipes)).toEqual(["iphone-air"]);
  });

  it("a new pose keeps the colours that still apply", () => {
    const pro = defaultRecipe("iphone-17-pro");
    const store = saveIn(EMPTY_STORE, { ...pro, parts: { ...pro.parts, frame: "deepBlue17Pro" } });
    const next = recipeInPose(store, "iphone-17-pro", "pro-max");
    expect([next.pose, next.parts.frame]).toEqual(["pro-max", "deepBlue17Pro"]);
  });
});

describe("shuffle and presets", () => {
  it("uses every colour of the palette before repeating one", () => {
    for (const spec of MODELS) {
      const colors = shuffleParts(spec, defaultRecipe(spec.id).parts, random);
      const firstRound = spec.parts.slice(0, spec.colors.length).map((part) => colors[part.id]);
      expect(new Set(firstRound).size).toBe(firstRound.length);
      for (const part of spec.parts) expect(spec.colors.map((color) => color.id)).toContain(colors[part.id]);
    }
  });

  it("a recipe matches the preset whose every part it wears, or none", () => {
    for (const spec of MODELS) {
      const [first] = Object.keys(spec.presets);
      expect(matchingPresetId(spec, defaultRecipe(spec.id).parts)).toBe(first);
    }
    const spec = modelSpec("iphone-17-standard");
    expect(matchingPresetId(spec, {})).toBe("");
  });
});

describe("views", () => {
  it("the default view is the first of the active set, or the device's own default", () => {
    expect(defaultViewFor(modelSpec("iphone-duo"), "half")).toBe("front");
    expect(defaultViewFor(modelSpec("macbook-neo"), "open")).toBe("motion");
    expect(defaultViewFor(modelSpec("iphone-17-standard"), "closed")).toBe("01-front");
  });
});

describe("exports", () => {
  it("names files the way the desk did", () => {
    expect(usdzFileName("my-cmf.usdz")).toBe("my-cmf.usdz");
    expect(usdzFileName("  ")).toBe("cmf-studio.usdz");
    expect(usdzFileName("")).toBe("iphone-17-standard-cmf.usdz");
    expect(viewFileName("", "iphone-air", "02-back")).toBe("iphone-air-02-back.png");
    expect(viewFileName("mine", "iphone-air", "02-back")).toBe("mine-02-back.png");
    expect(foldVideoFileName("mine")).toBe("mine-fold.webm");
  });

  it("the server sees the Pro and the Pro Max as two models", () => {
    const pro = defaultRecipe("iphone-17-pro", "pro-max");
    expect(serviceRecipe(pro)).toMatchObject({ model: "iphone-17-pro-max" });
    expect(serviceRecipe(pro)).not.toHaveProperty("pose");
    expect(serviceRecipe(defaultRecipe("iphone-air")).model).toBe("iphone-air");
  });

  it("the browser exporter gets the palette, exact mesh map and the hinge only for the MacBook", () => {
    const neo = exportRecipe(modelSpec("macbook-neo"), { ...defaultRecipe("macbook-neo"), fold: 0.25 });
    expect([neo.exactOnly, neo.fold]).toEqual([true, 0.25]);
    const air = exportRecipe(modelSpec("iphone-air"), defaultRecipe("iphone-air"));
    expect(air.exactOnly).toBe(false);
    expect(air).not.toHaveProperty("fold");
    expect(air.colors.length).toBe(modelSpec("iphone-air").colors.length);
  });

  it("a canvas data URL becomes PNG bytes", async () => {
    const blob = dataUrlToPngBlob("data:image/png;base64,iVBORw0KGgo=");
    expect(blob.type).toBe("image/png");
    expect([...new Uint8Array(await blob.arrayBuffer())].slice(0, 4)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
