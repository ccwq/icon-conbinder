# Pin Icon Generator — REST API

用 Node.js 实现的 RESTful 接口，与 HTML 版本 **完全相同的 Canvas 渲染逻辑**，同等参数下两者输出的 PNG 像素一致。

## 安装

```bash
npm install
```

依赖：
- `express` — HTTP 框架
- `@napi-rs/canvas` — 提供预编译二进制的 Node Canvas（无需 node-gyp 编译）
- `sharp` — 服务端高质量缩放策略 `sharp-lanczos3`
- `multer` — 处理 multipart/form-data 文本字段

## 启动

```bash
node server.js
```

通过 `.env` 控制端口、CORS、请求参数默认值和 `image` 解析规则；`.env.example` 保持同样结构，直接复制后修改即可。

- `PORT`：服务监听端口，默认 `3000`
- `ENABLE_CORS`：是否开启全局 CORS，默认 `0`
- `ICON_PARAM_*`：请求参数默认值、候选值和范围都写在 `.env` / `.env.example` 里，运行时优先读取这些值
- `IMAGE_URL_PREFIX`：`image` 取相对路径时的基础前缀，服务端会用 `new URL(image, IMAGE_URL_PREFIX)` 合成最终地址
- `IMAGE_URL_PREFIX_ONLY`：是否要求最终解析后的 URL 必须命中 `IMAGE_URL_PREFIX`
- `IMAGE_ENABLE_BASE64`：是否允许 `image` 传入 `data:image/*;base64,...`
- `ENABLE_CORS=1` 时，`/ui.html`、`/icon`、`/info` 都会带上 CORS 响应头

---

## API

### GET `/ui.html`

服务端模板页面，使用 `pug` 渲染，直接调用 `/icon` 和 `/info`。

- 左侧是参数面板，布局和 `pin-icon-generator.html` 保持同一组参数
- 预览区实时请求服务端生成的 PNG
- 复制区会输出当前状态对应的请求文本
- 抗锯齿区可以选择离屏超采样倍率和缩小策略；预览固定 `1x`，导出和复制请求按当前选择生效
- `image` 输入支持完整 URL、相对路径和 `data:image/*;base64,...`；相对路径可结合 `IMAGE_URL_PREFIX` 合成
- 当 `ENABLE_CORS=1` 时，页面和图像接口都可以跨域访问

可直接打开：

```bash
http://localhost:3000/ui.html
```

可以继续通过 query string 预填参数，例如：

```bash
http://localhost:3000/ui.html?shape=circle&iconSize=160&exportSquare=0
```

### GET `/icon`

通过 query string 传递所有参数，返回 PNG 图片（`Content-Type: image/png`）。

下表中的默认值与 `.env` / `.env.example` 保持一致。

| 参数             | 类型     | 默认值     | 说明                                        |
|----------------|--------|---------|-------------------------------------------|
| `shape`        | string | `pin`   | `pin` / `circle` / `square` / `squircle` / `hexagon` |
| `iconSize`     | number | `128`   | 形状高度（px），1–2048                         |
| `imageScale`   | number | `1.0`   | 内部图片缩放，0.01–10                          |
| `imageOffsetY` | number | `0`     | 内部图片垂直偏移，-50–50                        |
| `borderWidth`  | number | `4`     | 内描边宽度，0–20                              |
| `lineJoin`     | string | `round` | 边框拐角：`round` / `miter` / `bevel`         |
| `borderColor`  | string | `#ef4444` | 边框颜色，格式 `#rrggbb`                    |
| `bgColor`      | string | `#ffffff` | 背景/填充颜色，格式 `#rrggbb`               |
| `enableShadow` | 0/1    | `1`     | 是否启用阴影                                  |
| `shadowBlur`   | number | `10`    | 阴影模糊度，0–50                             |
| `shadowOffsetY`| number | `5`     | 阴影垂直偏移，-20–20                          |
| `exportSquare` | 0/1    | `1`     | 导出为正方形画布                               |
| `exportStrategy`| string| `center`| 对齐策略：`center` / `bottom`               |
| `antiAliasScale`| 1/2/4  | `1`     | 离屏超采样倍率                                  |
| `resizeStrategy`| string | `smooth-high` | 缩小策略：`smooth-high` / `pixelated` / `step-down` / `sharp-lanczos3` |
| `image`        | string | —       | 可选，图片输入：完整 URL、相对路径或 `data:image/*;base64,...` |

