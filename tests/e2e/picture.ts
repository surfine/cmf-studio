// Reading what a canvas shows. A WebGL canvas without a preserved drawing
// buffer reads back blank from script, so the picture is taken the way a
// person sees it: a screenshot of the element, decoded in the page.

import type { Locator, Page } from "@playwright/test";

export interface Picture {
  /** Distinct colours after quantising to 5 bits a channel: 1 means a flat fill. */
  readonly colours: number;
  /** A cheap fingerprint, to tell two pictures apart. */
  readonly hash: string;
}

export async function picture(page: Page, target: Locator): Promise<Picture> {
  const png = (await target.screenshot({ animations: "disabled" })).toString("base64");
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    context.drawImage(image, 0, 0);
    const { data: pixels } = context.getImageData(0, 0, image.width, image.height);
    const colours = new Set<number>();
    let hash = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = (pixels[i] ?? 0) >> 3;
      const g = (pixels[i + 1] ?? 0) >> 3;
      const b = (pixels[i + 2] ?? 0) >> 3;
      colours.add((r << 10) | (g << 5) | b);
      hash = (Math.imul(hash, 31) + ((r << 10) | (g << 5) | b)) | 0;
    }
    return { colours: colours.size, hash: hash.toString(16) };
  }, png);
}
