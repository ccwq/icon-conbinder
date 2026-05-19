# 任务计划：example 页面能力对齐 `views/ui.pug`

## 目标
让 `example/src/App.vue` 作为 `views/ui.pug` 的浏览器替代面，尽可能覆盖同等能力面。

## 范围边界
- 必须覆盖浏览器侧可完成的全部参数与交互。
- Node-only 能力单独隔离，不在 example 页里硬做假实现。
- 重点包括：图像输入、形状/尺寸/颜色、图像缩放与偏移、阴影、抗锯齿、轮廓增强、导出/复制、折叠状态持久化。

## 已确认
- `example/src/App.vue` 已具备基础三栏布局、预览区、导出区。
- 目前缺口主要在参数覆盖面和浏览器侧 source 入口完整性。
- `browser.js` 支持 `kind: "url" | "data" | "file"`，因此 example 页可以覆盖浏览器侧 source 组合。

## 阶段

### Phase 1: 对齐能力清单
- [x] 读取 `views/ui.pug` / `views/assets/ui.js` / `README.md` / `docs/api.md`
- [x] 识别 example 页缺失的参数与交互
- [x] 明确 Node-only 能力在 example 页里的呈现方式（灰显保留入口）

### Phase 2: 补齐 browser-side 参数与 source 入口
- [x] 补齐 `image`、`imageScale`、`imageOffsetY`
- [x] 补齐轮廓增强全组参数
- [x] 补齐 source / upload 相关入口的 browser-side 版本
- [x] 对齐 `JSON / URL / CLI` 输出内容

### Phase 3: 持久化与状态恢复
- [x] 折叠分组状态持久化
- [x] 参数状态与 source 状态持久化
- [x] 刷新后恢复编辑态

### Phase 4: 验证
- [x] 浏览器页面截图核对
- [x] 控件交互核对
- [x] `npm test` 回归通过

## 待确认问题
- 无。当前已按“可见但 Node-only 置灰”的方式落地。

## 错误记录
| 错误 | 发现阶段 | 处理 |
|------|----------|------|
| `expandedSections` 在初始化前被 `watch` 引用 | UI 改造阶段 | 调整声明顺序，先定义 `expandedSections` 再注册 `watch` |
