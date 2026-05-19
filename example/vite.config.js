import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '/examples/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'icon-combinder': resolve(__dirname, '../browser.mjs'),
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
