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

1. 把代码推送到 `main`
2. GitHub Actions 运行 `.github/workflows/deploy-pages.yml`
3. 站点构建完成后自动部署到 GitHub Pages

## 仓库设置

在 GitHub 仓库设置里开启 Pages，并选择 GitHub Actions 作为发布来源。

## 如果以后要换自定义域名

如果将来改成自定义域名或根路径发布，需要同步修改 `docs/.vitepress/config.mjs` 里的 `base`。
