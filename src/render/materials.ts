// Finishes on a loaded USD model: which mesh is which part, and painting it.

import { Box3, type Material, type Mesh, type MeshPhysicalMaterial, type Object3D, type Texture, Vector3 } from "three";
import { MATERIAL_PART_ALIASES, type ModelSpec, type PartColors } from "../model/catalog.ts";
import { finishFor } from "../model/models.ts";

// How much dielectric specular a lit display keeps.
const SCREEN_SPECULAR_INTENSITY = 0.15;
// Clearcoat is a second, independent specular layer: specularIntensity does
// not reach it, so a lit display kept a full-strength varnish that mirrored
// the neutral studio environment as an even grey veil.
const SCREEN_CLEARCOAT = 0.04;

const PART_IN_MATERIAL_NAME =
  /__(frameSide|frame|backGlass|volumeUp|volumeDown|actionOrSim|cameraControl|sideButton|simTray|usbC|screwOrSpeaker|cameraPlate|lid|topCase|bottomCase|keycaps|trackpad)_[^/]+$/;

/** The physical-material fields this module reads; the USD loader makes MeshPhysicalMaterial. */
type StudioMaterial = Material & Partial<MeshPhysicalMaterial>;

/** three marks meshes with `isMesh`; reading the flag off any Object3D is how three itself tests it. */
function isMesh(object: Object3D): object is Mesh {
  // Reading an optional flag; a non-mesh simply lacks it.
  return (object as Partial<Mesh>).isMesh === true;
}

function materialsOf(object: Object3D): StudioMaterial[] {
  if (!isMesh(object)) return [];
  const list = Array.isArray(object.material) ? object.material : [object.material];
  // The loader only produces physical (or standard) materials, which these fields describe.
  return list.filter((entry): entry is StudioMaterial => Boolean(entry));
}

function partInName(material: StudioMaterial | undefined): string {
  const match = String(material?.name || "").match(PART_IN_MATERIAL_NAME);
  return match?.[1] ? (MATERIAL_PART_ALIASES[match[1]] ?? match[1]) : "";
}

/** Trim Apple authors as true black: never a finish surface. */
function isBlackTrim(material: StudioMaterial): boolean {
  if (!material.color?.getHSL) return false;
  if (material.map || material.emissiveMap) return false;
  const { r, g, b } = material.color;
  return r * 0.299 + g * 0.587 + b * 0.114 < 0.035;
}

/** Which part a mesh is, from where it sits in the device (Y up in three.js). */
function classifyLiveMesh(object: Object3D, globalBounds: Box3): string {
  const bounds = new Box3().setFromObject(object);
  if (bounds.isEmpty()) return "";
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const globalSize = globalBounds.getSize(new Vector3());
  const leftEdge = globalBounds.min.x + globalSize.x * 0.08;
  const rightEdge = globalBounds.max.x - globalSize.x * 0.08;
  const topEdge = globalBounds.max.y - globalSize.y * 0.22;
  const bottomEdge = globalBounds.min.y + globalSize.y * 0.08;
  const nearSide = center.x < leftEdge || center.x > rightEdge;
  const sideControl =
    nearSide &&
    size.x < globalSize.x * 0.08 &&
    size.z < globalSize.z * 0.35 &&
    size.y > globalSize.y * 0.035 &&
    size.y < globalSize.y * 0.18;
  if (sideControl) return "";

  const bottomPart = center.y < bottomEdge && size.z < globalSize.z * 0.35 && size.y < globalSize.y * 0.06;
  if (bottomPart && size.x > globalSize.x * 0.05) return "usbC";

  const backGlass =
    Math.abs(center.x) < globalSize.x * 0.12 &&
    center.z < globalBounds.min.z + globalSize.z * 0.38 &&
    size.x > globalSize.x * 0.72 &&
    size.y > globalSize.y * 0.75;
  if (backGlass) return "backGlass";

  const sideFrame = nearSide && size.y > globalSize.y * 0.45 && size.z > globalSize.z * 0.45;
  if (sideFrame) return "frame";

  const mainFrame =
    Math.abs(center.x) < globalSize.x * 0.12 &&
    size.x > globalSize.x * 0.88 &&
    size.y > globalSize.y * 0.85 &&
    size.z > globalSize.z * 0.18;
  if (mainFrame) return "frame";

  const cameraArea =
    center.y > topEdge &&
    center.x > globalBounds.min.x + globalSize.x * 0.45 &&
    size.x > globalSize.x * 0.12 &&
    size.y > globalSize.y * 0.08;
  return cameraArea ? "cameraPlate" : "";
}

