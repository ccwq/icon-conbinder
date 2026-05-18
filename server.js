"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const core = require("./core");
const { createNodeRuntime, loadImageFromReference } = require("./core/node-runtime");
const { renderComposite } = require("./core/render");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const nodeRuntime = createNodeRuntime();

const PORT = core.readEnvInt("PORT", 3000, 1, 65535, process.env);
const ENABLE_CORS = core.readEnvBool("ENABLE_CORS", false, process.env);
const IMAGE_URL_PREFIX = core.readEnvString("IMAGE_URL_PREFIX", "", process.env);
const IMAGE_URL_PREFIX_ONLY = core.readEnvBool("IMAGE_URL_PREFIX_ONLY", false, process.env);
const IMAGE_ENABLE_BASE64 = core.readEnvBool("IMAGE_ENABLE_BASE64", false, process.env);
const IMG_BED_BASE_URL = core.readEnvString("IMG_BED_BASE_URL", "", process.env);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use("/assets", express.static(path.join(__dirname, "views/assets")));
app.use("/assets/core", express.static(path.join(__dirname, "core")));

app.get("/browser.js", (req, res) => {
  res.sendFile(path.join(__dirname, "browser.js"));
});

if (ENABLE_CORS) {
  app.use(
    cors({
      origin: "*",
      credentials: false,
    })
  );
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

function getApiBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function getImageBedUploadUrl() {
  return IMG_BED_BASE_URL
    ? new URL("upload", core.normalizeUrlPrefix(IMG_BED_BASE_URL)).toString()
    : "";
}

function buildPageData(req, state) {
  const apiBaseUrl = getApiBaseUrl(req);
  const imageBedUploadUrl = getImageBedUploadUrl();
  return {
    apiBaseUrl,
    apiIconPath: "/icon",
    apiInfoPath: "/info",
    apiImageBedUploadUrl: imageBedUploadUrl,
    imageEnableBase64: IMAGE_ENABLE_BASE64,
    imageUrlPrefix: IMAGE_URL_PREFIX,
    imageUrlPrefixOnly: IMAGE_URL_PREFIX_ONLY,
    state,
    shapeOptions: core.SHAPE_OPTIONS,
  };
}

async function resolveUserImage(state, fileBuffer) {
  if (fileBuffer) {
    return await loadImageFromReference({
      kind: "data",
      value: `data:image/png;base64,${fileBuffer.toString("base64")}`,
    });
  }

  const reference = core.resolveImageReference(state.image, {
    imageEnableBase64: IMAGE_ENABLE_BASE64,
    imageUrlPrefix: IMAGE_URL_PREFIX,
    imageUrlPrefixOnly: IMAGE_URL_PREFIX_ONLY,
  });
  return await loadImageFromReference(reference);
}

function setPngResponseHeaders(res, buffer, layout) {
  res.set({
    "Content-Type": "image/png",
    "Content-Length": buffer.length,
    "X-Icon-Width": layout.width,
    "X-Icon-Height": layout.height,
    "Cache-Control": "no-cache",
  });
}

app.get("/icon", async (req, res) => {
  try {
    const state = core.parseState(req.query, process.env);
    const userImage = await resolveUserImage(state, null);
    const { buffer, layout } = await renderComposite(state, userImage, nodeRuntime);
    setPngResponseHeaders(res, buffer, layout);
    res.send(buffer);
  } catch (err) {
    respondRouteError(res, err);
  }
});

app.post("/icon", upload.single("image"), async (req, res) => {
  try {
    const state = core.parseState({ ...req.query, ...req.body }, process.env);
    let userImage = null;

    if (req.file) {
      userImage = await resolveUserImage(state, req.file.buffer);
    } else {
      userImage = await resolveUserImage(state, null);
    }

    const { buffer, layout } = await renderComposite(state, userImage, nodeRuntime);
    setPngResponseHeaders(res, buffer, layout);
    res.send(buffer);
  } catch (err) {
    respondRouteError(res, err);
  }
});

app.get("/info", (req, res) => {
  try {
    const state = core.parseState(req.query, process.env);
    const layout = core.getLayout(state);
    const renderSize = core.getRenderSize(state, layout);
    res.json({
      state,
      width: layout.width,
      height: layout.height,
      renderWidth: renderSize.width,
      renderHeight: renderSize.height,
      shapeWidth: Math.round(layout.shapeWidth),
      shapeHeight: Math.round(layout.shapeHeight),
      scale: layout.scale,
      effectiveResizeStrategy: state.resizeStrategy,
    });
  } catch (err) {
    respondRouteError(res, err);
  }
});

app.get("/ui.html", (req, res) => {
  try {
    const state = core.parseState(req.query, process.env);
    res.render("ui", {
      title: "图标合成工作台",
      state,
      shapeOptions: core.SHAPE_OPTIONS,
      pageDataJson: JSON.stringify(buildPageData(req, state)),
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

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
  parseState: core.parseState,
  getLayout: core.getLayout,
  getRenderSize: core.getRenderSize,
  ENABLE_CORS,
  PORT,
};
