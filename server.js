/**
 * Pin Icon Generator — Node.js REST API
 *
 * 完整移植自 HTML 版本的 Canvas 渲染逻辑，保证与浏览器端输出一致。
 *
 * GET /icon
 * 所有参数均为查询字符串，与 HTML 中的 state 字段一一对应：
 *
 * shape          {string}  pin|circle|square|squircle|hexagon  (default: pin)
 * iconSize       {number}  形状高度 px (default: 128)
 * imageScale     {number}  内部图片缩放 (default: 1.0)
 * imageOffsetY   {number}  垂直偏移 -50~50 (default: 0)
 * borderWidth    {number}  边框宽度 (default: 4)
 * lineJoin       {string}  round|miter|bevel (default: round)
 * borderColor    {string}  #rrggbb (default: #ef4444)
 * bgColor        {string}  #rrggbb (default: #ffffff)
 * enableShadow   {0|1}     (default: 1)
 * shadowBlur     {number}  (default: 10)
 * shadowOffsetY  {number}  (default: 5)
 * exportSquare   {0|1}     (default: 1)
 * exportStrategy {string}  center|bottom (default: center)
 * antiAliasScale {1|2|4}   (default: 1)
 * resizeStrategy {string}  smooth-high|pixelated|step-down|sharp-lanczos3 (default: smooth-high)
 * image          {string}  可选，图片输入：完整 URL / 相对路径 / data:image/*;base64,...
 *
 * POST /icon
 * Body: multipart/form-data，支持 `image` 文件上传；若未上传文件，也可回退到文本 `image` 字段。
 *
 * 默认值可由 `.env` 中对应的 `ICON_PARAM_*` 覆盖。
 */

"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createCanvas, loadImage, Path2D } = require("@napi-rs/canvas");
const multer = require("multer");
const https = require("https");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const sharp = require("sharp");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

const readEnvString = (name, fallback) => {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
};

const readEnvBool = (name, fallback) => {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value !== "0" && value.toLowerCase() !== "false";
};

