// Where the orthographic camera stands to frame a model for a named view.

import { type Box3, Vector3 } from "three";
import type { CameraView } from "../model/catalog.ts";

export interface CameraPose {
  readonly position: Vector3;
  readonly target: Vector3;
  readonly up: Vector3;
  /** Half the visible height, in model units. */
  readonly halfHeight: number;
}

/** The pose that fits `bounds` for `view` in a pane of the given aspect (width / height). */
export function cameraPoseForView(bounds: Box3, view: CameraView, aspect: number): CameraPose {
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const [ox, oy, oz] = view.targetOffset ?? [0, 0, 0];
  const target = center.clone().add(new Vector3(ox * size.x, oy * size.y, oz * size.z));
  const direction = new Vector3(...view.direction).normalize();
  const up = new Vector3(...view.up).normalize();
  const right = new Vector3().crossVectors(up, direction).normalize();
  const trueUp = new Vector3().crossVectors(direction, right).normalize();
  let halfWidth = 0;
  let halfHeight = 0;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const local = new Vector3(x, y, z).sub(target);
        halfWidth = Math.max(halfWidth, Math.abs(local.dot(right)));
        halfHeight = Math.max(halfHeight, Math.abs(local.dot(trueUp)));
      }
    }
  }
  const distance = Math.max(size.length() * 2.6, 1);
  return {
    position: target.clone().add(direction.multiplyScalar(distance)),
    target,
    up,
    halfHeight: Math.max(halfHeight, halfWidth / aspect) * 1.14 * view.frame,
  };
}
