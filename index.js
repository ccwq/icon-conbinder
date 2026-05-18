"use strict";

const core = require("./core");
const render = require("./core/render");
const nodeRuntime = require("./core/node-runtime");

const exported = {
  ...core,
  ...render,
  core,
  render,
  createNodeRuntime: nodeRuntime.createNodeRuntime,
  loadImageFromBuffer: nodeRuntime.loadImageFromBuffer,
  loadImageFromUrl: nodeRuntime.loadImageFromUrl,
  loadImageFromReference: nodeRuntime.loadImageFromReference,
  dataUrlToBuffer: nodeRuntime.dataUrlToBuffer,
  downsampleCanvas: nodeRuntime.downsampleCanvas,
  encodeCanvas: nodeRuntime.encodeCanvas,
  getEffectiveResizeStrategy: nodeRuntime.getEffectiveResizeStrategy,
};

module.exports = exported;
module.exports.default = exported;
