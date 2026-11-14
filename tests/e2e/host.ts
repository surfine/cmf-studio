// A stand-in desk for the end-to-end tests: it frames the built page, answers
// the bridge handshake with the kit's own envelope machinery, keeps state in
// memory, records exported files and menu state, and answers the two CMF
// services the way the test asks.

import type { Page } from "@playwright/test";

export const HOST_PATH = "/__cmf-test-host.html";

export interface HostOptions {
  /** What `cmf.capabilities` answers: true when the "server" can export USDZ. */
  readonly serverCanExport: boolean;
}

const hostPage = (options: HostOptions) => `<!doctype html>
<html><head><meta charset="utf-8"><title>host</title>
<style>html,body{margin:0;height:100%}iframe{border:0;width:1120px;height:720px}</style>
<script src="./ais6-bridge.js"></script></head>
<body><iframe id="app" src="./index.html?lang=en"></iframe>
<script>
const frame = document.getElementById("app");
const state = new Map();
window.__host = { files: [], menu: null, endpoint: null };
addEventListener("message", (event) => {
  if (event.source !== frame.contentWindow || event.data?.ais6 !== "hello") return;
  // The desk refuses a hello that names another app; so does this stand-in.
  if (event.data.appId !== "cmfStudio" || event.data.window !== "cmfStudio") return;
  const channel = new MessageChannel();
  const endpoint = AIS6Bridge.createEndpoint((message, transfer) => channel.port1.postMessage(message, transfer), "h");
  channel.port1.onmessage = (e) => endpoint.dispatch(e.data);
  channel.port1.start();
  endpoint.handle("state.get", ({ key }) => ({ value: state.has(key) ? state.get(key) : null }));
  endpoint.handle("state.set", ({ key, value }) => { state.set(key, value); return {}; });
  endpoint.handle("files.export", ({ name, mime, bytes }) => { window.__host.files.push({ name, mime, size: bytes.byteLength }); return {}; });
  endpoint.handle("service.request", ({ name }) => {
    if (name === "cmf.capabilities") return { canExport: ${options.serverCanExport} };
    return { ok: false, reason: "no server in this test" };
  });
  endpoint.on("menu.state", (params) => { window.__host.menu = params; });
  window.__host.endpoint = endpoint;
  const welcome = {
    protocol: 1, appId: "cmfStudio", window: "cmfStudio", version: "1.0.0", language: "en",
    appearance: { id: "classic", colorMode: "light", touch: false, reducedMotion: true, tokens: {}, kitUrl: "" },
    capabilities: ["state", "files", "services", "appearance", "snapshot"], readOnly: false,
  };
  frame.contentWindow.postMessage({ ais6: "welcome", welcome }, location.origin, [channel.port2]);
});
</script></body></html>`;

/** Serves the host page beside the build and opens it. */
export async function openInHost(page: Page, options: HostOptions): Promise<void> {
  await page.route(`**${HOST_PATH}`, (route) => route.fulfill({ contentType: "text/html", body: hostPage(options) }));
  await page.goto(HOST_PATH);
}
