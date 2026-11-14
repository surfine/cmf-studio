// The studio's state and every action on it. The UI reads the signals and
// calls the methods; the renderer (three.js or the Duo's own viewer) is
// driven from here and never from a component.

import { batch, computed, signal } from "@preact/signals";
import {
  type BridgeClient,
  exportFile,
  readState,
  requestCapabilities,
  requestServerExport,
  writeState,
} from "../bridge/bridge.ts";
import type { MenuState, SuspendCause } from "../bridge/types.ts";
import { dataUrlToPngBlob, foldVideoFileName, PNG_MIME, viewFileName, WEBM_MIME } from "../export/files.ts";
import { repackageUsdz, USDZ_MIME } from "../export/usdz.ts";
import type { CameraView, ModelSpec } from "../model/catalog.ts";
import {
  activePose,
  assetUrlFor,
  defaultViewFor,
  finishFor,
  firstPart,
  isCameraView,
  modelSpec,
  poseSpec,
  type StudioView,
  viewsFor,
} from "../model/models.ts";
import {
  defaultRecipe,
  EMPTY_STORE,
  exportRecipe,
  forget,
  matchingPresetId,
  type Recipe,
  type RecipeStore,
  readStore,
  recipeInPose,
  restoreRecipe,
  saveIn,
  serviceRecipe,
  shuffleParts,
  usdzFileName,
} from "../model/recipe.ts";
import { clampProgress, easeProgress, foldForPose, neoEaseProgress, poseForFold } from "../motion/hinge.ts";
import { AbortedError, DuoViewer } from "../render/duo.ts";
import type { Studio } from "../render/studio.ts";
import { type Language, type StringKey, translate } from "../strings/index.ts";

/** The view a visit opens on, as the desk window did. */
const OPENING_VIEW = "02-back";
/** The bridge state key the recipes live under. */
export const STORE_KEY = "recipes";
// A hung probe must not leave the preview loading forever: after the timeout
// the feature degrades to unavailable like any other fetch failure.
const CAPABILITIES_TIMEOUT_MS = 8000;

export type Translate = (key: StringKey, values?: Record<string, string | number>) => string;
/** A status line, rendered in whatever language is current when it is shown. */
export type Message = (t: Translate) => string;

const say =
  (key: StringKey, detail = ""): Message =>
  (t) =>
    detail ? `${t(key)} ${detail}` : t(key);

/** "Model update failed" with the reason, without doubling a reason that already says so. */
export function modelFailureMessage(t: Translate, error: unknown): string {
  const prefix = t("cmf_model_failed").trim();
  const base = prefix.replace(/[:：]\s*$/, "");
  const detail = String(error instanceof Error ? error.message : "").trim();
  if (!detail || detail === base || detail === prefix) return `${base}${/[.!。！？]$/.test(base) ? "" : "。"}`;
  if (detail.toLocaleLowerCase().startsWith(base.toLocaleLowerCase())) return detail;
  return `${prefix} ${detail}`;
}

const reducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** The menu actions this window answers, in manifest order. */
export const MENU_ACTIONS = [
  "cmf-save-recipe",
  "cmf-export-usdz",
  "cmf-shuffle",
  "cmf-reset",
  "cmf-reset-view",
  "cmf-view-front",
  "cmf-view-back",
  "cmf-view-side",
] as const;
export type MenuAction = (typeof MENU_ACTIONS)[number];

const MENU_VIEWS: Partial<Record<MenuAction, string>> = {
  "cmf-view-front": "01-front",
  "cmf-view-back": "02-back",
  "cmf-view-side": "05-buttons-side",
};

export interface Surface {
  readonly viewport: HTMLElement;
  readonly canvas: HTMLCanvasElement;
}

export class Controller {
  readonly language = signal<Language>("en");
  readonly recipe = signal<Recipe>(defaultRecipe());
  readonly selectedPartId = signal("");
  readonly selectedView = signal("");
  readonly viewIsCustom = signal(false);
  readonly busy = signal(false);
  readonly status = signal<Message>(say("cmf_ready"));
  /** null until the first probe answers. */
  readonly canRender = signal<boolean | null>(null);
  readonly canExport = signal(false);
  readonly refreshing = signal(false);
  readonly motionPlaying = signal(false);
  /** The renderer shows the recipe's device (three.js) or the Duo's viewer is up. */
  readonly modelReady = signal(false);
  /** Text over the empty preview; null once a model is shown. */
  readonly emptyMessage = signal<Message | null>(say("cmf_model_loading"));

