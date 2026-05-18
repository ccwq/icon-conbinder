# API 参考

## GET `/ui.html`

服务端模板页面，提供参数面板、请求文本和实时预览。

## GET `/icon`

通过 query string 传递参数，返回 `image/png`。

### 常用参数

| 参数 | 说明 |
| --- | --- |
| `shape` | `pin` / `circle` / `square` / `squircle` / `hexagon` |
| `iconSize` | 形状高度，单位 px |
| `imageScale` | 内部图片缩放 |
| `imageOffsetY` | 内部图片垂直偏移 |
| `borderWidth` | 内描边宽度 |
| `lineJoin` | `round` / `miter` / `bevel` |
| `borderColor` | 边框颜色 |
| `bgColor` | 背景颜色 |
| `contourEnhance` | 是否启用轮廓增强 |
| `contourOuterGlow` | 外侧柔光强度 |
| `contourOuterWidth` | 外扩描边宽度 |
| `contourMainWidth` | 主轮廓描边宽度 |
| `contourInnerWidth` | 内侧柔化宽度 |
| `contourCornerSoftness` | 尖角圆润度 |
| `enableShadow` | 是否启用阴影 |
| `shadowBlur` | 阴影模糊 |
| `shadowOffsetY` | 阴影垂直偏移 |
| `exportSquare` | 是否导出正方形画布 |
| `exportStrategy` | `center` / `bottom` |
| `marginX` | 水平边距，支持 `px` 或 `%` |
| `marginY` | 垂直边距，支持 `px` 或 `%` |
| `antiAliasScale` | `1` / `2` / `4` |
| `resizeStrategy` | `smooth-high` / `pixelated` / `step-down` / `sharp-lanczos3` |
| `image` | 图片地址、相对路径或 `data:image/*;base64,...` |

## POST `/icon`

使用 `multipart/form-data` 上传本地图片，其他参数与 GET 相同。

## GET `/info`

返回当前参数下的布局和导出尺寸，不渲染图片。

## POST `/__imgbed/upload`

上传 `image` 文件，返回可供 `GET /icon?image=...` 使用的短 URL。

## GET `/__imgbed/:id`

返回上传到本地图床的原始文件。