/**
 * Gives every paintable mesh materials of its own, tagged with its part, and
 * corrects what the loaded materials get wrong for a product shot.
 */
export function prepareLiveMaterials(model: Object3D, globalBounds: Box3, spec: ModelSpec, parts: PartColors): void {
  model.traverse((object) => {
    if (!isMesh(object) || !object.material) return;
    const mesh = object;
    const sourceMaterials = materialsOf(mesh);
    for (const material of sourceMaterials) {
      // Three can expand indexed USD st1 coordinates incorrectly. The affected
      // maps are baked occlusion atlases, so letting WebGL sample them paints
      // unrelated component silhouettes across the enclosure. Keep the real
      // mesh and its colour/normal/roughness maps, but omit the invalid AO.
      if (material.aoMap && (material.aoMap.channel > 0 || mesh.geometry?.getAttribute("uv1"))) {
        material.aoMap = null;
        material.aoMapIntensity = 0;
      }
      if (material.transparent) material.depthWrite = false;
      // A lit display is emissive over a black dielectric. At grazing angles
      // that dielectric's Fresnel term climbs toward 1 and lays a flat grey
      // veil over the wallpaper. Damp the specular so the screen keeps its
      // picture; a trace is left so it does not read as matte paper.
      if (material.emissiveMap && "specularIntensity" in material)
        material.specularIntensity = SCREEN_SPECULAR_INTENSITY;
      // The MacBook's panel also ships a 0.25 clearcoat, a separate lobe the
      // line above cannot reach. Leave the trace an anti-glare coating has.
      if (material.emissiveMap && typeof material.clearcoat === "number" && material.clearcoat > SCREEN_CLEARCOAT) {
        material.clearcoat = SCREEN_CLEARCOAT;
      }
      // A lit display is a light source showing an already-graded picture;
      // the film curve washed it out. Opt the panel out of tone mapping.
      if (material.emissiveMap) material.toneMapped = false;
      material.needsUpdate = true;
    }
    const namedPart = sourceMaterials.map(partInName).find(Boolean) ?? "";
    const partId = namedPart || spec.meshParts?.[mesh.name] || classifyLiveMesh(mesh, globalBounds);
    if (!partId || !Object.hasOwn(parts, partId)) return;
    // The server refuses to recolour black trim (lens glass and rings, bezels,
    // antenna lines). Live recolouring agrees, or the viewport would paint
    // what the export leaves alone.
    if (!namedPart && sourceMaterials.some(isBlackTrim)) return;

    const owned = sourceMaterials.map((material) => {
      // Every material the loader makes is cloneable into its own type.
      const copy = material.clone() as StudioMaterial;
      copy.userData = { ...material.userData, cmfPart: partId };
      if (copy.aoMap) {
        copy.aoMap = null;
        copy.aoMapIntensity = 0;
      }
      if (spec.id === "macbook-neo" && ["lid", "topCase", "bottomCase", "trackpad"].includes(partId)) {
        // A satin aluminium response: broad highlights still describe the
        // enclosure, but no chalky diffuse veil over the anodising.
        copy.metalness = Math.max(copy.metalness ?? 0, 0.8);
        copy.roughness = Math.min(copy.roughness ?? 1, 0.32);
      }
      if (copy.transparent) copy.depthWrite = false;
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? owned : (owned[0] ?? mesh.material);
  });
}

/** Paints the recipe onto a prepared model; answers how many materials changed. */
export function applyFinishes(model: Object3D, spec: ModelSpec, parts: PartColors): number {
  let changed = 0;
  model.traverse((object) => {
    for (const material of materialsOf(object)) {
      const tagged = material.userData?.cmfPart;
      const partId = (typeof tagged === "string" && tagged) || partInName(material);
      if (!partId || !material.color?.set) continue;
      material.color.set(finishFor(spec, parts[partId]).hex);
      material.needsUpdate = true;
      changed += 1;
    }
  });
  return changed;
}

function isTexture(value: unknown): value is Texture {
  // Reading an optional flag on an object already checked to be one.
  return typeof value === "object" && value !== null && (value as Partial<Texture>).isTexture === true;
}

/** Frees a model's geometry, materials and textures. */
export function disposeModel(model: Object3D | null | undefined): void {
  model?.traverse((object) => {
    if (isMesh(object)) object.geometry?.dispose();
    for (const material of materialsOf(object)) {
      // Any property may be a texture; each is narrowed by isTexture before use.
      for (const value of Object.values(material) as unknown[]) {
        if (isTexture(value)) value.dispose();
      }
      material.dispose();
    }
  });
}
