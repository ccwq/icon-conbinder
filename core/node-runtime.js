"use strict";

const https = require("https");
const http = require("http");
const { createCanvas, loadImage, Path2D } = require("@napi-rs/canvas");
const sharp = require("sharp");
const { genericDownsampleCanvas } = require("./render");

function clientError(code, message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function dataUrlToBuffer(dataUrl) {
  const text = String(dataUrl || "");
  const commaIndex = text.indexOf(",");
  const base64Part = commaIndex >= 0 ? text.slice(commaIndex + 1) : "";
  return Buffer.from(base64Part, "base64");
}

async function loadImageFromBuffer(buffer) {
  try {
    return await loadImage(buffer);
  } catch (err) {
    throw clientError("IMAGE_DECODE_FAILED", `image 解码失败：${err.message}`);
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

async function loadImageFromReference(reference) {
  if (!reference) return null;
  if (reference.kind === "data") {
    const buffer = dataUrlToBuffer(reference.value);
    if (!buffer.length) {
      throw clientError("IMAGE_BASE64_INVALID", "image 的 data URL 解码后为空");
    }
    return await loadImageFromBuffer(buffer);
  }
  if (reference.kind === "url") {
    return await loadImageFromUrl(reference.value);
  }
  return null;
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
    const ctx = finalCanvas.getContext("2d");
    const img = await loadImage(buffer);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    return finalCanvas;
  }

  return genericDownsampleCanvas(oversampledCanvas, layout, state, {
    createCanvas,
  });
}

function encodeCanvas(canvas) {
  return canvas.toBuffer("image/png");
}

function getEffectiveResizeStrategy(state) {
  return state.resizeStrategy;
}

function createNodeRuntime() {
  return {
    createCanvas,
    Path2D,
    downsampleCanvas,
    encodeCanvas,
    getEffectiveResizeStrategy,
  };
}

module.exports = {
  createNodeRuntime,
  loadImageFromBuffer,
  loadImageFromUrl,
  loadImageFromReference,
  dataUrlToBuffer,
  downsampleCanvas,
  encodeCanvas,
  getEffectiveResizeStrategy,
};
