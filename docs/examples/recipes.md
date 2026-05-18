# 进阶示例

这里放一些更接近实际使用的组合，可以直接复制到浏览器、终端或脚本里。

## 1. 纯色徽标

适合做最干净的发布图标。

```bash
curl "http://localhost:3000/icon?shape=circle&iconSize=160&bgColor=%23ffffff&borderColor=%23000000&borderWidth=2&enableShadow=0&exportSquare=0" \
  -o circle-clean.png
```

## 2. 带轮廓增强的图钉

适合做更强调边缘的预览图。

```bash
curl "http://localhost:3000/icon?shape=pin&iconSize=220&contourEnhance=1&contourOuterGlow=4&contourOuterWidth=8&contourMainWidth=4&contourInnerWidth=2&contourCornerSoftness=0.18&antiAliasScale=4&resizeStrategy=step-down" \
  -o pin-enhanced.png
```

## 3. 相对路径图片

如果你配置了 `IMAGE_URL_PREFIX`，可以直接传相对路径。

```bash
curl "http://localhost:3000/icon?shape=squircle&iconSize=200&image=/assets/demo/logo.png&enableShadow=1" \
  -o squircle-relative.png
```

## 4. 正方形导出并统一边距

适合需要规整画布的场景。

```bash
curl "http://localhost:3000/icon?shape=hexagon&iconSize=180&exportSquare=1&exportStrategy=center&marginX=16px&marginY=16px&enableShadow=1" \
  -o hexagon-square.png
```

## 5. Base64 图片输入

如果启用了 `IMAGE_ENABLE_BASE64=1`，可以直接传 `data:image/*;base64,...`。

```bash
curl "http://localhost:3000/icon?shape=square&iconSize=180&image=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0fN9kAAAAASUVORK5CYII=" \
  -o square-base64.png
```

## 6. 先看尺寸再渲染

先请求 `/info`，确认输出大小后再生成最终图片。

```bash
curl "http://localhost:3000/info?shape=squircle&iconSize=240&exportSquare=1&antiAliasScale=2"
```

## 7. POST 上传本地文件

更适合在脚本里直接处理本地文件。

```bash
curl -X POST "http://localhost:3000/icon" \
  -F "shape=pin" \
  -F "iconSize=240" \
  -F "contourEnhance=1" \
  -F "enableShadow=1" \
  -F "shadowBlur=12" \
  -F "shadowOffsetY=6" \
  -F "image=@/path/to/your/icon.png" \
  -o pin-post.png
```
