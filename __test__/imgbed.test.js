const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");

const { app } = require("../imgbed-server");

const INPUT_DIR = path.join(__dirname, "test-data");
const BASE_ICON = path.join(INPUT_DIR, "marker.png");

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
  const boundary = "----icon-combinder-imgbed-boundary";
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

test("POST /upload returns a short URL and GET /:id serves the uploaded file", async () => {
  const server = app.listen(0);
  const baseIcon = await fs.readFile(BASE_ICON);

  try {
    const multipart = buildMultipartForm(
      {},
      {
        name: "image",
        filename: "marker.png",
        contentType: "image/png",
        buffer: baseIcon,
      }
    );

    const uploadRes = await request(server, "POST", "/upload", {
      headers: {
        "Content-Type": multipart.contentType,
        "Content-Length": multipart.body.length,
      },
      body: multipart.body,
    });

    assert.equal(uploadRes.statusCode, 200);
    const uploadPayload = JSON.parse(uploadRes.body.toString("utf8"));
    assert.match(uploadPayload.url, /^http:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+$/);
    assert.ok(uploadPayload.url.length < 90, "expected a short image bed URL");

    const uploadedUrl = new URL(uploadPayload.url);
    const fileRes = await request(server, "GET", uploadedUrl.pathname);
    assert.equal(fileRes.statusCode, 200);
    assert.equal(fileRes.headers["content-type"], "image/png");
    assert.ok(fileRes.body.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