  readonly spec = computed<ModelSpec>(() => modelSpec(this.recipe.value.model));
  readonly pose = computed(() => activePose(this.spec.value, this.recipe.value.pose));
  readonly views = computed<readonly StudioView[]>(() => viewsFor(this.spec.value, this.pose.value));
  readonly presetId = computed(() => matchingPresetId(this.spec.value, this.recipe.value.parts));
  readonly fold = computed(() => clampProgress(this.recipe.value.fold));
  readonly t = computed<Translate>(() => {
    const language = this.language.value;
    return (key, values) => translate(language, key, values);
  });

  readonly #client: BridgeClient;
  #store: RecipeStore = EMPTY_STORE;
  #surface: Surface | null = null;
  #studio: Studio | null = null;
  #studioPromise: Promise<Studio> | null = null;
  #duo: DuoViewer | null = null;
  #requestId = 0;
  #abort: AbortController | null = null;
  #activeKey = "";
  #pendingSwitch = false;
  #motionFrame = 0;
  #suspended = false;
  #onMenuChange: (state: MenuState) => void = () => {};

  constructor(client: BridgeClient) {
    this.#client = client;
    this.language.value = client.welcome.language;
  }

  /** Reads the stored recipes and probes what the host can do. */
  async start(): Promise<void> {
    this.#store = readStore(await readState(this.#client, STORE_KEY));
    const recipe = restoreRecipe(this.#store);
    batch(() => {
      this.recipe.value = recipe;
      this.selectedPartId.value = firstPart(modelSpec(recipe.model)).id;
      // A visit opens on the back, where the finish reads, when the device has
      // that view; a switch or reset takes the device's own default instead.
      this.selectedView.value = this.views.value.some((view) => view.name === OPENING_VIEW)
        ? OPENING_VIEW
        : defaultViewFor(this.spec.value, this.pose.value);
    });
    this.#menuChanged();
    await this.#refreshCapabilities();
  }

  set onMenuChange(listener: (state: MenuState) => void) {
    this.#onMenuChange = listener;
    this.#menuChanged();
  }

  /** The preview's DOM, once the UI has rendered it. */
  attach(surface: Surface): void {
    this.#surface = surface;
    if (this.canRender.value) this.#scheduleRender();
  }

  // ---- recipe ---------------------------------------------------------------

  #setRecipe(recipe: Recipe): void {
    this.recipe.value = recipe;
    this.#menuChanged();
  }

  async #save(): Promise<boolean> {
    this.#store = saveIn(this.#store, this.recipe.value);
    return writeState(this.#client, STORE_KEY, this.#store);
  }

  async saveRecipe(): Promise<void> {
    const saved = await this.#save();
    this.status.value = say(saved ? "cmf_recipe_saved" : "cmf_export_download_failed");
  }

  /** Saves without a status line: every edit autosaves this way. */
  async saveRecipeQuietly(): Promise<void> {
    await this.#save();
  }

  selectPart(partId: string): void {
    if (this.spec.value.parts.some((part) => part.id === partId)) this.selectedPartId.value = partId;
  }

  paintSelected(colorId: string): void {
    if (this.busy.value || !this.spec.value.colors.some((color) => color.id === colorId)) return;
    const recipe = this.recipe.value;
    this.#setRecipe({ ...recipe, parts: { ...recipe.parts, [this.selectedPartId.value]: colorId } });
    void this.#save();
    this.#updateModel();
  }

  applyPreset(presetId: string): void {
    const preset = this.spec.value.presets[presetId];
    if (!preset) return;
    const recipe = this.recipe.value;
    this.#setRecipe({ ...recipe, parts: { ...recipe.parts, ...preset } });
    void this.#save();
    this.#updateModel();
    this.status.value = say("cmf_preset_applied");
  }

  shuffle(): void {
    const recipe = this.recipe.value;
    this.#setRecipe({ ...recipe, parts: shuffleParts(this.spec.value, recipe.parts, Math.random) });
    void this.#save();
    this.#updateModel();
    this.status.value = say("cmf_shuffle_done");
  }

