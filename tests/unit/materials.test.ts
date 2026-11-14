// Live finishes on a loaded model: which surfaces a recipe paints and what the
// product shot corrects. Built from plain three.js meshes, no renderer needed.

import { Box3, BoxGeometry, Color, Group, Mesh, MeshPhysicalMaterial, Texture } from "three";
import { describe, expect, it } from "vitest";
import { modelSpec } from "../../src/model/models.ts";
import { applyFinishes, prepareLiveMaterials } from "../../src/render/materials.ts";

function mesh(name: string, material: MeshPhysicalMaterial, size: [number, number, number] = [1, 1, 1]): Mesh {
  const result = new Mesh(new BoxGeometry(...size), material);
  result.name = name;
  return result;
}

const air = modelSpec("iphone-air");
const neo = modelSpec("macbook-neo");

describe("prepareLiveMaterials", () => {
  it("tags a surface named for its part and paints it with the recipe", () => {
    const shared = new MeshPhysicalMaterial({ name: "/Looks/body__frame_1", color: "#808080" });
    const model = new Group().add(mesh("a", shared));
    prepareLiveMaterials(model, new Box3().setFromObject(model), air, { frame: "skyBlueAir" });
    const owned = (model.children[0] as Mesh).material as MeshPhysicalMaterial;
    expect(owned).not.toBe(shared);
    expect(owned.userData.cmfPart).toBe("frame");
    expect(applyFinishes(model, air, { frame: "skyBlueAir" })).toBe(1);
    const sky = air.colors.find((color) => color.id === "skyBlueAir")?.hex;
    expect(owned.color.getHexString()).toBe(new Color(sky).getHexString());
  });

  it("recognises the MacBook's trackpad and maps a known mesh by name", () => {
    const pad = new MeshPhysicalMaterial({ name: "deck__trackpad_x" });
    const byMesh = new MeshPhysicalMaterial({ name: "unnamed" });
    const model = new Group().add(mesh("pad", pad), mesh("TJrncXRMBNoKueV", byMesh));
    prepareLiveMaterials(model, new Box3().setFromObject(model), neo, { trackpad: "citrusNeo" });
    const parts = model.children.map((child) => ((child as Mesh).material as MeshPhysicalMaterial).userData.cmfPart);
    expect(parts).toEqual(["trackpad", "trackpad"]);
  });

  it("leaves black trim alone, as the export does", () => {
    const trim = new MeshPhysicalMaterial({ name: "ring", color: "#000000" });
    const model = new Group().add(mesh("TJrncXRMBNoKueV", trim));
    prepareLiveMaterials(model, new Box3().setFromObject(model), neo, { trackpad: "citrusNeo" });
    expect((model.children[0] as Mesh).material).toBe(trim);
    expect(applyFinishes(model, neo, { trackpad: "citrusNeo" })).toBe(0);
  });

  it("drops the broken secondary-UV occlusion map and keeps transparent layers from punching holes", () => {
    const ao = new Texture();
    ao.channel = 1;
    const glass = new MeshPhysicalMaterial({ name: "body__backGlass_1", aoMap: ao, transparent: true });
    const model = new Group().add(mesh("a", glass));
    prepareLiveMaterials(model, new Box3().setFromObject(model), air, { backGlass: "skyBlueAir" });
    expect(glass.aoMap).toBeNull();
    const owned = (model.children[0] as Mesh).material as MeshPhysicalMaterial;
    expect([owned.aoMap, owned.depthWrite]).toEqual([null, false]);
  });

  it("damps a lit display's specular and clearcoat and keeps it out of tone mapping", () => {
    const screen = new MeshPhysicalMaterial({ name: "display", emissiveMap: new Texture(), clearcoat: 0.25 });
    const model = new Group().add(mesh("screen", screen));
    prepareLiveMaterials(model, new Box3().setFromObject(model), neo, {});
    expect([screen.specularIntensity, screen.clearcoat, screen.toneMapped]).toEqual([0.15, 0.04, false]);
  });

  it("gives the MacBook's aluminium a satin metal response", () => {
    const lid = new MeshPhysicalMaterial({ name: "shell__lid_1", metalness: 0.1, roughness: 0.9 });
    const model = new Group().add(mesh("lid", lid));
    prepareLiveMaterials(model, new Box3().setFromObject(model), neo, { lid: "silverNeo" });
    const owned = (model.children[0] as Mesh).material as MeshPhysicalMaterial;
    expect([owned.metalness, owned.roughness]).toEqual([0.8, 0.32]);
  });
});
