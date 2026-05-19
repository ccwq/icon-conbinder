# 计划：将 example/dist 集成到 VitePress

## 目标
将 `example/` 的构建产物通过 iframe 嵌入式嵌入到 `docs/` 的 VitePress 示例页面中，发布到 GitHub Pages。

---

## 步骤

### 1. 修改 example 的 vite base 配置
- **文件**: `example/vite.config.js`
- **操作**: 添加 `base: '/examples/'`，使资源路径与 docs base 路径对齐
- **验证**: 构建后 `dist/index.html` 中资源路径为 `/examples/assets/...`

### 2. 修改 example 的 index.html 引用路径
- **文件**: `example/index.html`
- **操作**: 将 `href="/favicon.svg"` 改为 `/examples/favicon.svg`，`src="/src/main.js"` 改为 `/examples/src/main.js`（Vite 会处理）
- **验证**: 构建后所有资源可被 `/examples/` base 正确解析

### 3. 创建 VitePress customTheme
- **目录**: `docs/.vitepress/theme/`
- **文件**: `theme/index.js`
- **操作**: 导出默认 theme，支持 `doBeforeBuild` 钩子触发 example 联动构建
- **钩子逻辑**:
  1. `doBeforeBuild` 中执行 `cd example && vite build`
  2. 将 `example/dist/*` 复制到 `docs/public/examples/`
  3. 清理旧产物

### 4. 配置 VitePress 使用 customTheme
- **文件**: `docs/.vitepress/config.mjs`
- **操作**: 导入并使用 customTheme

### 5. 在示例页面中嵌入 iframe
- **文件**: `docs/examples/basic.md`、`docs/examples/recipes.md`
- **操作**: 添加 iframe 标记，src 指向 `/examples/index.html`
- **iframe 属性**: width, height, border, loading="lazy" 等

### 6. 验证构建与部署
- **本地验证**: `vitepress build docs` 和 `vitepress preview docs`
- **检查点**:
  - `docs/.vitepress/dist/examples/` 存在且结构正确
  - iframe 页面可正常加载
  - GitHub Pages base 路径 `/icon-conbinder/` 正确

---

## 依赖文件
- `example/vite.config.js`
- `example/index.html`
- `docs/.vitepress/config.mjs`
- `docs/examples/basic.md`
- `docs/examples/recipes.md`
- 新建: `docs/.vitepress/theme/index.js`

---

## 待验证假设
- example 的 `index.html` 中资源路径（`/favicon.svg`、`/src/main.js`）在 base 变更后仍可被正确解析
- VitePress customTheme 的 `doBeforeBuild` 钩子可用
- `docs/public/examples/` 会被 VitePress 作为静态资源正确托管