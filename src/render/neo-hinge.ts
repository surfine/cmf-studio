import type { Object3D } from "three";
import { type HingeTransform, NEO_HINGE, neoTransform } from "../motion/hinge.ts";

/** Turns the MacBook Neo's lid group to `progress` (0 closed, 1 open). */
export function applyNeoHinge(model: Object3D, progress: number): HingeTransform {
  const lid = model.getObjectByName(NEO_HINGE.group);
  if (!lid) throw new Error("MacBook Neo hinge group is missing.");
  const transform = neoTransform(progress);
  lid.rotation.set(transform.radians, 0, 0);
  lid.position.set(...transform.translation);
  model.updateMatrixWorld(true);
  return transform;
}
