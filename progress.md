# 进度日志

## 2026/05/19 - Browser ESM 模块改造

### 当前任务
将 `icon-combinder` 从 UMD 动态 script 加载改为直接 ESM import

### 已完成
1. ✅ 创建 `core/browser-runtime.mjs` - 浏览器 runtime，使用 OffscreenCanvas
2. ✅ 创建 `core/index.mjs` - ESM 版本的核心模块
3. ✅ 创建 `core/render.mjs` - ESM 版本的渲染模块
4. ✅ 创建 `browser.mjs` - 浏览器专用入口
5. ✅ 更新 `example/vite.config.js` 添加 alias
6. ✅ 更新 `App.vue` 使用直接 import
7. ✅ 删除旧的 `example/src/icon-combinder.js`
8. ✅ 更新 `package.json` exports 配置
9. ✅ 修复 `convertToBlob` 参数问题（`'image/png'` → `{ type: 'image/png' }`）

### 验证结果
- Dev server 启动成功 (localhost:56123)
- 预览图正常生成（dataURL 长度 24966 字符）
- shape 参数切换正常（pin → circle 预览更新）
- 无 JavaScript 控制台错误

### 问题与解决
1. **端口占用** - 多个 vite 进程占用端口。解决：taskkill 强制终止
2. **convertToBlob 参数类型错误** - `'image/png'` 应为 `{ type: 'image/png' }`
3. **浏览器缓存** - 强制刷新 `Ctrl+Shift+R` 清理缓存

### 当前状态
核心功能验证通过，UI 布局已重新设计

---

## 2026/05/19 下午 - UI 布局优化

### 完成
1. ✅ 重新设计布局：预览居中(300x300)，参数面板围绕四周
2. ✅ 深色科技风格 (VS Code/Figma 风格)
3. ✅ 添加折叠式参数分组面板
4. ✅ 添加多格式复制功能 (JSON/URL/CLI)
5. ✅ 添加 localStorage 持久化（刷新后状态不丢失）
6. ✅ 完善复制参数功能

### 新布局
- 三栏布局：左侧面板(形状/边框) + 中央预览 + 右侧面板(效果/导出)
- 预览区 300x300 居中，带棋盘格背景
- 底部复制区支持 JSON/URL/CLI 三种格式切换
- 右侧面板可折叠分组：阴影/抗锯齿/轮廓/导出

### 技术实现
- 使用 CSS Grid 实现三栏布局
- 深色主题 CSS Variables
- localStorage 持久化（参考 views/assets/ui.js）

---

## 2026/05/19 - Example 页面能力补齐准备

### 当前结论
- example 页需要继续对齐 `views/ui.pug` 的参数覆盖面，而不只是做“更好看的简化版”。
- 重点缺口是图像输入、图像缩放、垂直偏移、轮廓增强全组，以及更完整的 source/上传操作入口。
- 折叠分组状态需要持久化，且要和参数状态一起存储恢复。

### 待确认
- 预设缓存上传在 example 页里是“真实浏览器可用的来源选择/缓存引用”，还是“仅保留和 UI 对应的入口但实际上传依赖 Node 服务”。

## 2026/05/19 - example 页面来源入口完成

### 已完成
1. ✅ `example/src/App.vue` 增加 `URL / 本地文件 / 预设缓存上传(Node-only)` 来源分段，Node-only 保持灰显禁用
2. ✅ 本地文件支持上传、预览、浏览器侧渲染，并在可用时缓存 data URL 以便刷新恢复
3. ✅ 折叠分组状态与来源状态写入 `localStorage` 并在刷新后恢复
4. ✅ 导出区不再输出本地文件的原始 data URL，而是使用文件名占位
5. ✅ 真实浏览器验证通过：URL / 本地文件互切正常，灰色 Node-only 入口不可用
6. ✅ `npm test` 通过

## 2026/05/19 - example 页面紧凑布局收敛

### 已完成
1. ✅ 基础参数区改成 2 列卡片布局，并扩大左栏宽度
2. ✅ 预览区缩小到更紧凑的画布尺寸，弱化大空白中心
3. ✅ 导出区下沉到预览列下面，复用中间空白区域
4. ✅ 右侧效果区进一步压缩，默认仅保留必要分组
5. ✅ 浏览器验证截图显示页面无需纵向滚动即可容纳主要内容

