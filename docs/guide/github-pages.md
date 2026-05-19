# GitHub Pages

本仓库的文档站点按仓库子路径发布：

```text
/icon-conbinder/
```

对应的站点地址通常是：

```text
https://ccwq.github.io/icon-conbinder/
```

## 站点配置

- VitePress 配置文件在 `docs/.vitepress/config.mjs`
- `base` 已设置为 `/icon-conbinder/`
- 构建输出目录是 `docs/.vitepress/dist`

## 发布流程

1. 把代码推送到 `master`
2. GitHub Actions 运行 `.github/workflows/deploy-pages.yml`
3. 站点构建完成后自动部署到 GitHub Pages

## Example 页面同步规则

`/examples/index.html` 不是直接读取 `example/` 源码目录，而是读取文档静态资源目录中的副本：

```text
docs/public/examples/
```

这意味着：

1. 修改 `example/src/*` 后，先执行 `cd example && npm run build`
2. 把 `example/dist/*` 同步到 `docs/public/examples/`
3. 再执行 `npm run docs:build`
4. 最后再做 `vitepress preview` 或 GitHub Pages 验证

如果只改了 `example/` 但没有同步 `docs/public/examples/`，文档站里的全屏演示页不会更新。

## 开发环境验证

推荐顺序：

1. `cd example && npm run build`
2. 同步 `example/dist/*` 到 `docs/public/examples/`
3. `npm run docs:build`
4. `npx vitepress preview docs --host 127.0.0.1 --port <new-port>`

注意：

- 旧的 `vitepress preview` 进程可能继续服务旧资源
- 当 `example` 产物 hash 变化后，继续复用旧预览端口，容易误判成“页面还是旧的”或“资源 404”
- 更稳妥的方式是重启 preview，或直接换一个新端口验证

## 测试环境验证

建议至少检查这几项：

1. `/examples/basic` 与 `/examples/recipes` 不再内嵌固定高度 `iframe`
2. `/examples/index.html` 能加载对应的 `./assets/*.js` 与 `./assets/*.css`
3. 页面顶部联系入口存在：
   - 文档首页
   - API 参考
   - 示例说明
   - GitHub
4. 页面内本地接口入口存在：
   - `GET /icon`
   - `GET /info`

## GitHub Pages 缓存

GitHub Pages 资源可能存在短时缓存。一次部署成功后，如果页面仍表现为旧版本：

1. 先确认 Actions 已完成且 `head_sha` 正确
2. 再用带时间戳参数的 URL 或强制刷新验证
3. 必要时等待几分钟后再复测

## 仓库设置

在 GitHub 仓库设置里开启 Pages，并选择 GitHub Actions 作为发布来源。

## 如果以后要换自定义域名

如果将来改成自定义域名或根路径发布，需要同步修改 `docs/.vitepress/config.mjs` 里的 `base`。
