# 研究发现

## icon-combinder 库结构

### 关于浏览器操作

使用agent-browser --cdp 9696 进行处理

### 核心模块
- `core/index.js` - 提供 UMD 入口 `IconCombinderCore`
  - `parseState()` - 解析参数
  - `getLayout()` - 计算布局
  - `SHAPES` - 支持的形状定义
  - `RESIZE_STRATEGIES` - 抗锯齿策略

- `core/render.js` - 提供 UMD 入口 `IconCombinderRender`
  - `renderComposite()` - 组合渲染入口
  - `drawPinLayers()` - 绘制各层
  - `genericDownsampleCanvas()` - 缩小策略

### Browser UMD 入口
- `browser.js` - 提供 `IconCombinderBrowser`
  - `renderIcon(state, source)` - 浏览器渲染接口
  - `loadImageFromSource()` - 加载图片
  - 需要先加载 `core/index.js` 和 `core/render.js`

### 参数说明
| 参数 | 类型 | 默认值 | 说明 |
|-----|-----|-------|-----|
| shape | string | pin | 形状 |
| iconSize | number | 128 | 高度 px |
| borderWidth | number | 4 | 描边宽度 |
| borderColor | string | #ef4444 | 边框颜色 |
| bgColor | string | #ffffff | 背景颜色 |
| enableShadow | 0/1 | 1 | 阴影开关 |
| shadowBlur | number | 10 | 阴影模糊 |
| shadowOffsetY | number | 5 | 阴影偏移 |
| antiAliasScale | 1/2/4 | 1 | 超采样倍率 |
| resizeStrategy | string | smooth-high | 缩小策略 |

### 形状列表
- pin (图钉)
- circle (圆形)
- square (方形)
- squircle (圆角方)
- hexagon (六边形)

### 缩小策略
- smooth-high - Canvas 高质量缩放
- pixelated - 最近邻
- step-down - 逐步递减
- sharp-lanczos3 - Lanczos3 (仅服务端)

## 2026/05/19 - Example 页面必须覆盖 `views/ui.pug` 的浏览器侧能力

### 观察
- `example/src/App.vue` 目前只覆盖了 `shape`、`iconSize`、`borderWidth`、`lineJoin`、`borderColor`、`bgColor`、`enableShadow`、`shadowBlur`、`shadowOffsetY`、`exportSquare`、`exportStrategy`、`antiAliasScale`、`resizeStrategy`。
- `views/ui.pug` 还包含 `image`、`imageScale`、`imageOffsetY`、`contourEnhance`、`contourOuterGlow`、`contourOuterWidth`、`contourMainWidth`、`contourInnerWidth`、`contourCornerSoftness`，以及图像输入/上传区。
- `browser.js` 的 `renderIcon(state, source)` 已支持 `kind: "url" | "data" | "file"`，所以 example 页可以在纯浏览器侧补齐 URL / data / file 三类 source。
- 用户明确要求 example 页作为 `views/ui.pug` 的替代面，除图床等 Node 依赖能力外，其余参数和操作都应覆盖。

## 2026/05/19 - example 页来源入口与持久化

### 观察
- `example/src/App.vue` 现在把来源切成 `URL / 本地文件 / 预设缓存上传(Node-only)` 三段，Node-only 项保持可见但禁用。
- 本地文件选择走 `browser.renderIcon(..., { kind: 'file', file })`，并在文件读完后把 data URL 一并缓存到 `localStorage`，刷新后可以恢复来源状态与折叠状态。
- 文件导出文本不会直接吐出 data URL，而是用 `file:<filename>` 占位，避免复制区膨胀。

## 2026/05/19 - example 页紧凑布局

### 观察
- 左侧基础参数改成两列卡片后，原本纵向堆叠的表单密度明显下降。
- 预览区从大画布缩到更小的 248px 级别，并把导出区放到预览列下面，中心列的空白被重新利用。
- 右侧效果区保持折叠默认态后，整页在浏览器里可以压进单屏，未再出现页面级纵向滚动条。

