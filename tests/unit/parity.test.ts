// The TypeScript port against the desk scripts it replaced, run side by side
// on the shipped assets. The two legacy files are copied verbatim into
// tests/fixtures/legacy so the comparison outlives the desk side.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { unzipSync } from "three/addons/libs/fflate.module.js";
import { describe, expect, it } from "vitest";
import { applyHingeToUsda, normalizeRecipe, recolorUsdaText, repackageUsdz } from "../../src/export/usdz.ts";
import { MODELS } from "../../src/model/catalog.ts";
import { assetUrlFor } from "../../src/model/models.ts";
import { defaultRecipe, exportRecipe, shuffleParts } from "../../src/model/recipe.ts";
import { clampProgress, easeProgress, neoEaseProgress, neoTransform } from "../../src/motion/hinge.ts";

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

interface LegacyMotion {
  clampProgress(value: unknown, fallback?: number): number;
  easeProgress(value: number): number;
  neoEaseProgress(value: number): number;
  neoTransform(value: number): unknown;
}

interface LegacyExport {
  normalizeRecipe(input: unknown): unknown;
  recolorUsdaText(source: string, recipe: unknown): { text: string; stats: unknown };
  applyHingeToUsda(text: string, recipe: unknown): string;
}

function loadLegacy(): { motion: LegacyMotion; usdz: LegacyExport } {
  const window: Record<string, unknown> = {};
  const context = { window, TextDecoder, TextEncoder, Blob, console };
  runInNewContext(readFileSync(here("../fixtures/legacy/cmf-motion.js"), "utf8"), context);
  runInNewContext(readFileSync(here("../fixtures/legacy/cmf-usdz-export.js"), "utf8"), context);
  return {
    motion: window.AISystem6CMFMotion as LegacyMotion,
    usdz: window.AISystem6CMFUsdzExport as LegacyExport,
  };
}

const legacy = loadLegacy();

/** A small deterministic generator, so a failing case can be replayed. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function rootLayer(assetPath: string): { source: string; buffer: ArrayBuffer } {
  const bytes = readFileSync(here(`../../public/${assetPath}`));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const entries = unzipSync(new Uint8Array(buffer));
  const name = Object.keys(entries).find((entry) => /\.usda$/i.test(entry));
  const layer = name ? entries[name] : undefined;
  if (!layer) throw new Error(`${assetPath} has no text layer`);
  return { source: new TextDecoder().decode(layer), buffer };
}

describe("hinge motion matches the desk", () => {
  const samples = Array.from({ length: 41 }, (_, i) => i / 40);
  it("clamps, eases and places the lid the same way", () => {
    for (const value of [...samples, -1, 2, Number.NaN, "0.4", null, undefined]) {
      expect(clampProgress(value)).toBe(legacy.motion.clampProgress(value));
      expect(clampProgress(value, 0.5)).toBe(legacy.motion.clampProgress(value, 0.5));
    }
    for (const value of samples) {
      expect(easeProgress(value)).toBeCloseTo(legacy.motion.easeProgress(value), 12);
      expect(neoEaseProgress(value)).toBeCloseTo(legacy.motion.neoEaseProgress(value), 12);
      expect(JSON.parse(JSON.stringify(neoTransform(value)))).toEqual(
        JSON.parse(JSON.stringify(legacy.motion.neoTransform(value))),
      );
    }
  });
});

describe("USDZ recolouring matches the desk", () => {
  const usdModels = MODELS.filter((model) => model.renderer !== "lotus");
  for (const spec of usdModels) {
    // A folding device has one asset whatever its pose; the fold is the variable.
    const poses = spec.poses && !spec.motion ? spec.poses.map((pose) => pose.id) : [undefined];
    for (const pose of poses) {
      it(`${spec.id}${pose ? ` (${pose})` : ""}: same text, same stats`, () => {
        const base = defaultRecipe(spec.id, pose);
        const { source } = rootLayer(assetUrlFor(spec, pose ?? "closed"));
        const random = seeded(spec.id.length * 97 + (pose?.length ?? 0));
        const recipes = [
          base,
          ...[0, 1, 2].map(() => ({ ...base, parts: shuffleParts(spec, base.parts, random) })),
          ...(spec.motion === "neo" ? [0, 0.37, 1].map((fold) => ({ ...base, fold })) : []),
        ];
        for (const recipe of recipes) {
          const input = exportRecipe(spec, recipe);
          const ours = normalizeRecipe(input);
          expect(JSON.parse(JSON.stringify(ours))).toEqual(
            JSON.parse(JSON.stringify(legacy.usdz.normalizeRecipe(input))),
          );
          const mine = recolorUsdaText(source, ours);
          const theirs = legacy.usdz.recolorUsdaText(source, legacy.usdz.normalizeRecipe(input));
          expect(mine.stats).toEqual(theirs.stats);
          expect(mine.text === theirs.text).toBe(true);
          expect(applyHingeToUsda(mine.text, ours) === legacy.usdz.applyHingeToUsda(theirs.text, ours)).toBe(true);
        }
        // Whole-asset text passes on a few MB each; a loaded machine needs the room.
      }, 120_000);
    }
  }

  it("stores the archive uncompressed, as Apple's USD runtime requires", () => {
    const spec = MODELS.find((model) => model.id === "iphone-17e");
    if (!spec) throw new Error("catalogue changed");
    const { buffer } = rootLayer(assetUrlFor(spec, "closed"));
    const { bytes } = repackageUsdz(buffer, exportRecipe(spec, defaultRecipe(spec.id)));
    // Local file header: compression method at offset 8, 0 = stored.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(8, true)).toBe(0);
  });
});
