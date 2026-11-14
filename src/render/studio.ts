// The interactive three.js studio. It owns one WebGL context, one scene lit
// only by an environment map, an orthographic camera with orbit controls, and
// at most one device model. The UI drives it imperatively through a ref.

import {
  ACESFilmicToneMapping,
  Box3,
  type Group,
  type Object3D,
  OrthographicCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  type Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import type { CameraView, ModelSpec, PartColors } from "../model/catalog.ts";
import { type CameraPose, cameraPoseForView } from "./framing.ts";
import { applyFinishes, disposeModel, prepareLiveMaterials } from "./materials.ts";
import { applyNeoHinge } from "./neo-hinge.ts";
import { USDLoader } from "./usd-loader.ts";

// The one light every interactive model is lit by: the EXR the official
// product scene names in its one `Environment` script.
export const ENVIRONMENT_URL = "assets/environment/studio.exr";

const reducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A metal has no diffuse term: its colour comes from what it reflects, so the
// scene needs an environment even though nothing else in it is reflective.
// RoomEnvironment is the fallback for a browser that cannot decode the EXR: a
// synthetic room is the wrong room, which is visibly better than none.
async function buildEnvironment(renderer: WebGLRenderer): Promise<Texture> {
  const generator = new PMREMGenerator(renderer);
  generator.compileEquirectangularShader();
  try {
    const texture = await new EXRLoader().loadAsync(ENVIRONMENT_URL);
    const target = generator.fromEquirectangular(texture);
    texture.dispose();
    return target.texture;
  } catch {
    return generator.fromScene(new RoomEnvironment(), 0.04).texture;
  } finally {
    generator.dispose();
  }
}

function parseUsdz(buffer: ArrayBuffer): Promise<Group> {
  // The returned group is only geometry; the callback waits for textures.
  // Preparing materials earlier misses the screen's emissive map.
  return new Promise((resolve, reject) => {
    new USDLoader().parse(buffer, "", resolve, reject);
  });
}

/** What the studio shows: a model id, its pose, and the fold for the hinged device. */
export interface LoadRequest {
  readonly spec: ModelSpec;
  readonly pose: string;
  readonly fold: number;
  readonly parts: PartColors;
}

export class Studio {
  readonly #renderer: WebGLRenderer;
  readonly #scene = new Scene();
  readonly #camera = new OrthographicCamera(-1, 1, 1, -1, 0.001, 1000);
  readonly #controls: OrbitControls;
  readonly #canvas: HTMLCanvasElement;
  readonly #viewport: HTMLElement;
  readonly #resizeObserver: ResizeObserver;
  readonly #isHidden: () => boolean;
  /** Every device model parented to the scene; an interrupted load can leave more than one. */
  readonly #loaded = new Set<Object3D>();
  #model: Object3D | null = null;
  #modelId = "";
  #poseId = "";
  #framedModelId = "";
  #bounds: Box3 | null = null;
  /** The union of the hinge's sampled poses, for the MacBook's motion view. */
  #motionBounds: Box3 | null = null;
  #viewHalfHeight = 1;
  #viewIsCustom = false;
  #pendingViewFrame: { view: CameraView; bounds: "model" | "motion" } | null = null;
  #cameraFrame = 0;
  #onOrbit: () => void = () => {};

  private constructor(canvas: HTMLCanvasElement, viewport: HTMLElement, isHidden: () => boolean) {
    this.#canvas = canvas;
    this.#viewport = viewport;
    this.#isHidden = isHidden;
    this.#renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.#renderer.outputColorSpace = SRGBColorSpace;
    // Apple's product scene renders with ACESFilmic at exposure 1 and sRGB
    // output. Matching it is half of matching the look; the other half is the
    // environment. No analytic lights: Apple's scene has none either.
    this.#renderer.toneMapping = ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = 1;
    this.#renderer.setClearColor(0x000000, 0);

    this.#controls = new OrbitControls(this.#camera, canvas);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.09;
    this.#controls.screenSpacePanning = true;
    this.#controls.zoomToCursor = true;
    this.#controls.minZoom = 0.35;
    this.#controls.maxZoom = 8;
    this.#controls.listenToKeyEvents(canvas);
    this.#controls.addEventListener("start", () => {
      window.cancelAnimationFrame(this.#cameraFrame);
      this.#viewIsCustom = true;
      this.#onOrbit();
    });
    this.#controls.addEventListener("change", () => this.render());
    this.#resizeObserver = new ResizeObserver(() => this.resize());
    this.#resizeObserver.observe(viewport);
  }

  static async create(canvas: HTMLCanvasElement, viewport: HTMLElement, isHidden: () => boolean): Promise<Studio> {
    const studio = new Studio(canvas, viewport, isHidden);
    studio.#scene.environment = await buildEnvironment(studio.#renderer);
    studio.resize();
    studio.start();
    return studio;
  }

  /** Called when the reader starts dragging the camera away from a named view. */
  set onOrbit(listener: () => void) {
    this.#onOrbit = listener;
  }

  get modelId(): string {
    return this.#modelId;
  }

  get hasModel(): boolean {
    return Boolean(this.#model && this.#bounds);
  }

  get viewIsCustom(): boolean {
    return this.#viewIsCustom;
  }

  set viewIsCustom(value: boolean) {
    this.#viewIsCustom = value;
  }

  /** True when the loaded model is the device and pose the recipe names. */
  shows(modelId: string, pose: string, hasMotion: boolean): boolean {
    return this.#modelId === modelId && (hasMotion || this.#poseId === pose);
  }

  // The damping loop is a real rAF every frame for as long as the renderer
  // lives, so suspending takes the loop off the renderer, not just the work.
  start(): void {
    this.#renderer.setAnimationLoop(() => {
      if (this.#isHidden()) return;
      if (this.#controls.update()) this.render();
    });
  }

  stop(): void {
    window.cancelAnimationFrame(this.#cameraFrame);
    this.#cameraFrame = 0;
    this.#renderer.setAnimationLoop(null);
  }

  render(): void {
    this.#renderer.render(this.#scene, this.#camera);
  }

  // A window that is collapsed or not laid out measures zero, and the aspect
  // computed from it frames the device at a few percent of the pane.
  #measurable(): boolean {
    const rect = this.#viewport.getBoundingClientRect();
    return rect.width >= 2 && rect.height >= 2;
  }

  #aspect(): number {
    const rect = this.#viewport.getBoundingClientRect();
    return Math.max(rect.width, 1) / Math.max(rect.height, 1);
  }

  resize(): void {
    const rect = this.#viewport.getBoundingClientRect();
    this.#renderer.setSize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)), false);
    this.#updateFrustum(this.#viewHalfHeight);
    // A frame deferred while the pane had no size is owed one now.
    if (this.#pendingViewFrame && this.#measurable()) {
      const pending = this.#pendingViewFrame;
      this.#pendingViewFrame = null;
      this.#frame(pending.view, pending.bounds, false);
      return;
    }
    this.render();
  }

  #updateFrustum(halfHeight: number): void {
    const aspect = this.#aspect();
    this.#viewHalfHeight = Math.max(halfHeight || this.#viewHalfHeight, 0.001);
    this.#camera.left = -this.#viewHalfHeight * aspect;
    this.#camera.right = this.#viewHalfHeight * aspect;
    this.#camera.top = this.#viewHalfHeight;
    this.#camera.bottom = -this.#viewHalfHeight;
    this.#camera.updateProjectionMatrix();
  }

  /**
   * Loads a device. Answers false when `isCurrent` says a newer request
   * superseded this one, so the caller drops it.
   */
  async load(buffer: ArrayBuffer, request: LoadRequest, isCurrent: () => boolean): Promise<boolean> {
    const next = await parseUsdz(buffer);
    // A device whose own art faces the other way is turned before the bounds
    // are taken, so framing, orbiting and every named view agree.
    if (request.spec.spin) next.rotation.y += request.spec.spin;
    next.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(next);
    if (bounds.isEmpty()) {
      disposeModel(next);
      throw new Error("empty");
    }
    if (!isCurrent()) {
      disposeModel(next);
      return false;
    }
    const neo = request.spec.id === "macbook-neo";
    // One environment and no analytic lights leave nothing to aim. Only the
    // rotation is model business: Neo is authored Y-up, and turning the
    // studio with it keeps the softbox over the lid.
    this.#scene.environmentIntensity = 1;
    this.#scene.environmentRotation.set(0, neo ? Math.PI / 2 : 0, 0);
    this.#renderer.toneMappingExposure = 1;
    prepareLiveMaterials(next, bounds, request.spec, request.parts);
    this.#scene.add(next);
    this.#loaded.add(next);
    const hadModel = Boolean(this.#model);
    this.#model = next;
    this.#modelId = request.spec.id;
    this.#poseId = request.pose;
    this.#bounds = bounds;
    this.#motionBounds = null;
    if (request.spec.motion === "neo") {
      const all = new Box3();
      for (const value of [0, 0.5, 1]) {
        applyNeoHinge(next, value);
        all.union(new Box3().setFromObject(next));
      }
      this.#motionBounds = all;
      applyNeoHinge(next, request.fold);
      this.#bounds = new Box3().setFromObject(next);
    }
    applyFinishes(next, request.spec, request.parts);
    // Remove every model that is not the one just committed: an interrupted
    // load can finish its parse and add its own model to the scene.
    for (const loaded of this.#loaded) {
      if (loaded === next) continue;
      this.#loaded.delete(loaded);
      this.#scene.remove(loaded);
      disposeModel(loaded);
    }
    this.#canvas.hidden = false;
    this.start();
    return !hadModel || this.#framedModelId !== this.#modelId;
  }

  /** Marks the loaded device as framed (the caller just framed it). */
  markFramed(): void {
    this.#framedModelId = this.#modelId;
  }

  /** Paints finishes on the loaded model; 0 when it is not the requested device. */
  paint(spec: ModelSpec, pose: string, parts: PartColors): number {
    if (!this.#model || !this.shows(spec.id, pose, Boolean(spec.motion))) return 0;
    const changed = applyFinishes(this.#model, spec, parts);
    if (changed) this.render();
    return changed;
  }

  /** Moves the MacBook's lid. */
  setNeoFold(spec: ModelSpec, fold: number): void {
    if (!this.#model || this.#modelId !== spec.id) return;
    applyNeoHinge(this.#model, fold);
    this.#bounds = new Box3().setFromObject(this.#model);
    this.render();
  }

  /** Points the camera at a named view; animated unless asked not to or the reader prefers less motion. */
  frame(view: CameraView, animate: boolean): void {
    this.#frame(view, view.name === "motion" ? "motion" : "model", animate);
  }

  #frame(view: CameraView, which: "model" | "motion", animate: boolean): void {
    const bounds = which === "motion" && this.#motionBounds ? this.#motionBounds : this.#bounds;
    if (!this.#model || !bounds) return;
    // Framing against a zero-sized pane bakes a 1/height aspect into the
    // camera. Owe the frame instead; resize pays it once the pane has a size.
    if (!this.#measurable()) {
      this.#pendingViewFrame = { view, bounds: which };
      return;
    }
    this.#animateTo(cameraPoseForView(bounds, view, this.#aspect()), animate && !reducedMotion());
  }

  /** Settles any frame a hidden pane deferred. */
  settleDeferredFrame(): void {
    if (this.#pendingViewFrame) this.resize();
  }

  #animateTo(pose: CameraPose, animate: boolean): void {
    window.cancelAnimationFrame(this.#cameraFrame);
    const startPosition = this.#camera.position.clone();
    const startTarget = this.#controls.target.clone();
    const startUp = this.#camera.up.clone();
    const startHalfHeight = this.#viewHalfHeight;
    const startZoom = this.#camera.zoom;
    const startedAt = performance.now();
    const duration = animate ? 360 : 0;
    const step = (now: number): void => {
      const progress = duration ? Math.min((now - startedAt) / duration, 1) : 1;
      const eased = 1 - (1 - progress) ** 3;
      this.#camera.position.lerpVectors(startPosition, pose.position, eased);
      this.#controls.target.lerpVectors(startTarget, pose.target, eased);
      this.#camera.up.lerpVectors(startUp, pose.up, eased).normalize();
      this.#camera.zoom = startZoom + (1 - startZoom) * eased;
      this.#updateFrustum(startHalfHeight + (pose.halfHeight - startHalfHeight) * eased);
      this.#camera.lookAt(this.#controls.target);
      this.#camera.updateMatrixWorld();
      this.#controls.update();
      this.render();
      if (progress < 1) this.#cameraFrame = window.requestAnimationFrame(step);
    };
    // An unanimated move is a placement: it must not wait for a frame
    // callback, which never fires in a background tab. A device loaded there
    // was left at the origin, inside the enclosure.
    if (!duration) step(startedAt);
    else this.#cameraFrame = window.requestAnimationFrame(step);
  }

  /**
   * Renders each view as a PNG data URL through a second renderer with its own
   * environment (a PMREM target cannot be shared between GL contexts), then
   * puts the camera back. Everything between lending and returning the
   * environment runs in one task, so the live preview never shows the swap.
   */
  async stills(views: readonly CameraView[]): Promise<[string, string][]> {
    if (!this.#bounds) return [];
    const bounds = this.#bounds;
    const rect = this.#viewport.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.width * 2));
    canvas.height = Math.max(1, Math.round(rect.height * 2));
    const offscreen = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    try {
      offscreen.setPixelRatio(1);
      offscreen.outputColorSpace = SRGBColorSpace;
      offscreen.toneMapping = this.#renderer.toneMapping;
      offscreen.toneMappingExposure = this.#renderer.toneMappingExposure;
      offscreen.setClearColor(0x000000, 0);
      offscreen.setSize(canvas.width, canvas.height, false);
      const environment = await buildEnvironment(offscreen);
      const previous = this.#scene.environment;
      this.#scene.environment = environment;
      try {
        return views.map((view) => {
          this.#snap(cameraPoseForView(bounds, view, this.#aspect()));
          offscreen.render(this.#scene, this.#camera);
          return [view.name, canvas.toDataURL("image/png")];
        });
      } finally {
        this.#scene.environment = previous;
        environment.dispose();
      }
    } finally {
      offscreen.dispose();
    }
  }

  #snap(pose: CameraPose): void {
    this.#camera.position.copy(pose.position);
    this.#controls.target.copy(pose.target);
    this.#camera.up.copy(pose.up).normalize();
    this.#camera.zoom = 1;
    this.#updateFrustum(pose.halfHeight);
    this.#camera.lookAt(this.#controls.target);
    this.#camera.updateMatrixWorld();
    this.#controls.update();
    this.render();
  }

  /** Empties the scene, for a device the studio does not render (the Duo). */
  clear(): void {
    for (const loaded of this.#loaded) {
      this.#scene.remove(loaded);
      disposeModel(loaded);
    }
    this.#loaded.clear();
    this.#model = null;
    this.#modelId = "";
    this.#framedModelId = "";
  }

  dispose(): void {
    this.stop();
    this.#resizeObserver.disconnect();
    this.#controls.dispose();
    this.clear();
    this.#renderer.dispose();
  }

  /** The camera position, for tests and diagnostics. */
  get cameraPosition(): Vector3 {
    return this.#camera.position.clone();
  }
}
