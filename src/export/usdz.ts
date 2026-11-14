// USDZ recolouring in the browser. It carries the same text-layer rules as the
// desk server's CMF engine, so the app can rewrite the shipped `.usda` root
// without a server or USD tools. Pure: bytes and strings in, bytes out.

import { unzipSync, zipSync } from "three/examples/jsm/libs/fflate.module.js";
import type { ExportRecipe } from "../model/recipe.ts";
import { NEO_HINGE, neoTransform } from "../motion/hinge.ts";

type Rgb = readonly [number, number, number];
type Vec3 = readonly [number, number, number];

const BLACK_TRIM_LUMINANCE = 0.035;

// The app calls the action button by its product name; the USD mesh
// classifier and the server recipe store it as the SIM/action slot.
const BROWSER_TO_SERVER_PART: Readonly<Record<string, string>> = Object.freeze({
  actionButton: "actionOrSim",
  actionOrSim: "actionOrSim",
  frame: "frame",
  frameSide: "frameSide",
  backGlass: "backGlass",
  volumeUp: "volumeUp",
  volumeDown: "volumeDown",
  cameraControl: "cameraControl",
  sideButton: "sideButton",
  simTray: "simTray",
  usbC: "usbC",
  screwOrSpeaker: "screwOrSpeaker",
  cameraPlate: "cameraPlate",
  lid: "lid",
  topCase: "topCase",
  bottomCase: "bottomCase",
  keycaps: "keycaps",
  trackpad: "trackpad",
});

/** The recipe in the exporter's own terms: server part names and parsed colours. */
export interface UsdRecipe {
  readonly model: string;
  readonly pose: string | null;
  readonly fold: number | null;
  readonly parts: Readonly<Record<string, string | undefined>>;
  readonly palette: Readonly<Record<string, Rgb>>;
  readonly exactMeshParts: Readonly<Record<string, string>>;
  readonly exactOnly: boolean;
  readonly slug: string;
}

export interface RecolorStats {
  readonly splitCount: number;
  readonly sharedColorCount: number;
  readonly materialCloneCount: number;
}

interface Block {
  readonly name: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly body: string;
}

interface Bounds {
  readonly min: [number, number, number];
  readonly max: [number, number, number];
  readonly size: number[];
  readonly center: number[];
}

const has = (object: object, key: string): boolean => Object.hasOwn(object, key);

export function parseHex(value: string): Rgb {
  const clean = String(value).trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) throw new Error(`Invalid HEX color: ${value}`);
  return [
    Number.parseInt(clean.slice(0, 2), 16) / 255,
    Number.parseInt(clean.slice(2, 4), 16) / 255,
    Number.parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

export function normalizeRecipe(input: ExportRecipe): UsdRecipe {
  const modelId = input.modelId || "iphone-17-standard";
  const palette = Object.fromEntries(input.colors.map((color) => [color.id, parseHex(color.hex)]));
  const parts: Record<string, string | undefined> = {};
  for (const [rawPart, rawColor] of Object.entries(input.parts)) {
    const part = BROWSER_TO_SERVER_PART[rawPart] ?? rawPart;
    const color = String(rawColor || "").trim();
    if (!color || !has(palette, color)) continue;
    parts[part] = color;
  }
  if (!has(parts, "frameSide")) parts.frameSide = parts.frame;
  if (!has(parts, "screwOrSpeaker")) parts.screwOrSpeaker = parts.usbC;

  const exactMeshParts: Record<string, string> = {};
  for (const [meshName, partName] of Object.entries(input.exactMeshParts)) {
    exactMeshParts[meshName] = BROWSER_TO_SERVER_PART[partName] ?? partName;
  }
  const fold = input.fold;
  return {
    model: modelId,
    pose: input.pose ?? null,
    fold:
      modelId === "macbook-neo" && typeof fold === "number" && Number.isFinite(fold)
        ? Math.max(0, Math.min(1, fold))
        : null,
    parts,
    palette,
    exactMeshParts,
    exactOnly: input.exactOnly,
    slug: input.slug || "cmf",
  };
}

function findMatchingBrace(text: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") depth -= 1;
    if (depth === 0) return i;
  }
  return -1;
}

