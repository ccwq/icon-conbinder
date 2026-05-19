/**
 * 浏览器运行环境
 * 用 OffscreenCanvas / Image 替代 @napi-rs/canvas
 */

import * as coreApi from './index.mjs';
import * as renderApi from './render.mjs';

export function createBrowserRuntime() {
  function createCanvas(width, height) {
    return new OffscreenCanvas(width, height);
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!url.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
      img.src = url;
    });
  }

  async function loadImageFromSource(source) {
    if (!source) return null;
    if (source.kind === 'file') {
      const url = URL.createObjectURL(source.file);
      try {
        return await loadImageFromUrl(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    if (source.kind === 'data' || source.kind === 'url') {
      return await loadImageFromUrl(source.value);
    }
    return null;
  }

  function dataUrlToBuffer(dataUrl) {
    const text = String(dataUrl || '');
    const commaIndex = text.indexOf(',');
    const base64Part = commaIndex >= 0 ? text.slice(commaIndex + 1) : '';
    return Uint8Array.from(atob(base64Part), c => c.charCodeAt(0)).buffer;
  }

  async function encodeCanvas(canvas) {
    if (typeof canvas.convertToBlob === 'function') {
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    // 降级到 toDataURL (普通 Canvas)
    return canvas.toDataURL('image/png');
  }

  function getEffectiveResizeStrategy(state) {
    return state.resizeStrategy === 'sharp-lanczos3' ? 'step-down' : state.resizeStrategy;
  }

  return {
    createCanvas,
    Path2D,
    loadImageFromSource,
    dataUrlToBuffer,
    encodeCanvas,
    getEffectiveResizeStrategy,
    coreApi,
    downsampleCanvas: renderApi.genericDownsampleCanvas,
  };
}