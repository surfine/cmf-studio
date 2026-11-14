// The devices CMF Studio can recolour: finishes, parts, presets, camera views
// and the mesh names that stand in for a missing material name. Data only.

import type { StringKey } from "../strings/index.ts";

export interface Finish {
  readonly id: string;
  readonly hex: string;
  readonly labelKey: StringKey;
}

export interface Part {
  readonly id: string;
  readonly labelKey: StringKey;
}

/** A camera set entry. `direction` and `up` are unit-free vectors; `frame` scales the fit. */
export interface CameraView {
  readonly name: string;
  readonly labelKey: StringKey;
  readonly direction: readonly [number, number, number];
  readonly up: readonly [number, number, number];
  readonly frame: number;
  /** Where the camera aims, as fractions of the model's bounds from its centre. */
  readonly targetOffset?: readonly [number, number, number];
}

/** A named camera angle of the Duo's own scene. */
export interface NamedAngle {
  readonly name: string;
  readonly labelKey: StringKey;
}

export interface Pose {
  readonly id: string;
  readonly labelKey: StringKey;
  readonly asset?: string;
}

/** Part id → finish id. */
export type PartColors = Readonly<Record<string, string>>;
export type Presets = Readonly<Record<string, PartColors>>;
export type MeshParts = Readonly<Record<string, string>>;

/** "duo": the folding phone in its own scene viewer. "neo": the MacBook hinge driven here. */
export type Motion = "duo" | "neo";

export interface ModelSpec {
  readonly id: string;
  readonly asset: string;
  readonly labelKey: StringKey;
  readonly colors: readonly Finish[];
  readonly parts: readonly Part[];
  readonly presets: Presets;
  readonly presetLabelKeys: Readonly<Record<string, StringKey>>;
  readonly meshParts?: MeshParts;
  readonly poses?: readonly Pose[];
  readonly motion?: Motion;
  /** "lotus": rendered by the vendor's scene viewer in a frame, not by three.js. */
  readonly renderer?: "lotus";
  readonly defaultView?: string;
  readonly views?: readonly NamedAngle[] | Readonly<Record<string, readonly CameraView[]>>;
  /** A rotation about Y applied before framing, for an asset authored facing the other way. */
  readonly spin?: number;
}

