// The names and bytes of the files the studio hands to its host.

export const PNG_MIME = "image/png";
export const WEBM_MIME = "video/webm";

/** A still of one view. The Duo's stills are named by the recipe alone, as the desk named them. */
export function viewFileName(recipeName: string, modelId: string, viewName: string): string {
  return `${recipeName || modelId}-${viewName}.png`;
}

export function foldVideoFileName(recipeName: string): string {
  return `${recipeName}-fold.webm`;
}

/** A canvas still read as a data URL, as bytes. */
export function dataUrlToPngBlob(dataUrl: string): Blob {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: PNG_MIME });
}
