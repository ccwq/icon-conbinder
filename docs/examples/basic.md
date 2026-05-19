# 基本示例

这个页面放最常复制的请求模板。想看更偏场景化的组合，请看 [进阶示例](/examples/recipes)。

## 1. 打开工作台

```text
http://localhost:3000/ui.html
```

带参数预填：

```text
http://localhost:3000/ui.html?shape=squircle&iconSize=200&contourEnhance=1&antiAliasScale=2
```

## 2. 交互式演示

<iframe
  src="/icon-conbinder/examples/index.html"
  width="100%"
  height="600"
  style="border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;"
  title="Icon Combinder 交互演示"
  loading="lazy"
></iframe>

## 2. 交互式演示

<iframe
  src="/examples/index.html"
  width="100%"
  height="600"
  style="border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;"
  title="Icon Combinder 交互演示"
  loading="lazy"
></iframe>

## 3. GET 请求

```bash
curl "http://localhost:3000/icon?shape=pin&iconSize=128&borderColor=%23ef4444&bgColor=%23ffffff&enableShadow=1"
```

## 3. POST 请求

```bash
curl -X POST "http://localhost:3000/icon" \
  -F "shape=pin" \
  -F "iconSize=256" \
  -F "contourEnhance=1" \
  -F "antiAliasScale=4" \
  -F "resizeStrategy=sharp-lanczos3" \
  -F "image=@/path/to/your/icon.png" \
  -o output.png
```

## 4. 先上传再生成

```bash
curl -X POST "http://localhost:3000/__imgbed/upload" \
  -F "image=@/path/to/your/icon.png"
```

拿到返回的 `url` 后，再拼到 `/icon?image=...` 里即可。

## 5. 直接导出成 PNG

```bash
curl "http://localhost:3000/icon?shape=squircle&iconSize=180&enableShadow=0&exportSquare=1" \
  -o squircle.png
```

## 6. 查询布局信息

```bash
curl "http://localhost:3000/info?shape=hexagon&iconSize=180&antiAliasScale=2"
```
