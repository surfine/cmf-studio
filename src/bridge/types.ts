// The part of bridge contract v1 this app uses. The kit (ais6-bridge.js) is a
// classic script that installs `window.AIS6Bridge`; these types describe it.

import type { Language } from "../strings/index.ts";

export type ColorMode = "light" | "dark";

export interface Appearance {
  readonly id: string;
  readonly colorMode: ColorMode;
  readonly oneBit?: boolean;
  readonly touch: boolean;
  readonly reducedMotion: boolean;
  readonly tokens: Readonly<Record<string, string>>;
  readonly kitUrl: string;
}

export interface Welcome {
  readonly protocol: number;
  readonly appId: string;
  readonly window: string;
  readonly version: string;
  readonly language: Language;
  readonly appearance: Appearance;
  readonly capabilities: readonly string[];
  readonly readOnly: boolean;
  readonly standalone?: boolean;
}

/** `menu.state`: what the desk shows enabled and checked in this window's menus. */
export interface MenuState {
  readonly available: Readonly<Record<string, boolean>>;
  readonly checked: Readonly<Record<string, boolean>>;
}

export interface MenuCommand {
  readonly action: string;
  readonly arg?: unknown;
}

export type SuspendCause = "close" | "away";

/** The request methods this app calls, with their params and results. */
export interface BridgeCalls {
  "state.get": { params: { key: string }; result: { value: unknown } };
  "state.set": { params: { key: string; value: unknown }; result: Record<string, never> };
  "files.export": { params: { name: string; mime: string; bytes: Uint8Array }; result: Record<string, never> };
  "service.request": { params: { name: CmfServiceName; params: unknown }; result: unknown };
}

/** The requests the desk sends this app, and what the app answers. */
export interface BridgeHandlers {
  "menu.command": { params: MenuCommand; result: { handled: boolean } };
  "lifecycle.suspend": { params: { cause?: SuspendCause }; result: Record<string, never> };
  "lifecycle.resume": { params: Record<string, never>; result: Record<string, never> };
  "lifecycle.dispose": { params: Record<string, never>; result: Record<string, never> };
}

/** The events the desk sends this app. */
export interface BridgeEvents {
  "appearance.changed": Appearance;
  "language.changed": { language: Language };
}

export type CmfServiceName = "cmf.capabilities" | "cmf.exportUsdz";

/** What the desk's `cmf.capabilities` adapter answers. */
export interface CmfCapabilities {
  readonly canExport?: boolean;
  readonly ok?: false;
  readonly reason?: string;
}

/** What the desk's `cmf.exportUsdz` adapter answers. */
export type CmfExportResult =
  | { readonly name: string; readonly type: string; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly reason: string };

/** The client object `AIS6Bridge.connect()` resolves to (hosted or standalone). */
export interface BridgeClient {
  readonly standalone: boolean;
  readonly welcome: Welcome;
  call<M extends keyof BridgeCalls>(method: M, params: BridgeCalls[M]["params"]): Promise<BridgeCalls[M]["result"]>;
  on<E extends keyof BridgeEvents>(method: E, listener: (params: BridgeEvents[E]) => void): () => void;
  handle<M extends keyof BridgeHandlers>(
    method: M,
    handler: (
      params: BridgeHandlers[M]["params"],
    ) => BridgeHandlers[M]["result"] | Promise<BridgeHandlers[M]["result"]>,
  ): void;
  ready(): boolean;
  menuState(state: MenuState): boolean;
  setTitle(title: string): boolean;
  enableSnapshots(config: { producer: "canvas" | "dom"; target?: Element | null }): BridgeClient;
}

export interface ConnectOptions {
  readonly appId: string;
  readonly window: string;
  readonly version: string;
}

/** `window.AIS6Bridge`, installed by ais6-bridge.js. */
export interface Ais6Bridge {
  readonly protocol: number;
  connect(options: ConnectOptions): Promise<BridgeClient>;
}

declare global {
  interface Window {
    AIS6Bridge?: Ais6Bridge;
  }
}
