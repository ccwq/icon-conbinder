"use strict";

(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.IconCombinderBrowser = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (root) {
  const core = root.IconCombinderCore;
  const render = root.IconCombinderRender;

  function ensureDeps() {
    if (!core || !render) {
      throw new Error("需要先加载 IconCombinderCore 和 IconCombinderRender");
    }
  }

  function createBrowserCanvas(width, height) {
    const canvas = root.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new root.Image();
      if (typeof src === "string" && !src.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => resolve(img);
      img.onerror = () => {
        reject(new Error("浏览器图片加载失败，请检查 URL、CORS 或文件内容"));
      };
      img.src = src;
    });
  }

  async function loadImageFromSource(source) {
    if (!source) return null;

    if (source.kind === "file") {
      const objectUrl = root.URL.createObjectURL(source.file);
      try {
        return await loadImageElement(objectUrl);
      } finally {
        root.URL.revokeObjectURL(objectUrl);
      }
    }

    if (source.kind === "data") {
      return await loadImageElement(source.value);
    }

    if (source.kind === "url") {
      return await loadImageElement(source.value);
    }

    return null;
  }

  async function encodeCanvas(canvas) {
    try {
      return canvas.toDataURL("image/png");
    } catch (err) {
      throw new Error(`浏览器导出 base64 失败：${err.message}`);
    }
  }

  function getEffectiveResizeStrategy(state) {
    return state.resizeStrategy === "sharp-lanczos3"
      ? "step-down"
      : state.resizeStrategy;
  }

  async function downsampleCanvas(oversampledCanvas, layout, state) {
    const effectiveState = {
      ...state,
      resizeStrategy: getEffectiveResizeStrategy(state),
    };
    return render.genericDownsampleCanvas(
      oversampledCanvas,
      layout,
      effectiveState,
      {
        createCanvas: createBrowserCanvas,
      }
    );
  }

  async function renderIcon(state, source) {
    ensureDeps();
    const image = await loadImageFromSource(source);
    const runtime = {
      createCanvas: createBrowserCanvas,
      Path2D: root.Path2D,
      downsampleCanvas,
      encodeCanvas,
      getEffectiveResizeStrategy,
    };

    const result = await render.renderComposite(state, image, runtime);
    return {
      ...result,
      dataUrl: result.buffer,
      mimeType: "image/png",
    };
  }

  function describeSource(source) {
    if (!source) return "无图像输入";
    if (source.kind === "file") return `file:${source.file.name || "未命名"}`;
    if (source.kind === "data") return "data:image/*;base64,...";
    if (source.kind === "url") return source.value;
    return "未知图像输入";
  }

  return {
    core,
    renderIcon,
    loadImageFromSource,
    getEffectiveResizeStrategy,
    describeSource,
  };
});
