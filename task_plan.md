# 计划：全屏演示页改造与环境经验固化

## 目标

1. 取消文档页中固定高度 `iframe` 的交互演示嵌入方式
2. 将 `example` 改成独立全屏工作台
3. 在工作台内串联文档、API、GitHub 和本地接口入口
4. 固化开发环境与测试环境的正确验证链路

---

## 步骤

### 1. 文档页入口改造
- **状态**: complete
- **文件**:
  - `docs/examples/basic.md`
  - `docs/examples/recipes.md`
- **结果**:
  - 删除重复的 `iframe`
  - 改为独立演示入口和文档/API/GitHub 链接

### 2. Example 全屏工作台改造
- **状态**: complete
- **文件**:
  - `example/src/App.vue`
- **结果**:
  - 增加 `FULLSCREEN LAB` 顶部区域
  - 串联 `文档首页 / API 参考 / 示例说明 / GitHub`
  - 增加 `快速开始 / 文档 API / GET /icon / GET /info` 快捷入口

### 3. 静态产物同步
- **状态**: complete
- **文件**:
  - `docs/public/examples/*`
- **结果**:
  - 重新构建 `example/dist`
  - 同步到 `docs/public/examples/`

### 4. 文档站重建与验证
- **状态**: complete
- **命令**:
  - `cd example && npm run build`
  - `npm run docs:build`
  - `npx vitepress preview docs --host 127.0.0.1 --port 4174`
- **结果**:
  - `/examples/basic` 文档内容已不含 `iframe`
  - `/examples/index.html` 运行态可见全屏导航、本地接口入口，以及默认 `hospital.png` 预览图
  - 新的实机验证地址为 `http://string.localhost:4178/icon-conbinder/examples/index.html`

### 5. 环境经验固化
- **状态**: complete
- **文件**:
  - `docs/guide/github-pages.md`
  - `findings.md`
  - `progress.md`
- **结果**:
  - 固化开发环境和测试环境的同步/验证规则

---

## 关键结论

- `example` 的线上页面来源于 `docs/public/examples/`，不是直接读取 `example/`
- 修改 `example/src/*` 后，必须执行：
  1. `cd example && npm run build`
  2. 同步 `example/dist/*` 到 `docs/public/examples/`
  3. `npm run docs:build`
- 旧的 `vitepress preview` 进程可能伪装成“页面没更新”或“静态资源 404”；换新端口验证更稳
