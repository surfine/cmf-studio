// A recipe is one device's finish choices. Pure: no storage, no DOM, no
// randomness of its own (the caller hands in `random`).

import { clampProgress, foldForPose } from "../motion/hinge.ts";
import { DEFAULT_MODEL_ID, type ModelSpec, type PartColors } from "./catalog.ts";
import { activePose, defaultPartsFor, modelSpec } from "./models.ts";

export interface Recipe {
  readonly model: string;
  readonly pose?: string;
  /** 0 closed .. 1 open, for the two folding devices. */
  readonly fold?: number;
  readonly name: string;
  readonly parts: PartColors;
}

/** What is kept between visits: the device last open and each device's own recipe. */
export interface RecipeStore {
  readonly activeModel: string;
  /** As stored: anything until restoreRecipe has cleaned it. */
  readonly recipes: Readonly<Record<string, unknown>>;
}

export const EMPTY_STORE: RecipeStore = { activeModel: DEFAULT_MODEL_ID, recipes: {} };

export function defaultRecipe(modelId: string = DEFAULT_MODEL_ID, poseId?: string): Recipe {
  const spec = modelSpec(modelId);
  const firstPose = spec.poses?.[0]?.id;
  const pose = spec.poses ? (poseId ?? (spec.motion === "duo" ? "half" : firstPose)) : undefined;
  return {
    model: spec.id,
    ...(pose ? { pose } : {}),
    ...(spec.motion ? { fold: foldForPose(pose, spec.motion) } : {}),
    name: `${spec.id}-cmf-studio`,
    parts: defaultPartsFor(spec),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The stored value as a store. Shape is { activeModel, recipes: { <modelId>: recipe } };
 * a recipe saved by the single-model version is read into its model's slot.
 */
export function readStore(raw: unknown): RecipeStore {
  if (!isRecord(raw)) return EMPTY_STORE;
  if (isRecord(raw.recipes)) {
    return {
      activeModel: typeof raw.activeModel === "string" ? raw.activeModel : DEFAULT_MODEL_ID,
      recipes: raw.recipes,
    };
  }
  if (typeof raw.model === "string" && isRecord(raw.parts)) {
    return { activeModel: raw.model, recipes: { [raw.model]: raw } };
  }
  return EMPTY_STORE;
}

/** Keeps only colours from this model's own palette. */
function partsFrom(spec: ModelSpec, saved: unknown, base: PartColors): PartColors {
  if (!isRecord(saved)) return base;
  const parts: Record<string, string> = { ...base };
  for (const part of spec.parts) {
    const color = saved[part.id];
    if (typeof color === "string" && spec.colors.some((entry) => entry.id === color)) parts[part.id] = color;
  }
  return parts;
}

/** The recipe a device opens with: its saved one, cleaned, or its default. */
export function restoreRecipe(store: RecipeStore, modelId: string = store.activeModel): Recipe {
  const rawId = String(modelId || DEFAULT_MODEL_ID);
  const spec = modelSpec(rawId);
  const legacyPose = rawId === "iphone-17-pro-max" ? "pro-max" : undefined;
  const fallback = defaultRecipe(spec.id, legacyPose);
  const saved = store.recipes[spec.id] ?? (legacyPose ? store.recipes[rawId] : undefined);
  if (!isRecord(saved) || !isRecord(saved.parts)) return fallback;
  const wantedPose = (typeof saved.pose === "string" && saved.pose) || legacyPose;
  const pose = spec.poses
    ? spec.poses.some((entry) => entry.id === wantedPose)
      ? wantedPose
      : spec.poses[0]?.id
    : undefined;
  const restored: Recipe = {
    ...fallback,
    // A stored recipe may carry fields of its own (its name); the ones that matter are overwritten below.
    ...(saved as Partial<Recipe>),
    model: spec.id,
    ...(pose ? { pose } : {}),
    parts: partsFrom(spec, saved.parts, fallback.parts),
  };
  return spec.motion ? { ...restored, fold: clampProgress(saved.fold, foldForPose(pose, spec.motion)) } : restored;
}

/** A recipe in a new pose, keeping the colours that still apply. */
export function recipeInPose(store: RecipeStore, modelId: string, poseId: string): Recipe {
  const spec = modelSpec(modelId);
  const recipe = defaultRecipe(spec.id, poseId);
  const saved = store.recipes[spec.id];
  return isRecord(saved) && isRecord(saved.parts)
    ? { ...recipe, parts: partsFrom(spec, saved.parts, recipe.parts) }
    : recipe;
}

export function saveIn(store: RecipeStore, recipe: Recipe): RecipeStore {
  return { activeModel: recipe.model, recipes: { ...store.recipes, [recipe.model]: recipe } };
}

/** Only the current model resets; other models keep their saved recipes. */
export function forget(store: RecipeStore, modelId: string): RecipeStore {
  const { [modelId]: _removed, ...recipes } = store.recipes;
  return { activeModel: store.activeModel, recipes };
}

/** The preset whose every part matches the recipe, or "". */
export function matchingPresetId(spec: ModelSpec, parts: PartColors): string {
  return (
    Object.entries(spec.presets).find(([, preset]) =>
      spec.parts.every((part) => parts[part.id] === preset[part.id]),
    )?.[0] ?? ""
  );
}

/** Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    // i and j are within bounds, so neither read is undefined.
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

// Reshuffle each time the palette is exhausted, so a three-colour palette
// still mixes instead of repeating one fixed stripe order.
export function shuffleParts(spec: ModelSpec, parts: PartColors, random: () => number): PartColors {
  const next: Record<string, string> = { ...parts };
  let bag: string[] = [];
  for (const part of spec.parts) {
    if (!bag.length)
      bag = shuffled(
        spec.colors.map((color) => color.id),
        random,
      );
    const color = bag.pop();
    if (color) next[part.id] = color;
  }
  return next;
}

/** The recipe the server's USD exporter expects: the Pro and Pro Max are two models there. */
export function serviceRecipe(recipe: Recipe): Recipe {
  if (recipe.model !== "iphone-17-pro") return recipe;
  const { pose, ...withoutPose } = recipe;
  return { ...withoutPose, model: pose === "pro-max" ? "iphone-17-pro-max" : "iphone-17-pro" };
}

/** What the in-browser USDZ exporter needs. */
export interface ExportRecipe {
  readonly modelId: string;
  readonly pose?: string;
  readonly fold?: number;
  readonly parts: PartColors;
  readonly colors: readonly { readonly id: string; readonly hex: string }[];
  readonly exactMeshParts: Readonly<Record<string, string>>;
  readonly exactOnly: boolean;
  readonly slug: string;
}

export function exportRecipe(spec: ModelSpec, recipe: Recipe): ExportRecipe {
  const pose = spec.poses ? activePose(spec, recipe.pose) : undefined;
  return {
    modelId: spec.id,
    ...(pose ? { pose } : {}),
    ...(spec.motion === "neo" ? { fold: clampProgress(recipe.fold) } : {}),
    parts: recipe.parts,
    colors: spec.colors.map(({ id, hex }) => ({ id, hex })),
    exactMeshParts: spec.meshParts ?? {},
    exactOnly: spec.id === "macbook-neo",
    slug: recipe.name || `${spec.id}-cmf`,
  };
}

/** The USDZ file name: the recipe name without a doubled extension. */
export function usdzFileName(recipeName: string): string {
  const name = String(recipeName || "iphone-17-standard-cmf")
    .trim()
    .replace(/\.usdz$/i, "");
  return `${name || "cmf-studio"}.usdz`;
}
