// The vendor scenes the package ships are complete and unmodified, and the
// 18 Pro scene's material groups still select the physical buttons after an
// upstream geometry update. Ported from the desk's CMF contract.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parseAst } from "vite";
import { describe, expect, it } from "vitest";

interface SourceManifest {
  readonly files: readonly string[];
  readonly sha256: Readonly<Record<string, string>>;
}

const assets = new URL("../../public/assets/", import.meta.url);
const sceneRoot = (name: string) => new URL(`${name}/`, assets);
const manifestOf = (root: URL): SourceManifest => JSON.parse(readFileSync(new URL("source.json", root), "utf8"));
const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

describe.each(["iphone-duo", "iphone-18-pro"])("%s scene", (name) => {
  const root = sceneRoot(name);
  const manifest = manifestOf(root);

  it("lists files, each matching its recorded hash", () => {
    expect(manifest.files.length).toBeGreaterThan(0);
    for (const file of manifest.files)
      expect(sha256(readFileSync(new URL(file, root))), file).toBe(manifest.sha256[file]);
  });

  it("bundles every file its scene documents reference", () => {
    for (const file of manifest.files.filter((entry) => /\.(lsd|gltf|json)$/.test(entry))) {
      const visit = (value: unknown): void => {
        if (Array.isArray(value)) {
          for (const item of value) visit(item);
          return;
        }
        if (!value || typeof value !== "object") return;
        for (const [key, item] of Object.entries(value)) {
          if (
            typeof item === "string" &&
            (item.startsWith("/uploads/") || (key === "uri" && !item.startsWith("data:")))
          ) {
            const reference = item.startsWith("/")
              ? item.slice(1)
              : new URL(item, new URL(file, "https://cmf.invalid/")).pathname.slice(1);
            expect(manifest.files, `${file} → ${reference}`).toContain(reference);
          } else visit(item);
        }
      };
      visit(JSON.parse(readFileSync(new URL(file, root), "utf8")));
    }
  });
});