// Only finishes Apple actually shipped on the part. Hexes are sampled from
// Apple's own store swatches; the server keeps the same ids and values.
const IPHONE_17_COLORS: readonly Finish[] = [
  { id: "black17", hex: "#353839", labelKey: "cmf_color_black17" },
  { id: "lavender17", hex: "#dfceea", labelKey: "cmf_color_lavender17" },
  { id: "mistBlue17", hex: "#96aed1", labelKey: "cmf_color_mist_blue17" },
  { id: "sage17", hex: "#a9b689", labelKey: "cmf_color_sage17" },
  { id: "white17", hex: "#f5f5f5", labelKey: "cmf_color_white17" },
];
const IPHONE_17_PRO_COLORS: readonly Finish[] = [
  { id: "cosmicOrange17Pro", hex: "#f78039", labelKey: "cmf_color_cosmic_orange17pro" },
  { id: "deepBlue17Pro", hex: "#47547e", labelKey: "cmf_color_deep_blue17pro" },
  { id: "silver17Pro", hex: "#e7e7e7", labelKey: "cmf_color_silver17pro" },
];
const IPHONE_18_PRO_COLORS: readonly Finish[] = [
  { id: "silver18Pro", hex: "#c4c4c4", labelKey: "cmf_color_silver18pro" },
  { id: "burgundy18Pro", hex: "#2e0f14", labelKey: "cmf_color_burgundy18pro" },
  { id: "glacier18Pro", hex: "#a3b1c4", labelKey: "cmf_color_glacier18pro" },
  { id: "black18Pro", hex: "#242424", labelKey: "cmf_color_black18pro" },
];
const IPHONE_DUO_COLORS: readonly Finish[] = [
  { id: "starWhiteDuo", hex: "#f7f6f5", labelKey: "cmf_color_star_white_duo" },
  { id: "nightSkyDuo", hex: "#394452", labelKey: "cmf_color_night_sky_duo" },
];
const IPHONE_18_PRO_MESH_PARTS: MeshParts = Object.freeze({
  tGmDwIVAJzsXtCr: "actionButton",
  IhutpDtXiHOXZQQ: "volumeUp",
  MLXiLvzAcyadwsO: "volumeDown",
  PiNlHXRokKeMMue: "sideButton",
  BBOLhsUzCqVnqIr: "cameraControl",
  RkmKFSzCSaemljP: "cameraControl",
  uzPNjLhCsKQHKkA: "cameraControl",
  tSzbeyqDWPqajtE: "backGlass",
  lHgsWfYosJjEHHx: "backGlass",
});
const IPHONE_17E_COLORS: readonly Finish[] = [
  { id: "black17e", hex: "#4a4e51", labelKey: "cmf_color_black17e" },
  { id: "white17e", hex: "#fafafa", labelKey: "cmf_color_white17e" },
  { id: "softPink17e", hex: "#fce7e6", labelKey: "cmf_color_soft_pink17e" },
];
const IPHONE_AIR_COLORS: readonly Finish[] = [
  { id: "spaceBlackAir", hex: "#131313", labelKey: "cmf_color_space_black_air" },
  { id: "cloudWhiteAir", hex: "#fcfcfc", labelKey: "cmf_color_cloud_white_air" },
  { id: "lightGoldAir", hex: "#faf3e5", labelKey: "cmf_color_light_gold_air" },
  { id: "skyBlueAir", hex: "#e5f2fa", labelKey: "cmf_color_sky_blue_air" },
];
// MacBook Neo official finishes (sampled from apple.com.cn store swatches).
const MACBOOK_NEO_COLORS: readonly Finish[] = [
  { id: "silverNeo", hex: "#e5e6e7", labelKey: "cmf_color_silver_neo" },
  { id: "blushNeo", hex: "#ead5d4", labelKey: "cmf_color_blush_neo" },
  { id: "citrusNeo", hex: "#dddc8c", labelKey: "cmf_color_citrus_neo" },
  { id: "indigoNeo", hex: "#67738b", labelKey: "cmf_color_indigo_neo" },
];
const IPHONE_17_PARTS: readonly Part[] = [
  { id: "frame", labelKey: "cmf_part_frame" },
  { id: "backGlass", labelKey: "cmf_part_back_glass" },
  { id: "volumeUp", labelKey: "cmf_part_volume_up" },
  { id: "volumeDown", labelKey: "cmf_part_volume_down" },
  { id: "actionButton", labelKey: "cmf_part_action_button" },
  { id: "cameraControl", labelKey: "cmf_part_camera_control" },
  { id: "sideButton", labelKey: "cmf_part_side_button" },
  { id: "simTray", labelKey: "cmf_part_sim_tray" },
  { id: "usbC", labelKey: "cmf_part_usb_c" },
  // No camera-area part: on every one of these phones the plateau and the
  // lens rings are the same anodised body, and Apple sells no contrasting
  // ring. Those meshes follow the frame finish through the shared pass.
];
// The Pro line and the Air ship as Apple's eSIM AR build: no SIM tray.
const IPHONE_17_PRO_PARTS: readonly Part[] = IPHONE_17_PARTS.filter((part) => part.id !== "simTray");
const IPHONE_AIR_PARTS: readonly Part[] = IPHONE_17_PARTS.filter((part) => part.id !== "simTray");
// The 17e has neither a SIM tray nor Camera Control.
const IPHONE_17E_PARTS: readonly Part[] = IPHONE_17_PARTS.filter(
  (part) => part.id !== "simTray" && part.id !== "cameraControl",
);
// The folding phone splits differently from the slabs, because it has parts
// they do not: a hinge spine down the centre and a camera plateau raised off
// the back. Both are separately painted in the scene, so both are separately
// paintable here. The material-to-part mapping and the measurements behind
// it live in assets/cmf/iphone-duo/viewer.js.
const IPHONE_DUO_PARTS: readonly Part[] = [
  { id: "frame", labelKey: "cmf_part_frame" },
  { id: "hinge", labelKey: "cmf_part_hinge" },
  { id: "backGlass", labelKey: "cmf_part_back_glass" },
  { id: "cameraPlateau", labelKey: "cmf_part_camera_plateau" },
  { id: "sideButton", labelKey: "cmf_part_side_button" },
];
// Names match the scene's own InteractiveCamera angles; the viewer asks for
// them by name. Order is the order a finish reads in: front, back, sides.
const IPHONE_DUO_VIEWS: readonly NamedAngle[] = [
  { name: "front", labelKey: "cmf_view_front" },
  { name: "back", labelKey: "cmf_view_back" },
  { name: "left", labelKey: "cmf_view_side_left" },
  { name: "right", labelKey: "cmf_view_side_right" },
];

