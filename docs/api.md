# API 参考

这个项目的 API 分两层：

- **库 API**：给其他项目直接 `require` / `import`，复用参数解析、布局计算和渲染
- **HTTP API**：给本地测试服务和浏览器工作台使用，方便快速试参数

> [!NOTE]
> `/ui.html` 是工作台，不是独立产品页。它的职责是把同一套参数调到可用，然后把结果复制到别的场景里。

## 库 API

| 名称 | 作用 |
| --- | --- |
| `parseState(query, env)` | 把 query 和环境变量合成标准状态对象 |
| `getLayout(state)` | 根据状态计算画布、形状、边距和阴影信息 |
| `getRenderSize(state, layout)` | 只计算最终导出尺寸 |
| `resolveImageReference(rawImage, options)` | 解析 `image` 输入，支持 URL、相对路径和 `data:image/*;base64,...` |
| `renderComposite(state, userImage, runtime)` | 执行完整合成，返回 canvas 和 PNG buffer |
| `createNodeRuntime()` | 创建 Node 侧运行时适配层 |
| `loadImageFromReference(reference)` | 从引用加载图片，适合和 `renderComposite()` 一起用 |

## HTTP API

| 接口 | 用途 |
| --- | --- |
| `GET /ui.html` | 浏览器工作台，支持面板、预览和请求复制 |
| `GET /icon` | 通过 query string 直接导出 PNG |
| `POST /icon` | 通过 `multipart/form-data` 上传本地图片 |
| `GET /info` | 只返回布局和导出尺寸 |
| `POST /__imgbed/upload` | 上传到本地图床 |
| `GET /__imgbed/:id` | 读取本地图床里的原始文件 |

### GET `/ui.html`

浏览器工作台会把参数面板、实时预览、请求复制和 `GET / POST` 图片输入整合在一起。

### GET `/icon`

通过 query string 传递参数，返回 `image/png`。

#### 参数分组

基础形状：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `shape` | string | `pin` | `pin` / `circle` / `square` / `squircle` / `hexagon` |
| `iconSize` | number | `128` | 形状高度，单位 px，范围 `1-2048` |
| `exportSquare` | 0/1 | `1` | 是否导出正方形画布 |
| `exportStrategy` | string | `center` | `center` / `bottom` |

图片输入与布局：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `image` | string | - | 完整 URL、相对路径或 `data:image/*;base64,...` |
| `imageScale` | number | `1.0` | 内部图片缩放，范围 `0.01-10` |
| `imageOffsetY` | number | `0` | 内部图片垂直偏移，范围 `-50-50` |
| `marginX` | string | `0` | 水平边距，支持 `px` 或 `%` |
| `marginY` | string | `0` | 垂直边距，支持 `px` 或 `%` |

描边与轮廓：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `borderWidth` | number | `4` | 内描边宽度，范围 `0-20` |
| `borderColor` | string | `#ef4444` | 边框颜色，格式 `#rrggbb` |
| `bgColor` | string | `#ffffff` | 背景 / 填充颜色，格式 `#rrggbb` |
| `lineJoin` | string | `round` | `round` / `miter` / `bevel` |
| `contourEnhance` | 0/1 | `1` | 是否启用轮廓增强 |
| `contourOuterGlow` | number | `2` | 外侧柔光强度 |
| `contourOuterWidth` | number | `6` | 外扩描边宽度 |
| `contourMainWidth` | number | `3` | 主轮廓描边宽度 |
| `contourInnerWidth` | number | `1` | 内侧柔化宽度 |
| `contourCornerSoftness` | number | `0.12` | 尖角圆润度，范围 `0-1` |

阴影与抗锯齿：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enableShadow` | 0/1 | `1` | 是否启用阴影 |
| `shadowBlur` | number | `10` | 阴影模糊度，范围 `0-50` |
| `shadowOffsetY` | number | `5` | 阴影垂直偏移，范围 `-20-20` |
| `antiAliasScale` | 1/2/4 | `1` | 离屏超采样倍率 |
| `resizeStrategy` | string | `smooth-high` | `smooth-high` / `pixelated` / `step-down` / `sharp-lanczos3` |

#### 返回头

- `Content-Type: image/png`
- `X-Icon-Width`
- `X-Icon-Height`
- `Cache-Control: no-cache`

#### 错误返回

参数校验失败时返回：

```json
{ "error": "...", "code": "..." }
```

### POST `/icon`

使用 `multipart/form-data` 上传本地图片，其他参数与 `GET /icon` 相同。

| 字段 | 说明 |
| --- | --- |
| `image` | 图片文件上传；不上传文件时，也可回退为文本输入 |
| 其他字段 | 与 `GET /icon` 参数相同 |

### GET `/info`

返回当前参数下的布局和导出尺寸，不渲染图片，适合前端动态显示。

### POST `/__imgbed/upload`

本地图床测试接口。上传 `image` 文件后，返回一个可供 `GET /icon?image=...` 直接使用的短 URL。

### GET `/__imgbed/:id`

返回上传到本地图床的原始文件。

## 背景

这个接口设计不是为了堆参数，而是为了让同一套合成逻辑同时服务三种场景：

- Node 脚本批量生成
- 浏览器里调参和预览
- 其他项目里复用核心合成能力

## 一致性

服务端与浏览器端尽量共享同一套渲染逻辑。  
当你在工作台里调到满意的参数，再把同一组参数丢给 `/icon`，结果应该尽量一致。