const readEnvInt = (name, fallback, min, max) => {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const readEnvFloat = (name, fallback, min, max) => {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const readEnvOneOf = (name, options, fallback) => {
  const value = readEnvString(name, fallback);
  return options.includes(value) ? value : fallback;
};

const PORT = readEnvInt("PORT", 3000, 1, 65535);
const ENABLE_CORS = readEnvBool("ENABLE_CORS", false);
const IMAGE_URL_PREFIX = readEnvString("IMAGE_URL_PREFIX", "");
const IMAGE_URL_PREFIX_ONLY = readEnvBool("IMAGE_URL_PREFIX_ONLY", false);
const IMAGE_ENABLE_BASE64 = readEnvBool("IMAGE_ENABLE_BASE64", false);

function clientError(code, message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function normalizeUrlPrefix(prefix) {
  const trimmed = String(prefix || "").trim();
  if (!trimmed) return "";

  const parsed = new URL(trimmed);
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname += "/";
  }
  return parsed.toString();
}

const NORMALIZED_IMAGE_URL_PREFIX = normalizeUrlPrefix(IMAGE_URL_PREFIX);

function isHttpUrl(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isDataImageUrl(value) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/.test(value);
}

function resolveImageSource(rawImage) {
  if (rawImage === undefined || rawImage === null) {
    return null;
  }

  const image = String(rawImage).trim();
  if (!image) {
    return null;
  }

  if (image.startsWith("data:")) {
    if (!IMAGE_ENABLE_BASE64) {
      throw clientError(
        "IMAGE_BASE64_DISABLED",
        "image 传入了 data:image/*;base64,...，但 IMAGE_ENABLE_BASE64 未开启"
      );
    }
    if (!isDataImageUrl(image)) {
      throw clientError(
        "IMAGE_BASE64_INVALID",
        "image 必须是 data:image/*;base64,... 形式"
      );
    }
    const commaIndex = image.indexOf(",");
    const base64Part = commaIndex >= 0 ? image.slice(commaIndex + 1) : "";
    const buffer = Buffer.from(base64Part, "base64");
    if (!buffer.length) {
      throw clientError(
        "IMAGE_BASE64_INVALID",
        "image 的 data URL 解码后为空"
      );
    }
    return { kind: "data", buffer };
  }

  if (image.startsWith("//")) {
    throw clientError(
      "IMAGE_URL_INVALID",
      "image 不能以 // 开头，请使用 http(s):// 或相对路径"
    );
  }

  let resolvedUrl = null;
  if (isHttpUrl(image)) {
    resolvedUrl = image;
  } else {
    if (!NORMALIZED_IMAGE_URL_PREFIX) {
      throw clientError(
        "IMAGE_URL_PREFIX_REQUIRED",
        "image 是相对路径时必须配置 IMAGE_URL_PREFIX"
      );
    }
    resolvedUrl = new URL(image, NORMALIZED_IMAGE_URL_PREFIX).toString();
  }

  if (IMAGE_URL_PREFIX_ONLY) {
    if (!NORMALIZED_IMAGE_URL_PREFIX) {
      throw clientError(
        "IMAGE_URL_PREFIX_REQUIRED",
        "启用 IMAGE_URL_PREFIX_ONLY 时必须配置 IMAGE_URL_PREFIX"
      );
    }
    if (!resolvedUrl.startsWith(NORMALIZED_IMAGE_URL_PREFIX)) {
      throw clientError(
        "IMAGE_URL_PREFIX_MISMATCH",
        "image 解析后的 URL 必须命中 IMAGE_URL_PREFIX"
      );
    }
  }

  return { kind: "url", url: resolvedUrl };
}

if (ENABLE_CORS) {
  app.use(
    cors({
      origin: "*",
      credentials: false,
    })
  );
}

// ─── 形状定义（与 HTML 完全相同）──────────────────────────────────────────────

const SHAPES = {
  pin: {
    path: "M 12 2 C 8.13 2 5 5.13 5 9 C 5 14.25 12 22 12 22 S 19 14.25 19 9 C 19 5.13 15.87 2 12 2 Z",
    width: 14,
    height: 20,
    imageCenterY: 9,
    innerRadius: 7,
  },
  circle: {
    path: "M 22 12 A 10 10 0 1 1 2 12 A 10 10 0 1 1 22 12 Z",
    width: 20,
    height: 20,
    imageCenterY: 12,
    innerRadius: 10,
  },
  square: {
    path: "M 2 2 L 22 2 L 22 22 L 2 22 Z",
    width: 20,
    height: 20,
    imageCenterY: 12,
    innerRadius: 10,
  },
  squircle: {
    path: "M 6 2 L 18 2 A 4 4 0 0 1 22 6 L 22 18 A 4 4 0 0 1 18 22 L 6 22 A 4 4 0 0 1 2 18 L 2 6 A 4 4 0 0 1 6 2 Z",
    width: 20,
    height: 20,
    imageCenterY: 12,
    innerRadius: 10,
  },
  hexagon: {
    path: "M 12 2 L 20.66 7 L 20.66 17 L 12 22 L 3.34 17 L 3.34 7 Z",
    width: 17.32,
    height: 20,
    imageCenterY: 12,
    innerRadius: 8.66,
  },
};

const SHAPE_LABELS = {
  pin: "图钉",
  circle: "圆形",
  square: "方形",
  squircle: "圆角方",
  hexagon: "六边形",
};

const SHAPE_BOUNDS = {
  pin: { minX: 5, minY: 2, maxX: 19, maxY: 22 },
  circle: { minX: 2, minY: 2, maxX: 22, maxY: 22 },
  square: { minX: 2, minY: 2, maxX: 22, maxY: 22 },
  squircle: { minX: 2, minY: 2, maxX: 22, maxY: 22 },
  hexagon: { minX: 3.34, minY: 2, maxX: 20.66, maxY: 22 },
};

const SHAPE_OPTIONS = Object.entries(SHAPES).map(([value, shape]) => ({
  value,
  label: SHAPE_LABELS[value] || value,
  path: shape.path,
}));

const ANTI_ALIAS_SCALES = [1, 2, 4];
const RESIZE_STRATEGIES = [
  "smooth-high",
  "pixelated",
  "step-down",
  "sharp-lanczos3",
];
const MAX_RENDER_DIMENSION = 4096;

// ─── 参数解析与默认值 ──────────────────────────────────────────────────────────

function parseState(query) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const parseIntOrFallback = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };
  const parseFloatOrFallback = (value, fallback) => {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };
  const bool = (v, def) => (v === undefined ? def : v !== "0" && v !== "false");
  const oneOf = (v, opts, def) => (opts.includes(v) ? v : def);
  const enumInt = (v, opts, def) => {
    const n = parseIntOrFallback(v, def);
    return opts.includes(n) ? n : def;
  };
  const borderColorDefault = readEnvString("ICON_PARAM_BORDER_COLOR", "#ef4444");
  const bgColorDefault = readEnvString("ICON_PARAM_BG_COLOR", "#ffffff");
  const defaults = {
    shape: readEnvOneOf("ICON_PARAM_SHAPE", Object.keys(SHAPES), "pin"),
    iconSize: readEnvInt("ICON_PARAM_ICON_SIZE", 128, 1, 2048),
    imageScale: readEnvFloat("ICON_PARAM_IMAGE_SCALE", 1.0, 0.01, 10),
    imageOffsetY: readEnvFloat("ICON_PARAM_IMAGE_OFFSET_Y", 0, -50, 50),
    borderWidth: readEnvFloat("ICON_PARAM_BORDER_WIDTH", 4, 0, 20),
    lineJoin: readEnvOneOf(
      "ICON_PARAM_LINE_JOIN",
      ["round", "miter", "bevel"],
      "round"
    ),
    borderColor: /^#[0-9a-fA-F]{6}$/.test(borderColorDefault)
      ? borderColorDefault
      : "#ef4444",
    bgColor: /^#[0-9a-fA-F]{6}$/.test(bgColorDefault)
      ? bgColorDefault
      : "#ffffff",
    enableShadow: readEnvBool("ICON_PARAM_ENABLE_SHADOW", true),
    shadowBlur: readEnvFloat("ICON_PARAM_SHADOW_BLUR", 10, 0, 50),
    shadowOffsetY: readEnvFloat("ICON_PARAM_SHADOW_OFFSET_Y", 5, -20, 20),
    exportSquare: readEnvBool("ICON_PARAM_EXPORT_SQUARE", true),
    exportStrategy: readEnvOneOf(
      "ICON_PARAM_EXPORT_STRATEGY",
      ["center", "bottom"],
      "center"
    ),
    antiAliasScale: readEnvInt("ICON_PARAM_ANTI_ALIAS_SCALE", 1, 1, 4),
    resizeStrategy: readEnvOneOf(
      "ICON_PARAM_RESIZE_STRATEGY",
      RESIZE_STRATEGIES,
      "smooth-high"
    ),
  };

  return {
    shape: oneOf(query.shape, Object.keys(SHAPES), defaults.shape),
    iconSize: clamp(
      parseIntOrFallback(query.iconSize, defaults.iconSize),
      1,
      2048
    ),
    imageScale: clamp(
      query.imageScale === undefined
        ? defaults.imageScale
        : parseFloatOrFallback(query.imageScale, defaults.imageScale),
      0.01,
      10
    ),
    imageOffsetY: clamp(
      query.imageOffsetY === undefined
        ? defaults.imageOffsetY
        : parseFloatOrFallback(query.imageOffsetY, defaults.imageOffsetY),
      -50,
      50
    ),
    borderWidth: clamp(
      query.borderWidth === undefined
        ? defaults.borderWidth
        : parseFloatOrFallback(query.borderWidth, defaults.borderWidth),
      0,
      20
    ),
    lineJoin: oneOf(query.lineJoin, ["round", "miter", "bevel"], defaults.lineJoin),
    borderColor: /^#[0-9a-fA-F]{6}$/.test(query.borderColor)
      ? query.borderColor
      : defaults.borderColor,
    bgColor: /^#[0-9a-fA-F]{6}$/.test(query.bgColor)
      ? query.bgColor
      : defaults.bgColor,
    enableShadow: bool(query.enableShadow, defaults.enableShadow),
    shadowBlur: clamp(
      query.shadowBlur === undefined
        ? defaults.shadowBlur
        : parseFloatOrFallback(query.shadowBlur, defaults.shadowBlur),
      0,
      50
    ),
    shadowOffsetY: clamp(
      query.shadowOffsetY === undefined
        ? defaults.shadowOffsetY
        : parseFloatOrFallback(query.shadowOffsetY, defaults.shadowOffsetY),
      -20,
      20
    ),
    exportSquare: bool(query.exportSquare, defaults.exportSquare),
    exportStrategy: oneOf(
      query.exportStrategy,
      ["center", "bottom"],
      defaults.exportStrategy
    ),
    antiAliasScale: enumInt(query.antiAliasScale, ANTI_ALIAS_SCALES, defaults.antiAliasScale),
    resizeStrategy: oneOf(
      query.resizeStrategy,
      RESIZE_STRATEGIES,
      defaults.resizeStrategy
    ),
    image: query.image === undefined || query.image === "" ? null : query.image,
  };
}