// Apple self-service parts that ship in every finish: lid (display
// assembly), keyboard deck (top case), bottom case, keycaps, USB-C boards.
const MACBOOK_NEO_PARTS: readonly Part[] = [
  { id: "lid", labelKey: "cmf_part_lid" },
  { id: "topCase", labelKey: "cmf_part_top_case" },
  { id: "bottomCase", labelKey: "cmf_part_bottom_case" },
  { id: "keycaps", labelKey: "cmf_part_keycaps" },
  { id: "trackpad", labelKey: "cmf_part_trackpad" },
  { id: "usbC", labelKey: "cmf_part_usb_c" },
];
export const MATERIAL_PART_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  frame: "frame",
  frameSide: "frame",
  backGlass: "backGlass",
  volumeUp: "volumeUp",
  volumeDown: "volumeDown",
  actionOrSim: "actionButton",
  cameraControl: "cameraControl",
  sideButton: "sideButton",
  simTray: "simTray",
  usbC: "usbC",
  screwOrSpeaker: "usbC",
  trackpad: "trackpad",
});
// Fallback only: the served model already carries the part in its material
// name. These keep the live view honest if a material name ever goes missing.
const IPHONE_17_MESH_PARTS: MeshParts = Object.freeze({
  psstnNZmWlkGpGJ: "actionButton",
  aabQdFuOayXiOAy: "volumeUp",
  fQDGdPVinVFkDgA: "volumeDown",
  DRSYKrXjlbGZrGD: "sideButton",
  SdLaeCAiKFeDCSz: "cameraControl",
  ohRsmdOpfcWOasQ: "cameraControl",
  kQtKvBruXjVcFqZ: "cameraControl",
  tXyqmuCYyFmMJhw: "simTray",
});
const IPHONE_17_PRO_MESH_PARTS: MeshParts = Object.freeze({
  MurNHnRHsVHWaxp: "actionButton",
  YMhcZuJreIkCuNy: "volumeUp",
  VOwOyTIgUdFOGSH: "volumeDown",
  oKryyXghVaYcnxt: "sideButton",
  LXcFmsoszzDyTrR: "cameraControl",
  VAAxcOWnKYsQZew: "cameraControl",
  AepdVkPZeAmapGK: "cameraControl",
  gCMlCSdRJrizepS: "backGlass",
  vDwikmBvgqpSImF: "backGlass",
});
const IPHONE_17E_MESH_PARTS: MeshParts = Object.freeze({
  MNFvcyIPvJHZGho: "actionButton",
  wvehvZgKSiHShKe: "volumeUp",
  grjpZqMAFshUbYL: "volumeDown",
  bAdaiwDyPNSIOTz: "sideButton",
});
const IPHONE_AIR_MESH_PARTS: MeshParts = Object.freeze({
  YkCTFFnfNRTcvhu: "actionButton",
  gxvVEZnHDLTMeDu: "volumeUp",
  ZozkCecQqsHKRdW: "volumeDown",
  eFAjqNXqlosYdcs: "sideButton",
  zvTKDcDzjwBqPXl: "cameraControl",
  oeeuEHMiwxuyjiE: "cameraControl",
  mKggmceRYtWVyLb: "cameraControl",
});
const MACBOOK_NEO_MESH_PARTS: MeshParts = Object.freeze({
  // lid (display assembly)
  LTxTFlhLWoHyhvo: "lid",
  sGDniMbgLiwHqFw: "lid",
  ZMGnWkiZEPXzRiw: "lid",
  iGKSuTNlIlEGpLp: "lid",
  LUMtYvTEVNmTHoQ: "lid",
  // The display panel stays unmapped so its emissive wallpaper survives.
  // top case (keyboard deck)
  RtqozqWvXTJHuDi: "topCase",
  RGLDQJKTekftnoB: "topCase",
  fylMvyMYpOJcbku: "topCase",
  KMIKFolgYmmmahm: "topCase",
  // Trackpad surface: a separate component that carries its own finish
  // (mirrors the server's exactMeshParts map — the client must agree or the
  // live view can never paint the trackpad color the export honors).
  TJrncXRMBNoKueV: "trackpad",
  RBmsNybhFEScfui: "topCase",
  LhZMVgrGkfDhZnJ: "topCase",
  TaNFpMmKHqePKML: "topCase",
  EXRYTxHqZCxcjZx: "topCase",
  // bottom case
  // Unibody base: the outer shells are the top case (palm rest + sides);
  // only the separate lower panel is the bottom case.
  IYjUsjnVPLevabB: "topCase",
  ubZKAAJmPSUZVHj: "topCase",
  AHewMMzHKsIFykK: "bottomCase",
  JcBLefbhAcSFtfV: "bottomCase",
  // Keycaps: the raised key field only. The bed below and the legend plane
  // above stay with the deck; the hinge-edge strips are never visible.
  AqcQCwqkepkmIxJ: "keycaps",
  ldFDBmejSXToUkP: "topCase",
  qQGZuUUMeRVQGEY: "topCase",
  ymYLIOEGFuqNeyB: "topCase",
  // USB-C boards (right cluster + left cluster)
  // Touch ID is a key, not a port: it takes the keycap finish.
  UDjFocEFPMTxxzE: "keycaps",
  bkNkMexbhfuRgXd: "keycaps",
  uMvgvtrefotcxLA: "keycaps",
  vpFYGndskQCpAiL: "keycaps",
  KwFQtiwiPZcwELa: "usbC",
  MdEwZxJYnatsNEo: "usbC",
  cMzncBRnxGSiixF: "usbC",
  RxQwEeRZjARFsvN: "usbC",
  WWvgVRnfZBeNwpP: "usbC",
  jXEhAmPcGAkgmPq: "usbC",
  WJWxyVsmuaogzKH: "usbC",
  UdgYVXrcknzsfzU: "usbC",
  UgnigMDmuhQEbNc: "usbC",
  GDzFfJLYgiBMTFB: "usbC",
  DrJauNLaRtCxyAy: "usbC",
  bqcaMJZxVDeevNs: "usbC",
  MHkxrMAWDVbaaeW: "usbC",
  hgRUNThRBKzoawn: "usbC",
  ckddmGzikslSSZi: "usbC",
  VFFQHFXIwreyxOW: "usbC",
  BNEVCQcWteGdere: "usbC",
  gOxaRXQOCdmPKSH: "usbC",
});
export const VIEW_DEFINITIONS: readonly CameraView[] = [
  { name: "01-front", labelKey: "cmf_view_front", direction: [0, 0.04, 1], up: [0, 1, 0], frame: 1.08 },
  { name: "02-back", labelKey: "cmf_view_back", direction: [0, 0.04, -1], up: [0, 1, 0], frame: 1.08 },
  { name: "03-rear-hero", labelKey: "cmf_view_rear_hero", direction: [-0.72, 0.42, -1], up: [0, 1, 0], frame: 0.92 },
  { name: "04-front-hero", labelKey: "cmf_view_front_hero", direction: [-0.72, 0.32, 1], up: [0, 1, 0], frame: 0.92 },
  { name: "05-buttons-side", labelKey: "cmf_view_buttons", direction: [-1, 0.02, 0.12], up: [0, 1, 0], frame: 1.02 },
  { name: "06-control-side", labelKey: "cmf_view_control", direction: [1, 0.06, 0.22], up: [0, 1, 0], frame: 1.02 },
  {
    name: "07-camera-close",
    labelKey: "cmf_view_camera",
    direction: [-0.58, 0.38, -1],
    up: [0, 1, 0],
    targetOffset: [0.22, 0.3, -0.28],
    frame: 0.46,
  },
  {
    name: "08-bottom-usb",
    labelKey: "cmf_view_bottom_usb",
    direction: [0.08, -1, -0.35],
    up: [0, 0, 1],
    targetOffset: [0, -0.46, -0.08],
    frame: 0.36,
  },
  {
    name: "09-top-edge",
    labelKey: "cmf_view_top_edge",
    direction: [0.14, 1, -0.38],
    up: [0, 0, -1],
    targetOffset: [0, 0.46, -0.08],
    frame: 0.38,
  },
];

