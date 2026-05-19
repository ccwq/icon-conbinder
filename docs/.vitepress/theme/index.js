import DefaultTheme from "vitepress/theme";

// Keep the default VitePress Layout; this repo only adds hooks on top.
export default {
  extends: DefaultTheme,
  async enhanceApp({ app }) {
    // Reserved for future theme-level setup.
  },
};
