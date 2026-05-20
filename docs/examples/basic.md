# 基本示例

这一页放最常复制的请求模板。交互工作台已经拆到独立页面，下面的链接直接指向它。

## 工作台

- [打开全屏示例工作台](/examples/index.html)
- [查看 API 参考](/api)
- [查看 GitHub 仓库](https://github.com/ccwq/icon-conbinder)

## 常用请求

```bash
curl "http://localhost:3000/icon?shape=pin&iconSize=128&borderColor=%23ef4444&bgColor=%23ffffff&enableShadow=1"
```

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

```bash
curl -X POST "http://localhost:3000/__imgbed/upload" \
  -F "image=@/path/to/your/icon.png"
```

拿到返回的 `url` 之后，再拼到 `/icon?image=...` 里即可。

```bash
curl "http://localhost:3000/icon?shape=squircle&iconSize=180&enableShadow=0&exportSquare=1" \
  -o squircle.png
```

```bash
curl "http://localhost:3000/info?shape=hexagon&iconSize=180&antiAliasScale=2"
```
