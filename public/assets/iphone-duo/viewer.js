/* CMF adapter for Apple's public iPhone Duo scene. The desktop owns controls,
 * translations and saved recipes; Lotus remains isolated in this document. */
"use strict";
(async () => {
  const channel = "ai6-cmf-duo";
  const origin = new URL(document.baseURI).origin;
  const send = (type, data = {}) => parent.postMessage({ channel, type, ...data }, origin);
  let scene;
  let API;
  let progress = 1 / 3;
  let suspended = false;
  let frame = 0;
  let deadline = 0;
  let snapshot = null;
  let snapshotFrames = 0;
  let orbit;
  let lastAngle = "";
  const fail = (error) => send("error", { message: String(error?.message || error) });
  try {
    const req = window.__appleRequire;
    API = window.Lotus = req("YEMv/39/pw6MbIjSlRSe");
    const { Lotus } = API;
    Lotus.settings.dprTest = () => Math.min(devicePixelRatio || 1, 2);
    const chunks = {
      DetailChunk: req("rPr0FRAY05W5smljnBUZ").DetailChunk,
      Wallpaper: req("iQR0xhrLkcgDNKF/CrlT").Wallpaper,
      Wipe: req("3KWH7xpHANxtsy7reUMs").Wipe,
    };
    const scripts = {
      AnimationScrubber: req("kjH2WT2JtSgZLYUFj9jM").AnimationScrubber,
      CameraMixerOffset: req("OJhHH5Nrn5Av8/a7vghL").CameraMixerOffset,
      FadeThroughBlack: req("QEikGNFzm1WGbKgdoGe8").FadeThroughBlack,
      Hinge: req("a6KkYNc7ItI2tZbDpVEF").Hinge,
      StencilMasking: req("Xci3QsCa8MxXYXf24Gwn").StencilMasking,
      WallpaperRenderer: req("2g0qWaU7yu+645nbbw9b").WallpaperRenderer,
    };
    class CmfScene extends API.CustomScene {
      init() { Lotus.chunks.initialize(chunks); Lotus.scripts.initialize(scripts); super.init(); }
      create() {
        super.create();
        this.mainWeights = this.getComponentsByName("weights_main")[0].scripts.get("VariantWeightsMixer");
        this.ptWeights = this.getComponentsByName("weights_pt")[0].scripts.get("VariantWeights");
        this.hinge = this.getComponentByName("YvVAegQhHvoGyyp:Hinge");
      }
      onLoop() {
        if (suspended) return;
        super.onLoop();
        // A drag leaves the camera wherever the writer's finger stopped, and
        // Apple's own camera snaps to the nearest of its named angles. Telling
        // the studio which angle it settled on is what keeps the view strip
        // lit on the angle the writer is actually looking at.
        if (orbit && orbit.angle && orbit.angle !== lastAngle) {
          lastAngle = orbit.angle;
          send("angle", { angle: lastAngle });
        }
        if (snapshot && ++snapshotFrames >= 2) {
          const id = snapshot;
          snapshot = null;
          this.renderer.domElement.toBlob((blob) => send("snapshot", { id, blob }), "image/png");
        }
      }
    }
    scene = await API.instance().loadScene({
      // Paths resolve against the document's base, which the studio sets to
      // this folder wherever the app is served from.
      src: new URL("scenes/iPhoneDuo_ROW_L_avif.lsd", document.baseURI).href,
      element: document.getElementById("viewer"), SceneClass: CmfScene,
      assetsPath: new URL(".", document.baseURI).href.replace(/\/$/, ""),
    });
    // The scene ships a hero camera and a draggable 360 camera, and only the
    // 360 camera answers a drag: the authored one ignores the pointer. A color
    // studio is worthless at one angle -- the back glass, the hinge and the
    // camera plateau only show from other sides -- so the 360 camera renders.
    // It starts on the same angle as the hero camera, so nothing moves until
    // the user turns the device.
    const orbitCamera = scene.getObjectByName?.("camera_360");
    orbit = orbitCamera?.userData?.component?.scripts?.get?.("InteractiveCamera") || null;
    if (orbitCamera) scene.camera = orbitCamera;
    function requestRender() {
      deadline = performance.now() + 200;
      if (!frame) frame = requestAnimationFrame(render);
    }
    // One frame on demand. The scene runs its own loop while it is on screen;
    // this is the "paint now" that a fold, a colour, an upload or a resize asks
    // for, and `deadline` keeps a burst of requests to one short run instead of
    // a frame per message.
    //
    // This function was referenced but never defined, so the *first* request
    // threw `render is not defined`. On the desk that stayed invisible — the
    // scene's own loop had already painted the frame the studio was looking at —
    // but on the deployed site it was the whole failure: the app reported
    // "Model update failed … render is not defined" and the folding phone never
    // appeared.
    function render(now = performance.now()) {
      frame = 0;
      if (suspended) return;
      scene.onLoop?.();
      if (performance.now() < deadline) frame = requestAnimationFrame(render);
    }
    function setFold(value) {
      if (!Number.isFinite(value)) return;
      progress = Math.max(0, Math.min(1, value));
      const middle = 1 / 3;
      const weights = progress <= middle
        ? [{ label: "PT_SliderClosed", weight: 1 - progress / middle }, { label: "PT_SliderLanding", weight: progress / middle }]
        : [{ label: "PT_SliderLanding", weight: (1 - progress) / (1 - middle) }, { label: "PT_SliderOpen", weight: (progress - middle) / (1 - middle) }];
      scene.ptWeights.setWeightTargets(weights);
      scene.ptWeights.snapValuesToTargets();
      scene.ptWeights.onFrame({ delta: 0 });
      scene.mainWeights.mixSpring.value = scene.mainWeights.mixSpring.targetValue = 1;
      scene.mainWeights.mixSpring.velocity = 0;
      scene.mainWeights.onFrame({ delta: 0 });
      scene.hinge.simulator.reset(progress);
      scene.hinge.position = progress;
      scene.hinge.hingeController.progress = progress;
      scene.hinge.hingeController.onLoop();
      requestRender();
    }
    async function recordVideo(id, durationMs = 5500) {
      const canvas = scene.renderer.domElement;
      if (!canvas.captureStream || !window.MediaRecorder) throw new Error("Video recording is unavailable in this browser");
      const originalPixelRatio = scene.renderer.getPixelRatio?.();
      scene.renderer.setPixelRatio?.(Math.min(2, Math.max(originalPixelRatio || 1, (devicePixelRatio || 1) * 2)));
      setFold(0);
      const stream = canvas.captureStream(60);
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((value) => MediaRecorder.isTypeSupported(value));
      if (!mime) throw new Error("WebM recording is unavailable in this browser");
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      const chunks = [];
      recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
      const done = new Promise((resolve, reject) => { recorder.onerror = () => reject(recorder.error || new Error("Video recording failed")); recorder.onstop = () => resolve(new Blob(chunks, { type: mime })); });
      recorder.start(100);
      const started = performance.now();
      const scale = durationMs / 5500;
      const tick = () => {
        const elapsed = performance.now() - started;
        const holdOpen = 1500 * scale;
        const unfold = 3000 * scale;
        const p = elapsed < holdOpen ? 0 : elapsed < holdOpen + unfold
          ? (elapsed - holdOpen) / unfold : 1;
        setFold(p);
        if (p < 1 || elapsed < durationMs) requestAnimationFrame(tick);
        else setTimeout(() => recorder.stop(), 80);
      };
      tick();
      try {
        const blob = await done;
        send("video", { id, blob, mime });
      } finally {
        stream.getTracks().forEach((track) => track.stop());
        if (originalPixelRatio != null) scene.renderer.setPixelRatio?.(originalPixelRatio);
      }
    }
    // Apple's material names are opaque hashes, so the split is justified by
    // where each one sits on the device, measured 2026-09-12 from this scene
    // with the phone open (16.52 x 11.77 x 1.14 cm, centre x = 2.645):
    //
    //   lrXfpZcYrByzvym  16.52 x 11.77, polished metal   outer enclosure
    //   NtNSwEIIFmIbXaY  16.48 x 11.72, satin metal      enclosure, second shell
    //   stlMkdXkRsspsoE  13.15 x 11.72, satin metal      inner shell
    //   jeFtQmHBLCfgIkY   0.82 x 11.49 at centre x       the hinge spine
    //   jqlebwNqkTyrcyd   3.40 x  1.61 on the back       camera plateau
    //   OwqobJiNTlvAFyj   3.39 x  1.61, same footprint   plateau base
    //   mAvfMvCzYIPKaNG   0.07 x  5.93 on the left edge  side button rail
    //   QTguOGnxQOXIuCV   8.01 x 11.46 on the back       back glass
    //
    // A full-height 8mm strip down the exact centre of a folding phone is the
    // hinge and nothing else; a 0.7mm-thin 6cm rail on the edge is a button.
    // The two whole-device shells stay one part, because a viewer cannot tell
    // the writer which of them they are looking at.
    //
    // The back glass carries its inner layers too. They sit within a hair of
    // the outer sheet, so whichever one wins the depth test at a given angle
    // is what the writer sees, and painting only the outermost read as "Star
    // White" on a Night Sky back.
    const partMaterials = new Map([
      ["lrXfpZcYrByzvym", "frame"],
      ["NtNSwEIIFmIbXaY", "frame"],
      ["stlMkdXkRsspsoE", "frame"],
      ["jeFtQmHBLCfgIkY", "hinge"],
      ["jqlebwNqkTyrcyd", "cameraPlateau"],
      ["OwqobJiNTlvAFyj", "cameraPlateau"],
      ["mAvfMvCzYIPKaNG", "sideButton"],
      ["QTguOGnxQOXIuCV", "backGlass"],
      ["MZiYIrcFSqDDBWG", "backGlass"],
      ["ZoizrWFccovSVQl", "backGlass"],
    ]);
    const ownedMaterials = new Map();
    const seenParts = new Set();
    scene.hinge.hingeController.component.asset.scene.traverse((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials.filter(Boolean)) {
        const part = partMaterials.get(material.name) || "";
        if (part && material.color?.clone && !ownedMaterials.has(material)) {
          ownedMaterials.set(material, { part, original: material.color.clone() });
          seenParts.add(part);
        }
      }
    });
    // Apple can re-author this scene, and a part that quietly stops existing
    // paints nothing while every control still says it worked. Name the ones
    // that went missing instead.
    const missingParts = [...new Set(partMaterials.values())].filter((part) => !seenParts.has(part));
    if (missingParts.length) throw new Error(`Duo parts not found in the scene: ${missingParts.join(", ")}`);
    function setColors(colors) {
      for (const [material, { part, original }] of ownedMaterials) {
        const hex = colors?.[part];
        if (!/^#[0-9a-f]{6}$/i.test(hex || "")) continue;
        if (hex.toLowerCase() === "#f7f6f5") material.color.copy(original);
        else material.color.set(hex);
      }
      requestRender();
    }
    // Apple's InteractiveCamera owns the drag, so a view is set by asking it
    // for one of the named angles it already carries (front, back, left,
    // right, and the four corners). The current angles are written as well as
    // the target: the studio only renders for the length of one gesture, and a
    // spring that has nowhere to run would leave the old angle on screen.
    function setView(name) {
      if (!orbit) return;
      const entry = orbit.positions?.find((item) => item.label === name);
      if (!entry) return;
      orbit.closestAngle.set(entry.theta, entry.phi);
      orbit.thetaCurrent = entry.theta;
      orbit.phiCurrent = entry.phi;
      orbit.calculateCameraRotation?.();
      orbit.angle = name;
      lastAngle = name;
      requestRender();
    }
    addEventListener("message", (event) => {
      if (event.source !== parent || event.origin !== origin || event.data?.channel !== channel) return;
      const message = event.data;
      if (message.type === "colors") setColors(message.colors);
      if (message.type === "view") setView(message.name);
      if (message.type === "fold") setFold(message.progress);
      if (message.type === "suspend") { suspended = true; cancelAnimationFrame(frame); frame = 0; }
      if (message.type === "resume") { suspended = false; setFold(progress); }
      if (message.type === "snapshot") { snapshot = message.id; snapshotFrames = 0; requestRender(); }
      if (message.type === "record") recordVideo(message.id, message.durationMs).catch((error) => send("video-error", { id: message.id, message: String(error.message || error) }));
    });
    scene.renderer.domElement.addEventListener("webglcontextlost", () => fail(new Error("WebGL context lost")));
    addEventListener("pagehide", () => { cancelAnimationFrame(frame); scene.destroy(); }, { once: true });
    setFold(progress);
    document.documentElement.dataset.ready = "true";
    send("ready", { materialCount: ownedMaterials.size });
  } catch (error) { fail(error); }
})();
