# 快速开始

## 安装

```bash
npm install icon-combinder
```

## 作为库引用

```js
const {
  renderComposite,
  createNodeRuntime,
  loadImageFromReference,
} = require("icon-combinder");
```

如果你用的是打包器，也可以按同名命名导入读取这些能力。

## 启动本地测试服务

```bash
npm start
```

默认会监听 `http://localhost:3000`，可直接打开：

```bash
http://localhost:3000/ui.html
```

这个服务的主要作用是快速试参数，而不是长期对外托管。

## 文档站点

本仓库使用 VitePress 生成静态文档站点。

```bash
npm run docs:dev
```

本地预览构建结果：

```bash
npm run docs:build
npm run docs:preview
```

## 常用环境变量

- `PORT`：服务端口
- `ENABLE_CORS`：是否开启跨域
- `IMAGE_URL_PREFIX`：相对路径图片的基础前缀
- `IMAGE_URL_PREFIX_ONLY`：是否限制图片地址必须命中前缀
- `IMAGE_ENABLE_BASE64`：是否允许 `data:image/*;base64,...`
- `IMG_BED_BASE_URL`：`GET` 模式文件上传使用的图床地址

## 发布前检查

- 确认文档站点可通过 `npm run docs:build` 成功构建
- 确认 npm 包只包含 `package.json` 中 `files` 白名单里的内容
- 确认 GitHub Pages 的 `base` 与仓库路径一致