// MacBook Neo has two poses, each with its own camera set. The closed slab
// shows the lid/bottom/edges; the open L shows the screen and keyboard deck.
// Close-up targets are fractions of the loaded model's own bounds.
export const MACBOOK_NEO_VIEWS: Readonly<Record<"closed" | "open", readonly CameraView[]>> = {
  closed: [
    { name: "01-lid-top", labelKey: "cmf_view_lid_top", direction: [0, 1, 0], up: [0, 0, -1], frame: 1.05 },
    { name: "02-bottom", labelKey: "cmf_view_bottom", direction: [0, -1, 0], up: [0, 0, -1], frame: 1.05 },
    {
      name: "03-hero-front",
      labelKey: "cmf_view_hero_front",
      direction: [-0.55, 0.62, 0.56],
      up: [0, 1, 0],
      frame: 1.12,
    },
    {
      name: "04-hero-back",
      labelKey: "cmf_view_hero_back",
      direction: [0.55, 0.62, -0.56],
      up: [0, 1, 0],
      frame: 1.12,
    },
    { name: "05-side-left", labelKey: "cmf_view_side_left", direction: [-1, 0.08, 0.1], up: [0, 1, 0], frame: 1.34 },
    { name: "06-side-right", labelKey: "cmf_view_side_right", direction: [1, 0.08, 0.1], up: [0, 1, 0], frame: 1.34 },
    { name: "07-front-edge", labelKey: "cmf_view_front_edge", direction: [0, 0.15, 1], up: [0, 1, 0], frame: 1.3 },
    { name: "08-hinge-edge", labelKey: "cmf_view_hinge_edge", direction: [0, 0.15, -1], up: [0, 1, 0], frame: 1.3 },
    {
      name: "09-ports-close",
      labelKey: "cmf_view_ports_close",
      direction: [-1, 0.02, 0.05],
      up: [0, 1, 0],
      targetOffset: [-0.486, 0.007, -0.355],
      frame: 0.42,
    },
  ],
  open: [
    { name: "01-screen", labelKey: "cmf_view_screen", direction: [0, 0.05, 1], up: [0, 1, 0], frame: 1.1 },
    { name: "02-deck-top", labelKey: "cmf_view_deck_top", direction: [0, 1, 0], up: [0, 0, -1], frame: 1.12 },
    { name: "03-hero-open", labelKey: "cmf_view_hero_open", direction: [-0.6, 0.45, 0.66], up: [0, 1, 0], frame: 1.16 },
    { name: "04-hero-back", labelKey: "cmf_view_hero_back", direction: [0.6, 0.4, -0.68], up: [0, 1, 0], frame: 1.16 },
    { name: "05-side-left", labelKey: "cmf_view_side_left", direction: [-1, 0.12, 0.08], up: [0, 1, 0], frame: 1.3 },
    { name: "06-side-right", labelKey: "cmf_view_side_right", direction: [1, 0.12, 0.08], up: [0, 1, 0], frame: 1.3 },
    {
      name: "07-keyboard-close",
      labelKey: "cmf_view_keyboard_close",
      direction: [0, 0.55, 0.83],
      up: [0, 0, -1],
      targetOffset: [0, -0.45, 0.009],
      frame: 0.42,
    },
    {
      name: "08-hinge-close",
      labelKey: "cmf_view_hinge_close",
      direction: [0, 0.2, 0.98],
      up: [0, 1, 0],
      targetOffset: [0, -0.44, -0.237],
      frame: 0.44,
    },
    {
      name: "09-ports-close",
      labelKey: "cmf_view_ports_close",
      direction: [-1, 0.05, 0.08],
      up: [0, 1, 0],
      targetOffset: [-0.486, -0.459, -0.13],
      frame: 0.4,
    },
  ],
};

