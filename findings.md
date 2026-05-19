# 研究发现

## icon-combinder 库结构

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
