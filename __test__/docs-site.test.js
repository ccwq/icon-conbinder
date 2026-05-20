const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const DOCS_PUBLIC_EXAMPLE = path.join(DOCS_DIR, "public", "examples", "index.html");
const DOCS_EXAMPLE_REDIRECT = path.join(DOCS_DIR, "examples.md");
const DOCS_EXAMPLE_INDEX_MD = path.join(DOCS_DIR, "examples", "index.md");
const DOCS_EXAMPLE_TARGET = "/icon-conbinder/examples/index.html";

test("examples route redirects to the workbench instead of rendering doc content", async () => {
  await assert.rejects(fs.access(DOCS_EXAMPLE_INDEX_MD), /ENOENT/);
  await assert.doesNotReject(fs.access(DOCS_EXAMPLE_REDIRECT));
  await assert.doesNotReject(fs.access(DOCS_PUBLIC_EXAMPLE));

  const html = await fs.readFile(DOCS_EXAMPLE_REDIRECT, "utf8");
  assert.match(html, /layout:\s*false/);
  assert.match(html, /Cache-Control/);
  assert.match(html, /Pragma/);
  assert.match(html, /Expires/);
  assert.match(html, /http-equiv="refresh"/);
  assert.match(html, /window\.location\.replace/);
  assert.match(html, new RegExp(DOCS_EXAMPLE_TARGET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