const IPHONE_17_PRESETS: Presets = {
  porcelainCircuit: {
    frame: "black17",
    backGlass: "white17",
    volumeUp: "lavender17",
    volumeDown: "mistBlue17",
    actionButton: "sage17",
    cameraControl: "black17",
    sideButton: "white17",
    simTray: "lavender17",
    usbC: "mistBlue17",
  },
  sageTerminal: {
    frame: "black17",
    backGlass: "sage17",
    volumeUp: "lavender17",
    volumeDown: "mistBlue17",
    actionButton: "white17",
    cameraControl: "lavender17",
    sideButton: "sage17",
    simTray: "black17",
    usbC: "black17",
  },
  mistDraft: {
    frame: "white17",
    backGlass: "mistBlue17",
    volumeUp: "lavender17",
    volumeDown: "sage17",
    actionButton: "black17",
    cameraControl: "lavender17",
    sideButton: "mistBlue17",
    simTray: "white17",
    usbC: "black17",
  },
};

const IPHONE_17_PRO_PRESETS: Presets = {
  orangeIndex: {
    frame: "cosmicOrange17Pro",
    backGlass: "silver17Pro",
    volumeUp: "deepBlue17Pro",
    volumeDown: "deepBlue17Pro",
    actionButton: "deepBlue17Pro",
    cameraControl: "deepBlue17Pro",
    sideButton: "deepBlue17Pro",
    usbC: "silver17Pro",
  },
  deepBlueMargin: {
    frame: "deepBlue17Pro",
    backGlass: "deepBlue17Pro",
    volumeUp: "silver17Pro",
    volumeDown: "silver17Pro",
    actionButton: "cosmicOrange17Pro",
    cameraControl: "cosmicOrange17Pro",
    sideButton: "silver17Pro",
    usbC: "cosmicOrange17Pro",
  },
  silverProof: {
    frame: "silver17Pro",
    backGlass: "cosmicOrange17Pro",
    volumeUp: "deepBlue17Pro",
    volumeDown: "deepBlue17Pro",
    actionButton: "cosmicOrange17Pro",
    cameraControl: "deepBlue17Pro",
    sideButton: "cosmicOrange17Pro",
    usbC: "deepBlue17Pro",
  },
};

