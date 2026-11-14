// The studio window's content. Components read the controller's signals and
// call its methods; none of them owns state of its own beyond DOM refs.

import type { TargetedKeyboardEvent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { Controller } from "../app/controller.ts";
import { MODELS } from "../model/catalog.ts";
import { finishFor } from "../model/models.ts";

interface Props {
  readonly studio: Controller;
}

/**
 * Arrow keys, Home and End move through a group and choose what they land on,
 * the way the desk's roving groups did.
 */
function rovingKeys(orientation: "vertical" | "horizontal", selector: string) {
  const previous = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const next = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  return (event: TargetedKeyboardEvent<HTMLElement>): void => {
    if (![previous, next, "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(selector)].filter(
      (button) => !button.disabled,
    );
    // Only compared by identity; a non-button simply is not found.
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    let target = index;
    if (event.key === previous) target = (index - 1 + buttons.length) % buttons.length;
    if (event.key === next) target = (index + 1) % buttons.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = buttons.length - 1;
    buttons[target]?.focus();
    buttons[target]?.click();
  };
}

function StatusBar({ studio }: Props) {
  const t = studio.t.value;
  const canRender = studio.canRender.value;
  return (
    <div class="kit-status-bar cmf-status-bar">
      <span role="status" aria-live="polite" aria-atomic="true" data-cmf-status>
        {studio.status.value(t)}
      </span>
      <span data-cmf-capabilities>
        {canRender === null ? "--" : t(canRender ? "cmf_cap_ready" : "cmf_cap_missing")}
      </span>
    </div>
  );
}

function Toolbar({ studio }: Props) {
  const t = studio.t.value;
  const spec = studio.spec.value;
  const busy = studio.busy.value;
  const canRender = Boolean(studio.canRender.value);
  const canExport = studio.canExport.value;
  const duo = spec.motion === "duo";
  return (
    <aside class="cmf-panel cmf-setup-panel">
      <label class="cmf-control cmf-control-model" title={t("balloon_cmf_model")}>
        <span>{t("cmf_model")}</span>
        <span class="kit-select-wrap">
          <select
            class="kit-field"
            data-cmf-model
            value={spec.id}
            disabled={busy}
            onChange={(event) => studio.selectModel(event.currentTarget.value)}
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {t(model.labelKey)}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label class="cmf-control cmf-control-preset" title={t("balloon_cmf_preset")}>
        <span>{t("cmf_preset")}</span>
        <span class="kit-select-wrap">
          <select
            class="kit-field"
            data-cmf-preset
            value={studio.presetId.value}
            disabled={busy}
            onChange={(event) => studio.applyPreset(event.currentTarget.value)}
          >
            <option value="">{t("cmf_preset_custom")}</option>
            {Object.keys(spec.presets).map((id) => {
              const key = spec.presetLabelKeys[id];
              return (
                <option key={id} value={id}>
                  {key ? t(key) : id}
                </option>
              );
            })}
          </select>
        </span>
      </label>
      <div class="cmf-setup-actions">
        <button
          class="kit-button"
          type="button"
          data-cmf-shuffle
          disabled={busy}
          title={t("balloon_cmf_shuffle")}
          onClick={() => studio.shuffle()}
        >
          {t("cmf_shuffle")}
        </button>
        <button
          class="kit-button"
          type="button"
          data-cmf-reset
          disabled={busy}
          title={t("balloon_cmf_reset")}
          onClick={() => studio.reset()}
        >
          {t("reset")}
        </button>
      </div>
      <p class="cmf-autosave-note">{t("cmf_autosave")}</p>
      <div class="cmf-button-stack">
        <button
          class="kit-button"
          type="button"
          data-cmf-reset-view
          aria-label={t("cmf_reset_view")}
          disabled={busy || !canRender}
          title={t(canRender ? "balloon_cmf_reset_view" : "balloon_cmf_needs_model")}
          onClick={() => studio.resetView()}
        >
          <span class="mobile-control-long">{t("cmf_reset_view")}</span>
          <span class="mobile-control-short">{t("cmf_reset_view_short")}</span>
        </button>
        <button
          class="kit-button"
          type="button"
          data-cmf-export
          aria-label={t("cmf_export_usdz")}
          disabled={busy || !canExport}
          title={
            duo ? t("balloon_cmf_duo_export_disabled") : t(canExport ? "balloon_cmf_export" : "balloon_cmf_needs_model")
          }
          onClick={() => void studio.exportUsdz()}
        >
          <span class="mobile-control-long">{t("cmf_export_usdz")}</span>
          <span class="mobile-control-short">{t("cmf_export_short")}</span>
        </button>
        <button
          class="kit-button"
          type="button"
          data-cmf-export-views
          aria-label={t("cmf_export_views")}
          disabled={busy || !canRender}
          title={canRender ? "" : t("balloon_cmf_needs_model")}
          onClick={() => void studio.exportViews()}
        >
          <span class="mobile-control-long">{t("cmf_export_views")}</span>
          <span class="mobile-control-short">{t("cmf_export_views_short")}</span>
        </button>
      </div>
    </aside>
  );
}

function MotionControls({ studio }: Props) {
  const t = studio.t.value;
  const spec = studio.spec.value;
  const poses = spec.poses ?? [];
  const motion = spec.motion;
  if (!motion && !poses.length) return null;
  const busy = studio.busy.value;
  const ready = studio.modelReady.value;
  const percent = Math.round(studio.fold.value * 100);
  // One chooser, two jobs: a size on the Pro pair and a form on the MacBook.
  // Say which one it is.
  return (
    <div class="cmf-motion-controls">
      {poses.length ? (
        <label class="cmf-control cmf-control-pose" title={t("balloon_cmf_pose")}>
          <span>{t(motion ? "cmf_pose" : "cmf_size")}</span>
          <span class="kit-select-wrap">
            <select
              class="kit-field"
              data-cmf-pose
              value={studio.pose.value}
              disabled={busy}
              onChange={(event) => studio.selectPose(event.currentTarget.value)}
            >
              {poses.map((pose) => (
                <option key={pose.id} value={pose.id}>
                  {t(pose.labelKey)}
                </option>
              ))}
            </select>
          </span>
        </label>
      ) : null}
      {motion ? (
        <>
          <label class="cmf-fold-label" for="cmf-fold">
            {t("cmf_fold")}
          </label>
          <input
            id="cmf-fold"
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={String(studio.fold.value)}
            disabled={busy || !ready}
            aria-valuetext={t("cmf_fold_value", { percent })}
            onPointerDown={() => studio.stopMotion()}
            onInput={(event) => {
              // Stopping playback must not overwrite the value just dragged to.
              const value = Number(event.currentTarget.value);
              studio.stopMotion();
              studio.setFold(value);
            }}
            onChange={(event) => {
              // Some touch and keyboard paths emit only `change`.
              studio.setFold(Number(event.currentTarget.value));
              void studio.saveRecipeQuietly();
            }}
          />
          <output for="cmf-fold">{percent}%</output>
          <button
            class="kit-button cmf-motion-play"
            type="button"
            disabled={busy || !ready}
            onClick={() => studio.toggleMotion()}
          >
            {t(studio.motionPlaying.value ? "cmf_motion_pause" : "cmf_motion_play")}
          </button>
          {motion === "duo" ? (
            // The fold video belongs on Play's row: it is the other thing Play produces.
            <button
              class="kit-button cmf-duo-video"
              type="button"
              disabled={busy || !ready}
              onClick={() => void studio.exportFoldVideo()}
            >
              {t("cmf_duo_export_video")}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ViewStrip({ studio }: Props) {
  const t = studio.t.value;
  const selected = studio.selectedView.value;
  const custom = studio.viewIsCustom.value;
  return (
    <div
      class="cmf-view-strip"
      role="toolbar"
      aria-label={t("cmf_model_views")}
      title={t("balloon_cmf_views")}
      onKeyDown={rovingKeys("horizontal", "[data-cmf-view]")}
    >
      {studio.views.value.map((view) => {
        const active = !custom && view.name === selected;
        return (
          <button
            key={view.name}
            type="button"
            class={`cmf-view-thumb cmf-view-control${active ? " is-active" : ""}`}
            data-cmf-view={view.name}
            aria-pressed={active}
            tabIndex={view.name === selected ? 0 : -1}
            onClick={() => studio.selectView(view.name)}
          >
            <span>{t(view.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Preview({ studio }: Props) {
  const t = studio.t.value;
  const spec = studio.spec.value;
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (viewport.current && canvas.current) studio.attach({ viewport: viewport.current, canvas: canvas.current });
  }, [studio]);
  const refreshing = studio.refreshing.value;
  const recipe = studio.recipe.value;
  const part = spec.parts.find((entry) => entry.id === studio.selectedPartId.value) ?? spec.parts[0];
  const finish = finishFor(spec, part ? recipe.parts[part.id] : undefined);
  const empty = studio.emptyMessage.value;
  const indicator = refreshing
    ? "cmf_model_updating"
    : spec.motion
      ? "cmf_model_motion"
      : spec.renderer === "lotus"
        ? "cmf_model_official"
        : "cmf_model_interactive";
  return (
    <section
      class={`cmf-preview-panel${refreshing ? " is-refreshing" : ""}`}
      aria-labelledby="cmf-preview-title"
      aria-busy={refreshing}
    >
      <header class="cmf-preview-head">
        <div>
          <h3 id="cmf-preview-title">{t("preview")}</h3>
          <p data-cmf-selection-summary>{part ? `${t(part.labelKey)} · ${t(finish.labelKey)}` : ""}</p>
        </div>
        <span class="cmf-live-indicator" data-state={refreshing ? "loading" : "ready"} title={t("balloon_cmf_live")}>
          {t(indicator)}
        </span>
      </header>
      <div class="cmf-preview-stage" ref={viewport}>
        <canvas ref={canvas} tabIndex={0} aria-label={t("cmf_model_canvas")} hidden />
        {empty ? <p class="cmf-preview-empty">{empty(t)}</p> : null}
      </div>
      <MotionControls studio={studio} />
      <ViewStrip studio={studio} />
    </section>
  );
}

function Inspector({ studio }: Props) {
  const t = studio.t.value;
  const spec = studio.spec.value;
  const recipe = studio.recipe.value;
  const busy = studio.busy.value;
  const selectedPart = studio.selectedPartId.value;
  const selectedColor = finishFor(spec, recipe.parts[selectedPart]).id;
  return (
    <aside class="cmf-panel cmf-parts-panel">
      <header class="cmf-parts-head">
        <h3>{t("cmf_parts")}</h3>
        <p>{t("cmf_parts_hint")}</p>
      </header>
      <fieldset
        class="cmf-palette"
        aria-label={t("cmf_finishes")}
        title={t("balloon_cmf_palette")}
        onKeyDown={rovingKeys("horizontal", "[data-cmf-color]")}
      >
        {spec.colors.map((color) => {
          const selected = color.id === selectedColor;
          return (
            <button
              key={color.id}
              type="button"
              class={`cmf-color-chip${selected ? " is-selected" : ""}`}
              data-cmf-color={color.id}
              aria-label={t(color.labelKey)}
              title={t(color.labelKey)}
              aria-pressed={selected}
              tabIndex={selected ? 0 : -1}
              disabled={busy}
              onClick={() => studio.paintSelected(color.id)}
            >
              <span class="cmf-color-chip-swatch" style={{ "--cmf-swatch": color.hex }} />
              <span>{t(color.labelKey)}</span>
            </button>
          );
        })}
      </fieldset>
      <div
        class="cmf-parts kit-scroll"
        role="listbox"
        aria-label={t("cmf_parts")}
        title={t("balloon_cmf_parts")}
        onKeyDown={rovingKeys("vertical", "[data-cmf-part-row]")}
      >
        {spec.parts.map((part) => {
          const selected = part.id === selectedPart;
          const finish = finishFor(spec, recipe.parts[part.id]);
          return (
            <button
              key={part.id}
              type="button"
              role="option"
              class={`cmf-part-row${selected ? " is-selected" : ""}`}
              data-cmf-part-row={part.id}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={busy}
              onClick={() => studio.selectPart(part.id)}
            >
              <span class="cmf-part-label">{t(part.labelKey)}</span>
              <span class="cmf-part-current">
                <span class="cmf-part-swatch" style={{ "--cmf-swatch": finish.hex }} />
                <span>{t(finish.labelKey)}</span>
              </span>
              <span class="cmf-part-affordance" aria-hidden="true">
                ›
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function App({ studio }: Props) {
  return (
    <div class="cmf-studio kit-pane">
      <StatusBar studio={studio} />
      <div class="cmf-studio-pane">
        <Toolbar studio={studio} />
        <Preview studio={studio} />
        <Inspector studio={studio} />
      </div>
    </div>
  );
}