// ─── 布局计算（与 HTML getLayout() 完全相同）──────────────────────────────────

function getLayout(state) {
  const shape = SHAPES[state.shape];
  const bounds = SHAPE_BOUNDS[state.shape];
  const bboxWidth = bounds.maxX - bounds.minX;
  const bboxHeight = bounds.maxY - bounds.minY;
  const scale = state.iconSize / bboxHeight;
  const shapeWidth = bboxWidth * scale;
  const shapeHeight = bboxHeight * scale;
  const strokePad = Math.max(0, state.borderWidth);
  const shadowSpread = state.enableShadow
    ? Math.max(0, Math.ceil(state.shadowBlur * 1.5))
    : 0;
  const shadowOffsetX = 0;
  const shadowOffsetY = state.enableShadow
    ? Math.round(state.shadowOffsetY)
    : 0;
  const shadowExtraLeft = shadowSpread + Math.max(0, -shadowOffsetX);
  const shadowExtraRight = shadowSpread + Math.max(0, shadowOffsetX);
  const shadowExtraTop = shadowSpread + Math.max(0, -shadowOffsetY);
  const shadowExtraBottom = shadowSpread + Math.max(0, shadowOffsetY);
  const leftPad = Math.ceil(strokePad + shadowExtraLeft);
  const rightPad = Math.ceil(strokePad + shadowExtraRight);
  const topPad = Math.ceil(strokePad + shadowExtraTop);
  const bottomPad = Math.ceil(strokePad + shadowExtraBottom);

  const rectWidth = Math.ceil(shapeWidth + leftPad + rightPad);
  const rectHeight = Math.ceil(shapeHeight + topPad + bottomPad);
  const squareSize = Math.max(rectWidth, rectHeight);
  const width = state.exportSquare ? squareSize : rectWidth;
  const height = state.exportSquare ? squareSize : rectHeight;

  return {
    shape,
    bounds,
    scale,
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    width,
    height,
    shapeWidth,
    shapeHeight,
    leftPad,
    rightPad,
    topPad,
    bottomPad,
    squareSize,
    shadowSpread,
    shadowOffsetX,
    shadowOffsetY,
  };
}

