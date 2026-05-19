/**
 * 浏览器专用入口
 * 使用原生 OffscreenCanvas / Image，替代 @napi-rs/canvas
 *
 * 使用方式:
 *   import { renderIcon, loadImageFromSource } from 'icon-combinder/browser';
 */

import * as coreApi from './core/index.mjs';
import {
  strokeLayer,
  genericDownsampleCanvas,
  drawPinLayers,
  renderComposite,
} from './core/render.mjs';

import { createBrowserRuntime } from './core/browser-runtime.mjs';

export {
  strokeLayer,
  genericDownsampleCanvas,
  drawPinLayers,
};

export {
  SHAPES,
  SHAPE_LABELS,
  SHAPE_BOUNDS,
  SHAPE_OPTIONS,
  ANTI_ALIAS_SCALES,
  RESIZE_STRATEGIES,
  MAX_RENDER_DIMENSION,
  parseMarginParam,
  parseState,
  getLayout,
  getRenderSize,
  assertRenderSize,
  getInnerCircle,
  resolveImageReference,
  clientError,
  hexToRgba,
  isHttpUrl,
  isDataImageUrl,
  normalizeUrlPrefix,
  readEnvString,
  readEnvBool,
  readEnvInt,
  readEnvFloat,
  readEnvOneOf,
} from './core/index.mjs';

export { createBrowserRuntime };

export async function renderIcon(state, source) {
  const runtime = createBrowserRuntime();
  const image = await runtime.loadImageFromSource(source);
  const result = await renderComposite(state, image, runtime);
  return {
    ...result,
    dataUrl: result.buffer,
    mimeType: 'image/png',
  };
}