  reset(): void {
    this.stopMotion();
    const recipe = this.recipe.value;
    this.#store = forget(this.#store, recipe.model);
    void writeState(this.#client, STORE_KEY, this.#store);
    batch(() => {
      this.#setRecipe(defaultRecipe(recipe.model, this.pose.value));
      this.selectedView.value = defaultViewFor(this.spec.value, this.pose.value);
      this.selectedPartId.value = firstPart(this.spec.value).id;
      this.viewIsCustom.value = false;
    });
    this.#updateModel();
    if (this.spec.value.motion === "neo") this.setFold(this.fold.value);
    this.status.value = say("cmf_reset_done");
  }

  selectModel(modelId: string): void {
    const spec = modelSpec(modelId);
    if (spec.id === this.recipe.value.model) return;
    this.stopMotion();
    this.#disposeDuo();
    batch(() => {
      this.#setRecipe(restoreRecipe(this.#store, spec.id));
      this.selectedPartId.value = firstPart(spec).id;
      this.selectedView.value = defaultViewFor(spec, this.pose.value);
      this.viewIsCustom.value = false;
      this.modelReady.value = false;
    });
    void this.#save();
    // A different device is different geometry: rebuild, do not recolour.
    this.#pendingSwitch = true;
    this.status.value = say("cmf_model_switched");
    void this.#refreshCapabilities();
  }

  selectPose(poseId: string): void {
    const spec = this.spec.value;
    if (spec.motion) {
      if (poseSpec(spec, poseId)?.id === poseId) this.animateFold(foldForPose(poseId, spec.motion));
      return;
    }
    if (poseSpec(spec, poseId)?.id !== poseId || poseId === this.pose.value) return;
    batch(() => {
      this.#setRecipe(recipeInPose(this.#store, spec.id, poseId));
      this.selectedPartId.value = firstPart(spec).id;
      this.selectedView.value = defaultViewFor(spec, poseId);
      this.modelReady.value = false;
    });
    void this.#save();
    // A different pose is a different asset.
    this.#pendingSwitch = true;
    this.#scheduleRender();
    this.status.value = say("cmf_model_switched");
  }

  // ---- fold -----------------------------------------------------------------

  setFold(value: number): void {
    const spec = this.spec.value;
    if (!spec.motion) return;
    const fold = clampProgress(value);
    this.#setRecipe({ ...this.recipe.value, fold, pose: poseForFold(fold) });
    if (spec.motion === "duo") this.#duo?.send({ type: "fold", progress: fold });
    else this.#studio?.setNeoFold(spec, fold);
  }

  stopMotion(): void {
    window.cancelAnimationFrame(this.#motionFrame);
    this.#motionFrame = 0;
    this.motionPlaying.value = false;
  }

  toggleMotion(): void {
    if (this.motionPlaying.value) {
      this.stopMotion();
      void this.#save();
    } else {
      this.animateFold(this.fold.value < 0.5 ? 1 : 0);
    }
  }

  animateFold(target: number): void {
    const spec = this.spec.value;
    if (!spec.motion) return;
    this.stopMotion();
    const from = this.fold.value;
    const to = clampProgress(target);
    if (reducedMotion() || Math.abs(to - from) < 0.001) {
      this.setFold(to);
      void this.#save();
      return;
    }
    const modelId = spec.id;
    const start = performance.now();
    const duration = Math.max(350, Math.abs(to - from) * 1800);
    const easing = spec.motion === "neo" ? neoEaseProgress : easeProgress;
    this.motionPlaying.value = true;
    const tick = (now: number): void => {
      if (this.recipe.value.model !== modelId || !this.motionPlaying.value) return;
      const progress = Math.min(1, (now - start) / duration);
      this.setFold(from + (to - from) * easing(progress));
      if (progress < 1) {
        this.#motionFrame = window.requestAnimationFrame(tick);
      } else {
        this.stopMotion();
        void this.#save();
      }
    };
    this.#motionFrame = window.requestAnimationFrame(tick);
  }

  // ---- views ----------------------------------------------------------------

  selectView(name: string): void {
    if (!this.views.value.some((view) => view.name === name)) return;
    batch(() => {
      this.selectedView.value = name;
      this.viewIsCustom.value = false;
    });
    this.#applyView(name, true);
    this.#menuChanged();
  }

  resetView(): void {
    // On the Duo this is also the way back from a drag: a turned device needs
    // a named angle to return to.
    if (!this.selectedView.value) this.selectedView.value = "02-back";
    this.viewIsCustom.value = false;
    this.#applyView(this.selectedView.value, true);
    this.#menuChanged();
  }

  /** The view the menus mark: none once the camera was dragged off a named view. */
  get currentView(): string {
    return this.viewIsCustom.value ? "" : this.selectedView.value;
  }

  #applyView(name: string, animate: boolean): void {
    if (this.spec.value.renderer === "lotus") {
      this.#duo?.send({ type: "view", name });
      return;
    }
    const view = this.views.value.find((entry): entry is CameraView => entry.name === name && isCameraView(entry));
    if (view) this.#studio?.frame(view, animate);
  }

  /** The Duo viewer reports the named angle the pointer settled on. */
  #duoAngle(angle: string): void {
    if (this.spec.value.motion !== "duo") return;
    // The scene offers corners the studio does not list; such an angle means
    // no listed view is current any more.
    const known = this.views.value.some((view) => view.name === angle);
    batch(() => {
      if (known) this.selectedView.value = angle;
      this.viewIsCustom.value = !known;
    });
    this.#menuChanged();
  }