describe("the 18 Pro scene's material groups", () => {
  const root = sceneRoot("iphone-18-pro");
  const manifest = manifestOf(root);
  const gltfPath = manifest.files.find((file) => file.endsWith("/RITPniWcLZbEFMu.gltf"));
  if (!gltfPath) throw new Error("the 18 Pro manifest lost its exterior geometry");
  const gltfUrl = new URL(gltfPath, root);
  const gltf = JSON.parse(readFileSync(gltfUrl, "utf8"));
  const buffers: Buffer[] = gltf.buffers.map((buffer: { uri: string }) => readFileSync(new URL(buffer.uri, gltfUrl)));
  const metal = gltf.meshes.find((mesh: { name: string }) => mesh.name === "DtVNklXQfullwCP");
  const primitive = metal?.primitives[0];
  const indices = gltf.accessors[primitive?.indices];
  const positions = gltf.accessors[primitive?.attributes.POSITION];

  // The viewer's own group data, read through its AST rather than its spelling.
  const viewerSource = readFileSync(new URL("viewer.js", root), "utf8");
  let groups: [string, number, number][] | undefined;
  let applyPartSource: string | undefined;
  let finishes: Record<string, unknown> | undefined;
  type Node = { type: string; start: number; end: number; [key: string]: unknown };
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const n = node as Node;
    const id = n.id as { name?: string } | undefined;
    const init = n.init as { type?: string; elements?: unknown[]; properties?: unknown[] } | undefined;
    if (n.type === "VariableDeclarator" && id?.name === "groups" && init?.type === "ArrayExpression") {
      const rows = (init.elements ?? []).map((row) =>
        ((row as { elements?: { value: unknown }[] }).elements ?? []).map((value) => value.value),
      ) as [string, number, number][];
      if (rows.some((row) => row[0] === "sideButton")) groups = rows;
    }
    if (n.type === "FunctionDeclaration" && id?.name === "applyPart")
      applyPartSource = viewerSource.slice(n.start, n.end);
    if (n.type === "VariableDeclarator" && id?.name === "finishes" && init?.type === "ObjectExpression") {
      finishes = Object.fromEntries(
        (init.properties ?? []).map((property) => {
          const p = property as { key: { name?: string; value?: string }; value: { value: unknown } };
          return [p.key.name ?? p.key.value, p.value.value];
        }),
      );
    }
    for (const value of Object.values(n)) if (value && typeof value === "object") walk(value);
  };
  walk(parseAst(viewerSource));

  it("the exterior is one indexed triangle primitive of the recorded size", () => {
    expect(metal?.primitives.length).toBe(1);
    expect(indices.count).toBe(92877);
    expect([primitive.mode ?? 4, indices.type]).toEqual([4, "SCALAR"]);
    expect([positions.componentType, positions.type]).toEqual([5126, "VEC3"]);
  });

  it("four buttons and the frame cover every exterior triangle once, without gaps", () => {
    expect(groups?.length).toBe(5);
    let end = 0;
    for (const [part, start, count] of groups ?? []) {
      expect(start === end && count > 0 && count % 3 === 0, part).toBe(true);
      end = start + count;
    }
    expect(end).toBe(indices.count);
  });

  it("each button group selects that physical button", () => {
    const readers: Record<number, [number, "readUInt8" | "readUInt16LE" | "readUInt32LE"]> = {
      5121: [1, "readUInt8"],
      5123: [2, "readUInt16LE"],
      5125: [4, "readUInt32LE"],
    };
    const [indexBytes, readIndex] = readers[indices.componentType] ?? [4, "readUInt32LE"];
    const indexView = gltf.bufferViews[indices.bufferView];
    const positionView = gltf.bufferViews[positions.bufferView];
    const indexOffset = (indexView.byteOffset || 0) + (indices.byteOffset || 0);
    const positionOffset = (positionView.byteOffset || 0) + (positions.byteOffset || 0);
    const expected: Record<string, number[][]> = {
      sideButton: [
        [3.49243, -0.13302, -2.83208],
        [3.63745, 0.13302, -1.06126],
      ],
      volumeUp: [
        [-3.63743, -0.13302, -3.21721],
        [-3.49241, 0.13302, -2.09574],
      ],
      volumeDown: [
        [-3.63745, -0.13302, -1.79769],
        [-3.49243, 0.13302, -0.67623],
      ],
      actionButton: [
        [-3.63745, -0.13302, -4.41673],
        [-3.49243, 0.13302, -3.72507],
      ],
    };
    for (const [part, want] of Object.entries(expected)) {
      const group = groups?.find((row) => row[0] === part);
      if (!group) throw new Error(`${part} has no group`);
      const [, start, count] = group;
      const bounds = [
        [Infinity, Infinity, Infinity],
        [-Infinity, -Infinity, -Infinity],
      ] as [number[], number[]];
      for (let i = start; i < start + count; i += 1) {
        const vertex = (buffers[indexView.buffer] as Buffer)[readIndex](
          indexOffset + i * (indexView.byteStride || indexBytes),
        );
        const offset = positionOffset + vertex * (positionView.byteStride || 12);
        for (let axis = 0; axis < 3; axis += 1) {
          const value = (buffers[positionView.buffer] as Buffer).readFloatLE(offset + axis * 4);
          bounds[0][axis] = Math.min(bounds[0][axis] ?? Infinity, value);
          bounds[1][axis] = Math.max(bounds[1][axis] ?? -Infinity, value);
        }
      }
      // Local units are centimetres: 0.001 allows rounding, not another part.
      for (const [side, corner] of bounds.entries()) {
        for (const [axis, value] of corner.entries()) {
          expect(Math.abs(value - (want[side]?.[axis] ?? 0)), part).toBeLessThan(0.001);
        }
      }
    }
  });

  // A correct base map can still render blue when the opaque detail layer
  // keeps the frame's Glacier texture. Exercise the viewer's own adapter with
  // Apple's finish profiles, including a round trip.
  it("a back-glass finish reaches both diffuse layers and keeps the authored detail maps", () => {
    expect(applyPartSource && finishes).toBeTruthy();
    const profilesPath = manifest.files.find((file) => file.endsWith("/NkxxOAjhmlfGMZG.lsd"));
    if (!profilesPath) throw new Error("finish profiles missing");
    const profiles = Object.fromEntries(
      (JSON.parse(readFileSync(new URL(profilesPath, root), "utf8")) as Record<string, unknown>[]).map((profile) => [
        (profile["@states"] as string[])[0],
        profile,
      ]),
    ) as Record<string, Record<string, { map: string }>>;
    const glassName = "YmlPswXiJMnOhti";
    const blueId = profiles.Sky_Blue?.[glassName]?.map ?? "";
    const redId = profiles.Plum?.[glassName]?.map ?? "";
    const blue = { id: blueId };
    const red = { id: redId };
    const textures = new Map([
      [blueId, blue],
      [redId, red],
    ]);
    const parts: Record<string, string> = { frame: "glacier18Pro", backGlass: "glacier18Pro" };
    const normal = { id: "authored-detail-normal" };
    const rough = { id: "authored-detail-roughness" };
    const glass = {
      name: glassName,
      map: blue,
      metalness: 0.5,
      uniforms: {
        DetailDiffuseMap: { value: blue },
        DetailNormalMap: { value: normal },
        DetailNormalIntensity: { value: 1.21 },
        DetailRoughMetalMap: { value: rough },
        DetailRoughnessIntensity: { value: 0.73 },
      },
    };
    const applyPart = runInNewContext(`(${applyPartSource})`, {
      parts,
      finishes,
      profiles,
      scene: { assets: { getAsset: (id: string) => textures.get(id) } },
    }) as (input: object) => void;
    for (const [finish, texture] of [
      ["glacier18Pro", blue],
      ["burgundy18Pro", red],
      ["glacier18Pro", blue],
    ] as const) {
      parts.backGlass = finish;
      applyPart({ material: glass, part: "backGlass", baseline: { map: blue, metalness: 0.5 } });
      expect(glass.map === texture && glass.uniforms.DetailDiffuseMap.value === texture, finish).toBe(true);
      expect(glass.uniforms.DetailNormalMap.value).toBe(normal);
      expect(glass.uniforms.DetailRoughMetalMap.value).toBe(rough);
      expect([glass.uniforms.DetailNormalIntensity.value, glass.uniforms.DetailRoughnessIntensity.value]).toEqual([
        1.21, 0.73,
      ]);
    }
  });
});