响应头中包含 `X-Icon-Width` 和 `X-Icon-Height` 字段，值为实际像素尺寸。

`image` 校验失败时返回 `400`，响应体格式为 `{"error":"...","code":"..."}`。

**示例：**
```
GET /icon?shape=pin&iconSize=128&borderColor=%23ef4444&bgColor=%23ffffff&enableShadow=1
GET /icon?shape=circle&iconSize=256&enableShadow=0&exportSquare=0
GET /icon?shape=squircle&iconSize=200&image=https://example.com/logo.png
GET /icon?shape=squircle&iconSize=200&image=/logo.png
```

---

### POST `/icon`

使用 `multipart/form-data` 传递文本字段，字段与 GET 相同（通过表单字段或 query string 传递）。

| 字段    | 说明             |
|-------|----------------|
| `image` | 图片输入：完整 URL、相对路径或 `data:image/*;base64,...` |
| 其他字段  | 与 GET 参数相同     |

**curl 示例：**
```bash
curl -X POST http://localhost:3000/icon \
  -F "shape=pin" \
  -F "iconSize=256" \
  -F "borderColor=#ef4444" \
  -F "enableShadow=1" \
  -F "antiAliasScale=4" \
  -F "resizeStrategy=sharp-lanczos3" \
  -F "image=https://example.com/logo.png" \
  -o output.png
```

---

### GET `/info`

返回 JSON，预览当前参数下的导出尺寸，不渲染图片，适合前端动态显示分辨率。

```json
{
  "state": { ... },
  "width": 171,
  "height": 171,
  "shapeWidth": 90,
  "shapeHeight": 128,
  "scale": 6.4
}
```

---

## 与 HTML 版本的一致性

服务端逻辑与 HTML 中的 JavaScript 完全对齐，关键点：

| 特性           | 策略                                             |
|--------------|------------------------------------------------|
| 阴影渲染       | 独立阴影层（先 blur fill，再画主体），与 HTML 完全相同        |
| 内描边         | clip path 后 double lineWidth stroke，与 HTML 相同  |
| 图片裁剪       | clip(path) → setTransform(identity) → drawImage |
| 导出尺寸       | `shadowBlur * 1.5` 作为 spread，同 HTML            |
| `forExport`  | shadowAlpha 固定为 0.38（与 HTML `forExport=true` 相同）|
| 抗锯齿        | `antiAliasScale` 控制超采样倍率，`resizeStrategy` 控制缩小算法 |

## 抗锯齿策略

- `smooth-high`：Canvas 内建高质量缩放，默认策略
- `pixelated`：最近邻缩放，适合保留硬边或做对比
- `step-down`：多次递减缩小，通常比一次性缩小更稳
- `sharp-lanczos3`：仅服务端可用，适合作为高质量基准

注意：

- `pin-icon-generator.html` 的实时预览保持 `1x`，避免大画布和高倍率拖慢交互
- `sharp-lanczos3` 仅在服务端 API 和 `ui.html` 生成请求时可用，静态页面不会直接执行 `sharp`

## 注意事项

- `filter: blur()` 在 `@napi-rs/canvas` 中**已支持**，阴影效果与浏览器一致。
- 如果阴影在某些极端参数下有轻微差异，是浏览器和 Skia 渲染引擎的次像素差异，视觉上不可见。
- 生产部署建议在前面加 Nginx 限速 + 图片尺寸上限校验，避免大 `iconSize` 被滥用。
