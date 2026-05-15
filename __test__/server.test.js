const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");

const { app } = require("../server");

const OUT_DIR = path.join(__dirname, "test_dist");
const INPUT_DIR = path.join(__dirname, "test-data");
const BASE_ICON = path.join(INPUT_DIR, "marker.png");

async function resetOutDir() {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function request(server, method, urlPath, { headers = {}, body = null } = {}) {
  return await new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: urlPath,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function buildMultipartForm(fields, fileField) {
  const boundary = "----icon-combinder-test-boundary";
  const chunks = [];
  const push = (value) => chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(String(value)));

  for (const [key, value] of Object.entries(fields)) {
    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="${key}"\r\n\r\n`);
    push(`${value}\r\n`);
  }

  if (fileField) {
    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\n`);
    push(`Content-Type: ${fileField.contentType}\r\n\r\n`);
    push(fileField.buffer);
    push("\r\n");
  }

  push(`--${boundary}--\r\n`);

  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function readBaseIcon() {
  return await fs.readFile(BASE_ICON);
}

const shapeMatrix = [
  { shape: "pin", iconSize: 24, borderWidth: 2, exportSquare: 1, exportStrategy: "center", enableShadow: 0, shadowBlur: 0, shadowOffsetY: 0 },
  { shape: "circle", iconSize: 28, borderWidth: 1, exportSquare: 0, exportStrategy: "bottom", enableShadow: 1, shadowBlur: 2, shadowOffsetY: 1 },
  { shape: "square", iconSize: 30, borderWidth: 4, exportSquare: 1, exportStrategy: "center", enableShadow: 0, shadowBlur: 0, shadowOffsetY: 0 },
  { shape: "squircle", iconSize: 26, borderWidth: 2, exportSquare: 1, exportStrategy: "center", enableShadow: 1, shadowBlur: 3, shadowOffsetY: 2 },
  { shape: "hexagon", iconSize: 20, borderWidth: 1, exportSquare: 0, exportStrategy: "bottom", enableShadow: 1, shadowBlur: 3, shadowOffsetY: -2 },
];

const iconVariants = [
  { suffix: "marker", file: "marker.png", imageScale: 1.0, imageOffsetY: 0 },
  { suffix: "marker-tight", file: "marker-stroked.png", imageScale: 0.85, imageOffsetY: -10 },
  { suffix: "gift-wide", file: "gift.png", imageScale: 1.1, imageOffsetY: 8 },
  { suffix: "heart-large", file: "heart.png", imageScale: 1.2, imageOffsetY: -6 },
  { suffix: "museum-small", file: "museum.png", imageScale: 0.75, imageOffsetY: 4 },
  { suffix: "park-soft", file: "park.png", imageScale: 0.95, imageOffsetY: 12 },
  { suffix: "library-bottom", file: "library.png", imageScale: 1.05, imageOffsetY: -12 },
  { suffix: "fuel-center", file: "fuel.png", imageScale: 0.9, imageOffsetY: 0 },
  { suffix: "grocery-offset", file: "grocery.png", imageScale: 1.0, imageOffsetY: 15 },
  { suffix: "harbor-compact", file: "harbor.png", imageScale: 1.15, imageOffsetY: -15 },
];

test("POST /icon writes 50 composed PNG files under 50px", async () => {
  await resetOutDir();
  const baseIcon = await readBaseIcon();
  const server = app.listen(0);

  try {
    const results = [];

    for (const shapeCase of shapeMatrix) {
      for (const iconCase of iconVariants) {
        const name = `${shapeCase.shape}-${iconCase.suffix}`;
        const fields = {
          shape: shapeCase.shape,
          iconSize: String(shapeCase.iconSize),
          imageScale: String(iconCase.imageScale),
          imageOffsetY: String(iconCase.imageOffsetY),
          borderWidth: String(shapeCase.borderWidth),
          enableShadow: String(shapeCase.enableShadow),
          shadowBlur: String(shapeCase.shadowBlur),
          shadowOffsetY: String(shapeCase.shadowOffsetY),
          exportSquare: String(shapeCase.exportSquare),
          exportStrategy: shapeCase.exportStrategy,
        };
        const multipart = buildMultipartForm(fields, {
          name: "image",
          filename: iconCase.file,
          contentType: "image/png",
          buffer: baseIcon,
        });

        const res = await request(server, "POST", "/icon", {
          headers: {
            "Content-Type": multipart.contentType,
            "Content-Length": multipart.body.length,
          },
          body: multipart.body,
        });

        assert.equal(res.statusCode, 200, `${name} returned non-200`);
        assert.equal(res.headers["content-type"], "image/png", `${name} content-type mismatch`);

        const width = Number(res.headers["x-icon-width"]);
        const height = Number(res.headers["x-icon-height"]);
        assert.ok(Number.isFinite(width), `${name} width header missing`);
        assert.ok(Number.isFinite(height), `${name} height header missing`);
        assert.ok(width <= 50, `${name} width ${width} exceeds 50`);
        assert.ok(height <= 50, `${name} height ${height} exceeds 50`);

        await fs.writeFile(path.join(OUT_DIR, `${name}.png`), res.body);
        results.push({
          name,
          width,
          height,
          shape: shapeCase.shape,
          icon: iconCase.file,
          imageScale: iconCase.imageScale,
          imageOffsetY: iconCase.imageOffsetY,
          exportSquare: shapeCase.exportSquare,
          exportStrategy: shapeCase.exportStrategy,
        });
      }
    }

    await fs.writeFile(
      path.join(OUT_DIR, "manifest.json"),
      JSON.stringify(results, null, 2),
      "utf8"
    );
    await fs.writeFile(
      path.join(OUT_DIR, "sizes.txt"),
      results.map((item) => `${item.name}: width=${item.width}, height=${item.height}`).join("\n") + "\n",
      "utf8"
    );

    assert.equal(results.length, 50, "expected exactly 50 composed outputs");

    for (const item of results) {
      console.log(`${item.name} -> width=${item.width}, height=${item.height}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /ui.html renders the pug template page", async () => {
  const server = app.listen(0);

  try {
    const res = await request(server, "GET", "/ui.html?shape=circle&iconSize=160&exportSquare=0");

    assert.equal(res.statusCode, 200);
    assert.match(res.headers["content-type"], /text\/html/);

    const html = res.body.toString("utf8");
    assert.match(html, /Pin Icon UI/);
    assert.match(html, /window\.__ICON_PAGE__/);
    assert.match(html, /\/icon/);
    assert.match(html, /\/info/);
    assert.match(html, /"shape":"circle"/);
    assert.match(html, /"iconSize":160/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
