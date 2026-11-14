import type { Plugin } from "vite";
import { applySourcePatches, usdComposerPatches } from "./usd-composer-patches.ts";

const usdComposerFile = /[\\/]three[\\/]examples[\\/]jsm[\\/]loaders[\\/]usd[\\/]USDComposer\.js$/;

/**
 * Patches three's USD composer wherever it is loaded; a missing needle fails.
 * A production build also fails when the composer was never bundled at all,
 * since its patches then did not run.
 */
export function usdComposerPatchesPlugin(options: { requireBundled: boolean }): Plugin {
  let patched = false;
  return {
    name: "usd-composer-patches",
    enforce: "pre",
    transform(code, id) {
      if (!usdComposerFile.test(id)) return null;
      patched = true;
      return { code: applySourcePatches(code, usdComposerPatches), map: null };
    },
    buildEnd(error) {
      if (options.requireBundled && !error && !patched) {
        this.error("USDComposer.js was never bundled, so its patches did not run.");
      }
    },
  };
}
