import { describe, expect, expectTypeOf, it } from "vitest";
import { en } from "../../src/strings/en.ts";
import { type StringKey, translate } from "../../src/strings/index.ts";
import { zh } from "../../src/strings/zh.ts";

describe("strings", () => {
  it("rejects a misspelled key at compile time", () => {
    expectTypeOf<"cmf_studio_title">().toMatchTypeOf<StringKey>();
    // @ts-expect-error -- not a key of the English table, so it cannot be looked up.
    const misspelled: StringKey = "cmf_studio_titel";
    expect(misspelled).toBe("cmf_studio_titel");
  });

  it("has every English key in Chinese", () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });

  it("fills placeholders the way the desk did", () => {
    expect(translate("en", "cmf_fold_value", { percent: 50 })).toBe("50% open");
    expect(translate("zh", "cmf_fold_value", { percent: 50 })).toBe("展开 50%");
  });
});

describe("copy", () => {
  it("the preset help states the product boundary in both languages", () => {
    expect(translate("en", "balloon_cmf_preset")).toContain("It is not an Apple-shipped full-device colorway");
    expect(translate("zh", "balloon_cmf_preset")).toContain("它不是 Apple 发售的整机配色");
  });
});
