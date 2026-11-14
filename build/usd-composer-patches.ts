// Two corrections to three's USDComposer.js, applied at build time. Each needle
// must be present verbatim: when three changes the code around it, the build
// fails instead of shipping an unpatched composer.

export interface SourcePatch {
  readonly needle: string;
  readonly replacement: string;
  /** What the build says when the needle is gone. */
  readonly missing: string;
}

// The texture cache keyed a texture by its file alone. The same image bound to
// two UV channels then came back on the first channel for both.
const uvChannelTextureCache: SourcePatch = {
  needle: "let cacheKey = filePath;",
  replacement: "let cacheKey = filePath + ':uv' + uvChannel;",
  missing: "Three.js USD texture cache implementation changed; review the UV-channel patch.",
};

// Apple's Pro Max uses Maya-style pivot suffixes on translate ops. USD allows
// any suffix; three recognizes only ':pivot', so those prims rotated around the
// origin and the aperture blades protruded through the camera rim.
//
// The suffix list is a census, not a guess. Counting every opName the composer
// was asked to compose (2026-09-12):
//
//   iphone-17-pro.usdz      xformOp:translate:pivot x122
//   iphone-17-pro-max.usdz  xformOp:translate:pivot x180
//                           xformOp:translate:rotatePivot x2
//                           xformOp:translate:scalePivot x2
//
// So ':rotatePivot' is required, and the Pro is untouched by any form of this
// patch: it carries no named pivot at all.
//
// ':scalePivot' is deliberately absent: applying it folds the Pro Max
// enclosure into a chrome ribbon (verified by A/B with the camera framed). A
// scale pivot has to bracket the scale op and cancel against its own inverse,
// and these assets carry no '!invert!' entries, so composing one as a
// standalone translation never cancels.
const namedPivotMatch: SourcePatch = {
  needle: "opName === 'xformOp:translate:pivot'",
  replacement: "( opName === 'xformOp:translate:pivot' || opName === 'xformOp:translate:rotatePivot' )",
  missing: "Three.js USD transform implementation changed; review named-pivot support.",
};

// With the match widened, the pivot's value has to be read under the op's own
// name rather than the one suffix three knew.
const namedPivotValue: SourcePatch = {
  needle: "const t = data[ 'xformOp:translate:pivot' ];",
  replacement: "const t = data[ opName ];",
  missing: namedPivotMatch.missing,
};

export const usdComposerPatches: readonly SourcePatch[] = [uvChannelTextureCache, namedPivotMatch, namedPivotValue];

/** Applies every patch, or throws the first missing needle's message. */
export function applySourcePatches(source: string, patches: readonly SourcePatch[]): string {
  const absent = patches.find((patch) => !source.includes(patch.needle));
  if (absent) throw new Error(absent.missing);
  return patches.reduce((text, patch) => text.replace(patch.needle, patch.replacement), source);
}
