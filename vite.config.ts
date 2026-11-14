import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { usdComposerPatchesPlugin } from "./build/usd-composer-plugin.ts";

export default defineConfig({
  // The build is served from /apps/cmf-studio/ inside the desk and from any folder on its own.
  base: "./",
  plugins: [preact(), usdComposerPatchesPlugin({ requireBundled: true })],
  // three.js and its USD loader are one lazy chunk loaded with the first device (about 180 kB gzip).
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 800 },
});
