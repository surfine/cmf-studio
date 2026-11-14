// The app's one connection to its host, typed. Inside the desk the kit talks
// to the desk over a MessagePort; on the app's own page the kit's standalone
// adapter answers state and files itself, and desk services are unavailable.

import type { Language } from "../strings/index.ts";
import type { Appearance, BridgeClient, CmfCapabilities, CmfExportResult, MenuState, SuspendCause } from "./types.ts";

/** The window's app in the manifest: the desk checks the hello against it. */
export const APP_ID = "cmfStudio";
export const WINDOW_NAME = "cmfStudio";
export const APP_VERSION = "1.0.0";

export type { BridgeClient } from "./types.ts";

/** Connects through the kit the page loaded before this module. */
export async function connect(): Promise<BridgeClient> {
  const kit = window.AIS6Bridge;
  if (!kit) throw new Error("ais6-bridge.js did not load");
  return kit.connect({ appId: APP_ID, window: WINDOW_NAME, version: APP_VERSION });
}

export async function readState(client: BridgeClient, key: string): Promise<unknown> {
  try {
    return (await client.call("state.get", { key })).value;
  } catch {
    return null;
  }
}

export async function writeState(client: BridgeClient, key: string, value: unknown): Promise<boolean> {
  try {
    await client.call("state.set", { key, value });
    return true;
  } catch {
    return false;
  }
}

/** Whether the desk can export USDZ on its server. False on the app's own page. */
export async function requestCapabilities(client: BridgeClient): Promise<boolean> {
  try {
    // The desk's cmf.capabilities adapter answers this shape (or a refusal, caught below).
    const answer = (await client.call("service.request", { name: "cmf.capabilities", params: {} })) as CmfCapabilities;
    return answer.ok !== false && Boolean(answer.canExport);
  } catch {
    return false;
  }
}

/** The server-recoloured USDZ, for a host that can build one; throws with the host's reason otherwise. */
export async function requestServerExport(client: BridgeClient, recipe: object): Promise<Uint8Array> {
  // The desk's cmf.exportUsdz adapter answers the bytes or { ok: false, reason }.
  const answer = (await client.call("service.request", {
    name: "cmf.exportUsdz",
    params: { recipe },
  })) as CmfExportResult;
  if ("bytes" in answer) return answer.bytes;
  throw new Error(answer.reason);
}

/** Hands a file to the host to save. Answers whether the host took it. */
export async function exportFile(client: BridgeClient, name: string, mime: string, blob: Blob): Promise<boolean> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await client.call("files.export", { name, mime, bytes });
    return true;
  } catch {
    return false;
  }
}

export function pushMenuState(client: BridgeClient, state: MenuState): void {
  client.menuState(state);
}

export function onMenuCommand(client: BridgeClient, run: (action: string) => boolean): void {
  client.handle("menu.command", ({ action }) => ({ handled: run(action) }));
}

/** Suspend, resume and dispose; each handler runs before the reply goes back. */
export function onLifecycle(
  client: BridgeClient,
  handlers: { suspend: (cause: SuspendCause) => void; resume: () => void; dispose: () => void },
): void {
  client.handle("lifecycle.suspend", ({ cause }) => {
    handlers.suspend(cause ?? "away");
    return {};
  });
  client.handle("lifecycle.resume", () => {
    handlers.resume();
    return {};
  });
  client.handle("lifecycle.dispose", () => {
    handlers.dispose();
    return {};
  });
}

export function onAppearance(client: BridgeClient, listener: (appearance: Appearance) => void): () => void {
  return client.on("appearance.changed", listener);
}

export function onLanguage(client: BridgeClient, listener: (language: Language) => void): () => void {
  return client.on("language.changed", ({ language }) => listener(language));
}

export function setTitle(client: BridgeClient, title: string): void {
  client.setTitle(title);
}
