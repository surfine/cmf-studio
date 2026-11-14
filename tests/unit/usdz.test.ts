// The browser USDZ exporter on small hand-made archives and on the shipped
// MacBook and 18 Pro assets. Ported from the desk's exporter contract.

import { readFileSync } from "node:fs";
import { unzipSync, zipSync } from "three/addons/libs/fflate.module.js";
import { describe, expect, it } from "vitest";
import { applyHingeToUsda, normalizeRecipe, repackageUsdz } from "../../src/export/usdz.ts";
import type { ExportRecipe } from "../../src/model/recipe.ts";
import { NEO_HINGE, neoTransform } from "../../src/motion/hinge.ts";

const asset = (name: string) => readFileSync(new URL(`../../public/assets/${name}`, import.meta.url));
const arrayBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer;

const recipe: ExportRecipe = {
  modelId: "iphone-17-standard",
  parts: { frame: "red", backGlass: "blue", actionButton: "red", usbC: "blue" },
  colors: [
    { id: "red", hex: "#ff0000" },
    { id: "blue", hex: "#0000ff" },
  ],
  exactMeshParts: { body: "frame", back: "backGlass" },
  exactOnly: false,
  slug: "test-phone",
};

const usda = `#usda 1.0
(
    defaultPrim = "phone"
)

def Xform "phone"
{
    def Mesh "body"
    {
        point3f[] points = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0), (0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)]
        rel material:binding = </phone/materials/base>
    }

    def Mesh "back"
    {
        point3f[] points = [(0, -1, 0), (1, -1, 0), (1, -1, 1), (0, -1, 1), (0, -1.8, 0), (1, -1.8, 0), (1, -1.8, 1), (0, -1.8, 1)]
        rel material:binding = </phone/materials/base>
    }

    def Material "base"
    {
        color3f inputs:diffuseColor = (0.5, 0.5, 0.5)
    }
}
`;

describe("recipe normalisation", () => {
  it("maps the UI's part names onto the USD part names, with hidden parts following their visible ones", () => {
    const normalized = normalizeRecipe(recipe);
    expect(normalized.parts.actionOrSim).toBe("red");
    expect(normalized.parts.frameSide).toBe("red");
    expect(normalized.parts.screwOrSpeaker).toBe("blue");
  });

  it("clamps the MacBook's fold", () => {
    const neo = { ...recipe, modelId: "macbook-neo" };
    expect(normalizeRecipe({ ...neo, fold: -1 }).fold).toBe(0);
    expect(normalizeRecipe({ ...neo, fold: 2 }).fold).toBe(1);
  });
});

describe("repackaging", () => {
  const payload = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
  const input = zipSync({ "model.usda": new TextEncoder().encode(usda), "payload.bin": payload }, { level: 6 });
  const result = repackageUsdz(arrayBuffer(input), recipe);
  const entries = unzipSync(result.bytes);
  const output = new TextDecoder().decode(entries["model.usda"]);

  it("keeps other entries byte for byte and recolours the layer", () => {
    expect(entries["payload.bin"]).toEqual(payload);
    expect(output).not.toBe(usda);
  });

  it("clones one material per recoloured surface and rebinds each mesh to its clone", () => {
    expect(output).toMatch(/def Material "base__frame_red"/);
    expect(output).toMatch(/def Material "base__backGlass_blue"/);
    expect(output).toMatch(/rel material:binding = <\/phone\/materials\/base__frame_red>/);
    expect(output).toMatch(/rel material:binding = <\/phone\/materials\/base__backGlass_blue>/);
    expect(result.stats.materialCloneCount).toBe(2);
  });
});

describe("the MacBook hinge", () => {
  const entries = unzipSync(new Uint8Array(asset("macbook-neo-open.usdz")));
  const rootName = Object.keys(entries).find((name) => name.endsWith(".usda"));
  const source = new TextDecoder().decode(rootName ? entries[rootName] : new Uint8Array());

  it.each([0, 0.37, 0.5, 1])("at %s keeps every mesh byte-identical and the pivot fixed", (progress) => {
    const output = applyHingeToUsda(source, normalizeRecipe({ ...recipe, modelId: "macbook-neo", fold: progress }));
    const { degrees, radians, translation } = neoTransform(progress);
    expect(output.includes(`float3 xformOp:rotateXYZ = (${degrees}, 0, 0)`)).toBe(true);
    const stripped = output.replace(
      /\n {8}double3 xformOp:translate = [^\n]+\n {8}float3 xformOp:rotateXYZ = [^\n]+\n {8}uniform token\[\] xformOpOrder = [^\n]+\n/,
      "",
    );
    expect(stripped === source).toBe(true);
    const [, y, z] = NEO_HINGE.pivot;
    expect(Math.abs(Math.cos(radians) * y - Math.sin(radians) * z + translation[1] - y)).toBeLessThan(1e-10);
    expect(Math.abs(Math.sin(radians) * y + Math.cos(radians) * z + translation[2] - z)).toBeLessThan(1e-10);
  });

  it("is closed at 110° and flat open at 0°", () => {
    expect(Math.abs(neoTransform(1).degrees)).toBeLessThan(1e-10);
    expect(neoTransform(0).degrees).toBe(110);
  });
});

describe("the iPhone 18 Pro asset", () => {
  const bytes = asset("iphone-18-pro.usdz");
  const entries = unzipSync(new Uint8Array(bytes));
  const source = new TextDecoder().decode(entries["model.usda"]);

  it("is the prepared component with every texture it names packaged", () => {
    expect(source.includes('def Xform "UBGArkKGrAMRRnj"')).toBe(true);
    for (const [, name] of source.matchAll(/@([^@]+)@/g)) expect(entries[name ?? ""], name).toBeDefined();
  });

  it("exports its real back-glass materials in a new finish", () => {
    const result = repackageUsdz(arrayBuffer(new Uint8Array(bytes)), {
      ...recipe,
      modelId: "iphone-18-pro",
      parts: { backGlass: "red" },
      colors: [{ id: "red", hex: "#ff0000" }],
      exactMeshParts: { tSzbeyqDWPqajtE: "backGlass", lHgsWfYosJjEHHx: "backGlass" },
      exactOnly: true,
    });
    expect(result.stats.materialCloneCount).toBeGreaterThan(0);
  }, 60_000);
});
