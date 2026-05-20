import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "Icon Combinder",
  description: "Icon Combinder 的快速开始、API 参考和示例工作台",
  base: "/icon-conbinder/",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: "/examples/favicon.svg",
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "API", link: "/api" },
      { text: "示例工作台", link: "/examples/index.html" },
      { text: "进阶", link: "/examples/recipes" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "指南",
          items: [
            { text: "快速开始", link: "/guide/getting-started" },
          ],
        },
      ],
      "/": [
        {
          text: "文档",
          items: [
            { text: "示例工作台", link: "/examples/index.html" },
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