  // ---- capabilities and loading --------------------------------------------

  async #refreshCapabilities(): Promise<void> {
    const requested = this.recipe.value.model;
    const spec = this.spec.value;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), CAPABILITIES_TIMEOUT_MS);
    const assetProbe = fetch(assetUrlFor(spec, this.pose.value), {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    }).then(
      (response) => response.ok,
      () => false,
    );
    const [available, serverExport] = await Promise.all([assetProbe, requestCapabilities(this.#client)]);
    window.clearTimeout(timer);
    if (this.recipe.value.model !== requested) return;
    batch(() => {
      this.canRender.value = available;
      // Every shipped USDZ exports in the browser; the Duo's scene cannot go
      // through the USD-only server path either.
      this.canExport.value = spec.motion !== "duo" && (available || serverExport);
      if (!available) this.emptyMessage.value = say("cmf_preview_unavailable");
    });
    this.#menuChanged();
    if (available) this.#scheduleRender();
    else this.#cancelRender();
  }

  #renderKey(): string {
    const spec = this.spec.value;
    return `${spec.id}|${spec.renderer ?? "usd"}|${assetUrlFor(spec, this.pose.value)}|${spec.motion ? "motion" : this.pose.value}`;
  }

  #cancelRender(): void {
    this.#requestId += 1;
    this.#abort?.abort();
    this.#abort = null;
    this.#activeKey = "";
    this.refreshing.value = false;
  }

  #scheduleRender(): void {
    if (!this.#surface || !this.canRender.value) return;
    const key = this.#renderKey();
    // Capability refresh and attach can both ask for the same asset during
    // startup; coalesce instead of aborting the first download.
    if (this.#activeKey === key && this.#abort) return;
    this.#abort?.abort();
    const abort = new AbortController();
    const requestId = ++this.#requestId;
    this.#abort = abort;
    this.#activeKey = key;
    batch(() => {
      this.refreshing.value = true;
      this.status.value = say(this.spec.value.renderer === "lotus" ? "cmf_model_loading" : "cmf_model_rendering");
    });
    const run =
      this.spec.value.renderer === "lotus"
        ? this.#loadDuo(requestId, abort.signal)
        : this.#loadUsd(requestId, abort.signal);
    void run.finally(() => {
      if (this.#requestId === requestId && this.#abort === abort) {
        this.#abort = null;
        this.#activeKey = "";
        this.refreshing.value = false;
      }
    });
  }

  #studioFor(surface: Surface): Promise<Studio> {
    if (!this.#studioPromise) {
      // three.js and the USD loader are the heavy part of the app: fetched
      // on the first three.js device, never for the Duo.
      this.#studioPromise = import("../render/studio.ts").then(async ({ Studio }) => {
        const studio = await Studio.create(surface.canvas, surface.viewport, () => this.#suspended || document.hidden);
        studio.onOrbit = () => {
          this.viewIsCustom.value = true;
          this.#menuChanged();
        };
        this.#studio = studio;
        return studio;
      });
    }
    return this.#studioPromise;
  }

  // The static source USDZ, recoloured in the browser; the host's server
  // export only when the asset is unreachable.
  async #fetchModel(recipe: Recipe, signal: AbortSignal): Promise<ArrayBuffer> {
    const spec = modelSpec(recipe.model);
    try {
      const response = await fetch(assetUrlFor(spec, activePose(spec, recipe.pose)), { signal });
      if (response.ok) return await response.arrayBuffer();
    } catch (error) {
      if (isAbort(error)) throw error;
    }
    const bytes = await requestServerExport(
      this.#client,
      serviceRecipe(spec.motion === "neo" ? { ...recipe, pose: "open" } : recipe),
    );
    return bytes.slice().buffer;
  }

  async #loadUsd(requestId: number, signal: AbortSignal): Promise<void> {
    const surface = this.#surface;
    if (!surface) return;
    this.#disposeDuo();
    const recipe = this.recipe.value;
    const spec = modelSpec(recipe.model);
    const current = (): boolean => requestId === this.#requestId;
    try {
      const [studio, buffer] = await Promise.all([this.#studioFor(surface), this.#fetchModel(recipe, signal)]);
      if (!current()) return;
      const refit = await studio.load(
        buffer,
        { spec, pose: activePose(spec, recipe.pose), fold: clampProgress(recipe.fold), parts: this.recipe.value.parts },
        current,
      );
      if (!current()) return;
      // A colour chosen while the model was loading reaches it now.
      studio.paint(spec, this.pose.value, this.recipe.value.parts);
      if (this.#suspended) studio.stop();
      batch(() => {
        this.modelReady.value = true;
        this.emptyMessage.value = null;
        this.status.value = say("cmf_model_done");
      });
      // A different device is a different size: re-frame it the way a first
      // load would. A load that is overtaken can consume the switch flag
      // before the winning one commits, so the studio also says which device
      // its camera is framed for.
      if (refit || this.#pendingSwitch) {
        this.#pendingSwitch = false;
        studio.markFramed();
        this.viewIsCustom.value = false;
        this.#applyView(this.selectedView.value, false);
        studio.settleDeferredFrame();
      } else {
        studio.render();
      }
      this.#menuChanged();
    } catch (error) {
      if (isAbort(error) || !current()) return;
      const message: Message = (t) =>
        modelFailureMessage(t, errorText(error) === "empty" ? new Error(t("cmf_model_empty")) : error);
      batch(() => {
        this.status.value = message;
        if (!this.#studio?.hasModel) this.emptyMessage.value = message;
      });
    }
  }

  async #loadDuo(requestId: number, signal: AbortSignal): Promise<void> {
    const surface = this.#surface;
    if (!surface) return;
    this.#studio?.stop();
    this.#studio?.clear();
    this.#disposeDuo();
    surface.canvas.hidden = true;
    batch(() => {
      this.modelReady.value = false;
      this.emptyMessage.value = say("cmf_model_loading");
    });
    const spec = this.spec.value;
    try {
      const duo = await DuoViewer.load(
        surface.viewport,
        this.t.value(spec.labelKey),
        new URL(spec.asset, document.baseURI).href,
        (angle) => this.#duoAngle(angle),
        signal,
      );
      if (requestId !== this.#requestId) {
        duo.dispose();
        return;
      }
      this.#duo = duo;
      batch(() => {
        this.modelReady.value = true;
        this.emptyMessage.value = null;
        this.status.value = say(spec.motion ? "cmf_motion_ready" : "cmf_official_ready");
      });
      this.#sendDuoColors();
      if (spec.motion) this.setFold(this.fold.value);
      else duo.send({ type: "view", name: this.selectedView.value });
      if (this.#suspended) duo.send({ type: "suspend" });
      this.#menuChanged();
    } catch (error) {
      if (error instanceof AbortedError || requestId !== this.#requestId) return;
      const message: Message = (t) => modelFailureMessage(t, errorText(error) === "timeout" ? new Error("") : error);
      batch(() => {
        this.status.value = message;
        this.emptyMessage.value = message;
      });
    }
  }

  #disposeDuo(): void {
    this.#duo?.dispose();
    this.#duo = null;
  }

  #sendDuoColors(): void {
    const spec = this.spec.value;
    const parts = this.recipe.value.parts;
    this.#duo?.send({
      type: "colors",
      parts,
      colors: Object.fromEntries(spec.parts.map((part) => [part.id, finishFor(spec, parts[part.id]).hex])),
    });
  }

  /** Repaints the shown model, or rebuilds it when the shown one is another device. */
  #updateModel(): void {
    const spec = this.spec.value;
    if (spec.renderer === "lotus") {
      this.#sendDuoColors();
      return;
    }
    // Never paint one device (or pose) in another's finishes: when the shown
    // model is not the recipe's, rebuild instead.
    if (this.#studio?.paint(spec, this.pose.value, this.recipe.value.parts)) {
      this.status.value = say("cmf_model_live");
      return;
    }
    this.#scheduleRender();
  }

  // ---- exports --------------------------------------------------------------

  #setBusy(busy: boolean, message?: Message): void {
    batch(() => {
      this.busy.value = busy;
      if (message) this.status.value = message;
    });
    if (busy) this.stopMotion();
    this.#menuChanged();
  }

  async exportUsdz(): Promise<void> {
    const spec = this.spec.value;
    if (spec.motion === "duo") {
      this.status.value = say("cmf_duo_usdz_unavailable");
      return;
    }
    if (this.busy.value) return;
    this.#setBusy(true, say("cmf_exporting"));
    const recipe = this.recipe.value;
    try {
      let blob: Blob;
      try {
        const response = await fetch(assetUrlFor(spec, this.pose.value), { cache: "force-cache" });
        if (!response.ok) throw new Error(response.statusText || `HTTP ${response.status}`);
        const { bytes } = repackageUsdz(await response.arrayBuffer(), exportRecipe(spec, recipe));
        // fflate and the bridge return plain ArrayBuffer-backed arrays, never shared memory.
        blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: USDZ_MIME });
      } catch (error) {
        // The folding MacBook's hinge is only applied here; the server
        // exporter would ship it in the asset's own pose.
        if (spec.motion) throw error;
        const bytes = await requestServerExport(this.#client, serviceRecipe(recipe));
        // Same: the bridge delivers a structured-clone copy on a plain ArrayBuffer.
        blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: USDZ_MIME });
      }
      // The model built either way; claim "exported" only once the host took the file.
      const saved = await exportFile(this.#client, usdzFileName(recipe.name), USDZ_MIME, blob);
      this.status.value = say(saved ? "cmf_export_done" : "cmf_export_download_failed");
    } catch (error) {
      this.status.value = say("cmf_export_failed", errorText(error));
    } finally {
      this.#setBusy(false);
    }
  }

  async exportViews(): Promise<void> {
    if (this.busy.value) return;
    this.stopMotion();
    if (this.spec.value.renderer === "lotus") return this.#exportDuoViews();
    const studio = this.#studio;
    if (!studio?.hasModel || !this.modelReady.value) {
      this.status.value = say("cmf_export_views_unavailable");
      return;
    }
    this.#setBusy(true, say("cmf_exporting_views"));
    const recipe = this.recipe.value;
    try {
      const shots = await studio.stills(this.views.value.filter(isCameraView));
      let allSaved = true;
      for (const [name, dataUrl] of shots) {
        const saved = await exportFile(
          this.#client,
          viewFileName(recipe.name, recipe.model, name),
          PNG_MIME,
          dataUrlToPngBlob(dataUrl),
        );
        if (!saved) allSaved = false;
      }
      this.status.value = say(allSaved ? "cmf_export_views_done" : "cmf_export_views_download_failed");
    } catch (error) {
      this.status.value = say("cmf_export_views_failed", errorText(error));
    } finally {
      this.#applyView(this.selectedView.value, false);
      this.#setBusy(false);
    }
  }

  async #exportDuoViews(): Promise<void> {
    const duo = this.#duo;
    if (!duo?.ready) {
      this.status.value = say("cmf_export_views_unavailable");
      return;
    }
    const spec = this.spec.value;
    const previous = this.fold.value;
    this.#setBusy(true, say("cmf_exporting_views"));
    try {
      const shots: [string, number | null][] =
        spec.motion === "duo"
          ? [
              ["closed", 0],
              ["half", 1 / 3],
              ["open", 1],
            ]
          : this.views.value.map((view) => [view.name, null]);
      let allSaved = true;
      for (const [name, progress] of shots) {
        if (progress === null) duo.send({ type: "view", name });
        else this.setFold(progress);
        const blob = await duo.snapshot();
        const saved = await exportFile(
          this.#client,
          viewFileName(this.recipe.value.name, spec.id, name),
          PNG_MIME,
          blob,
        );
        if (!saved) allSaved = false;
      }
      this.status.value = say(allSaved ? "cmf_export_views_done" : "cmf_export_views_download_failed");
    } catch (error) {
      this.status.value = say("cmf_export_views_failed", errorText(error));
    } finally {
      if (spec.motion === "duo") this.setFold(previous);
      else duo.send({ type: "view", name: this.selectedView.value });
      this.#setBusy(false);
    }
  }

  async exportFoldVideo(): Promise<void> {
    const duo = this.#duo;
    if (!duo?.ready || this.busy.value) return;
    this.#setBusy(true, say("cmf_duo_exporting_video"));
    try {
      const { blob, mime } = await duo.record();
      const saved = await exportFile(this.#client, foldVideoFileName(this.recipe.value.name), mime || WEBM_MIME, blob);
      this.status.value = say(saved ? "cmf_duo_video_done" : "cmf_export_download_failed");
    } catch (error) {
      this.status.value = say("cmf_duo_video_failed", errorText(error));
    } finally {
      this.#setBusy(false);
    }
  }

  get duoReady(): boolean {
    return Boolean(this.#duo?.ready);
  }

  // ---- menus ----------------------------------------------------------------

  /** Whether a menu action can run now. */
  available(action: MenuAction): boolean {
    if (this.busy.value) return false;
    const view = MENU_VIEWS[action];
    if (view) return this.views.value.some((entry) => entry.name === view);
    if (action === "cmf-export-usdz") return this.canExport.value;
    if (action === "cmf-reset-view") return Boolean(this.canRender.value);
    return true;
  }

  menuState(): MenuState {
    const available: Record<string, boolean> = {};
    const checked: Record<string, boolean> = {};
    for (const action of MENU_ACTIONS) {
      available[action] = this.available(action);
      const view = MENU_VIEWS[action];
      if (view) checked[action] = this.currentView === view;
    }
    return { available, checked };
  }

  #menuChanged(): void {
    this.#onMenuChange(this.menuState());
  }

  /** Runs a menu action; answers whether this window handled it. */
  runMenuCommand(action: string): boolean {
    // Widening the tuple to test a plain string; the next line narrows after the test.
    if (!(MENU_ACTIONS as readonly string[]).includes(action)) return false;
    const known = action as MenuAction;
    if (!this.available(known)) return true;
    const view = MENU_VIEWS[known];
    if (view) {
      this.selectView(view);
      return true;
    }
    const commands: Partial<Record<MenuAction, () => unknown>> = {
      "cmf-save-recipe": () => this.saveRecipe(),
      "cmf-export-usdz": () => this.exportUsdz(),
      "cmf-shuffle": () => this.shuffle(),
      "cmf-reset": () => this.reset(),
      "cmf-reset-view": () => this.resetView(),
    };
    void commands[known]?.();
    return true;
  }

  // ---- lifecycle ------------------------------------------------------------

  // A hidden studio keeps a WebGL context, a model and a per-frame damping
  // loop alive. Suspend stops the loop and the in-flight load; the scene
  // stays built, so coming back is one repaint rather than a reload.
  suspend(_cause: SuspendCause): void {
    this.#suspended = true;
    this.stopMotion();
    this.#duo?.send({ type: "suspend" });
    if (this.spec.value.renderer === "lotus") return;
    this.#studio?.stop();
    if (!this.modelReady.value) this.#cancelRender();
  }

  resume(): void {
    this.#suspended = false;
    if (this.spec.value.renderer === "lotus") {
      this.#duo?.send({ type: "resume" });
      return;
    }
    const studio = this.#studio;
    if (studio) {
      studio.start();
      studio.resize();
    }
    if (!this.modelReady.value) this.#scheduleRender();
  }

  dispose(): void {
    this.stopMotion();
    this.#cancelRender();
    this.#disposeDuo();
    this.#studio?.dispose();
    this.#studio = null;
    this.#studioPromise = null;
  }
}
