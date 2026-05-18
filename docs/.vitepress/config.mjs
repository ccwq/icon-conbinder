import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "Icon Combinder",
  description: "Wrapper 与 Icon 合成工具的文档站点",
  base: "/icon-conbinder/",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "API", link: "/api" },
      { text: "示例", link: "/examples/basic" },
      { text: "进阶", link: "/examples/recipes" },
      { text: "发布", link: "/guide/github-pages" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "指南",
          items: [
            { text: "快速开始", link: "/guide/getting-started" },
            { text: "GitHub Pages", link: "/guide/github-pages" },
          ],
        },
      ],
      "/": [
        {
          text: "文档",
          items: [
            { text: "API", link: "/api" },
            { text: "示例", link: "/examples/basic" },
            { text: "进阶示例", link: "/examples/recipes" },
          ],
        },
      ],
    },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/ccwq/icon-conbinder",
      },
    ],
    footer: {
      message: "用于开源仓库与 GitHub Pages 静态发布",
    },
  },
});
