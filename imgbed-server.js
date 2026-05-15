"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const multer = require("multer");
const os = require("node:os");
const path = require("node:path");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const readEnvString = (name, fallback) => {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
};

const readEnvInt = (name, fallback, min, max) => {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const PORT = readEnvInt("IMG_BED_PORT", 3001, 1, 65535);
const BASE_DIR = path.join(os.tmpdir(), "icon-combinder-imgbed", String(PORT));
const FILES_DIR = path.join(BASE_DIR, "files");
const FILES = new Map();

const ensureFilesDir = async () => {
  await fs.mkdir(FILES_DIR, { recursive: true });
};

const buildAbsoluteUrl = (req, routePath) => {
  return `${req.protocol}://${req.get("host")}${routePath}`;
};

app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: "需要通过 image 字段上传文件",
        code: "IMAGE_BED_FILE_REQUIRED",
      });
      return;
    }

    await ensureFilesDir();
    const id = crypto.randomUUID();
    const filePath = path.join(FILES_DIR, id);
    await fs.writeFile(filePath, req.file.buffer);

    FILES.set(id, {
      filePath,
      mimetype: req.file.mimetype || "application/octet-stream",
    });

    const routePath = `/${id}`;
    res.json({
      id,
      path: routePath,
      url: buildAbsoluteUrl(req, routePath),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error && error.message ? error.message : "Unknown error",
      code: "INTERNAL_ERROR",
    });
  }
});

app.get("/:id", async (req, res) => {
  try {
    const entry = FILES.get(req.params.id);
    if (!entry) {
      res.status(404).json({
        error: "图床文件不存在或已失效",
        code: "IMAGE_BED_NOT_FOUND",
      });
      return;
    }

    const stat = await fs.stat(entry.filePath);
    res.set({
      "Content-Type": entry.mimetype,
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    res.sendFile(entry.filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      res.status(404).json({
        error: "图床文件不存在或已失效",
        code: "IMAGE_BED_NOT_FOUND",
      });
      return;
    }

    console.error(error);
    res.status(500).json({
      error: error && error.message ? error.message : "Unknown error",
      code: "INTERNAL_ERROR",
    });
  }
});

function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`Image bed listening on http://localhost:${port}`);
    console.log(`  POST /upload`);
    console.log(`  GET  /:id`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  PORT,
  FILES_DIR,
  readEnvString,
};
