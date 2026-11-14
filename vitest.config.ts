import { defineConfig } from "vitest/config";
import { usdComposerPatchesPlugin } from "./build/usd-composer-plugin.ts";

export default defineConfig({
  // The tests load three's USD loader as the app ships it: patched. Inlining
  // three sends it through the plugin instead of Node's own loader.
  plugins: [usdComposerPatchesPlugin({ requireBundled: false })],
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    server: { deps: { inline: [/[\\/]three[\\/]/] } },
  },
});
