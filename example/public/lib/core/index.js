"use strict";

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.IconCombinderCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function clientError(code, message) {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = code;
    return error;
  }

  function readEnvString(name, fallback, env) {
    const value = env && Object.prototype.hasOwnProperty.call(env, name) ? env[name] : undefined;
    return value === undefined || value === "" ? fallback : value;
  }

  function readEnvBool(name, fallback, env) {
    const value = env && Object.prototype.hasOwnProperty.call(env, name) ? env[name] : undefined;
    if (value === undefined || value === "") return fallback;
    return String(value) !== "0" && String(value).toLowerCase() !== "false";
  }

  function readEnvInt(name, fallback, min, max, env) {
    const value = env && Object.prototype.hasOwnProperty.call(env, name) ? env[name] : undefined;
    if (value === undefined || value === "") return fallback;
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function readEnvFloat(name, fallback, min, max, env) {
    const value = env && Object.prototype.hasOwnProperty.call(env, name) ? env[name] : undefined;
    if (value === undefined || value === "") return fallback;
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function readEnvOneOf(name, options, fallback, env) {
    const value = readEnvString(name, fallback, env);
    return options.includes(value) ? value : fallback;
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

  function hexToRgba(hex, alpha) {
    const match = /^#([0-9a-fA-F]{6})$/.exec(String(hex || ""));
    if (!match) {
      return `rgba(0, 0, 0, ${alpha})`;
    }

    const value = match[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

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

  function parseMarginParam(raw, iconSize) {
    if (raw === undefined || raw === null) return 0;
    const str = String(raw).trim();
    if (!str) return 0;
    if (str.endsWith("%")) {
      const pct = parseFloat(str);
      return Number.isNaN(pct) ? 0 : Math.max(0, (pct / 100) * iconSize);
    }
    const num = parseFloat(str.endsWith("px") ? str.slice(0, -2) : str);
    return Number.isNaN(num) ? 0 : Math.max(0, num);
  }

  function parseState(query, env = (typeof process !== "undefined" && process.env ? process.env : {})) {
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
    const borderColorDefault = readEnvString("ICON_PARAM_BORDER_COLOR", "#ef4444", env);
    const bgColorDefault = readEnvString("ICON_PARAM_BG_COLOR", "#ffffff", env);
    const defaults = {
      shape: readEnvOneOf("ICON_PARAM_SHAPE", Object.keys(SHAPES), "pin", env),
      iconSize: readEnvInt("ICON_PARAM_ICON_SIZE", 128, 1, 2048, env),
      imageScale: readEnvFloat("ICON_PARAM_IMAGE_SCALE", 1.0, 0.01, 10, env),
      imageOffsetY: readEnvFloat("ICON_PARAM_IMAGE_OFFSET_Y", 0, -50, 50, env),
      borderWidth: readEnvFloat("ICON_PARAM_BORDER_WIDTH", 4, 0, 20, env),
      lineJoin: readEnvOneOf(
        "ICON_PARAM_LINE_JOIN",
        ["round", "miter", "bevel"],
        "round",
        env
      ),
      borderColor: /^#[0-9a-fA-F]{6}$/.test(borderColorDefault)
        ? borderColorDefault
        : "#ef4444",
      bgColor: /^#[0-9a-fA-F]{6}$/.test(bgColorDefault)
        ? bgColorDefault
        : "#ffffff",
      contourEnhance: readEnvBool("ICON_PARAM_CONTOUR_ENHANCE", true, env),
      contourOuterGlow: readEnvFloat("ICON_PARAM_CONTOUR_OUTER_GLOW", 2, 0, 20, env),
      contourOuterWidth: readEnvFloat("ICON_PARAM_CONTOUR_OUTER_WIDTH", 6, 0, 20, env),
      contourMainWidth: readEnvFloat("ICON_PARAM_CONTOUR_MAIN_WIDTH", 3, 0, 20, env),
      contourInnerWidth: readEnvFloat("ICON_PARAM_CONTOUR_INNER_WIDTH", 1, 0, 20, env),
      contourCornerSoftness: readEnvFloat(
        "ICON_PARAM_CONTOUR_CORNER_SOFTNESS",
        0.12,
        0,
        1,
        env
      ),
      enableShadow: readEnvBool("ICON_PARAM_ENABLE_SHADOW", true, env),
      shadowBlur: readEnvFloat("ICON_PARAM_SHADOW_BLUR", 10, 0, 50, env),
      shadowOffsetY: readEnvFloat("ICON_PARAM_SHADOW_OFFSET_Y", 5, -20, 20, env),
      exportSquare: readEnvBool("ICON_PARAM_EXPORT_SQUARE", true, env),
      exportStrategy: readEnvOneOf(
        "ICON_PARAM_EXPORT_STRATEGY",
        ["center", "bottom"],
        "center",
        env
      ),
      antiAliasScale: readEnvInt("ICON_PARAM_ANTI_ALIAS_SCALE", 1, 1, 4, env),
      resizeStrategy: readEnvOneOf(
        "ICON_PARAM_RESIZE_STRATEGY",
        RESIZE_STRATEGIES,
        "smooth-high",
        env
      ),
    };

    const iconSize = clamp(parseIntOrFallback(query.iconSize, defaults.iconSize), 1, 2048);

    return {
      shape: oneOf(query.shape, Object.keys(SHAPES), defaults.shape),
      iconSize,
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
      contourEnhance: bool(query.contourEnhance, defaults.contourEnhance),
      contourOuterGlow: clamp(
        query.contourOuterGlow === undefined
          ? defaults.contourOuterGlow
          : parseFloatOrFallback(query.contourOuterGlow, defaults.contourOuterGlow),
        0,
        20
      ),
      contourOuterWidth: clamp(
        query.contourOuterWidth === undefined
          ? defaults.contourOuterWidth
          : parseFloatOrFallback(query.contourOuterWidth, defaults.contourOuterWidth),
        0,
        20
      ),
      contourMainWidth: clamp(
        query.contourMainWidth === undefined
          ? defaults.contourMainWidth
          : parseFloatOrFallback(query.contourMainWidth, defaults.contourMainWidth),
        0,
        20
      ),
      contourInnerWidth: clamp(
        query.contourInnerWidth === undefined
          ? defaults.contourInnerWidth
          : parseFloatOrFallback(query.contourInnerWidth, defaults.contourInnerWidth),
        0,
        20
      ),
      contourCornerSoftness: clamp(
        query.contourCornerSoftness === undefined
          ? defaults.contourCornerSoftness
          : parseFloatOrFallback(
              query.contourCornerSoftness,
              defaults.contourCornerSoftness
            ),
        0,
        1
      ),
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
      resizeStrategy: oneOf(query.resizeStrategy, RESIZE_STRATEGIES, defaults.resizeStrategy),
      image: query.image === undefined || query.image === "" ? null : query.image,
      marginX: parseMarginParam(query.marginX, iconSize),
      marginY: parseMarginParam(query.marginY, iconSize),
    };
  }

  function getLayout(state) {
    const shape = SHAPES[state.shape];
    const bounds = SHAPE_BOUNDS[state.shape];
    const bboxWidth = bounds.maxX - bounds.minX;
    const bboxHeight = bounds.maxY - bounds.minY;
    const scale = state.iconSize / bboxHeight;
    const shapeWidth = bboxWidth * scale;
    const shapeHeight = bboxHeight * scale;
    const strokePad = Math.max(0, state.borderWidth);
    const contourPad = state.contourEnhance
      ? Math.ceil(state.contourOuterWidth * 0.35 + state.contourOuterGlow * 0.75)
      : 0;
    const shadowSpread = state.enableShadow
      ? Math.max(0, Math.ceil(state.shadowBlur * 1.5))
      : 0;
    const shadowOffsetX = 0;
    const shadowOffsetY = state.enableShadow ? Math.round(state.shadowOffsetY) : 0;
    const shadowExtraLeft = shadowSpread + Math.max(0, -shadowOffsetX);
    const shadowExtraRight = shadowSpread + Math.max(0, shadowOffsetX);
    const shadowExtraTop = shadowSpread + Math.max(0, -shadowOffsetY);
    const shadowExtraBottom = shadowSpread + Math.max(0, shadowOffsetY);
    const marginXPx = Math.ceil(Math.max(0, state.marginX || 0));
    const marginYPx = Math.ceil(Math.max(0, state.marginY || 0));
    const leftPad = Math.ceil(strokePad + shadowExtraLeft + contourPad) + marginXPx;
    const rightPad = Math.ceil(strokePad + shadowExtraRight + contourPad) + marginXPx;
    const topPad = Math.ceil(strokePad + shadowExtraTop + contourPad) + marginYPx;
    const bottomPad = Math.ceil(strokePad + shadowExtraBottom + contourPad) + marginYPx;

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

  function resolveImageReference(rawImage, options = {}) {
    const {
      imageEnableBase64 = false,
      imageUrlPrefix = "",
      imageUrlPrefixOnly = false,
    } = options;

    if (rawImage === undefined || rawImage === null) {
      return null;
    }

    const image = String(rawImage).trim();
    if (!image) {
      return null;
    }

    if (image.startsWith("data:")) {
      if (!imageEnableBase64) {
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
      return { kind: "data", value: image };
    }

    if (image.startsWith("//")) {
      throw clientError(
        "IMAGE_URL_INVALID",
        "image 不能以 // 开头，请使用 http(s):// 或相对路径"
      );
    }

    const normalizedPrefix = imageUrlPrefix ? normalizeUrlPrefix(imageUrlPrefix) : "";
    let resolvedUrl = null;
    if (isHttpUrl(image)) {
      resolvedUrl = image;
    } else {
      if (!normalizedPrefix) {
        throw clientError(
          "IMAGE_URL_PREFIX_REQUIRED",
          "image 是相对路径时必须配置 IMAGE_URL_PREFIX"
        );
      }
      resolvedUrl = new URL(image, normalizedPrefix).toString();
    }

    if (imageUrlPrefixOnly) {
      if (!normalizedPrefix) {
        throw clientError(
          "IMAGE_URL_PREFIX_REQUIRED",
          "启用 IMAGE_URL_PREFIX_ONLY 时必须配置 IMAGE_URL_PREFIX"
        );
      }
      if (!resolvedUrl.startsWith(normalizedPrefix)) {
        throw clientError(
          "IMAGE_URL_PREFIX_MISMATCH",
          "image 解析后的 URL 必须命中 IMAGE_URL_PREFIX"
        );
      }
    }

    return { kind: "url", value: resolvedUrl };
  }

  return {
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
  };
});
