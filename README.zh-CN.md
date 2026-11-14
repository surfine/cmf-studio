# CMF Studio（配色工作台）

真实设备的颜色、材质与表面处理工作台。选一台手机或笔记本，选一个部件，从厂商真正为这台设备发售过的表面处理里挑一种涂上去，然后在实时 3D 模型上看结果：可以转动、跳到命名视角、打开笔记本的屏幕或折叠折叠屏手机。成品可以导出为 USDZ（用于快速查看和 AR），命名视角导出为 PNG，折叠过程导出为视频。

它是一份工作台配方，不是厂商发售的整机配色：每种表面处理都真实存在，组合是你自己的。

它可以在自己的页面上独立运行，也可以作为 AI System 6 桌面的一个窗口，通过应用套件的桥（`public/ais6-bridge.js`）与桌面通信。

## 运行

```sh
npm install
npm run dev
```

然后打开 Vite 打印的地址。`npm run build` 把页面写入 `dist/`；`npm run preview` 预览这次构建。

## 检查

```sh
npm run check      # 类型检查、lint、单元测试、构建
npm run test:e2e   # 用 Playwright 测 `vite preview` 出来的构建
```

`CONTRACTS.md` 把桌面原有 CMF 契约的每一条断言，对应到现在守护它的测试、类型或桌面契约。

## 宿主需要提供什么

在自己的页面上，应用把配方存在浏览器里，文件以下载方式保存。在桌面里，它向宿主请求：

| 桥调用 | 用途 |
| --- | --- |
| `state.get` / `state.set` | 每台设备保存的配方 |
| `files.export` | USDZ、PNG 和 WebM 文件 |
| `service.request` `cmf.capabilities` | 宿主能否在服务器上生成 USDZ |
| `service.request` `cmf.exportUsdz` | 服务器生成，仅在取不到模型文件时使用 |
| `menu.command`、`menu.state` | 文件、配方、视图三个菜单，当前视角打勾 |
| `lifecycle.suspend` / `resume` / `dispose` | 窗口离开时停下渲染循环 |

USDZ 导出在浏览器里由随包的模型完成。服务器路径（`cmf.exportUsdz`）只是后备，需要提供这项服务的宿主桌面；没有它、又取不到模型文件时，导出不可用。

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/model/` | 设备目录、配方、查询 |
| `src/motion/` | 笔记本铰链与折叠缓动 |
| `src/render/` | three.js 工作台、材质、取景、折叠屏手机的场景框架 |
| `src/export/` | USDZ 重新打包与文件命名 |
| `src/bridge/` | 与宿主之间带类型的桥 |
| `src/app/` | 控制器：以 signal 保存状态，承载每个操作 |
| `src/ui/` | Preact 组件 |
| `src/styles/` | 基于套件 token 的样式表 |
| `src/strings/` | 英文与中文字符串 |
| `build/` | three 的 USD composer 需要的两个补丁，构建时打上 |
| `public/` | 清单、套件、模型与场景 |
| `tests/unit/`、`tests/e2e/` | Vitest 与 Playwright |

## 许可

代码：MIT（`LICENSE`）。`public/assets/` 下的设备模型、产品场景和光照环境经许可使用，不在 MIT 之内；`LICENSES.md` 逐项列出。
