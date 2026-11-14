// The shipped (patched) USD loader on the Pro's six aperture blades, without
// textures or the rest of the phone: their named rotate pivots keep them
// inside the lens instead of rotating their points around the origin.
// Ported from the desk's USD transforms contract.

import { readFileSync } from "node:fs";
import { type Mesh, Vector3 } from "three";
import { unzipSync } from "three/addons/libs/fflate.module.js";
import { describe, expect, it } from "vitest";
import { USDLoader } from "../../src/render/usd-loader.ts";

const archive = unzipSync(
  new Uint8Array(readFileSync(new URL("../../public/assets/iphone-18-pro.usdz", import.meta.url))),
);
const source = new TextDecoder().decode(archive["model.usda"]);
const blades = [
  "SrhRNGHDcaZbSJB",
  "tWocoRUXpgSskst",
  "nwhqxPwnINKaYgS",
  "rIsmoPBESVrDvLK",
  "DOcguuJzxMtscKR",
  "PoIelaJyAzUOVgJ",
];

function prim(name: string): string {
  const start = source.indexOf(`def Mesh "${name}"`);
  expect(start, `${name} exists in the source asset`).toBeGreaterThanOrEqual(0);
  const open = source.indexOf("{", start);
  let depth = 1;
  let end = open + 1;
  while (depth && end < source.length) {
    if (source[end] === "{") depth++;
    if (source[end] === "}") depth--;
    end++;
  }
  return source.slice(start, end).replace(/rel material:binding = [^\n]+/, "");
}

describe.each(blades)("aperture blade %s", (name) => {
  it("rotates around its own pivot and keeps the authored transform", () => {
    const body = prim(name);
    const vector = (attribute: string): [number, number, number] => {
      const line = body.split("\n").find((entry) => entry.includes(`${attribute} = (`));
      if (!line) throw new Error(`${name} does not define ${attribute}`);
      return line
        .slice(line.indexOf("(") + 1, line.indexOf(")"))
        .split(",")
        .map(Number) as [number, number, number];
    };
    const pivot = vector("xformOp:translate:rotatePivot");
    const translation = vector("xformOp:translate");
    const radians = (vector("xformOp:rotateXYZ")[1] * Math.PI) / 180;
    const layer = `#usda 1.0\n( defaultPrim = "root" )\ndef Xform "root" {\n${body}\n}`;
    const model = new USDLoader().parse(new TextEncoder().encode(layer).buffer);
    const mesh = model.getObjectByName(name) as Mesh | undefined;
    expect(mesh?.isMesh).toBe(true);
    if (!mesh) return;
    mesh.updateMatrix();
    const fixedPivot = new Vector3(...pivot).applyMatrix4(mesh.matrix);
    const expectedPivot = new Vector3(...pivot).add(new Vector3(...translation));
    expect(fixedPivot.distanceTo(expectedPivot)).toBeLessThan(1e-6);
    const position = mesh.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const vertex = new Vector3().fromBufferAttribute(position, i);
      const actual = vertex.clone().applyMatrix4(mesh.matrix);
      const [x, y, z] = vertex.toArray().map((value, axis) => value - (pivot[axis] ?? 0)) as [number, number, number];
      const expected = new Vector3(
        Math.cos(radians) * x + Math.sin(radians) * z,
        y,
        -Math.sin(radians) * x + Math.cos(radians) * z,
      ).add(expectedPivot);
      expect(actual.distanceTo(expected), `vertex ${i}`).toBeLessThan(1e-6);
    }
  });
});
