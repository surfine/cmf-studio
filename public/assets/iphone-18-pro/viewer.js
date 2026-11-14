/* Apple's bundled product-viewer scene owns lighting, texture detail and camera.
 * This adapter maps CMF recipes to its authored finishes and real mesh groups. */
"use strict";
(async () => {
  const channel = "ai6-cmf-duo";
  const origin = new URL(document.baseURI).origin;
  const root = "/assets/cmf/iphone-18-pro";
  const send = (type, data = {}) => parent.postMessage({ channel, type, ...data }, origin);
  const finishes = { silver18Pro: "Silver", burgundy18Pro: "Plum", glacier18Pro: "Sky_Blue", black18Pro: "Black" };
  const views = { "01-front": "front", "02-back": "back", "03-rear-hero": "backLeft", "04-front-hero": "frontLeft", "05-buttons-side": "left", "06-control-side": "right", "07-camera-close": "backLeft", "08-bottom-usb": "backBottom", "09-top-edge": "frontTop" };
  let scene, API, frame = 0, deadline = 0, suspended = false, snapshot = null;
  let parts = {}, view = "backLeft", viewZoom = 1, viewOffset = 0;
  const fail = error => send("error", { message: String(error?.message || error) });
  try {
    const req = window.__appleRequire;
    API = window.Lotus = req("ac9bc25df4b82d3e2428");
    API.Lotus.settings.dprTest = () => Math.min(devicePixelRatio || 1, 2);
    const { DetailChunk } = req("15948708d897b34b9d0a");
    class ProScene extends API.CustomScene {
      init() { API.Lotus.chunks.initialize({ DetailChunk }); super.init(); }
      onLoop() {
        if (suspended) return;
        super.onLoop();
        if (snapshot && performance.now() >= snapshot.after) {
          const id = snapshot.id;
          snapshot = null;
          this.renderer.domElement.toBlob(blob => send("snapshot", { id, blob }), "image/png");
        }
      }
    }
    scene = await API.instance().loadScene({ src: `${root}/scenes/iPhone18Pro_ROW_L_avif.lsd`, assetsPath: root, element: document.getElementById("viewer"), SceneClass: ProScene });
    const file = scene.getComponent("212ea3f0-5608-4866-8138-d0945bf32c41");
    const response = await fetch(`${root}/uploads/FUTzWlfMznEZMGX/MszYeqEKDgnBqxc/pxNeLtyNKmhwUzW/megyEIopJyvbcOt/NkxxOAjhmlfGMZG.lsd`);
    if (!response.ok) throw new Error(`Finish profiles: HTTP ${response.status}`);
    const profiles = Object.fromEntries((await response.json()).map(profile => [profile["@states"][0], profile]));
    function requestRender() {
      deadline = performance.now() + 1800;
      if (frame || suspended) return;
      function render() {
        if (suspended) { frame = 0; return; }
        API.instance().tryRequestAnimationFrame();
        frame = performance.now() < deadline ? requestAnimationFrame(render) : 0;
      }
      frame = requestAnimationFrame(render);
    }
    const meshParts = { FavlsyntwORuAWE: "cameraControl", vNhhwQSvuMpJdIO: "cameraControl", MnLqboplBegKCiJ: "backGlass", DKubKYfnHrlwbUq: "backGlass", eJZvQwcTOqVtVfH: "usbC", sHcQpjFlDpalUmp: "usbC" };
    const owned = [];
    function own(material, part) {
      const baseline = {};
      for (const profile of Object.values(profiles)) {
        for (const key of Object.keys(profile[material.name] || {})) {
          if (!key.startsWith("color")) baseline[key] = material[key];
        }
      }
      owned.push({ material, part, baseline, color: material.color?.clone() });
    }
    function cloneMaterial(original) {
      const material = original.clone();
      for (const key of ["type", "vertexShader", "fragmentShader", "chunks", "lightLayer"]) material[key] = original[key];
      material.uniforms = original.uniforms;
      for (const key of Object.keys(original)) if (key.startsWith("is")) material[key] = original[key];
      material.defines = { ...original.defines };
      return material;
    }
    file.asset.scene.traverse(object => {
      if (!object.material) return;
      if (object.name === "DtVNklXQfullwCP") {
        if (object.geometry.index?.count !== 92877) throw new Error("Official metal mesh changed; review CMF groups");
        const original = object.material;
        const groups = [["sideButton", 0, 1716], ["volumeUp", 1716, 1716], ["volumeDown", 3432, 1716], ["actionButton", 5148, 1896], ["frame", 7044, 85833]];
        object.geometry.clearGroups();
        object.material = groups.map(([part, start, count], index) => {
          const material = cloneMaterial(original);
          object.geometry.addGroup(start, count, index);
          own(material, part);
          return material;
        });
      } else if (meshParts[object.name]) {
        own(object.material, meshParts[object.name]);
      }
    });
    function applyPart({ material, part, baseline, color }) {
      const finish = finishes[parts[part]] || finishes[parts.frame] || "Silver";
      const profile = profiles[finish][material.name] || {};
      if (color) material.color.copy(color);
      if (profile.colorR !== undefined) material.color.setRGB(profile.colorR, profile.colorG, profile.colorB);
      for (const [key, value] of Object.entries({ ...baseline, ...profile })) {
        if (key.startsWith("color")) continue;
        const texture = key.endsWith("Map") || key === "map";
        const next = texture && typeof value === "string" ? scene.assets.getAsset(value) : value;
        if (material[key] !== next) {
          material[key] = next;
          if (texture) material.needsUpdate = true;
        }
      }
      // The authored Over layer otherwise covers the base map with Glacier.
      // Keep the detail shader, but use the same finish in both diffuse layers.
      if (part === "backGlass" && profile.map && material.uniforms?.DetailDiffuseMap) {
        material.uniforms.DetailDiffuseMap.value = scene.assets.getAsset(profile.map);
      }
    }
    const render = scene.renderer.render.bind(scene.renderer);
    scene.renderer.render = (...args) => {
      for (const entry of owned) applyPart(entry);
      const camera = args[1];
      if (camera !== scene.camera || (viewZoom === 1 && !viewOffset)) return render(...args);
      const previousZoom = camera.zoom;
      const previousView = camera.view ? { ...camera.view } : null;
      camera.zoom *= viewZoom;
      if (viewOffset) {
        const { width, height } = scene.renderer.domElement;
        camera.setViewOffset(width, height, 0, height * viewOffset, width, height);
      }
      camera.updateProjectionMatrix();
      try { return render(...args); }
      finally { camera.zoom = previousZoom; camera.view = previousView; camera.updateProjectionMatrix(); }
    };
    function setParts(value) { parts = value || {}; scene.states.set("global", finishes[parts.frame] || "Silver"); requestRender(); }
    function setView(name) {
      view = views[name] || "backLeft";
      viewZoom = name === "07-camera-close" ? 2.4 : 1;
      viewOffset = name === "07-camera-close" ? -0.35 : 0;
      scene.states.set("angles", view);
      requestRender();
    }
    addEventListener("message", event => {
      if (event.source !== parent || event.origin !== origin || event.data?.channel !== channel) return;
      const message = event.data;
      if (message.type === "colors") setParts(message.parts);
      if (message.type === "view") setView(message.name);
      if (message.type === "suspend") { suspended = true; cancelAnimationFrame(frame); frame = 0; }
      if (message.type === "resume") { suspended = false; requestRender(); }
      if (message.type === "snapshot") { snapshot = { id: message.id, after: performance.now() + 1200 }; requestRender(); }
    });
    scene.renderer.domElement.addEventListener("webglcontextlost", () => fail(new Error("WebGL context lost")));
    addEventListener("pagehide", () => { cancelAnimationFrame(frame); scene.destroy(); }, { once: true });
    setParts({ frame: "silver18Pro" });
    setView("03-rear-hero");
    document.documentElement.dataset.ready = "true";
    send("ready", { materialCount: owned.length });
  } catch (error) { fail(error); }
})();