function getRenderSize(state, layout = getLayout(state)) {
  return {
    width: Math.round(layout.width * state.antiAliasScale),
    height: Math.round(layout.height * state.antiAliasScale),
  };
}

function assertRenderSize(state, layout = getLayout(state)) {
  const renderSize = getRenderSize(state, layout);
  if (
    renderSize.width > MAX_RENDER_DIMENSION ||
    renderSize.height > MAX_RENDER_DIMENSION
  ) {
    throw new Error(
      `antiAliasScale=${state.antiAliasScale} makes render size ${renderSize.width}x${renderSize.height} exceed ${MAX_RENDER_DIMENSION}px`
    );
  }
  return renderSize;
}

// ─── 内圆计算（与 HTML getInnerCircle() 完全相同）────────────────────────────

function getInnerCircle(shapeKey, width, height) {
  switch (shapeKey) {
    case "pin": {
      const r = width * 0.46;
      const topCY = r + height * 0.04;
      return { cx: width / 2, cy: topCY, r: r * 0.65 };
    }
    case "circle":
      return { cx: width / 2, cy: height * 0.4, r: width * 0.32 };
    case "squircle":
      return { cx: width / 2, cy: height * 0.41, r: width * 0.28 };
    case "square":
      return { cx: width / 2, cy: height * 0.42, r: width * 0.28 };
    case "hexagon":
      return { cx: width / 2, cy: height * 0.4, r: width * 0.27 };
    default:
      return { cx: width / 2, cy: height * 0.4, r: width * 0.3 };
  }
}

