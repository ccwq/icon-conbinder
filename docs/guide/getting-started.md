# 快速开始

## 先安装

```bash
npm install icon-combinder
```

## 再引用

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

如果你用的是 ESM 或打包器，也可以按同名命名导入。

## 启动本地服务

```bash
npm start
```

默认会监听 `http://localhost:3000`。打开下面这个地址就能进入工作台：

```text
http://localhost:3000/ui.html
```

> [!NOTE]
> 本地服务的主要用途是调参数、看预览和复制请求，不是长期对外托管页面。

如果你想把主服务和测试图床一起拉起来：

```bash
npm run dev
```

## 文档站点

```bash
npm run docs:dev
```

构建和预览：

```bash
npm run docs:build
npm run docs:preview
```

## 常用环境变量

- `PORT`：服务端口
- `ENABLE_CORS`：是否开启跨域
- `IMAGE_URL_PREFIX`：相对路径图片的基础前缀
- `IMAGE_URL_PREFIX_ONLY`：是否要求图片地址必须命中前缀
- `IMAGE_ENABLE_BASE64`：是否允许 `data:image/*;base64,...`
- `IMG_BED_BASE_URL`：`GET` 模式文件上传使用的图床地址

## 发布前检查

- 确认 `npm run docs:build` 可以成功构建
- 确认 npm 包只包含 `package.json` 里的 `files` 白名单内容
- 确认 GitHub Pages 的 `base` 与仓库路径一致
