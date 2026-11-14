# Old contracts, and where each assertion lives now

Every assertion of the desk's CMF contracts, found by `rg -ln "cmf" tests/features`
(each assertion of a CMF-only file, and each assertion elsewhere whose code names
CMF), with its message and its destination in this package or the desk.

| Destination | Count |
| --- | ---: |
| Vitest | 141 |
| Desk (kept) | 78 |
| Playwright | 63 |
| Desk (re-aimed) | 25 |
| Retired | 22 |
| Type | 17 |
| Gap | 12 |
| Build | 3 |
| **Total** | **361** |

- **Vitest / Playwright / Type / Build**: the behaviour is checked in this package.
- **Desk (kept)**: a desk-side fact (server, admission row, prepare tooling); the assertion stays.
- **Desk (re-aimed)**: the assertion stays in the desk contract, pointed at what replaced the desk file.
- **Retired**: it read a source string that no longer exists, and the behaviour is covered where named.
- **Gap**: the behaviour is in the code named, but no automated test reaches it. Listed rather than hidden.

## `tests/features/cmf-worker-scheduler.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 37 | three concurrent jobs enter only one worker and queue the remainder | Desk (kept) | server worker scheduler; untouched |
| 55 | a crashed renderer reports a stable worker error | Desk (kept) | server worker scheduler; untouched |
| 63 | the dispatcher serves the request after a worker crash | Desk (kept) | server worker scheduler; untouched |
| 80 | cancelling a request terminates its worker with a stable code | Desk (kept) | server worker scheduler; untouched |
| 82 | cancelled workers release their scheduler slot | Desk (kept) | server worker scheduler; untouched |
| 99 | oversized canvas dimensions fail before dispatch | Desk (kept) | server worker scheduler; untouched |
| 100 | invalid dimensions never start a worker | Desk (kept) | server worker scheduler; untouched |
| 111 | cache keys include view, pose, parts, and render parameters | Desk (kept) | server worker scheduler; untouched |
| 121 | capabilities probe external commands only once within the TTL | Desk (kept) | server worker scheduler; untouched |
| 124 | public CMF requests own a finite concurrency group | Desk (kept) | server worker scheduler; untouched |

## `tests/features/external-drop.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 204 | ${name} has no private download of its own | Desk (re-aimed) | the `cmf-studio` entry leaves the list: the app saves only through `files.export` (`src/bridge/bridge.ts`) |

## `tests/features/lazy-window-restore.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 172 | lazy-window loading is one registry, not a scatter of per-window ifs | Desk (kept) | still true: no per-window branch |

## `tests/features/launch-intent.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 692 | the local server serves the shell at / only | Desk (kept) | desk-side fact; stays in the desk contract |
| 759 | studio model assets bypass the shell worker | Desk (re-aimed) | the bypass names the app tree's asset path (and `/assets/cmf/` while its alias lives) |
| 763 | and the bypass runs before the build-stamped cache path | Desk (re-aimed) | same as line 759 |
| 773 | the studio viewer document declares the site root as its base | Retired | the viewer is loaded by URL beside its own files, no `<base>` rewrite; covered by `tests/e2e/studio.spec.ts` › the Duo opens in its own scene viewer and folds |