const IPHONE_AIR_PRESETS: Presets = {
  cloudBinding: {
    frame: "cloudWhiteAir",
    backGlass: "cloudWhiteAir",
    volumeUp: "spaceBlackAir",
    volumeDown: "spaceBlackAir",
    actionButton: "spaceBlackAir",
    cameraControl: "spaceBlackAir",
    sideButton: "spaceBlackAir",
    usbC: "spaceBlackAir",
  },
  goldCaption: {
    frame: "lightGoldAir",
    backGlass: "cloudWhiteAir",
    volumeUp: "lightGoldAir",
    volumeDown: "lightGoldAir",
    actionButton: "spaceBlackAir",
    cameraControl: "spaceBlackAir",
    sideButton: "lightGoldAir",
    usbC: "cloudWhiteAir",
  },
  skyTypeset: {
    frame: "skyBlueAir",
    backGlass: "skyBlueAir",
    volumeUp: "cloudWhiteAir",
    volumeDown: "cloudWhiteAir",
    actionButton: "lightGoldAir",
    cameraControl: "lightGoldAir",
    sideButton: "cloudWhiteAir",
    usbC: "spaceBlackAir",
  },
};

const IPHONE_17E_PRESETS: Presets = {
  pinkSerif: {
    frame: "softPink17e",
    backGlass: "softPink17e",
    volumeUp: "white17e",
    volumeDown: "white17e",
    actionButton: "black17e",
    sideButton: "white17e",
    usbC: "black17e",
  },
  inkLetterpress: {
    frame: "black17e",
    backGlass: "black17e",
    volumeUp: "softPink17e",
    volumeDown: "softPink17e",
    actionButton: "softPink17e",
    sideButton: "white17e",
    usbC: "white17e",
  },
  whiteFolio: {
    frame: "white17e",
    backGlass: "white17e",
    volumeUp: "black17e",
    volumeDown: "black17e",
    actionButton: "softPink17e",
    sideButton: "black17e",
    usbC: "softPink17e",
  },
};