// ─── 核心渲染（移植自 HTML drawPin()）────────────────────────────────────────

function drawPinLayers(targetCanvas, state, userImage) {
  const layout = getLayout(state);
  const { shape, scale, bounds, centerX, centerY, width, height } = layout;
  const renderScale = state.antiAliasScale;
  const renderSize = assertRenderSize(state, layout);

  targetCanvas.width = renderSize.width;
  targetCanvas.height = renderSize.height;
  const g = targetCanvas.getContext("2d");

  g.clearRect(0, 0, renderSize.width, renderSize.height);

  // 用 Path2D 绘制形状路径（@napi-rs/canvas 支持 Path2D + SVG path string）
  const path = new Path2D(shape.path);

  const shadowAlpha = 0.38; // 与 HTML forExport=true 保持一致
  const shapePixelHeight = (bounds.maxY - bounds.minY) * scale;
  const alignShiftY =
    state.exportStrategy === "bottom"
      ? Math.max(0, (height - state.iconSize) / 2 - layout.bottomPad * 0.15)
      : 0;

  const shapeAxisX = width / 2;
  const shapeAxisY = height / 2 + alignShiftY;
  const shadowX = layout.shadowOffsetX;
  const shadowY = layout.shadowOffsetY + shapePixelHeight * 0.08;
  const renderLineWidth = (state.borderWidth * 2) / (scale * renderScale);
  const renderBlur = layout.shadowSpread * renderScale;

  // 1. 独立阴影层（与 HTML 完全相同的策略：先画阴影再画主体）
  if (state.enableShadow) {
    g.save();
    g.scale(renderScale, renderScale);
    g.translate(shapeAxisX + shadowX, shapeAxisY + shadowY);
    g.scale(scale, scale);
    g.translate(-centerX, -centerY);
    g.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    if (layout.shadowSpread > 0) {
      g.filter = `blur(${renderBlur}px)`;
    }
    g.fill(path);
    g.filter = "none";
    g.restore();
  }

  // 2. 主体形状（填充 + 内描边）
  g.save();
  g.scale(renderScale, renderScale);
  g.translate(shapeAxisX, shapeAxisY);
  g.scale(scale, scale);
  g.translate(-centerX, -centerY);
  g.fillStyle = state.bgColor;
  g.fill(path);

  if (state.borderWidth > 0) {
    g.save();
    g.clip(path);
    g.lineWidth = renderLineWidth;
    g.strokeStyle = state.borderColor;
    g.lineJoin = state.lineJoin;
    g.stroke(path);
    g.restore();
  }
  g.restore();

  // 3. 内部图片
  if (userImage) {
    const inner = getInnerCircle(state.shape, width, height);
    const img = userImage;
    const drawWidth = img.width * state.imageScale;
    const drawHeight = img.height * state.imageScale;
    const imageAreaCenterX = width / 2;
    const imageAreaCenterY =
      shapeAxisY + (shape.imageCenterY - centerY) * scale;
    const radius = inner.r * scale; // note: inner.r is already in canvas px based on width/height
    const innerRadius = radius - state.borderWidth;
    const yOffsetPixel = innerRadius * (state.imageOffsetY / 100);
    const renderImageAreaCenterX = imageAreaCenterX * renderScale;
    const renderImageAreaCenterY = imageAreaCenterY * renderScale;
    const renderDrawWidth = drawWidth * renderScale;
    const renderDrawHeight = drawHeight * renderScale;
    const renderYOffsetPixel = yOffsetPixel * renderScale;

    g.save();
    g.scale(renderScale, renderScale);
    g.translate(shapeAxisX, shapeAxisY);
    g.scale(scale, scale);
    g.translate(-centerX, -centerY);
    g.clip(path);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(
      img,
      renderImageAreaCenterX - renderDrawWidth / 2,
      renderImageAreaCenterY - renderDrawHeight / 2 + renderYOffsetPixel,
      renderDrawWidth,
      renderDrawHeight
    );
    g.restore();
  }

  return {
    width: renderSize.width,
    height: renderSize.height,
    layout,
  };
}

