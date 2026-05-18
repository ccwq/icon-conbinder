import core from "./core/index.js";
import render from "./core/render.js";
import nodeRuntime from "./core/node-runtime.js";

export const {
  clientError,
  readEnvString,
  readEnvBool,
  readEnvInt,
  readEnvFloat,
  readEnvOneOf,
  normalizeUrlPrefix,
  isHttpUrl,
  isDataImageUrl,
  hexToRgba,
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
} = core;

export const {
  strokeLayer,
  genericDownsampleCanvas,
  drawPinLayers,
  renderComposite,
} = render;

export const createNodeRuntime = nodeRuntime.createNodeRuntime;
export const loadImageFromBuffer = nodeRuntime.loadImageFromBuffer;
export const loadImageFromUrl = nodeRuntime.loadImageFromUrl;
export const loadImageFromReference = nodeRuntime.loadImageFromReference;
export const dataUrlToBuffer = nodeRuntime.dataUrlToBuffer;
export const downsampleCanvas = nodeRuntime.downsampleCanvas;
export const encodeCanvas = nodeRuntime.encodeCanvas;
export const getEffectiveResizeStrategy = nodeRuntime.getEffectiveResizeStrategy;

export const coreApi = core;
export const renderApi = render;
export const runtimeApi = nodeRuntime;

const exported = {
  ...core,
  ...render,
  core: coreApi,
  render: renderApi,
  runtime: runtimeApi,
  createNodeRuntime,
  loadImageFromBuffer,
  loadImageFromUrl,
  loadImageFromReference,
  dataUrlToBuffer,
  downsampleCanvas,
  encodeCanvas,
  getEffectiveResizeStrategy,
};

export default exported;