## `tests/features/cmf-studio.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 39 | CMF Studio window exists | Desk (re-aimed) | the window comes from `public/app.manifest.json` (window `cmfStudio`); `app-admissions` and `extracted-app-host` read it |
| 40 | Applications markup has a launcher | Desk (kept) | the launcher stays in the desk's Applications markup |
| 41 | Applications folder dynamic list includes CMF Studio | Desk (kept) | desk-side fact; stays in the desk contract |
| 42 | MultiFinder labels the app from the admission table | Desk (kept) | desk-side fact; stays in the desk contract |
| 43 | window maps to its own app id | Desk (kept) | desk-side fact; stays in the desk contract |
| 44 | action opens the window through its registered command | Desk (re-aimed) | the open command is the admission row's; menus as data in `public/app.manifest.json` |
| 45 | CMF Studio menu commands are registered with the application | Playwright | `tests/e2e/studio.spec.ts` › menu commands run… (menus as data in `public/app.manifest.json`) |
| 46 | feature is registered as a lazy runtime path | Retired | no desk module any more; covered by `extracted-app-host` (the frame loads only when the window opens) |
| 48 | feature sits in lazyRuntimePaths | Retired | no desk module any more; covered by `extracted-app-host` |
| 49 | openWindow loads CMF on demand | Retired | no desk module any more; covered by `extracted-app-host` |
| 50 | CMF loads the browser USDZ exporter before its classic script | Retired | the exporter is an ES import of the app; covered by `src/app/controller.ts` → `src/export/usdz.ts` (typed import) |
| 51 | feature module is not an ES module | Retired | the app is ES modules by design; covered by `tsc -b` |
| 52 | feature module is not an ES module | Retired | the app is ES modules by design; covered by `tsc -b` |
| 59 | Duo asset integrity: ${file} | Vitest | `tests/unit/assets.test.ts` |
| 67 | Duo dependency is bundled: ${reference} | Vitest | `tests/unit/assets.test.ts` |
| 78 | iPhone 18 Pro asset manifest is populated | Vitest | `tests/unit/assets.test.ts` |
| 81 | iPhone 18 Pro asset integrity: ${file} | Vitest | `tests/unit/assets.test.ts` |
| 84 | iPhone 18 Pro manifest contains the exterior geometry | Vitest | `tests/unit/assets.test.ts` |
| 89 | iPhone 18 Pro metal exterior has one indexed primitive | Vitest | `tests/unit/assets.test.ts` |
| 93 | iPhone 18 Pro exterior still has 30,959 triangles | Vitest | `tests/unit/assets.test.ts` |
| 94 | iPhone 18 Pro exterior uses triangle indices | Vitest | `tests/unit/assets.test.ts` |
| 95 | iPhone 18 Pro positions are float vectors | Vitest | `tests/unit/assets.test.ts` |
| 123 | iPhone 18 Pro viewer groups cover four buttons and the frame | Vitest | `tests/unit/assets.test.ts` |
| 126 | iPhone 18 Pro ${part} group covers complete triangles without gaps | Vitest | `tests/unit/assets.test.ts` |
| 129 | iPhone 18 Pro viewer groups cover every exterior triangle once | Vitest | `tests/unit/assets.test.ts` |
| 149 | iPhone 18 Pro ${part} group selects that physical button | Vitest | `tests/unit/assets.test.ts` |
| 155 | iPhone 18 Pro finish adapter is available for behavior checks | Vitest | `tests/unit/assets.test.ts` |
| 189 | iPhone 18 Pro ${finish} reaches both back-glass diffuse layers with a Glacier frame | Vitest | `tests/unit/assets.test.ts` |
| 190 | iPhone 18 Pro ${finish} preserves authored detail normals and roughness | Vitest | `tests/unit/assets.test.ts` |
| 196 | iPhone 18 Pro is registered | Vitest | `tests/unit/catalog.test.ts` |
| 197 | iPhone Duo is registered | Vitest | `tests/unit/catalog.test.ts` |
| 200 | iPhone 17 standard is a registered model | Vitest | `tests/unit/catalog.test.ts` |
| 201 | recipe covers volume up | Vitest | `tests/unit/catalog.test.ts` |
| 202 | recipe covers volume down | Vitest | `tests/unit/catalog.test.ts` |
| 203 | recipe covers action button | Vitest | `tests/unit/catalog.test.ts` |
| 204 | recipe covers camera control | Vitest | `tests/unit/catalog.test.ts` |
| 205 | recipe covers side button | Vitest | `tests/unit/catalog.test.ts` |
| 206 | recipe covers SIM tray | Vitest | `tests/unit/catalog.test.ts` |
| 207 | recipe covers USB-C / bottom hardware | Vitest | `tests/unit/catalog.test.ts` |
| 211 | no phone offers a separately coloured camera area | Vitest | `tests/unit/catalog.test.ts` |
| 212 | no phone offers separately coloured lens rings | Vitest | `tests/unit/catalog.test.ts` |
| 213 | no model defaults a camera-area finish | Desk (kept) | the server's defaults; the package side is `tests/unit/catalog.test.ts` (no preset sets `cameraPlate`) |
| 214 | official black finish exists | Vitest | `tests/unit/catalog.test.ts` |
| 215 | official lavender finish exists | Vitest | `tests/unit/catalog.test.ts` |
| 216 | official mist blue finish exists | Vitest | `tests/unit/catalog.test.ts` |
| 217 | official sage finish exists | Vitest | `tests/unit/catalog.test.ts` |
| 218 | official white finish exists | Vitest | `tests/unit/catalog.test.ts` |
| 219 | shuffle draws from the active model's palette without repeating a color early | Vitest | `tests/unit/recipe.test.ts` › uses every colour of the palette before repeating one |
| 220 | recipe is saved locally | Vitest | `tests/unit/recipe.test.ts` › each model keeps its own recipe (persisted through the bridge's `state.set`, `STORE_KEY`) |
| 223 | iPhone 17 Pro is a registered model | Vitest | `tests/unit/catalog.test.ts` |
| 224 | iPhone 17 Pro Max is a selectable size | Vitest | `tests/unit/catalog.test.ts` |
| 225 | Pro line offers the official Cosmic Orange finish | Vitest | `tests/unit/catalog.test.ts` |
| 226 | Pro line offers the official Deep Blue finish | Vitest | `tests/unit/catalog.test.ts` |
| 227 | Pro line offers the official Silver finish | Vitest | `tests/unit/catalog.test.ts` |
| 228 | the Pro palette never borrows a finish from another device | Vitest | `tests/unit/catalog.test.ts` |
| 233 | iPhone Air is a registered model | Vitest | `tests/unit/catalog.test.ts` |
| 234 | Air offers the official Space Black finish | Vitest | `tests/unit/catalog.test.ts` |
| 235 | Air offers the official Cloud White finish | Vitest | `tests/unit/catalog.test.ts` |
| 236 | Air offers the official Light Gold finish | Vitest | `tests/unit/catalog.test.ts` |
| 237 | Air offers the official Sky Blue finish | Vitest | `tests/unit/catalog.test.ts` |
| 238 | the Air palette never borrows a finish from another device | Vitest | `tests/unit/catalog.test.ts` |
| 243 | iPhone 17e is a registered model | Vitest | `tests/unit/catalog.test.ts` |
| 244 | 17e offers the official Black finish | Vitest | `tests/unit/catalog.test.ts` |
| 245 | 17e offers the official White finish | Vitest | `tests/unit/catalog.test.ts` |
| 246 | 17e offers the official Soft Pink finish | Vitest | `tests/unit/catalog.test.ts` |
| 247 | the 17e exposes neither a SIM tray nor a Camera Control part, because it has neither | Vitest | `tests/unit/catalog.test.ts` |
| 252 | a device (or pose) is never repainted in another device's finishes when its own model failed to load | Gap | `Studio.paint()` answers 0 unless `shows(model, pose)`; no automated test reaches a WebGL scene's materials |
| 257 | MacBook Neo is a registered model | Vitest | `tests/unit/catalog.test.ts` |
| 258 | MacBook Neo offers the official Silver finish | Vitest | `tests/unit/catalog.test.ts` |
| 259 | MacBook Neo offers the official Blush finish | Vitest | `tests/unit/catalog.test.ts` |
| 260 | MacBook Neo offers the official Citrus finish | Vitest | `tests/unit/catalog.test.ts` |
| 261 | MacBook Neo offers the official Indigo finish | Vitest | `tests/unit/catalog.test.ts` |
| 262 | MacBook Neo ships in a Closed pose with a browser asset | Vitest | `tests/unit/catalog.test.ts` |
| 263 | MacBook Neo ships in an Open pose with a browser asset | Vitest | `tests/unit/catalog.test.ts` |
| 264 | the browser knows the iPhone 17 source USDZ asset | Vitest | `tests/unit/catalog.test.ts` |
| 265 | the browser resolves the active source asset URL | Playwright | `tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 266 | the live preview prefers the static source asset | Playwright | `tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 267 | capabilities probe the source asset without downloading it | Playwright | `tests/e2e/studio.spec.ts` › with no model asset and no server, nothing that needs a model is offered (HEAD probe) |
| 268 | the browser fetches the source USDZ directly | Playwright | `tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 269 | the lid is a MacBook Neo part (Apple self-service part) | Vitest | `tests/unit/catalog.test.ts` |
| 270 | the keyboard deck is a MacBook Neo part | Vitest | `tests/unit/catalog.test.ts` |
| 271 | the bottom case is a MacBook Neo part | Vitest | `tests/unit/catalog.test.ts` |
| 272 | the keycaps are a MacBook Neo part | Vitest | `tests/unit/catalog.test.ts` |
| 273 | the MacBook defines per-pose camera sets | Type | `MACBOOK_NEO_VIEWS: Record<"closed" \| "open", …>` in `src/model/catalog.ts` |
| 274 | the MacBook model registers both camera sets | Vitest | `tests/unit/catalog.test.ts` |
| 275 | the loaded pose is tracked for repaint guards | Gap | same guard as line 252 (`Studio.shows`) |
| 276 | a saved recipe cannot carry another pose's geometry across | Vitest | `tests/unit/recipe.test.ts` › a saved pose the device does not have falls back to its first pose |
| 277 | a pose chooser exists for posed models | Playwright | `tests/e2e/studio.spec.ts` › the MacBook's lid opens and closes (`[data-cmf-pose]`) |
| 278 | the pose chooser is hidden until a posed model is selected | Playwright | `tests/e2e/studio.spec.ts` › a device that fails to load… (no pose chooser on the iPhone 17) |
| 281 | a model chooser exists | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 282 | the model chooser uses the System 6 select harness | Retired | the System 6 select harness is the desk's; covered by the kit's `.kit-select-wrap` (kit contract) |
| 283 | a saved recipe cannot carry another model's finish across | Vitest | `tests/unit/recipe.test.ts` › a finish from another device's palette is dropped |
| 284 | each model keeps its own saved recipe | Vitest | `tests/unit/recipe.test.ts` › each model keeps its own recipe |
| 285 | the eSIM Pro asset exposes no SIM tray part | Vitest | `tests/unit/catalog.test.ts` |
| 292 | capabilities route is registered | Desk (kept) | desk-side fact; stays in the desk contract |
| 293 | USDZ export route is registered | Desk (kept) | desk-side fact; stays in the desk contract |
| 294 | view render route is registered | Desk (kept) | desk-side fact; stays in the desk contract |
| 295 | single-view preview route is registered | Desk (kept) | desk-side fact; stays in the desk contract |
| 296 | capabilities route uses the CMF service | Desk (kept) | desk-side fact; stays in the desk contract |
| 297 | export route returns a USDZ MIME type | Desk (kept) | desk-side fact; stays in the desk contract |
| 298 | export route downloads a file | Desk (kept) | desk-side fact; stays in the desk contract |
| 299 | render route dispatches through the bounded worker scheduler | Desk (kept) | desk-side fact; stays in the desk contract |
| 300 | render route asks its worker for the complete view set | Desk (kept) | desk-side fact; stays in the desk contract |
| 301 | preview route dispatches one current view off the HTTP thread | Desk (kept) | desk-side fact; stays in the desk contract |
| 302 | preview route identifies the single-view worker operation | Desk (kept) | desk-side fact; stays in the desk contract |
| 303 | engine keeps semantic mesh-to-part mapping | Desk (kept) | desk-side fact; stays in the desk contract |
| 304 | engine drives every device from one model registry | Desk (kept) | desk-side fact; stays in the desk contract |
| 305 | engine can recolor the iPhone 17 Pro Max | Desk (kept) | desk-side fact; stays in the desk contract |
| 306 | engine can recolor the iPhone Air | Desk (kept) | desk-side fact; stays in the desk contract |
| 307 | engine can recolor the MacBook Neo | Desk (kept) | desk-side fact; stays in the desk contract |
| 308 | the MacBook Neo ships one asset per pose | Desk (kept) | desk-side fact; stays in the desk contract |
| 309 | the closed pose asset is registered | Desk (kept) | desk-side fact; stays in the desk contract |
| 310 | the open pose asset is registered | Desk (kept) | desk-side fact; stays in the desk contract |
| 311 | per-pose camera sets exist for the MacBook | Desk (kept) | desk-side fact; stays in the desk contract |
| 312 | the phone-tuned geometric classifier is disabled for exact-only models | Desk (kept) | desk-side fact; stays in the desk contract |
| 313 | the MacBook part map covers the lid | Desk (kept) | desk-side fact; stays in the desk contract |
| 314 | the MacBook part map covers the keyboard deck | Desk (kept) | desk-side fact; stays in the desk contract |
| 315 | the MacBook part map covers the bottom case | Desk (kept) | desk-side fact; stays in the desk contract |
| 316 | the MacBook part map covers the keycaps | Desk (kept) | desk-side fact; stays in the desk contract |
| 317 | the MacBook part map covers the USB-C boards | Desk (kept) | desk-side fact; stays in the desk contract |
| 318 | a finish from another device is rejected, not silently swapped | Desk (kept) | desk-side fact; stays in the desk contract |
| 319 | close-up views frame against each device's own size | Desk (kept) | desk-side fact; stays in the desk contract |
| 323 | only the dark end is excluded, so bright finishes are still recolorable | Desk (kept) | desk-side fact; stays in the desk contract |
| 324 | the trim test does not reuse the shared pass's upper bound, which dropped the Neo's keycaps | Desk (kept) | desk-side fact; stays in the desk contract |
| 329 | the trackpad is its own MacBook Neo part | Vitest | `tests/unit/catalog.test.ts` |
| 330 | the trackpad surface is mapped, not the black recess around it | Desk (kept) | desk-side fact; stays in the desk contract |
| 331 | the live view agrees with the export: the trackpad surface is its own finish | Vitest | `tests/unit/materials.test.ts` |
| 332 | the client's material regex recognizes the trackpad part name | Vitest | `tests/unit/materials.test.ts` |
| 333 | black trim is skipped before a part clone is bound | Desk (kept) | desk-side fact; stays in the desk contract |
| 334 | the live viewport knows black trim is not a finish surface | Vitest | `tests/unit/materials.test.ts` |
| 337 | a lit display damps its dielectric specular so the picture survives off-axis | Vitest | `tests/unit/materials.test.ts` |
| 341 | the viewport gives metal something to reflect | Playwright | `tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 346 | the 18 Pro no longer opens in the vendor scene viewer | Vitest | `tests/unit/catalog.test.ts` |
| 347 | and its scene-viewer link is gone with it | Vitest | `tests/unit/catalog.test.ts` |
| 348 | the 18 Pro's asset is turned to face the way every other device faces | Vitest | `tests/unit/catalog.test.ts` |
| 349 | the turn is applied at load, before the bounds are taken | Playwright | `tests/e2e/studio.spec.ts` › every device… (the 18 Pro switch draws a framed picture) |
| 350 | and it moves the model, not the camera | Playwright | `tests/e2e/studio.spec.ts` › every device… (18 Pro) |
| 351 | the renderer bundle ships the environment the metals need | Type | `RoomEnvironment` and `EXRLoader` are typed imports of `src/render/studio.ts` |
| 353 | the damping targets the display, not every surface | Vitest | `tests/unit/materials.test.ts` |
| 354 | live recoloring skips black trim, matching the export | Vitest | `tests/unit/materials.test.ts` |
| 358 | the key field itself is what the keycaps finish paints | Desk (kept) | desk-side fact; stays in the desk contract |
| 359 | the unibody shell carrying the palm rest is the top case | Desk (kept) | desk-side fact; stays in the desk contract |
| 360 | the invisible hinge strips are not sold as keycaps | Desk (kept) | desk-side fact; stays in the desk contract |
| 361 | Touch ID is a key, so it wears the keycap finish, not the port finish | Desk (kept) | desk-side fact; stays in the desk contract |
| 362 | Touch ID is not grouped with the USB-C boards | Desk (kept) | desk-side fact; stays in the desk contract |
| 363 | engine maps UI action button naming to USD part naming | Desk (kept) | desk-side fact; stays in the desk contract |
| 364 | engine rewrites USD layers, not CSS filters | Desk (kept) | desk-side fact; stays in the desk contract |
| 365 | engine repackages final USDZ | Desk (kept) | desk-side fact; stays in the desk contract |
| 366 | view renderer uses SceneKit for Quick Look-style PNGs | Desk (kept) | desk-side fact; stays in the desk contract |
| 367 | software rendering remains available when Swift is absent | Desk (kept) | desk-side fact; stays in the desk contract |
| 368 | capabilities report the active render backend | Desk (kept) | desk-side fact; stays in the desk contract |
| 369 | software preview keeps the phone top upright | Desk (kept) | desk-side fact; stays in the desk contract |
| 370 | engine tracks which hidden material groups were explicitly supplied | Desk (kept) | desk-side fact; stays in the desk contract |
| 371 | side frame follows the public frame color by default | Desk (kept) | desk-side fact; stays in the desk contract |
| 372 | bottom screws and speaker holes follow the public USB-C color by default | Desk (kept) | desk-side fact; stays in the desk contract |
| 373 | view set includes a rear hero angle | Desk (kept) | desk-side fact; stays in the desk contract |
| 374 | view set includes a bottom USB-C detail angle | Desk (kept) | desk-side fact; stays in the desk contract |
| 375 | SceneKit USB-C detail camera looks from the back/bottom side | Desk (kept) | desk-side fact; stays in the desk contract |
| 376 | view set includes a top edge detail angle | Desk (kept) | desk-side fact; stays in the desk contract |
| 377 | source iPhone 17 USDZ asset is bundled in assets/cmf | Vitest | `tests/unit/catalog.test.ts` |
| 378 | source iPhone 17 Pro USDZ asset is bundled in assets/cmf | Vitest | `tests/unit/catalog.test.ts` |
| 379 | source iPhone 17 Pro Max USDZ asset is bundled in assets/cmf | Vitest | `tests/unit/catalog.test.ts` |
| 380 | source iPhone Air USDZ asset is bundled in assets/cmf | Vitest | `tests/unit/catalog.test.ts` |
| 381 | source iPhone 17e USDZ asset is bundled in assets/cmf | Vitest | `tests/unit/catalog.test.ts` |
| 382 | MacBook Neo closed-pose USDZ asset is bundled in assets/cmf | Vitest | `tests/unit/catalog.test.ts` |
| 383 | MacBook Neo open-pose USDZ asset is bundled in assets/cmf | Vitest | `tests/unit/catalog.test.ts` |
| 384 | model assets are reproducible from a recorded source, not hand-made | Desk (kept) | `tooling/cmf-prepare-model.mjs` stays desk tooling (its output path re-aimed into the package) |
| 385 | the prepare step proves each split asset against Apple's published dimensions | Desk (kept) | desk-side fact; stays in the desk contract |
| 389 | the prepare step strips the MaterialX branch that blanks a display | Desk (kept) | desk-side fact; stays in the desk contract |
| 390 | the 17e display material is named so its wallpaper survives | Desk (kept) | desk-side fact; stays in the desk contract |
| 391 | the MacBook Neo display material is named so its wallpaper survives | Desk (kept) | desk-side fact; stays in the desk contract |
| 392 | only textures the layer still points at are packaged | Desk (kept) | desk-side fact; stays in the desk contract |
| 395 | the browser renderer uses the pinned Three.js USD implementation | Type | `packages/cmf-studio/package.json` pins `three` 0.185.1, the root lockfile's version |
| 396 | the renderer is built as a lazy browser vendor module | Retired | the vendor bundle is gone; covered by the package's Vite build (`vite.config.ts`) |
| 397 | renderer build owns a stable app URL | Retired | the vendor bundle is gone; covered by the pinned app tree `apps/desktop/apps/cmf-studio/` |
| 398 | renderer build follows linked dependency paths before applying the UV cache repair | Build | `build/usd-composer-plugin.ts` patches the composer wherever it is loaded; a missing needle fails the build |
| 399 | vendor entry parses USD, USDA, USDC, and USDZ | Type | `src/render/usd-loader.ts` re-exports three's `USDLoader` |
| 400 | vendor entry supplies direct orbit, zoom, and pan controls | Type | `OrbitControls` is a typed import of `src/render/studio.ts` |
| 401 | the built interactive renderer exists | Build | `vite build` emits `assets/studio-*.js`; `verify:apps` checks the pinned tree |
| 402 | the heavy renderer stays lazy until CMF opens | Build | `src/app/controller.ts` loads `render/studio.ts` with `import()`; the build emits it as its own chunk |
| 403 | the repaired renderer URL invalidates stale browser caches | Retired | Vite names files by content hash; covered by the build |
| 404 | the browser parses the current real USDZ | Playwright | `tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 405 | the model supports free pointer and wheel inspection | Playwright | `tests/e2e/studio.spec.ts` › menu commands run… (dragging the model clears the marked view) |
| 406 | named views animate the live camera instead of replacing an image | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish… (each named view moves the camera) |
| 407 | loaded USDZ meshes receive part-level live material ownership | Vitest | `tests/unit/materials.test.ts` |
| 408 | finish changes target semantic parts in the loaded model | Vitest | `tests/unit/materials.test.ts` |
| 409 | finish changes recolor the real model without waiting for another package | Playwright | `tests/e2e/studio.spec.ts` › every device… (a finish repaints the model) |
| 410 | CMF renderer caches USD textures separately for every UV channel | Vitest | `tests/unit/usd-transforms.test.ts` › runs the loader through the same plugin; fails unpatched (6 of 6) |
| 415 | secondary-UV baked AO is identified even when the loader loses its texture channel | Vitest | `tests/unit/materials.test.ts` |
| 416 | corrupt secondary-UV AO atlases cannot paint component silhouettes over the enclosure | Vitest | `tests/unit/materials.test.ts` |
| 417 | every user-configurable exterior part rejects the broken baked AO atlas | Vitest | `tests/unit/materials.test.ts` |
| 418 | transparent USD layers do not punch hard holes into surfaces behind them | Vitest | `tests/unit/materials.test.ts` |
| 419 | a completed model is installed before the prior model is removed | Playwright | `tests/e2e/studio.spec.ts` › a device that fails to load leaves the last working model on screen |
| 420 | failed updates can preserve the last working model | Playwright | `tests/e2e/studio.spec.ts` › a device that fails to load leaves the last working model on screen |
| 421 | the front end no longer asks for static SceneKit PNG views | Type | services go through the bridge only (`CmfServiceName` in `src/bridge/types.ts`); no `/api` URL in the app |
| 422 | the front end no longer asks for a simplified software preview | Type | same as line 421 |
| 425 | interactive model canvas exists | Playwright | `tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 426 | static preview image was removed | Retired | removed element; covered by Playwright,`tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 427 | schematic fallback was removed | Retired | removed element; covered by Playwright,`tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 428 | part controls target exists | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 429 | view reset control exists | Playwright | `tests/e2e/studio.spec.ts` › on a phone the toolbar uses its short labels (`[data-cmf-reset-view]`) |
| 430 | export USDZ button exists | Playwright | `tests/e2e/studio.spec.ts` › export goes to the desk as a file… |
| 431 | phone view control has a short localized visible label | Playwright | `tests/e2e/studio.spec.ts` › on a phone the toolbar uses its short labels |
| 432 | phone export control has a short localized visible label | Playwright | `tests/e2e/studio.spec.ts` › on a phone the toolbar uses its short labels |
| 433 | color changes update the loaded USDZ model immediately | Playwright | `tests/e2e/studio.spec.ts` › every device… (Live material updated) |
| 434 | front end exports through the service capability | Playwright | `tests/e2e/studio.spec.ts` › without the model asset, a desk that can export on its server still offers export |
| 435 | part colors use stable inline swatch buttons | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 436 | part colors avoid native select dropdowns | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 437 | front end does not rely on CSS filters for recoloring | Retired | recolouring is material colour, not CSS; covered by `tests/unit/materials.test.ts` |
| 443 | the default view is derived from the active camera set | Vitest | `tests/unit/recipe.test.ts` › the default view is the first of the active set |
| 444 | model switch, pose switch, and reset all re-derive the selected view | Playwright | `tests/e2e/studio.spec.ts` › every device… (exactly one view is marked after each switch) |
| 445 | (cmfStudio.match(/selectedView = defaultViewForActive\(\)/g)) | Playwright | `tests/e2e/studio.spec.ts` › every device… (exactly one view is marked after each switch) |
| 448 | reset no longer hard-codes a phone view name | Vitest | `tests/unit/recipe.test.ts` › the default view… (reset re-derives it: `Controller.reset`) |
| 453 | the view strip repairs a stale selected view when it rebuilds | Playwright | `tests/e2e/studio.spec.ts` › every device… (exactly one view is marked after each switch) |
| 462 | the CMF API exposes cancelRender | Playwright | `tests/e2e/studio.spec.ts` › suspend stops drawing and resume repaints (`lifecycle.suspend` cancels a load in flight) |
| 463 | window close has a guarded CMF branch | Desk (re-aimed) | `extracted-app-host`: the host sends `lifecycle.suspend` with `cause: "close"` |
| 464 | closing CMF cancels an in-flight render | Desk (re-aimed) | `extracted-app-host` + Playwright suspend test |
| 468 | the capabilities probe is time-bounded | Gap | `CAPABILITIES_TIMEOUT_MS = 8000` in `src/app/controller.ts`; a hung probe is not simulated |
| 469 | the timeout aborts the capabilities fetch | Gap | same as line 468 |
| 470 | the capabilities timer is always cleared | Gap | same as line 468 |
| 472 | CMF stylesheet is in the style manifest | Retired | the stylesheet is imported by the app, not the desk's manifest; covered by `src/main.tsx` + the build |
| 473 | CMF stylesheet adds no !important overrides | Vitest | `tests/unit/styles.test.ts` |
| 516 | English string exists for ${key} | Type | `StringKey` is the English table's keys and `zh` is `Record<StringKey, string>`; `tests/unit/strings.test.ts` |
| 517 | Chinese string exists for ${key} | Type | `StringKey` is the English table's keys and `zh` is `Record<StringKey, string>`; `tests/unit/strings.test.ts` |
| 520 | CMF exports every view preset as a browser PNG | Playwright | `tests/e2e/studio.spec.ts` › Export Views hands the desk one PNG per view |
| 521 | view export reads the WebGL canvas as a PNG blob (synchronously, so the lent environment is never composited) | Playwright | `tests/e2e/studio.spec.ts` › Export Views… |
| 522 | each view is framed synchronously before readback | Playwright | `tests/e2e/studio.spec.ts` › Export Views… |
| 523 | view export renders offscreen at higher resolution | Playwright | `tests/e2e/studio.spec.ts` › Export Views… (each file > 20 kB: not a black silhouette) |
| 524 | the multi-view export command is registered | Playwright | `tests/e2e/studio.spec.ts` › Export Views… |
| 525 | the multi-view export button exists | Playwright | `tests/e2e/studio.spec.ts` › Export Views… |
| 532 | the screen-image controls and their strings are gone from the studio | Retired | removed feature; nothing in the package names it; covered by `tests/unit/assets.test.ts` (viewer) |
| 533 | and the viewer no longer offers a screen-image path | Vitest | `tests/unit/assets.test.ts` |
| 534 | the fold video keeps its button | Playwright | `tests/e2e/studio.spec.ts` › the Duo opens in its own scene viewer and folds (fold-video button) |
| 535 | and that button is written on Play's own row, not in a band of its own | Playwright | `tests/e2e/studio.spec.ts` › the Duo… (`.cmf-motion-controls .cmf-duo-video`) |
| 540 | Duo video export is wired to the local viewer | Type | `DuoViewer.record()` in `src/render/duo.ts`; the recording itself is not run in tests (5.5 s + encoding) |
| 542 | the Duo publishes its own part list | Vitest | `tests/unit/catalog.test.ts` |
| 544 | the Duo part list carries ${part} | Vitest | `tests/unit/catalog.test.ts` |
| 546 | the Duo viewer owns the part/material map | Vitest | `tests/unit/assets.test.ts` |
| 550 | the Duo back glass paints ${material} | Vitest | `tests/unit/assets.test.ts` |
| 552 | the Duo hinge is its own finish | Vitest | `tests/unit/assets.test.ts` |
| 553 | the Duo camera plateau is its own finish | Vitest | `tests/unit/assets.test.ts` |
| 554 | the Duo side-button rail is its own finish | Vitest | `tests/unit/assets.test.ts` |
| 555 | a part the scene stops authoring is named, not silently absent | Vitest | `tests/unit/assets.test.ts` |
| 558 | the Duo renders the scene's draggable camera | Vitest | `tests/unit/assets.test.ts` |
| 559 | the Duo viewer answers named camera angles | Vitest | `tests/unit/assets.test.ts` |
| 560 | the Duo offers named camera angles | Vitest | `tests/unit/catalog.test.ts` |
| 561 | the Duo view strip follows the camera after a drag | Gap | `Controller.#duoAngle` follows the scene's `angle` message; a drag inside the Duo scene is not automated |
| 565 | the Duo viewer document carries the build stamp | Retired | the viewer is a file of the pinned, content-hashed app tree; covered by `verify:apps` |
| 566 | the Duo viewer is fetched under the build stamp | Retired | same as line 565; covered by `verify:apps` |
| 569 | the fold strip keeps its own container class | Playwright | `tests/e2e/studio.spec.ts` › the MacBook's lid opens and closes (`.cmf-motion-controls`) |
| 570 | Duo viewer records a fold animation | Vitest | `tests/unit/assets.test.ts` |
| 576 | the renderer state tracks the models it has parented | Gap | `Studio.#loaded` sweeps every parented model on commit; not observable from outside the scene |
| 577 | every scene add is paired with a membership add | Gap | same as line 576 |
| 578 | the commit sweeps the models it has parented instead of removing one predecessor | Gap | same as line 576 |
| 583 | the old single-predecessor removal is gone, so a superseded model cannot stay parented | Gap | same as line 576 |
| 588 | the Duo handoff and the teardown each clear the tracked model set | Gap | `Studio.clear()` empties the set on the Duo handoff and in `dispose()`; same limit |
| 589 | (cmfStudio.match(/loadedModels\?\.clear\(\)/g)) | Gap | same as line 588 |
| 597 | the renderer state remembers which device the camera is framed for | Playwright | `tests/e2e/studio.spec.ts` › every device… (each device draws a different, framed picture) |
| 598 | the commit re-frames whenever the camera belongs to another device | Playwright | `tests/e2e/studio.spec.ts` › every device… |
| 599 | and records the device it just framed for | Playwright | `tests/e2e/studio.spec.ts` › every device… |
| 601 | Export Views has a phone label too, instead of clipping mid-word | Playwright | `tests/e2e/studio.spec.ts` › on a phone the toolbar uses its short labels |
| 609 | the offscreen renderer builds the environment in its own context | Playwright | `tests/e2e/studio.spec.ts` › Export Views… (> 20 kB per still) |
| 610 | the scene lends its environment for the capture | Playwright | `tests/e2e/studio.spec.ts` › Export Views… |
| 611 | and always takes it back | Playwright | `tests/e2e/studio.spec.ts` › Export Views… |
| 612 | the borrowed environment is disposed with the renderer that made it | Playwright | `tests/e2e/studio.spec.ts` › Export Views… |
| 622 | the export writes stored entries, so Quick Look and AR can open it | Desk (kept) | desk-side fact; stays in the desk contract |
| 623 | and never repackages with the zip default | Desk (kept) | desk-side fact; stays in the desk contract |
| 627 | the browser exporter stores its entries too | Vitest | `tests/unit/parity.test.ts` › stores the archive uncompressed |
| 628 | and no longer deflates the archive Quick Look has to open | Vitest | `tests/unit/parity.test.ts` › stores the archive uncompressed |

## `tests/features/classic-help-discovery.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 55 | CMF model chooser can identify itself | Desk (re-aimed) | these controls carry their balloon text as `title` inside the frame; desk Balloon Help does not reach into frames |
| 56 | CMF finish palette can identify itself | Desk (re-aimed) | these controls carry their balloon text as `title` inside the frame; desk Balloon Help does not reach into frames |
| 57 | CMF USDZ export can identify itself | Desk (re-aimed) | these controls carry their balloon text as `title` inside the frame; desk Balloon Help does not reach into frames |
| 58 | CMF live model indicator can identify itself | Desk (re-aimed) | these controls carry their balloon text as `title` inside the frame; desk Balloon Help does not reach into frames |

## `tests/features/window-iframe-boundary-w07.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 56 | ${name} gates its message listener on source or origin | Desk (re-aimed) | the entry is re-aimed to `public/assets/iphone-duo/viewer.js`, whose listener gates on source and origin; `src/render/duo.ts` gates the same way |
| 59 | the contract walked ${windowListeners} window message listeners (expected ≥ 5) | Desk (re-aimed) | the entry is re-aimed to `public/assets/iphone-duo/viewer.js`, whose listener gates on source and origin; `src/render/duo.ts` gates the same way |

## `tests/features/menu-bar.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 290 | every clickable application-menu item has a real action handler | Desk (re-aimed) | menus as data in `public/app.manifest.json`, read by the menu contract |
| 308 | (cmfStudio.matchAll(/"(open-cmf-studio\|cmf-[a-z-]+)"/g)) | Desk (re-aimed) | menus as data in `public/app.manifest.json` |

## `tests/features/menu-availability.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 99 | (cmfStudio.matchAll(/"(open-cmf-studio\|cmf-[a-z0-9-]+)"/g)) | Desk (re-aimed) | menus as data in `public/app.manifest.json` |

## `tests/features/working-session.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 158 | Project B has a scene of its own | Desk (kept) | a window name in a saved scene; `cmfStudio` is still a window |

## `tests/features/cmf-usdz-export.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 16 | browser exporter installs on window.AISystem6CMFUsdzExport | Vitest | `tests/unit/usdz.test.ts` |
| 39 | browser actionButton maps to actionOrSim | Vitest | `tests/unit/usdz.test.ts` |
| 40 | frameSide follows frame when not supplied | Vitest | `tests/unit/usdz.test.ts` |
| 41 | screwOrSpeaker follows USB-C when not supplied | Vitest | `tests/unit/usdz.test.ts` |
| 79 | non-USD entries are preserved byte-for-byte | Vitest | `tests/unit/usdz.test.ts` |
| 81 | frame material clone is written | Vitest | `tests/unit/usdz.test.ts` |
| 82 | backGlass material clone is written | Vitest | `tests/unit/usdz.test.ts` |
| 83 | body mesh is rebound to its frame clone | Vitest | `tests/unit/usdz.test.ts` |
| 84 | back mesh is rebound to its backGlass clone | Vitest | `tests/unit/usdz.test.ts` |
| 85 | both recolored surfaces produce exactly one clone | Vitest | `tests/unit/usdz.test.ts` |
| 100 | (assert.ok(output.includes(`float3 xformOp:rotateXYZ = (${degrees}, 0, 0)`))) | Vitest | `tests/unit/usdz.test.ts` |
| 101 | (assert.equal(output.replace(/\n double3 xformOp:translate = [^\n]+\n float3 ) | Vitest | `tests/unit/usdz.test.ts` |
| 103 | (assert.ok(Math.abs(Math.cos(radians) * y - Math.sin(radians) * z + translation[1] - y) < 1) | Vitest | `tests/unit/usdz.test.ts` |
| 104 | (assert.ok(Math.abs(Math.sin(radians) * y + Math.cos(radians) * z + translation[2] - z) < 1) | Vitest | `tests/unit/usdz.test.ts` |
| 106 | (assert.ok(Math.abs(motion.neoTransform(1).degrees) < 1e-10)) | Vitest | `tests/unit/usdz.test.ts` |
| 107 | (assert.equal(motion.neoTransform(0).degrees, 110)) | Vitest | `tests/unit/usdz.test.ts` |
| 108 | (assert.equal(exporter.normalizeRecipe({ modelId: "macbook-neo", fold: -1 }).fold, 0)) | Vitest | `tests/unit/usdz.test.ts` |
| 109 | (assert.equal(exporter.normalizeRecipe({ modelId: "macbook-neo", fold: 2 }).fold, 1)) | Vitest | `tests/unit/usdz.test.ts` |
| 115 | prepared Pro component exists | Vitest | `tests/unit/usdz.test.ts` |
| 116 | (proSource.matchAll(/@([^@]+)@/g)) | Vitest | `tests/unit/usdz.test.ts` |
| 117 | Pro texture is packaged: ${asset} | Vitest | `tests/unit/usdz.test.ts` |
| 121 | real Pro back glass materials can be exported in a new finish | Vitest | `tests/unit/usdz.test.ts` |

## `tests/features/clip-claim-write-back.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 286 | exportUsdz never claims the file was exported unless saveArtifact's own dispatch result says so | Playwright | `tests/e2e/studio.spec.ts` › export goes to the desk as a file… (status only after `files.export` resolves) |
| 291 | exportViewsAsPng never claims every view exported unless every saveArtifact dispatch actually confirmed | Playwright | `tests/e2e/studio.spec.ts` › Export Views hands the desk one PNG per view (`cmf_export_views_done` only when every file was taken) |

## `tests/features/application-lifecycle.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 269 | ${appId} registers a lifecycle | Desk (re-aimed) | the `cmfStudio` row leaves the hand-registered list: the extracted host registers its lifecycle |
| 270 | ${appId} declares onSuspend | Desk (re-aimed) | same as line 269 |
| 271 | ${appId} declares onResume | Desk (re-aimed) | same as line 269 |
| 272 | ${appId} declares onDispose | Desk (re-aimed) | same as line 269 |
| 320 | CMF Studio takes the render loop off the renderer | Playwright | `tests/e2e/studio.spec.ts` › suspend stops drawing and resume repaints (no animation frames while suspended) |
| 321 | a suspended CMF Studio schedules no frames at all | Playwright | `tests/e2e/studio.spec.ts` › suspend stops drawing… |
| 322 | resume reinstalls the same loop | Playwright | `tests/e2e/studio.spec.ts` › suspend stops drawing… (resume repaints) |

## `tests/features/creative-labs-control-reform.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 22 | CMF exposes one shared finish palette | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 23 | CMF exposes device parts as one selectable object list | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 24 | CMF keeps one explicit selected part | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 25 | Palette choices apply to the selected part | Playwright | `tests/e2e/studio.spec.ts` › every device… (a chip paints the selected part) |
| 26 | CMF part list supports roving keyboard navigation | Type | `rovingKeys` in `src/ui/App.tsx` (parts, palette, views) |
| 27 | CMF finish palette supports roving keyboard navigation | Type | `rovingKeys` |
| 28 | CMF live-model views support roving keyboard navigation | Type | `rovingKeys` |
| 29 | CMF preserves server capability state while operations are busy | Type | buttons disable on `busy` or the capability signal, never one for the other (`src/ui/App.tsx`) |
| 30 | CMF export uses stable loading semantics | Retired | the desk's loading helper is not in the frame; covered by the busy status line (`Controller.#setBusy`) |
| 31 | CMF owns one interactive model surface | Playwright | `tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 32 | CMF does not substitute a schematic for the model | Retired | removed element; covered by Playwright,`tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 33 | CMF reports a missing USDZ path instead of promising a false preview | Playwright | `tests/e2e/studio.spec.ts` › with no model asset and no server… |
| 34 | CMF renders the actual recolored USDZ in the browser | Playwright | `tests/e2e/studio.spec.ts` › loads without a console error and paints a real model |
| 35 | CMF finish changes update the loaded model immediately | Playwright | `tests/e2e/studio.spec.ts` › every device… (Live material updated) |
| 36 | CMF owns narrow-window layouts through its container | Retired | the container query moved with the stylesheet; covered by `src/styles/cmf-studio.css` (`@container cmf-studio`) + Playwright phone test |
| 37 | CMF adds no priority overrides | Vitest | `tests/unit/styles.test.ts` |

## `tests/features/copy-comprehension.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 49 | CMF recipe copy states the product boundary | Vitest | `tests/unit/strings.test.ts` › the preset help states the product boundary |
| 50 | 中文 CMF 文案不冒充 Apple 成品配色 | Vitest | `tests/unit/strings.test.ts` › the preset help states the product boundary |

## `tests/features/harvest-ux.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 162 | CMF export/view chrome says wait for the model | Desk (re-aimed) | disabled controls carry `balloon_cmf_needs_model` as their `title` (`src/ui/App.tsx`); desk Balloon Help does not reach frames |
| 495 | A4 CMF is in the narrow harvest set | Desk (kept) | `.cmf-studio-window` is still the desk window's class (manifest `windowClass`) |
| 589 | C13 CMF names availability with reason | Desk (re-aimed) | menu availability arrives as `menu.state` (`Controller.menuState`) |
| 590 | C13 CMF registers unavailableReason | Desk (re-aimed) | same as line 589 |
| 591 | C13 CMF host-missing reason is honest | Desk (re-aimed) | the host owns the host-window reason for every extracted app |

## `tests/features/cmf-usd-transforms.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 14 | ${name} exists in the source asset | Vitest | `tests/unit/usd-transforms.test.ts` |
| 26 | ${name} defines ${attribute} | Vitest | `tests/unit/usd-transforms.test.ts` |
| 35 | ${name} loads as a mesh | Vitest | `tests/unit/usd-transforms.test.ts` |
| 39 | ${name} rotates around its own pivot | Vitest | `tests/unit/usd-transforms.test.ts` |
| 51 | ${name} vertex ${i} preserves the authored transform | Vitest | `tests/unit/usd-transforms.test.ts` |

## `tests/features/public/cmf-studio-contract.test.mjs`

| Line | Message | Destination | Where |
| ---: | --- | --- | --- |
| 11 | CMF Studio loads lazily | Retired | no desk module any more; covered by `extracted-app-host` |
| 12 | CMF Studio owns a supported-device palette | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 13 | CMF Studio palette entries are declarative | Playwright | `tests/e2e/studio.spec.ts` › every device, view and finish changes the picture |
| 14 | CMF Studio palette labels come from translations | Type | finish labels are `StringKey`s |
| 15 | opening CMF Studio is a command | Desk (re-aimed) | the admission row's open command |
| 16 | exporting USDZ is a registered command | Type | menus as data in `public/app.manifest.json` |
| 17 | changing device views is a registered command | Type | menus as data in `public/app.manifest.json` |