function drawOversampledCanvas(state, userImage) {
  const layout = getLayout(state);
  const renderSize = assertRenderSize(state, layout);
  const canvas = createCanvas(renderSize.width, renderSize.height);
  drawPinLayers(canvas, state, userImage);
  return { canvas, layout };
}

async function downsampleCanvas(oversampledCanvas, layout, state) {
  const targetWidth = layout.width;
  const targetHeight = layout.height;

  if (
    oversampledCanvas.width === targetWidth &&
    oversampledCanvas.height === targetHeight
  ) {
    return oversampledCanvas;
  }

  if (state.resizeStrategy === "sharp-lanczos3") {
    if (!sharp) {
      throw new Error("sharp is not available for resizeStrategy=sharp-lanczos3");
    }
    const buffer = await sharp(oversampledCanvas.toBuffer("image/png"))
      .resize({
        width: targetWidth,
        height: targetHeight,
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();
    const finalCanvas = createCanvas(targetWidth, targetHeight);
    const g = finalCanvas.getContext("2d");
    const img = await loadImage(buffer);
    g.drawImage(img, 0, 0, targetWidth, targetHeight);
    return finalCanvas;
  }

  const finalCanvas = createCanvas(targetWidth, targetHeight);
  const g = finalCanvas.getContext("2d");
  g.clearRect(0, 0, targetWidth, targetHeight);

  if (state.resizeStrategy === "pixelated") {
    g.imageSmoothingEnabled = false;
  } else {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
  }

  let source = oversampledCanvas;
  if (state.resizeStrategy === "step-down") {
    while (
      source.width / 2 >= targetWidth * 1.2 &&
      source.height / 2 >= targetHeight * 1.2
    ) {
      const nextWidth = Math.max(targetWidth, Math.ceil(source.width / 2));
      const nextHeight = Math.max(targetHeight, Math.ceil(source.height / 2));
      const stepCanvas = createCanvas(nextWidth, nextHeight);
      const stepCtx = stepCanvas.getContext("2d");
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = "high";
      stepCtx.drawImage(source, 0, 0, nextWidth, nextHeight);
      source = stepCanvas;
    }
  }

  g.drawImage(source, 0, 0, targetWidth, targetHeight);
  return finalCanvas;
}

async function renderComposite(state, userImage) {
  const layout = getLayout(state);
  const { canvas: oversampledCanvas } = drawOversampledCanvas(state, userImage);
  const finalCanvas = await downsampleCanvas(
    oversampledCanvas,
    layout,
    state
  );
  const buffer = finalCanvas.toBuffer("image/png");
  return { canvas: finalCanvas, buffer, layout };
}

// ─── 图片加载工具 ──────────────────────────────────────────────────────────────

async function loadImageFromBuffer(buffer) {
  try {
    return await loadImage(buffer);
  } catch (err) {
    throw clientError(
      "IMAGE_DECODE_FAILED",
      `image 解码失败：${err.message}`
    );
  }
}

async function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    lib
      .get(url, (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(
            clientError(
              "IMAGE_FETCH_FAILED",
              `image URL 请求失败，HTTP ${res.statusCode || "unknown"}`
            )
          );
          return;
        }

        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", async () => {
          try {
            const buf = Buffer.concat(chunks);
            resolve(await loadImage(buf));
          } catch (e) {
            reject(
              clientError(
                "IMAGE_DECODE_FAILED",
                `image URL 图片解码失败：${e.message}`
              )
            );
          }
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function respondRouteError(res, err) {
  const statusCode = err && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const code =
    (err && err.code) || (statusCode >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: err && err.message ? err.message : "Unknown error",
    code,
  });
}

// ─── 路由 ─────────────────────────────────────────────────────────────────────

/**
 * GET /icon?shape=pin&iconSize=128&...&image=...
 */
app.get("/icon", async (req, res) => {
  try {
    const state = parseState(req.query);
    let userImage = null;

    const imageSource = resolveImageSource(state.image);
    if (imageSource) {
      if (imageSource.kind === "data") {
        userImage = await loadImageFromBuffer(imageSource.buffer);
      } else {
        userImage = await loadImageFromUrl(imageSource.url);
      }
    }

    const { canvas, buffer, layout } = await renderComposite(state, userImage);

    res.set({
      "Content-Type": "image/png",
      "Content-Length": buffer.length,
      "X-Icon-Width": layout.width,
      "X-Icon-Height": layout.height,
      "Cache-Control": "no-cache",
    });
    res.send(buffer);
  } catch (err) {
    respondRouteError(res, err);
  }
});

/**
 * GET /ui.html — 基于 pug 的服务端模板页
 */
app.get("/ui.html", (req, res) => {
  try {
    const state = parseState(req.query);
    res.render("ui", {
      title: "Pin Icon UI",
      apiBaseUrl: `${req.protocol}://${req.get("host")}`,
      apiIconPath: "/icon",
      apiInfoPath: "/info",
      state,
      shapeOptions: SHAPE_OPTIONS,
      pageDataJson: JSON.stringify({
        apiBaseUrl: `${req.protocol}://${req.get("host")}`,
        apiIconPath: "/icon",
        apiInfoPath: "/info",
        imageEnableBase64: IMAGE_ENABLE_BASE64,
        state,
        shapeOptions: SHAPE_OPTIONS,
      }),
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/**
 * POST /icon — multipart/form-data
 * 支持 `image` 文件上传；若未上传文件，可使用文本 `image`
 */
app.post("/icon", upload.single("image"), async (req, res) => {
  try {
    const state = parseState({ ...req.query, ...req.body });
    let userImage = null;

    if (req.file) {
      userImage = await loadImageFromBuffer(req.file.buffer);
    } else {
      const imageSource = resolveImageSource(state.image);
      if (imageSource) {
        if (imageSource.kind === "data") {
          userImage = await loadImageFromBuffer(imageSource.buffer);
        } else {
          userImage = await loadImageFromUrl(imageSource.url);
        }
      }
    }

    const { buffer, layout } = await renderComposite(state, userImage);

    res.set({
      "Content-Type": "image/png",
      "Content-Length": buffer.length,
      "X-Icon-Width": layout.width,
      "X-Icon-Height": layout.height,
      "Cache-Control": "no-cache",
    });
    res.send(buffer);
  } catch (err) {
    respondRouteError(res, err);
  }
});

/**
 * GET /info — 返回当前参数的布局尺寸信息（不渲染图片）
 */
app.get("/info", (req, res) => {
  try {
    const state = parseState(req.query);
    const layout = getLayout(state);
    const renderSize = getRenderSize(state, layout);
    res.json({
      state,
      width: layout.width,
      height: layout.height,
      renderWidth: renderSize.width,
      renderHeight: renderSize.height,
      shapeWidth: Math.round(layout.shapeWidth),
      shapeHeight: Math.round(layout.shapeHeight),
      scale: layout.scale,
    });
  } catch (err) {
    respondRouteError(res, err);
  }
});

// ─── 启动 ──────────────────────────────────────────────────────────────────────

function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`Pin Icon Server listening on http://localhost:${port}`);
    console.log(`  CORS: ${ENABLE_CORS ? "enabled" : "disabled"}`);
    console.log(`  GET  /ui.html`);
    console.log(
      `  GET  /icon?shape=pin&iconSize=128&borderColor=%23ef4444&antiAliasScale=2`
    );
    console.log(`  POST /icon  (multipart/form-data, image file or text field)`);
    console.log(`  GET  /info?shape=pin&iconSize=128`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  parseState,
  getLayout,
  ENABLE_CORS,
  PORT,
};
