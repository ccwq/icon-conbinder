import { defineAsyncComponent } from 'vue'

// VitePress custom theme
// Triggers example build before docs build, copying dist to public/examples/
export default {
  extends: {},
  async enhanceApp({ app }) {
    // doBeforeBuild hook is handled via VitePress config
  }
}