import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("the stylesheet adds no !important overrides", () => {
  const css = readFileSync(new URL("../../src/styles/cmf-studio.css", import.meta.url), "utf8");
  expect(css).not.toContain("!important");
});