function blocksWithEnd(text: string, pattern: RegExp): Block[] {
  const blocks: Block[] = [];
  for (const match of text.matchAll(pattern)) {
    const name = match[1] ?? "";
    const open = text.indexOf("{", match.index);
    if (open === -1) continue;
    const close = findMatchingBrace(text, open);
    if (close === -1) continue;
    blocks.push({
      name,
      start: match.index,
      end: close + 1,
      text: text.slice(match.index, close + 1),
      body: text.slice(open + 1, close),
    });
  }
  return blocks;
}

function parseNumberArray(body: string, key: string): number[] {
  const match = body.match(new RegExp(`${key.replace(/[\\[\\]]/g, "\\$&")}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!match?.[1]) return [];
  return match[1]
    .replace(/[()]/g, "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Number.isFinite);
}

function parseVec3Array(body: string, key: string): Vec3[] {
  const nums = parseNumberArray(body, key);
  const result: Vec3[] = [];
  for (let i = 0; i < nums.length; i += 3) {
    // Missing trailing coordinates stay NaN, exactly as the server parser reads them.
    result.push([nums[i] ?? Number.NaN, nums[i + 1] ?? Number.NaN, nums[i + 2] ?? Number.NaN]);
  }
  return result;
}

function getBounds(points: readonly Vec3[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const point of points) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis] as number, point[axis] as number);
      max[axis] = Math.max(max[axis] as number, point[axis] as number);
    }
  }
  return {
    min,
    max,
    size: max.map((value, axis) => value - (min[axis] as number)),
    center: max.map((value, axis) => (value + (min[axis] as number)) / 2),
  };
}

function getGlobalBounds(meshBlocks: readonly Block[]): Bounds {
  const all: Vec3[] = [];
  for (const mesh of meshBlocks) {
    const points = parseVec3Array(mesh.body, "point3f[] points");
    if (points.length) all.push(...points);
  }
  return getBounds(all);
}

function isProductColor([r, g, b]: Rgb): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = r * 0.299 + g * 0.587 + b * 0.114;
  return lum > 0.035 && lum < 0.93 && (chroma > 0.045 || lum > 0.18) && !(max < 0.12) && !(min > 0.9);
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

function preserveValue(original: Rgb, target: Rgb): Rgb {
  const originalLum = original[0] * 0.299 + original[1] * 0.587 + original[2] * 0.114;
  const targetLum = target[0] * 0.299 + target[1] * 0.587 + target[2] * 0.114;
  const scale = targetLum > 0 ? originalLum / targetLum : 1;
  return [clamp(target[0] * scale, 0, 1), clamp(target[1] * scale, 0, 1), clamp(target[2] * scale, 0, 1)];
}

const formatFloat = (value: number): string => Number(value.toFixed(6)).toString();
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const diffuse = (rgb: Rgb): string =>
  `color3f inputs:diffuseColor = (${formatFloat(rgb[0])}, ${formatFloat(rgb[1])}, ${formatFloat(rgb[2])})`;

function recolorSharedProductColors(source: string, target: Rgb): { text: string; count: number } {
  let count = 0;
  const text = source.replace(
    /color3f inputs:diffuseColor = \(([^,]+), ([^,]+), ([^)]+)\)/g,
    (line, rRaw: string, gRaw: string, bRaw: string) => {
      const original: Rgb = [Number(rRaw), Number(gRaw), Number(bRaw)];
      if (!isProductColor(original)) return line;
      count += 1;
      return diffuse(preserveValue(original, target));
    },
  );
  return { text, count };
}

/** Which part a mesh is, from its bounds within the device. USD is Z-forward here, so Z is up. */
function classifyPart(bounds: Bounds, global: Bounds): string | null {
  const [sx = 0, sy = 0, sz = 0] = bounds.size;
  const [cx = 0, , cz = 0] = bounds.center;
  const [gx = 0, gy = 0, gz = 0] = global.size;
  const leftEdge = global.min[0] + gx * 0.08;
  const rightEdge = global.max[0] - gx * 0.08;
  const topEdge = global.min[2] + gz * 0.22;
  const bottomEdge = global.max[2] - gz * 0.08;
  const nearSide = cx < leftEdge || cx > rightEdge;
  const sideControl = nearSide && sx < gx * 0.08 && sy < gy * 0.35 && sz > gz * 0.035 && sz < gz * 0.18;
  if (sideControl) return null;

  const bottomPart = cz > bottomEdge && sy < gy * 0.35 && sz < gz * 0.06;
  if (bottomPart && sx > gx * 0.25) return "usbC";
  if (bottomPart && sx > gx * 0.05) return "screwOrSpeaker";

  const cy = bounds.center[1] ?? 0;
  const backGlass = Math.abs(cx) < gx * 0.12 && cy < global.min[1] + gy * 0.38 && sx > gx * 0.72 && sz > gz * 0.75;
  if (backGlass) return "backGlass";

  const sideFrame = nearSide && sz > gz * 0.45 && sy > gy * 0.45;
  if (sideFrame) return "frameSide";

  const mainFrame = Math.abs(cx) < gx * 0.12 && sx > gx * 0.88 && sz > gz * 0.85 && sy > gy * 0.18;
  if (mainFrame) return "frame";

  const cameraArea = cz < topEdge && cx > global.min[0] + gx * 0.45 && sx > gx * 0.12 && sz > gz * 0.08;
  return cameraArea ? "cameraPlate" : null;
}

function colorForPart(part: string, recipe: UsdRecipe): string {
  return recipe.parts[part] || recipe.parts.frame || Object.keys(recipe.palette)[0] || "";
}

function cloneMaterial(text: string, originalName: string, cloneName: string, target: Rgb): string {
  const cloned = text
    .replace(new RegExp(`def Material "${escapeRegExp(originalName)}"`), `def Material "${cloneName}"`)
    .replace(new RegExp(`/${escapeRegExp(originalName)}(?=/)`, "g"), `/${cloneName}`);
  return cloned
    .replace(/color3f inputs:diffuseColor = \(([^,]+), ([^,]+), ([^)]+)\)/, diffuse(target))
    .replace(/color3f inputs:diffuseColor\.connect = <[^>]+>/, diffuse(target));
}

function isFinishSurface(materialBlocks: readonly Block[], materialName: string): boolean {
  const material = materialBlocks.find((block) => block.name === materialName);
  if (!material) return true;
  const color = material.body.match(/color3f inputs:diffuseColor = \(([^)]*)\)/);
  if (!color?.[1]) return true;
  const rgb = color[1].split(",").map((value) => Number(value.trim()));
  if (rgb.length !== 3 || rgb.some((value) => Number.isNaN(value))) return true;
  const [r = 0, g = 0, b = 0] = rgb;
  return r * 0.299 + g * 0.587 + b * 0.114 >= BLACK_TRIM_LUMINANCE;
}

interface Operation {
  readonly at: number;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export function recolorUsdaText(source: string, recipe: UsdRecipe): { text: string; stats: RecolorStats } {
  const palette = recipe.palette;
  const baseName = recipe.parts.frame || Object.keys(palette)[0] || "";
  const baseColor = palette[baseName];
  if (!baseColor) throw new Error("The recipe has no finishes to apply.");
  const base = recolorSharedProductColors(source, baseColor);
  const meshBlocks = blocksWithEnd(base.text, /def Mesh "([^"]+)"/g);
  const materialBlocks = blocksWithEnd(base.text, /def Material "([^"]+)"/g);
  const globalBounds = getGlobalBounds(meshBlocks);
  const rewrites: { start: number; end: number; from: string; to: string }[] = [];
  const cloneNeeds = new Map<string, Map<string, string>>();

  for (const mesh of meshBlocks) {
    const points = parseVec3Array(mesh.body, "point3f[] points");
    if (!points.length) continue;
    const named = recipe.exactMeshParts[mesh.name];
    const part =
      (named && has(recipe.parts, named) ? named : "") ||
      (recipe.exactOnly ? "" : classifyPart(getBounds(points), globalBounds));
    if (!part || !has(recipe.parts, part)) continue;

    const binding = mesh.body.match(/rel material:binding\s*=\s*<([^>]+)>/);
    if (!binding?.[1]) continue;
    const originalPath = binding[1];
    const originalName = originalPath.split("/").pop() ?? "";
    if (!isFinishSurface(materialBlocks, originalName)) continue;
    const colorName = colorForPart(part, recipe);
    const cloneName = `${originalName}__${part}_${colorName}`;
    const clonePath = originalPath.replace(new RegExp(`${escapeRegExp(originalName)}$`), cloneName);
    rewrites.push({ start: mesh.start, end: mesh.end, from: binding[0], to: `rel material:binding = <${clonePath}>` });
    const clones = cloneNeeds.get(originalName) ?? new Map<string, string>();
    clones.set(cloneName, colorName);
    cloneNeeds.set(originalName, clones);
  }

  const operations: Operation[] = rewrites.map((rewrite) => ({
    at: rewrite.start,
    start: rewrite.start,
    end: rewrite.end,
    text: base.text.slice(rewrite.start, rewrite.end).replace(rewrite.from, rewrite.to),
  }));
  for (const material of materialBlocks) {
    const clones = cloneNeeds.get(material.name);
    if (!clones) continue;
    for (const [cloneName, colorName] of clones) {
      const target = palette[colorName];
      if (!target) continue;
      operations.push({
        at: material.end,
        start: material.end,
        end: material.end,
        text: `\n${cloneMaterial(material.text, material.name, cloneName, target)}`,
      });
    }
  }

  let text = base.text;
  for (const operation of operations.sort((a, b) => b.at - a.at)) {
    text = text.slice(0, operation.start) + operation.text + text.slice(operation.end);
  }
  return {
    text,
    stats: {
      splitCount: rewrites.length,
      sharedColorCount: base.count,
      materialCloneCount: [...cloneNeeds.values()].reduce((sum, clones) => sum + clones.size, 0),
    },
  };
}

/** Writes the MacBook Neo's hinge angle into the open asset's lid group. */
export function applyHingeToUsda(text: string, recipe: UsdRecipe): string {
  if (recipe.model !== "macbook-neo" || recipe.fold === null) return text;
  const marker = `def Xform "${NEO_HINGE.group}"`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error("MacBook Neo hinge group is missing.");
  const open = text.indexOf("{", start);
  if (open < 0) throw new Error("MacBook Neo hinge group is invalid.");
  const { degrees, translation } = neoTransform(recipe.fold);
  // The prepared open asset has identity group transforms and baked points.
  // Writing the same rigid transform as the preview preserves the exact
  // current angle, including positions between the two pose presets.
  const transform = `
        double3 xformOp:translate = (${translation.join(", ")})
        float3 xformOp:rotateXYZ = (${degrees}, 0, 0)
        uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateXYZ"]
`;
  return text.slice(0, open + 1) + transform + text.slice(open + 1);
}

/** The recoloured archive. */
export function repackageUsdz(buffer: ArrayBuffer, input: ExportRecipe): { bytes: Uint8Array; stats: RecolorStats } {
  const recipe = normalizeRecipe(input);
  const entries = unzipSync(new Uint8Array(buffer));
  const rootName = Object.keys(entries).find((name) => /\.(usdc|usda|usd)$/i.test(name));
  const root = rootName ? entries[rootName] : undefined;
  if (!rootName || !root) throw new Error("No root USD layer found inside USDZ.");
  let source = "";
  try {
    source = new TextDecoder().decode(root);
  } catch {
    source = "";
  }
  if (!source.trimStart().startsWith("#usda")) throw new Error("CMF export needs a text USD layer.");
  const result = recolorUsdaText(source, recipe);
  entries[rootName] = new TextEncoder().encode(applyHingeToUsda(result.text, recipe));
  // Level 0 is store, and that is the format, not a size preference: USDZ is
  // a zip whose entries must be uncompressed. Apple's USD runtime refuses a
  // deflated archive outright ("compressed files are not supported").
  return { bytes: zipSync(entries, { level: 0 }), stats: result.stats };
}

export const USDZ_MIME = "model/vnd.usdz+zip";
