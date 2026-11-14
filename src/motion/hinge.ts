// Deterministic hinge sampling, shared by the preview and the USDZ export.
// MacBook Neo values come from Apple's original Pose variant, before the
// preparation step bakes its transforms. Units are the model's centimetres.

export const NEO_HINGE = Object.freeze({
  group: "unhvfLGugqNKvZm",
  pivot: Object.freeze([0, -0.10915308495800902, -10.501127103232617] as const),
  openDegrees: -110,
});

/** 0..1, or `fallback` for anything that is not a finite number. */
export function clampProgress(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

/** Smoothstep. */
export function easeProgress(value: number): number {
  const p = clampProgress(value);
  return p * p * (3 - 2 * p);
}

// Neo gets the same little physical settle as the Duo hinge: the lid moves
// decisively through the middle, then eases into the endpoint instead of
// stopping like a linear slideshow. It stays bounded so slider values are
// exact and saved recipes never overshoot.
export function neoEaseProgress(value: number): number {
  const p = easeProgress(value);
  return Math.min(1, p + Math.sin(Math.PI * p) * 0.08 * (1 - p));
}

export interface HingeTransform {
  readonly degrees: number;
  readonly radians: number;
  readonly translation: readonly [number, number, number];
}

// The live asset is always the open model. Endpoints never swap geometry:
// Apple's two authored poses contain slightly different lid vertices.
export function neoTransform(progress: number): HingeTransform {
  const degrees = (clampProgress(progress) - 1) * NEO_HINGE.openDegrees;
  const radians = (degrees * Math.PI) / 180;
  const [, y, z] = NEO_HINGE.pivot;
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { degrees, radians, translation: [0, y - (c * y - s * z), z - (s * y + c * z)] };
}

/** The fold a pose stands for: open 1, half 0.5 (the Duo's half is a third), closed 0. */
export function foldForPose(pose: string | undefined, motion: "duo" | "neo"): number {
  if (pose === "open") return 1;
  if (pose === "half") return motion === "duo" ? 1 / 3 : 0.5;
  return 0;
}

/** The pose a fold reads as. */
export function poseForFold(fold: number): "closed" | "half" | "open" {
  if (fold <= 0.001) return "closed";
  return fold >= 0.999 ? "open" : "half";
}