// The Duo's viewer script is ours, beside Apple's scene: it maps parts to the
// scene's materials, answers named angles, and records the fold.
describe("the Duo viewer", () => {
  const viewer = readFileSync(new URL("iphone-duo/viewer.js", assets), "utf8");

  it("owns the part-to-material map, painting every layer of each part", () => {
    expect(viewer).toContain("const partMaterials = new Map([");
    // A buried layer left behind read as Star White on a Night Sky back.
    for (const material of ["QTguOGnxQOXIuCV", "MZiYIrcFSqDDBWG", "ZoizrWFccovSVQl"])
      expect(viewer).toContain(material);
    expect(viewer).toContain('"jeFtQmHBLCfgIkY"'); // hinge
    expect(viewer).toContain('"jqlebwNqkTyrcyd"'); // camera plateau
    expect(viewer).toContain('"mAvfMvCzYIPKaNG"'); // side-button rail
    expect(viewer).toContain("missingParts");
  });

  it("renders the scene's draggable camera, answers named angles and records the fold", () => {
    expect(viewer).toContain('scene.getObjectByName?.("camera_360")');
    expect(viewer).toContain('message.type === "view"');
    expect(viewer).toContain('message.type === "record"');
  });

  it("offers no screen-image path (removed rather than half-shipped)", () => {
    expect(viewer).not.toMatch(/setScreen|screen-reset|screenMaterialCount/);
  });
});