const MACBOOK_NEO_PRESETS: Presets = {
  blushLid: {
    lid: "blushNeo",
    topCase: "silverNeo",
    bottomCase: "blushNeo",
    keycaps: "citrusNeo",
    trackpad: "silverNeo",
    usbC: "indigoNeo",
  },
  indigoDeck: {
    lid: "indigoNeo",
    topCase: "indigoNeo",
    bottomCase: "silverNeo",
    keycaps: "citrusNeo",
    trackpad: "indigoNeo",
    usbC: "silverNeo",
  },
  citrusKeys: {
    lid: "silverNeo",
    topCase: "silverNeo",
    bottomCase: "silverNeo",
    keycaps: "citrusNeo",
    trackpad: "blushNeo",
    usbC: "blushNeo",
  },
};

// One entry per model the server can recolor. Everything the UI needs to
// switch devices lives here: palette, parts, presets and preset labels.
export const MODELS: readonly ModelSpec[] = [
  {
    id: "iphone-18-pro",
    asset: "assets/iphone-18-pro.usdz",
    // The 18 Pro was the one phone that opened in the vendor's own scene
    // viewer instead of the studio. That made colour and light two systems:
    // the scene carried Apple's environment, and the reader could not drag
    // it or pick a part the way every other device works. It now renders in
    // the same interactive renderer as the rest of
    // the line-up, under the same shared EXR environment, with the mesh map
    // below standing in for the scene's material names.
    //
    // Its geometry is authored facing the other way: the studio's back view
    // showed its blank front, which is the one face a finish is never judged
    // from. Every other phone arrives facing the same way, so this is a fact
    // about this asset rather than a rule about the studio.
    spin: Math.PI,
    labelKey: "cmf_model_iphone_18_pro",
    colors: IPHONE_18_PRO_COLORS,
    parts: IPHONE_17_PRO_PARTS,
    presets: Object.fromEntries(
      IPHONE_18_PRO_COLORS.map((color) => [
        color.id,
        Object.fromEntries(IPHONE_17_PRO_PARTS.map((part) => [part.id, color.id])),
      ]),
    ),
    presetLabelKeys: Object.fromEntries(IPHONE_18_PRO_COLORS.map((color) => [color.id, color.labelKey])),
    meshParts: IPHONE_18_PRO_MESH_PARTS,
  },
  {
    id: "iphone-duo",
    asset: "assets/iphone-duo/viewer.html",
    renderer: "lotus",
    motion: "duo",
    labelKey: "cmf_model_iphone_duo",
    colors: IPHONE_DUO_COLORS,
    parts: IPHONE_DUO_PARTS,
    defaultView: "front",
    // Apple's scene carries named camera angles; these four are the ones a
    // finish is judged from, and the viewer sends the settled angle back so
    // the strip cannot stay lit on a view the writer has turned away from.
    views: IPHONE_DUO_VIEWS,
    poses: [
      { id: "closed", labelKey: "cmf_pose_closed" },
      { id: "half", labelKey: "cmf_pose_half" },
      { id: "open", labelKey: "cmf_pose_open" },
    ],
    // A whole-device preset per shipped finish, plus one that is honest
    // about being a studio recipe rather than a colorway Apple sells.
    presets: {
      ...Object.fromEntries(
        IPHONE_DUO_COLORS.map((color) => [
          color.id,
          Object.fromEntries(IPHONE_DUO_PARTS.map((part) => [part.id, color.id])),
        ]),
      ),
      duoTwoTone: {
        frame: "nightSkyDuo",
        hinge: "nightSkyDuo",
        backGlass: "starWhiteDuo",
        cameraPlateau: "nightSkyDuo",
        sideButton: "nightSkyDuo",
      },
    },
    presetLabelKeys: {
      starWhiteDuo: "cmf_color_star_white_duo",
      nightSkyDuo: "cmf_color_night_sky_duo",
      duoTwoTone: "cmf_preset_duo_two_tone",
    },
  },
  {
    id: "iphone-17-standard",
    asset: "assets/iphone-17-standard.usdz",
    labelKey: "cmf_model_iphone_17",
    colors: IPHONE_17_COLORS,
    parts: IPHONE_17_PARTS,
    presets: IPHONE_17_PRESETS,
    presetLabelKeys: {
      porcelainCircuit: "cmf_preset_porcelain",
      sageTerminal: "cmf_preset_sage",
      mistDraft: "cmf_preset_mist",
    },
    meshParts: IPHONE_17_MESH_PARTS,
  },
  {
    id: "iphone-17-pro",
    asset: "assets/iphone-17-pro.usdz",
    labelKey: "cmf_model_iphone_17_pro",
    poses: [
      { id: "pro", labelKey: "cmf_pose_pro", asset: "assets/iphone-17-pro.usdz" },
      { id: "pro-max", labelKey: "cmf_pose_pro_max", asset: "assets/iphone-17-pro-max.usdz" },
    ],
    colors: IPHONE_17_PRO_COLORS,
    parts: IPHONE_17_PRO_PARTS,
    presets: IPHONE_17_PRO_PRESETS,
    presetLabelKeys: {
      orangeIndex: "cmf_preset_orange_index",
      deepBlueMargin: "cmf_preset_deep_blue_margin",
      silverProof: "cmf_preset_silver_proof",
    },
    meshParts: IPHONE_17_PRO_MESH_PARTS,
  },
  {
    id: "iphone-air",
    asset: "assets/iphone-air.usdz",
    labelKey: "cmf_model_iphone_air",
    colors: IPHONE_AIR_COLORS,
    parts: IPHONE_AIR_PARTS,
    presets: IPHONE_AIR_PRESETS,
    presetLabelKeys: {
      cloudBinding: "cmf_preset_cloud_binding",
      goldCaption: "cmf_preset_gold_caption",
      skyTypeset: "cmf_preset_sky_typeset",
    },
    meshParts: IPHONE_AIR_MESH_PARTS,
  },
  {
    id: "iphone-17e",
    asset: "assets/iphone-17e.usdz",
    labelKey: "cmf_model_iphone_17e",
    colors: IPHONE_17E_COLORS,
    parts: IPHONE_17E_PARTS,
    presets: IPHONE_17E_PRESETS,
    presetLabelKeys: {
      pinkSerif: "cmf_preset_pink_serif",
      inkLetterpress: "cmf_preset_ink_letterpress",
      whiteFolio: "cmf_preset_white_folio",
    },
    meshParts: IPHONE_17E_MESH_PARTS,
  },
  {
    id: "macbook-neo",
    labelKey: "cmf_model_macbook_neo",
    motion: "neo",
    asset: "assets/macbook-neo-open.usdz",
    poses: [
      { id: "closed", labelKey: "cmf_pose_closed", asset: "assets/macbook-neo-closed.usdz" },
      { id: "half", labelKey: "cmf_pose_half", asset: "assets/macbook-neo-open.usdz" },
      { id: "open", labelKey: "cmf_pose_open", asset: "assets/macbook-neo-open.usdz" },
    ],
    colors: MACBOOK_NEO_COLORS,
    parts: MACBOOK_NEO_PARTS,
    presets: MACBOOK_NEO_PRESETS,
    presetLabelKeys: {
      blushLid: "cmf_preset_blush_lid",
      indigoDeck: "cmf_preset_indigo_deck",
      citrusKeys: "cmf_preset_citrus_keys",
    },
    meshParts: MACBOOK_NEO_MESH_PARTS,
    views: MACBOOK_NEO_VIEWS,
  },
];
export const DEFAULT_MODEL_ID = "iphone-17-standard";
export const MODEL_ALIASES: Readonly<Record<string, string>> = Object.freeze({ "iphone-17-pro-max": "iphone-17-pro" });