## 2026/05/19 - example 页面四背景预览与尺寸联动

### 观察
- `preview-stage` 已移除，预览区现在只保留 4 个背景窗口和下方信息条，主视觉从单一大画布转为 2x2 预览矩阵。
- 4 个背景窗口分别覆盖黑色、白色、网格、自定义红色。
- 尺寸预设已复现为 `24 / 30 / 36 / 45 / 54`，点击后会按当前联动基准同步 `imageScale`。
- `imageScale` 手动修改会先进入 300ms 暂停态，暂停结束后自动恢复联动，并沿用当前值作为新基准。
- 浏览器核对结果：默认桌面视口下 `preview-stage` 为 `false`，4 个预览卡片均存在，四卡宽度约 `239px`，`page.scrollWidth == viewport.width`。
- 窄视口下 4 个预览卡片会自动收成单列 4 行，满足空间不足时的折行要求。

## 2026/05/19 - 预览图保持原始尺寸

### 观察
- 四个背景窗口中的 `<img>` 已取消 CSS 宽高约束，恢复为原始渲染尺寸显示。
- 浏览器测量结果显示，卡片尺寸约 `239 × 118`，图片本身约 `26 × 26`，证明没有再被背景窗二次放大。

## 2026/05/19 - 文档页不应再内嵌 example iframe

### 观察
- `docs/examples/basic.md` 和 `docs/examples/recipes.md` 原先都把 `example` 以固定 `height="600"` 的 `iframe` 重复嵌入。
- 这种方式天然会把交互工作台压缩成文档里的局部窗口，无法满足“全屏工具页”的使用预期。
- 正确方向是让文档页只保留入口链接，把交互工作台当成独立页面 `/examples/index.html`。

## 2026/05/19 - example 页的导航串联规则

### 观察
- 用户要求在 example 页中显式串联 GitHub、API 和文档入口，而不是只保留参数编辑器本体。
- 经过实现和浏览器验证，顶部导航应至少包含：
  - `文档首页`
  - `API 参考`
  - `示例说明`
  - `GitHub`
- 页面内快捷入口应至少包含：
  - `快速开始`
  - `文档 API`
  - `GET /icon`
  - `GET /info`

## 2026/05/19 - 开发环境与测试环境的正确同步链路

### 观察
- `example` 页在文档站中的真实来源是 `docs/public/examples/` 的静态副本，而不是 `example/` 源码目录。
- 因此修改 `example/src/*` 后，如果没有重新构建并同步 `example/dist/*` 到 `docs/public/examples/`，文档站里的全屏演示页不会更新。
- 稳定链路是：
  1. `cd example && npm run build`
  2. 同步 `example/dist/*` 到 `docs/public/examples/`
  3. `npm run docs:build`
  4. 用新的 `vitepress preview` 端口做验证
- 旧 preview 进程可能继续服务旧资源，表现为：
  - 页面看起来还是旧版
  - `examples/index.html` 已更新，但 `./assets/*.js` 请求结果异常
  - 浏览器标签中 `#app` 为空，像是页面白屏
- 换新端口后，`/examples/index.html` 运行态已确认存在 `.hero-strip`、顶部导航和本地接口入口。

## 2026/05/19 - example 默认预览图与首屏可见性

### 观察
- `example/src/App.vue` 的默认来源已经固定为 `file:hospital.png`，并在首次打开时自动恢复为本地文件模式。
- 在 `http://string.localhost:4178/icon-conbinder/examples/index.html` 的实机验证中：
  - `sourceSrc` 为 `./hospital.png`
  - `sourceComplete` 为 `true`
  - `sourceNaturalWidth` 为 `24`
  - `thumbsLoaded` 为 `4`
  - `sourceLabel` 为 `hospital.png`
- 这说明页面打开时不是空白，也不是只渲染壳结构后等二次交互才出现预览图。
