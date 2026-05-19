"use strict";

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const core = require("./index");
    module.exports = factory(core);
  } else {
    root.IconCombinderRender = factory(root.IconCombinderCore);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (core) {
  if (!core) {
    throw new Error("IconCombinderCore is required before IconCombinderRender");
  }

  function strokeLayer(ctx, path, options = {}) {
    const {
      lineWidth,
      strokeStyle,
      lineJoin,
      lineCap = "round",
      blur = 0,
      clip = false,
    } = options;

    ctx.save();
    if (clip) {
      ctx.clip(path);
    }
    ctx.lineCap = lineCap;
    ctx.lineJoin = lineJoin || "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    if (blur > 0) {
      ctx.filter = `blur(${blur}px)`;
    }
    ctx.stroke(path);
    ctx.filter = "none";
    ctx.restore();
  }

  function ensureContext(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法创建 2d canvas context");
    }
    return ctx;
  }

  function genericDownsampleCanvas(oversampledCanvas, layout, state, runtime) {
    const targetWidth = layout.width;
    const targetHeight = layout.height;

    if (
      oversampledCanvas.width === targetWidth &&
      oversampledCanvas.height === targetHeight
    ) {
      return oversampledCanvas;
    }

    const finalCanvas = runtime.createCanvas(targetWidth, targetHeight);
    const ctx = ensureContext(finalCanvas);
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    if (state.resizeStrategy === "pixelated") {
      ctx.imageSmoothingEnabled = false;
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    let source = oversampledCanvas;
    if (state.resizeStrategy === "step-down") {
      while (
        source.width / 2 >= targetWidth * 1.2 &&
        source.height / 2 >= targetHeight * 1.2
      ) {
        const nextWidth = Math.max(targetWidth, Math.ceil(source.width / 2));
        const nextHeight = Math.max(targetHeight, Math.ceil(source.height / 2));
        const stepCanvas = runtime.createCanvas(nextWidth, nextHeight);
        const stepCtx = ensureContext(stepCanvas);
        stepCtx.imageSmoothingEnabled = true;
        stepCtx.imageSmoothingQuality = "high";
        stepCtx.drawImage(source, 0, 0, nextWidth, nextHeight);
        source = stepCanvas;
      }
    }

    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    return finalCanvas;
  }

  function drawPinLayers(targetCanvas, state, userImage, runtime) {
    const layout = core.getLayout(state);
    const { shape, scale, bounds, centerX, centerY, width, height } = layout;
    const renderScale = state.antiAliasScale;
    const renderSize = core.assertRenderSize(state, layout);

    targetCanvas.width = renderSize.width;
    targetCanvas.height = renderSize.height;
    const g = ensureContext(targetCanvas);

    g.clearRect(0, 0, renderSize.width, renderSize.height);

    const Path2D = runtime.Path2D;
    if (!Path2D) {
      throw new Error("runtime Path2D 不可用");
    }

    const path = new Path2D(shape.path);
    const shadowAlpha = 0.38;
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
    const contourLineJoin =
      state.contourEnhance && state.contourCornerSoftness > 0
        ? "round"
        : state.lineJoin;
    const contourRenderLineWidth = (value) =>
      (Math.max(0, value) * 2) / (scale * renderScale);
    const contourOuterGlowWidth = contourRenderLineWidth(
      state.borderWidth +
        (state.contourEnhance ? state.contourOuterWidth * 0.35 : 0)
    );
    const contourMainWidth = contourRenderLineWidth(
      state.borderWidth +
        (state.contourEnhance ? state.contourMainWidth * 0.2 : 0)
    );
    const contourInnerWidth = contourRenderLineWidth(
      Math.max(
        0,
        state.borderWidth -
          (state.contourEnhance ? state.contourInnerWidth * 0.2 : 0)
      )
    );
    const contourGlowBlur = state.contourEnhance
      ? Math.max(0, state.contourOuterGlow * 0.5 * renderScale)
      : 0;
    const contourCornerBoost = state.contourEnhance
      ? state.contourCornerSoftness * 0.35
      : 0;

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

    g.save();
    g.scale(renderScale, renderScale);
    g.translate(shapeAxisX, shapeAxisY);
    g.scale(scale, scale);
    g.translate(-centerX, -centerY);
    g.fillStyle = state.bgColor;
    g.fill(path);

    if (state.contourEnhance) {
      strokeLayer(g, path, {
        lineWidth: contourOuterGlowWidth + contourCornerBoost,
        strokeStyle: core.hexToRgba(state.borderColor, 0.16),
        lineJoin: contourLineJoin,
        blur: contourGlowBlur,
      });
      strokeLayer(g, path, {
        lineWidth: contourOuterGlowWidth + contourCornerBoost * 0.5,
        strokeStyle: core.hexToRgba(state.borderColor, 0.34),
        lineJoin: contourLineJoin,
      });
      strokeLayer(g, path, {
        lineWidth: contourMainWidth,
        strokeStyle: state.borderColor,
        lineJoin: contourLineJoin,
      });
      strokeLayer(g, path, {
        lineWidth: contourInnerWidth,
        strokeStyle: core.hexToRgba(state.borderColor, 0.42),
        lineJoin: contourLineJoin,
        clip: true,
      });
    } else if (state.borderWidth > 0) {
      g.save();
      g.clip(path);
      g.lineWidth = renderLineWidth;
      g.strokeStyle = state.borderColor;
      g.lineJoin = state.lineJoin;
      g.stroke(path);
      g.restore();
    }
    g.restore();

    if (userImage) {
      const inner = core.getInnerCircle(state.shape, width, height);
      const img = userImage;
      const drawWidth = img.width * state.imageScale;
      const drawHeight = img.height * state.imageScale;
      const imageAreaCenterX = width / 2;
      const imageAreaCenterY = shapeAxisY + (shape.imageCenterY - centerY) * scale;
      const radius = inner.r * scale;
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

  async function renderComposite(state, userImage, runtime) {
    const layout = core.getLayout(state);
    const renderSize = core.assertRenderSize(state, layout);
    const oversampledCanvas = runtime.createCanvas(renderSize.width, renderSize.height);
    drawPinLayers(oversampledCanvas, state, userImage, runtime);

    const downsample =
      runtime.downsampleCanvas || genericDownsampleCanvas;
    const finalCanvas = await downsample(
      oversampledCanvas,
      layout,
      state,
      runtime
    );

    const buffer = await runtime.encodeCanvas(finalCanvas, state, layout);
    const effectiveResizeStrategy = runtime.getEffectiveResizeStrategy
      ? runtime.getEffectiveResizeStrategy(state)
      : state.resizeStrategy;

    return {
      canvas: finalCanvas,
      buffer,
      layout,
      renderWidth: renderSize.width,
      renderHeight: renderSize.height,
      effectiveResizeStrategy,
    };
  }

  return {
    strokeLayer,
    genericDownsampleCanvas,
    drawPinLayers,
    renderComposite,
  };
});
