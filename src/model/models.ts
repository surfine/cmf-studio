// Lookups over the catalogue: which spec, pose, views and asset a recipe means.

import {
  type CameraView,
  DEFAULT_MODEL_ID,
  type Finish,
  MACBOOK_NEO_VIEWS,
  MODEL_ALIASES,
  MODELS,
  type ModelSpec,
  type NamedAngle,
  type Part,
  type PartColors,
  type Pose,
  VIEW_DEFINITIONS,
} from "./catalog.ts";

/** A view the strip can show: a camera view for three.js models, a named angle for the Duo. */
export type StudioView = CameraView | NamedAngle;

const MOTION_VIEW: CameraView = {
  name: "motion",
  labelKey: "cmf_view_motion",
  direction: [-0.6, 0.45, 0.66],
  up: [0, 1, 0],
  frame: 1.05,
};

export function canonicalModelId(id: string): string {
  return MODEL_ALIASES[id] ?? id;
}

/** The spec for an id; an unknown id falls back to the default device. */
export function modelSpec(id: string): ModelSpec {
  const canonical = canonicalModelId(id);
  const found = MODELS.find((model) => model.id === canonical) ?? MODELS.find((model) => model.id === DEFAULT_MODEL_ID);
  if (!found) throw new Error("The catalogue has no default device.");
  return found;
}

export function poseSpec(model: ModelSpec, id: string | undefined): Pose | null {
  const poses = model.poses ?? [];
  return poses.find((pose) => pose.id === id) ?? poses[0] ?? null;
}

/** The pose a recipe is in: its own when the model has it, the model's first otherwise, "closed" without poses. */
export function activePose(model: ModelSpec, pose: string | undefined): string {
  return poseSpec(model, pose)?.id ?? "closed";
}

export function isCameraView(view: StudioView): view is CameraView {
  return "direction" in view;
}

/** The view set for a model in a pose. */
export function viewsFor(model: ModelSpec, pose: string): readonly StudioView[] {
  // The Duo's view set is the scene's own named camera angles: it does not
  // change with the fold, so it is a plain list rather than a pose map.
  // The Duo's catalogue entry lists named angles (an array); camera sets are keyed by pose.
  if (model.motion === "duo") return Array.isArray(model.views) ? (model.views as readonly NamedAngle[]) : [];
  if (model.motion === "neo") return [MOTION_VIEW, ...MACBOOK_NEO_VIEWS.open];
  const views =
    model.views && !Array.isArray(model.views)
      ? // Not an array, so it is the per-pose camera map.
        (model.views as Readonly<Record<string, readonly CameraView[]>>)[pose]
      : undefined;
  return views ?? VIEW_DEFINITIONS;
}

// The first camera set entry is the natural default for a model or pose.
// A device switch must never keep a view name that does not exist in the new
// set, or the model would load unframed.
export function defaultViewFor(model: ModelSpec, pose: string): string {
  return model.defaultView ?? viewsFor(model, pose)[0]?.name ?? "";
}

export function assetUrlFor(model: ModelSpec, pose: string): string {
  if (model.motion) return model.asset;
  if (model.poses) return (poseSpec(model, pose) ?? model.poses[0])?.asset ?? model.asset;
  return model.asset;
}

/** The first preset's colours: what a device starts in. */
export function defaultPartsFor(model: ModelSpec): PartColors {
  const first = Object.keys(model.presets)[0];
  return first ? { ...model.presets[first] } : {};
}

/** The finish for an id, or the model's first finish. */
export function finishFor(model: ModelSpec, id: string | undefined): Finish {
  const finish = model.colors.find((color) => color.id === id) ?? model.colors[0];
  if (!finish) throw new Error(`${model.id} has no finishes.`);
  return finish;
}

export function firstPart(model: ModelSpec): Part {
  const part = model.parts[0];
  if (!part) throw new Error(`${model.id} has no parts.`);
  return part;
}
