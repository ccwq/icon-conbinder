# Icon Combinder

<p align="center">
  <img src="./docs/public/examples/favicon.svg" alt="Icon Combinder logo" width="88" height="84">
</p>

`icon-combinder` 是一个用于合成 `Wrapper + Icon` 的库，附带本地测试服务、浏览器 UMD 入口和文档站点。
它的定位很明确：同一套合成逻辑，既能被其他项目直接引用，也能用来快速调参和验证导出效果。

> [!NOTE]
> 这个仓库更适合当作“库 + 调试工作台”来用，不是面向长期托管的在线产品。

## 它提供什么

- 作为库被其他项目引用，直接复用参数解析、布局计算和合成渲染
- 作为浏览器 UMD 入口挂到现有页面里做快速试验
- 作为本地服务打开 `/ui.html`、`/icon` 和 `/info` 做调参与验证
- 作为测试辅助图床，支持 `GET / POST` 图片输入切换

## 快速开始

安装依赖：

```bash
npm install icon-combinder
```

启动本地服务：

```bash
npm start
```

打开工作台：

```text
http://localhost:3000/ui.html
```

如果要同时启动主服务和独立测试图床：

```bash
npm run dev
```

如果要本地预览文档站：

```bash
npm run docs:dev
```

## 作为库引用

CommonJS：

```js
const {
  parseState,
  getLayout,
  getRenderSize,
  resolveImageReference,
  renderComposite,
  createNodeRuntime,
  loadImageFromReference,
} = require("icon-combinder");
```

ESM / 打包器环境也可以用同名命名导入。

常见用法是把这三层能力配起来：

- `core`：参数解析、布局和尺寸计算
- `render`：合成渲染
- `runtime`：Node 侧图片加载与编码适配

## 浏览器 UMD

浏览器端保留了 UMD 入口，适合直接接到静态页面或已有调试页里。加载顺序要保持为 `core` -> `render` -> `browser.js`：

```html
<script src="/assets/core/index.js"></script>
<script src="/assets/core/render.js"></script>
<script src="/browser.js"></script>
```

然后调用：

```js
await window.IconCombinderBrowser.renderIcon(state, source);
```

`browser.js` 会在真正渲染时才检查依赖是否齐全，适合做渐进式接入。

## 本地服务

本地服务主要用于快速试参数，不建议当成长期对外托管的主站。

常用入口：

- `/ui.html`：浏览器工作台，支持参数面板、预览和请求复制
- `/icon`：返回 `image/png`
- `/info`：返回当前参数下的布局和导出尺寸
- `/__imgbed/upload`：本地图床上传接口

环境变量通过 `.env` / `.env.example` 控制，常见项包括：

- `PORT`：服务端口，默认 `3000`
- `ENABLE_CORS`：是否开启跨域
- `IMAGE_URL_PREFIX`：相对路径图片的基础前缀
- `IMAGE_URL_PREFIX_ONLY`：是否要求图片地址必须命中前缀
- `IMAGE_ENABLE_BASE64`：是否允许 `data:image/*;base64,...`
- `IMG_BED_BASE_URL`：`GET` 模式上传文件时使用的独立图床地址

> [!TIP]
> `npm run dev` 会同时拉起主服务和测试图床，适合在 `ui.html` 里走完整的上传和预览链路。

## HTTP 接口

完整参数表和返回值请看 [API 参考](/api)。下面是最常用的入口：

- `GET /ui.html`：本地调参工作台
- `GET /icon`：通过 query string 导出 PNG
- `POST /icon`：通过 `multipart/form-data` 上传本地图片
- `GET /info`：只看布局和导出尺寸，不渲染图片
- `POST /__imgbed/upload`：上传到本地图床
- `GET /__imgbed/:id`：读取本地图床里的原始文件

## 文档与示例

- [在线文档站](https://ccwq.github.io/icon-conbinder/)
- [快速开始](/guide/getting-started)
- [API 参考](/api)
- [基本示例](/examples/basic)
- [进阶示例](/examples/recipes)

## 发布与反馈

- npm 包：<https://www.npmjs.com/package/icon-combinder>
- GitHub Issues：<https://github.com/ccwq/icon-conbinder/issues>
