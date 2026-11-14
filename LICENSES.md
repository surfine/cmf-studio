# Licences

The code in this repository is MIT (see `LICENSE`). The device models, the
product scenes and the lighting environment are not: they are used with the
rights holders' written permission for public redistribution, and that
permission does not pass to anyone who copies them from here.

| Folder or file | What it is | Origin | Licence |
| --- | --- | --- | --- |
| `public/assets/iphone-17-standard.usdz`, `iphone-17-pro.usdz`, `iphone-17-pro-max.usdz`, `iphone-air.usdz`, `iphone-17e.usdz`, `iphone-18-pro.usdz` | Device models, prepared (split and renamed) from the manufacturer's published AR models | The manufacturer's product pages | Used with permission |
| `public/assets/macbook-neo-closed.usdz`, `macbook-neo-open.usdz` | The laptop in its two authored poses, prepared the same way | The manufacturer's product page | Used with permission |
| `public/assets/environment/studio.exr` | The lighting environment the product scene names | The manufacturer's product scene | Used with permission |
| `public/assets/iphone-duo/scenes/`, `uploads/`, `vendor/` | The folding phone's product scene, its textures and the manufacturer's scene runtime (`vendor/apple-lotus.js`, `vendor/apple-modules.js`); pinned by hash in `source.json` | The manufacturer's product page (`source.json` names it and the retrieval date) | Used with permission |
| `public/assets/iphone-18-pro/scenes/`, `uploads/`, `vendor/` | The same for the 18 Pro scene | The manufacturer's product page (`source.json`) | Used with permission |
| `public/assets/iphone-duo/viewer.html`, `viewer.js`, `viewer.css`, `source.json`; the same files under `iphone-18-pro/` | This project's adapter around each scene, and the pin list | This repository | MIT |
| `public/ais6-bridge.js`, `public/kit.css` | The host desk's app kit, vendored | The AI System 6 repository | MIT |
| three.js (bundled into `dist/`) | 3D rendering, USD loader, orbit controls, fflate | npm `three` | MIT, Copyright © 2010-2026 three.js authors |
| Preact, @preact/signals (bundled into `dist/`) | UI | npm | MIT |