## 2026/05/19 - example 页面四窗预览与尺寸联动

### 已完成
1. ✅ `preview-stage` 已移除，预览区改为 4 个背景窗口作为主预览
2. ✅ 背景窗口支持黑色、白色、网格、自定义红色四种底色
3. ✅ 尺寸预设复现为 `24 / 30 / 36 / 45 / 54`
4. ✅ `iconSize` 与 `imageScale` 关联开关已加入，支持 300ms 暂停恢复
5. ✅ 四个背景窗口里的图片已恢复原始尺寸显示，不再被 CSS 拉伸
6. ✅ 浏览器验证通过：尺寸预设、暂停/恢复联动、窄宽度 1 列 4 行、原始尺寸显示
7. ✅ `npm test` 和 `example` 构建都通过

---

## 2026/05/19 - VitePress 集成 Example

### 当前任务
将 example 构建产物通过 iframe 嵌入到 VitePress 文档中

### 已完成
1. ✅ 创建 VitePress customTheme (`docs/.vitepress/theme/index.js`)
2. ✅ 修改 example/index.html 路径配置
3. ✅ 修改 example vite.config.js base 为相对路径 `./`
4. ✅ example vite build 成功
5. ✅ 复制 dist 到 docs/public/examples/
6. ✅ 添加 iframe 到 basic.md 和 recipes.md
7. ✅ iframe src 使用 `/icon-conbinder/examples/index.html` 匹配 base
8. ✅ 推送到 GitHub Pages 验证

### 关键修改
- `example/vite.config.js`: `base: '/examples/'` → `base: './'`
- `docs/examples/basic.md`: iframe src `/examples/index.html` → `/icon-conbinder/examples/index.html`
- `docs/examples/recipes.md`: 同上

### 当前状态
- example 页面已推送到 GitHub Pages (https://ccwq.github.io/icon-conbinder/examples/index.html)
- iframe 已嵌入到 basic 和 recipes 页面
- 但 VitePress 的 SSR 输出 `<div id="app"><!----></div>` 表示客户端 JavaScript 尚未渲染内容
- 这可能是 VitePress 的已知行为或需要额外配置

### 验证方法
在浏览器中打开 https://ccwq.github.io/icon-conbinder/examples/basic 应能看到带 iframe 的页面

### 2026/05/19 上午
- 创建了 task_plan.md, findings.md, progress.md
- ✅ Phase 1: 初始化 Vite + Vue 项目到 `example/`
- ✅ Phase 2: 核心集成 - 复制 UMD 文件到 public/lib/
- ✅ Phase 3: 参数控制 UI - App.vue 已实现
- ✅ Phase 4-5: 测试验证 - 页面正常运行

---

## 2026/05/19 - 全屏演示页改造与环境经验固化

### 已完成
1. ✅ 删除 `docs/examples/basic.md` 与 `docs/examples/recipes.md` 中重复的固定高度 `iframe`
2. ✅ 将文档页改为独立演示入口，补上 API 与 GitHub 链接
3. ✅ 为 `example/src/App.vue` 增加全屏工作台头图区和导航串联入口
4. ✅ 页面内补齐 `快速开始 / 文档 API / GET /icon / GET /info` 的快捷入口
5. ✅ `cd example && npm run build` 通过
6. ✅ 将 `example/dist/*` 同步到 `docs/public/examples/`
7. ✅ `npm run docs:build` 通过
8. ✅ 使用新端口 `4174` 的 `vitepress preview` 完成验证
9. ✅ 浏览器运行态验证通过：`.hero-strip`、顶部导航、本地接口入口均存在

### 关键经验
- 旧的 `vitepress preview` 进程会干扰判断，可能让人误以为页面没更新或资源 404。
- 修改 `example/src/*` 后，不能只看 `example/dist`，必须同步到 `docs/public/examples/` 再重建 `docs`。
- 对这个仓库来说，更稳的验证顺序是：
  1. `cd example && npm run build`
  2. 同步 `example/dist/*` → `docs/public/examples/`
  3. `npm run docs:build`
  4. 启动新的 preview 端口验证
