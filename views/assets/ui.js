"use strict";

(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.IconCombinderUi = api;
  }

  if (root.document) {
    const run = () => api.bootstrap();
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (root) {
  const core = root.IconCombinderCore;
  const browser = root.IconCombinderBrowser;

  if (!core || !browser) {
    throw new Error("需要先加载 IconCombinderCore / IconCombinderBrowser");
  }

  function bootstrap() {
    const document = root.document;
    const configEl = document.getElementById("iconPageData");
    const config = configEl ? JSON.parse(configEl.textContent || "{}") : {};
    const initialState = config.state || {};
    const apiBaseUrl = config.apiBaseUrl || root.location.origin;
    const apiIconUrl = `${apiBaseUrl}${config.apiIconPath || "/icon"}`;
    const apiInfoUrl = `${apiBaseUrl}${config.apiInfoPath || "/info"}`;
    const apiImageBedUploadUrl = config.apiImageBedUploadUrl || "";
    const imageEnableBase64 = !!config.imageEnableBase64;
    const imageUrlPrefix = config.imageUrlPrefix || "";
    const imageUrlPrefixOnly = !!config.imageUrlPrefixOnly;

    const renderModeLabels = {
      server: "服务端渲染",
      browser: "浏览器端渲染",
    };
    const resizeStrategyLabels = {
      "smooth-high": "平滑高质量",
      pixelated: "像素风",
      "step-down": "逐级缩小",
      "sharp-lanczos3": "Sharp Lanczos3",
    };
    const lineJoinLabels = {
      round: "圆角",
      miter: "斜接",
      bevel: "斜角",
    };
    const exportStrategyLabels = {
      center: "居中",
      bottom: "贴底",
    };
    const shapeLabels = Object.fromEntries(
      (config.shapeOptions || []).map((item) => [item.value, item.label])
    );

    const state = {
      ...initialState,
      renderMode: "server",
      imageMode: "get",
      file: null,
      fileName: "",
      filePreviewUrl: "",
      marginX: Number(initialState.marginX) || 0,
      marginY: Number(initialState.marginY) || 0,
      marginXUnit: "px",
      marginYUnit: "px",
      marginSquareUnit: "px",
    };

    const STORAGE_KEY = "icon-combinder.ui-state.v1";
    const PERSIST_KEYS = [
      "shape",
      "iconSize",
      "imageScale",
      "imageOffsetY",
      "borderWidth",
      "lineJoin",
      "borderColor",
      "bgColor",
      "contourEnhance",
      "contourOuterGlow",
      "contourOuterWidth",
      "contourMainWidth",
      "contourInnerWidth",
      "contourCornerSoftness",
      "enableShadow",
      "shadowBlur",
      "shadowOffsetY",
      "exportSquare",
      "exportStrategy",
      "antiAliasScale",
      "resizeStrategy",
      "image",
      "renderMode",
      "imageMode",
      "marginX",
      "marginY",
      "marginXUnit",
      "marginYUnit",
      "marginSquareUnit",
    ];

    function getStorage() {
      try {
        return root.localStorage || null;
      } catch {
        return null;
      }
    }

    function readPersistedState() {
      const storage = getStorage();
      if (!storage) return null;
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const restored = {};
        for (const key of PERSIST_KEYS) {
          if (Object.prototype.hasOwnProperty.call(parsed, key)) {
            restored[key] = parsed[key];
          }
        }
        return restored;
      } catch {
        return null;
      }
    }

    function writePersistedState() {
      const storage = getStorage();
      if (!storage) return;
      try {
        const snapshot = {};
        for (const key of PERSIST_KEYS) {
          if (Object.prototype.hasOwnProperty.call(state, key)) {
            snapshot[key] = state[key];
          }
        }
        storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // 本地存储不可用时静默降级。
      }
    }

    const restoredState = readPersistedState();
    if (restoredState && (!root.location || !root.location.search)) {
      Object.assign(state, restoredState);
    }

    const el = (id) => document.getElementById(id);

    let previewObjectUrl = "";
    let previewTimer = 0;
    let previewToken = 0;
    let uploadToken = 0;

    function setText(id, text) {
      const node = el(id);
      if (node) node.textContent = text;
    }

    function setValue(id, value) {
      const node = el(id);
      if (node) node.value = value;
    }

    function formatMargin(value, unit) {
      return `${Number(value) || 0}${unit || "px"}`;
    }

    function serializableState() {
      return {
        shape: state.shape,
        iconSize: Number(state.iconSize),
        imageScale: Number(state.imageScale),
        imageOffsetY: Number(state.imageOffsetY),
        borderWidth: Number(state.borderWidth),
        lineJoin: state.lineJoin,
        borderColor: state.borderColor,
        bgColor: state.bgColor,
        contourEnhance: !!state.contourEnhance,
        contourOuterGlow: Number(state.contourOuterGlow),
        contourOuterWidth: Number(state.contourOuterWidth),
        contourMainWidth: Number(state.contourMainWidth),
        contourInnerWidth: Number(state.contourInnerWidth),
        contourCornerSoftness: Number(state.contourCornerSoftness),
        enableShadow: !!state.enableShadow,
        shadowBlur: Number(state.shadowBlur),
        shadowOffsetY: Number(state.shadowOffsetY),
        exportSquare: !!state.exportSquare,
        exportStrategy: state.exportStrategy,
        antiAliasScale: Number(state.antiAliasScale),
        resizeStrategy: state.resizeStrategy,
        image: String(state.image || ""),
        marginX: formatMargin(state.marginX, state.marginXUnit),
        marginY: formatMargin(state.marginY, state.marginYUnit),
      };
    }

    function browserStateObject() {
      const source = getBrowserSource();
      const sourcePayload =
        source && source.kind === "file"
          ? {
              kind: "file",
              expression: 'document.querySelector("#imageUpload").files[0]',
              fileName: source.file && source.file.name ? source.file.name : "image.png",
            }
          : source;

      return {
        method: "window.IconCombinderBrowser.renderIcon",
        params: serializableState(),
        source: sourcePayload,
      };
    }

    function serverStateObject() {
      const params = Object.fromEntries(queryParams().entries());
      const hasFile = !!state.file && state.imageMode === "post";
      return {
        method: hasFile ? "POST" : "GET",
        url: apiIconUrl,
        headers: hasFile ? undefined : { Accept: "image/png" },
        params,
        file: hasFile
          ? {
              field: "image",
              expression: 'document.querySelector("#imageUpload").files[0]',
              fileName: state.fileName || "image.png",
            }
          : undefined,
      };
    }

    function buildCallConfigObject() {
      return state.renderMode === "browser" ? browserStateObject() : serverStateObject();
    }

    function formatIndentedText(text, indent = 2) {
      const pad = " ".repeat(indent);
      return String(text)
        .split("\n")
        .map((line) => `${pad}${line}`)
        .join("\n");
    }

    function buildBrowserInvokeText(source = getBrowserSource()) {
      const paramsText = JSON.stringify(serializableState(), null, 2);
      const sourceText =
        source && source.kind === "file"
          ? '{ kind: "file", file: document.querySelector("#imageUpload").files[0] }'
          : JSON.stringify(source || null, null, 2);
      return [
        "await window.IconCombinderBrowser.renderIcon(",
        formatIndentedText(paramsText),
        ",",
        formatIndentedText(sourceText),
        ")",
      ].join("\n");
    }

    function buildServerInvokeText() {
      const hasFile = !!state.file && state.imageMode === "post";
      const params = Object.fromEntries(queryParams().entries());

      if (hasFile) {
        const formLines = Object.entries(params).map(
          ([key, value]) => `formData.append(${JSON.stringify(key)}, ${JSON.stringify(String(value))});`
        );
        formLines.push(
          `formData.append("image", document.querySelector("#imageUpload").files[0], ${JSON.stringify(
            state.fileName || "image.png"
          )});`
        );
        return [
          "const formData = new FormData();",
          ...formLines,
          `await fetch(${JSON.stringify(apiIconUrl)}, {`,
          '  method: "POST",',
          "  body: formData,",
          "});",
        ].join("\n");
      }

      return [
        `await fetch(${JSON.stringify(`${apiIconUrl}?${queryParams().toString()}`)}, {`,
        '  headers: { Accept: "image/png" },',
        "});",
      ].join("\n");
    }

    function buildCallText() {
      return state.renderMode === "browser" ? buildBrowserInvokeText() : buildServerInvokeText();
    }

    function buildConfigText() {
      return JSON.stringify(buildCallConfigObject(), null, 2);
    }

    async function copyTextToClipboard(text) {
      const value = String(text ?? "");

      try {
        if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
          await root.navigator.clipboard.writeText(value);
          return;
        }
      } catch {
        // 回退到传统复制方式。
      }

      const textarea = root.document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";
      root.document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      let copied = false;
      try {
        copied = !!root.document.execCommand("copy");
      } finally {
        root.document.body.removeChild(textarea);
      }

      if (!copied) {
        throw new Error("复制失败，请手动选择文本");
      }
    }

    function runtimeState() {
      return {
        ...state,
        marginX: Number(state.marginX) || 0,
        marginY: Number(state.marginY) || 0,
      };
    }

    function queryParams() {
      const params = new URLSearchParams();
      const snapshot = serializableState();
      for (const [key, value] of Object.entries(snapshot)) {
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
      }
      return params;
    }

    function getBrowserSource() {
      if (state.file) {
        return { kind: "file", file: state.file };
      }

      const raw = String(state.image || "").trim();
      if (!raw) return null;
      return core.resolveImageReference(raw, {
        imageEnableBase64,
        imageUrlPrefix,
        imageUrlPrefixOnly,
      });
    }

    function updateModeLabels() {
      setText("renderModeValue", renderModeLabels[state.renderMode] || state.renderMode);
      setText("modeState", renderModeLabels[state.renderMode] || state.renderMode);
      setText("requestMode", renderModeLabels[state.renderMode] || state.renderMode);
      setText(
        "requestModeInput",
        state.renderMode === "browser" ? "BROWSER / base64" : `${state.imageMode.toUpperCase()} /icon`
      );
      setValue("renderModeSelect", state.renderMode);
    }

    function updateShapeButtons() {
      document.querySelectorAll("#shapeSelect .shape-card").forEach((card) => {
        const active = card.dataset.shape === state.shape;
        card.classList.toggle("active", active);
        card.setAttribute("aria-pressed", active ? "true" : "false");
      });
      setText("shapeValue", shapeLabels[state.shape] || state.shape);
    }

    function updateToggles() {
      const pairs = [
        ["contourEnhanceSwitch", state.contourEnhance],
        ["enableShadowSwitch", state.enableShadow],
        ["exportSquareSwitch", state.exportSquare],
      ];
      pairs.forEach(([id, value]) => {
        const node = el(id);
        if (node) node.classList.toggle("on", !!value);
      });
    }

    function updateFieldLabels() {
      const valueMap = {
        iconSizeValue: state.iconSize,
        imageScaleValue: Number(state.imageScale).toFixed(2),
        imageOffsetYValue: state.imageOffsetY,
        borderWidthValue: state.borderWidth,
        lineJoinValue: lineJoinLabels[state.lineJoin] || state.lineJoin,
        contourEnhanceValue: state.contourEnhance ? "1" : "0",
        contourOuterGlowValue: state.contourOuterGlow,
        contourOuterWidthValue: state.contourOuterWidth,
        contourMainWidthValue: state.contourMainWidth,
        contourInnerWidthValue: state.contourInnerWidth,
        contourCornerSoftnessValue: state.contourCornerSoftness,
        enableShadowValue: state.enableShadow ? "1" : "0",
        shadowBlurValue: state.shadowBlur,
        shadowOffsetYValue: state.shadowOffsetY,
        exportSquareValue: state.exportSquare ? "1" : "0",
        exportStrategyValue: exportStrategyLabels[state.exportStrategy] || state.exportStrategy,
        antiAliasScaleValue: state.antiAliasScale,
        resizeStrategyValue: resizeStrategyLabels[state.resizeStrategy] || state.resizeStrategy,
        renderModeValue: renderModeLabels[state.renderMode] || state.renderMode,
        modeState: renderModeLabels[state.renderMode] || state.renderMode,
      };

      for (const [id, value] of Object.entries(valueMap)) {
        setText(id, String(value));
      }

      setValue("iconSizeRange", state.iconSize);
      setValue("iconSizeInput", state.iconSize);
      setValue("imageScaleRange", state.imageScale);
      setValue("imageScaleInput", state.imageScale);
      setValue("imageOffsetYRange", state.imageOffsetY);
      setValue("imageOffsetYInput", state.imageOffsetY);
      setValue("borderWidthRange", state.borderWidth);
      setValue("borderWidthInput", state.borderWidth);
      setValue("lineJoinSelect", state.lineJoin);
      setValue("borderColor", state.borderColor);
      setValue("borderColorHex", state.borderColor);
      setValue("bgColor", state.bgColor);
      setValue("bgColorHex", state.bgColor);
      setValue("shadowBlurRange", state.shadowBlur);
      setValue("shadowBlurInput", state.shadowBlur);
      setValue("shadowOffsetYRange", state.shadowOffsetY);
      setValue("shadowOffsetYInput", state.shadowOffsetY);
      setValue("exportStrategySelect", state.exportStrategy);
      setValue("antiAliasScaleSelect", state.antiAliasScale);
      setValue("resizeStrategySelect", state.resizeStrategy);
      setValue("imageModeSelect", state.imageMode);
      setValue("marginSquareInput", state.marginX);
      setValue("marginSquareUnitSelect", state.marginSquareUnit);
      setValue("marginXInput", state.marginX);
      setValue("marginXUnitSelect", state.marginXUnit);
      setValue("marginYInput", state.marginY);
      setValue("marginYUnitSelect", state.marginYUnit);

      if (el("marginSquareValue")) {
        el("marginSquareValue").textContent = formatMargin(state.marginX, state.marginSquareUnit);
      }
      if (el("marginXValue")) {
        el("marginXValue").textContent = formatMargin(state.marginX, state.marginXUnit);
      }
      if (el("marginYValue")) {
        el("marginYValue").textContent = formatMargin(state.marginY, state.marginYUnit);
      }
    }

    function updateMarginVisibility() {
      const square = !!state.exportSquare;
      if (el("marginSquareRow")) el("marginSquareRow").style.display = square ? "" : "none";
      if (el("marginXRow")) el("marginXRow").style.display = square ? "none" : "";
      if (el("marginYRow")) el("marginYRow").style.display = square ? "none" : "";
    }

    function updateSourceUi() {
      const serverGetNeedsBed = state.renderMode === "server" && state.imageMode === "get";
      const uploadEnabled = !serverGetNeedsBed || !!apiImageBedUploadUrl;

      const sourceCard = el("imageSourceCard");
      if (sourceCard) {
        sourceCard.classList.toggle("disabled", serverGetNeedsBed && !apiImageBedUploadUrl);
        sourceCard.title = uploadEnabled
          ? "拖放整个卡片即可选择文件"
          : "GET 模式下需要配置图床地址";
      }

      if (el("imageUpload")) {
        el("imageUpload").disabled = serverGetNeedsBed && !apiImageBedUploadUrl;
      }
      if (el("imageUploadButton")) {
        el("imageUploadButton").classList.toggle("disabled", serverGetNeedsBed && !apiImageBedUploadUrl);
        el("imageUploadButton").setAttribute(
          "aria-disabled",
          serverGetNeedsBed && !apiImageBedUploadUrl ? "true" : "false"
        );
      }

      if (el("uploadHint")) {
        if (state.renderMode === "browser") {
          el("uploadHint").textContent = "浏览器端直接使用本地文件或图像 URL 渲染，结果会导出为 base64。";
        } else if (state.imageMode === "post") {
          el("uploadHint").textContent = "POST 模式会把文件直接发给 /icon。";
        } else if (apiImageBedUploadUrl) {
          el("uploadHint").textContent = "GET 模式下选文件会先上传到独立图床，再写入 image 参数。";
        } else {
          el("uploadHint").textContent = "当前未配置图床，GET 模式下只能输入 URL、相对路径或 data URL。";
        }
      }
    }

    function updateFilePreview(url) {
      if (el("sourcePreview")) {
        el("sourcePreview").src = url || "";
        el("sourcePreview").classList.toggle("visible", !!url);
      }
      setText("fileName", state.fileName || "未选择文件");
      setText("imageState", state.file ? "FILE" : state.image ? "TEXT" : "EMPTY");
    }

    function clearPreviewObjectUrl() {
      if (previewObjectUrl) {
        root.URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = "";
      }
    }

    function updateRequestText(result) {
      if (!el("requestText")) return;
      el("requestText").value = buildCallText();
    }

    function updatePreviewInfoFromLayout(layout, effectiveResizeStrategy) {
      const contour = state.contourEnhance ? "增强" : "普通";
      const info = `形状=${shapeLabels[state.shape] || state.shape}，轮廓=${contour}，超采样=${state.antiAliasScale}x，缩小=${resizeStrategyLabels[effectiveResizeStrategy || state.resizeStrategy] || effectiveResizeStrategy || state.resizeStrategy}，尺寸=${layout.width} × ${layout.height}`;
      setText("previewSize", `${layout.width} × ${layout.height}`);
      setText("previewInfo", info);
      const previewInfo = el("previewInfo");
      if (previewInfo) previewInfo.title = info;
    }

    function updatePreviewStatus(status, tip) {
      setText("previewStatus", status);
      setText("previewTip", tip);
    }

    async function uploadFileToBed(file) {
      if (!apiImageBedUploadUrl) {
        throw new Error("未配置图床地址，无法在 GET 模式下上传文件");
      }
      const formData = new root.FormData();
      formData.append("image", file);
      const res = await root.fetch(apiImageBedUploadUrl, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`图床上传失败：HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.url) {
        throw new Error("图床上传失败：响应中缺少 url");
      }
      return data.url;
    }

    async function ensureServerImageFromFile() {
      if (!state.file || state.imageMode !== "get" || !apiImageBedUploadUrl) {
        return;
      }
      const token = ++uploadToken;
      updatePreviewStatus("上传中", "文件正在写入独立图床");
      const url = await uploadFileToBed(state.file);
      if (token !== uploadToken) return;
      state.image = url;
      setValue("image", url);
      updateRequestText();
    }

    async function refreshInfo() {
      if (state.renderMode === "browser") {
        const layout = core.getLayout(state);
        updatePreviewInfoFromLayout(layout, browser.getEffectiveResizeStrategy(state));
        return;
      }

      const params = queryParams();
      const res = await root.fetch(`${apiInfoUrl}?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`info 请求失败：HTTP ${res.status}`);
      }
      const info = await res.json();
      setText("previewSize", `${info.width} × ${info.height}`);
      const infoText = `形状=${shapeLabels[info.state.shape] || info.state.shape}，轮廓=${info.state.contourEnhance ? "增强" : "普通"}，超采样=${info.state.antiAliasScale}x，缩小=${resizeStrategyLabels[info.state.resizeStrategy] || info.state.resizeStrategy}，渲染=${info.renderWidth} × ${info.renderHeight}`;
      setText("previewInfo", infoText);
      const previewInfo = el("previewInfo");
      if (previewInfo) previewInfo.title = infoText;
    }

    function setPreviewImages(src) {
      ["previewImageDark", "previewImageLight", "previewImageChecker"].forEach((id) => {
        const node = el(id);
        if (node) node.src = src;
      });
    }

    function clearPreviewImages() {
      ["previewImageDark", "previewImageLight", "previewImageChecker"].forEach((id) => {
        const node = el(id);
        if (node) node.removeAttribute("src");
      });
    }

    async function refreshServerPreview() {
      if (state.file && state.imageMode === "get" && apiImageBedUploadUrl && !state.image) {
        await ensureServerImageFromFile();
      }

      const params = queryParams();
      if (state.imageMode === "post" && state.file) {
        const formData = new root.FormData();
        for (const [key, value] of params.entries()) {
          if (key === "image") continue;
          formData.append(key, value);
        }
        formData.append("image", state.file, state.fileName || "image.png");

        const res = await root.fetch(apiIconUrl, { method: "POST", body: formData });
        if (!res.ok) {
          throw new Error(`预览失败：HTTP ${res.status}`);
        }
        const blob = await res.blob();
        clearPreviewObjectUrl();
        previewObjectUrl = root.URL.createObjectURL(blob);
        setPreviewImages(previewObjectUrl);
        updatePreviewStatus("已更新", `POST /icon · ${state.fileName || "本地文件"}`);
      } else {
        const res = await root.fetch(`${apiIconUrl}?${params.toString()}`, {
          headers: { Accept: "image/png" },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `预览失败：HTTP ${res.status}`);
        }
        const blob = await res.blob();
        clearPreviewObjectUrl();
        previewObjectUrl = root.URL.createObjectURL(blob);
        setPreviewImages(previewObjectUrl);
        updatePreviewStatus("已更新", `GET /icon · ${state.imageMode.toUpperCase()}`);
      }
      updateRequestText();
      await refreshInfo();
    }

    async function refreshBrowserPreview() {
      const source = getBrowserSource();
      const result = await browser.renderIcon(runtimeState(), source);
      setPreviewImages(result.dataUrl);
      updateRequestText(result);
      updatePreviewStatus("已更新", `浏览器输出 ${browser.describeSource(source)} · ${result.effectiveResizeStrategy}`);
      await refreshInfo();
    }

    async function refreshPreview() {
      const token = ++previewToken;
      updatePreviewStatus("加载中", state.renderMode === "browser" ? "浏览器本地渲染" : `${state.imageMode.toUpperCase()} /icon`);
      clearPreviewObjectUrl();

      try {
        if (state.renderMode === "browser") {
          await refreshBrowserPreview();
        } else {
          await refreshServerPreview();
        }
      } catch (error) {
        if (token !== previewToken) return;
        clearPreviewImages();
        updatePreviewStatus("预览失败", error.message);
        updateRequestText();
        return;
      }

      if (token !== previewToken) return;
    }

    function scheduleRefresh() {
      writePersistedState();
      root.clearTimeout(previewTimer);
      previewTimer = root.setTimeout(() => {
        refreshPreview();
      }, 100);
    }

    function setState(patch) {
      Object.assign(state, patch);
      updateModeLabels();
      updateShapeButtons();
      updateFieldLabels();
      updateToggles();
      updateMarginVisibility();
      updateSourceUi();
      scheduleRefresh();
    }

    function bindRangePair(rangeId, inputId, key, parse = Number) {
      const range = el(rangeId);
      const input = el(inputId);
      if (!range || !input) return;
      const apply = (value) => {
        state[key] = parse(value);
        updateFieldLabels();
        scheduleRefresh();
      };
      range.addEventListener("input", (event) => {
        input.value = event.target.value;
        apply(event.target.value);
      });
      input.addEventListener("input", (event) => {
        range.value = event.target.value;
        apply(event.target.value);
      });
    }

    function bindColorPair(colorId, hexId, key) {
      const color = el(colorId);
      const hex = el(hexId);
      if (!color || !hex) return;
      const apply = (value) => {
        state[key] = value;
        updateFieldLabels();
        scheduleRefresh();
      };
      color.addEventListener("input", (event) => {
        hex.value = event.target.value;
        apply(event.target.value);
      });
      hex.addEventListener("input", (event) => {
        color.value = event.target.value;
        apply(event.target.value);
      });
    }

    function bindSelect(id, key, transform = (v) => v) {
      const node = el(id);
      if (!node) return;
      node.addEventListener("change", (event) => {
        setState({ [key]: transform(event.target.value) });
      });
    }

    function bindToggle(id, key) {
      const node = el(id);
      if (!node) return;
      node.addEventListener("click", () => {
        setState({ [key]: !state[key] });
      });
    }

    function updateFileState(file) {
      state.file = file || null;
      state.fileName = file ? file.name || "image" : "";
      if (state.filePreviewUrl) {
        root.URL.revokeObjectURL(state.filePreviewUrl);
        state.filePreviewUrl = "";
      }
      if (file) {
        state.filePreviewUrl = root.URL.createObjectURL(file);
      }
      updateFilePreview(state.filePreviewUrl);
      updateSourceUi();
    }

    async function handleFile(file) {
      updateFileState(file);
      if (state.renderMode === "server" && state.imageMode === "get" && apiImageBedUploadUrl) {
        await ensureServerImageFromFile();
      }
      scheduleRefresh();
    }

    function wireMarginInputs() {
      const applySquare = () => {
        state.marginX = Number(el("marginSquareInput")?.value || 0);
        state.marginY = state.marginX;
        state.marginSquareUnit = el("marginSquareUnitSelect")?.value || "px";
        state.marginXUnit = state.marginSquareUnit;
        state.marginYUnit = state.marginSquareUnit;
        updateFieldLabels();
        scheduleRefresh();
      };

      const applyX = () => {
        state.marginX = Number(el("marginXInput")?.value || 0);
        state.marginXUnit = el("marginXUnitSelect")?.value || "px";
        updateFieldLabels();
        scheduleRefresh();
      };

      const applyY = () => {
        state.marginY = Number(el("marginYInput")?.value || 0);
        state.marginYUnit = el("marginYUnitSelect")?.value || "px";
        updateFieldLabels();
        scheduleRefresh();
      };

      if (el("marginSquareInput")) el("marginSquareInput").addEventListener("input", applySquare);
      if (el("marginSquareUnitSelect")) el("marginSquareUnitSelect").addEventListener("change", applySquare);
      if (el("marginXInput")) el("marginXInput").addEventListener("input", applyX);
      if (el("marginXUnitSelect")) el("marginXUnitSelect").addEventListener("change", applyX);
      if (el("marginYInput")) el("marginYInput").addEventListener("input", applyY);
      if (el("marginYUnitSelect")) el("marginYUnitSelect").addEventListener("change", applyY);
    }

    function attachEvents() {
      document.querySelectorAll("#shapeSelect .shape-card").forEach((card) => {
        card.addEventListener("click", () => {
          setState({ shape: card.dataset.shape });
        });
      });

      document.querySelectorAll(".preset-chip[data-size]").forEach((chip) => {
        chip.addEventListener("click", () => {
          setState({ iconSize: Number(chip.dataset.size) || state.iconSize });
        });
      });

      bindRangePair("iconSizeRange", "iconSizeInput", "iconSize");
      bindRangePair("imageScaleRange", "imageScaleInput", "imageScale");
      bindRangePair("imageOffsetYRange", "imageOffsetYInput", "imageOffsetY");
      bindRangePair("borderWidthRange", "borderWidthInput", "borderWidth");
      bindRangePair("contourOuterGlowRange", "contourOuterGlowInput", "contourOuterGlow");
      bindRangePair("contourOuterWidthRange", "contourOuterWidthInput", "contourOuterWidth");
      bindRangePair("contourMainWidthRange", "contourMainWidthInput", "contourMainWidth");
      bindRangePair("contourInnerWidthRange", "contourInnerWidthInput", "contourInnerWidth");
      bindRangePair(
        "contourCornerSoftnessRange",
        "contourCornerSoftnessInput",
        "contourCornerSoftness"
      );
      bindRangePair("shadowBlurRange", "shadowBlurInput", "shadowBlur");
      bindRangePair("shadowOffsetYRange", "shadowOffsetYInput", "shadowOffsetY");

      bindToggle("contourEnhanceSwitch", "contourEnhance");
      bindToggle("enableShadowSwitch", "enableShadow");
      bindToggle("exportSquareSwitch", "exportSquare");

      bindColorPair("borderColor", "borderColorHex", "borderColor");
      bindColorPair("bgColor", "bgColorHex", "bgColor");

      bindSelect("lineJoinSelect", "lineJoin");
      bindSelect("exportStrategySelect", "exportStrategy");
      bindSelect("resizeStrategySelect", "resizeStrategy");
      bindSelect("antiAliasScaleSelect", "antiAliasScale", (value) => Number(value));

      if (el("renderModeSelect")) {
        el("renderModeSelect").addEventListener("change", (event) => {
          setState({ renderMode: event.target.value === "browser" ? "browser" : "server" });
        });
      }

      if (el("imageModeSelect")) {
        el("imageModeSelect").addEventListener("change", (event) => {
          setState({ imageMode: event.target.value === "post" ? "post" : "get" });
        });
      }

      if (el("image")) {
        el("image").addEventListener("input", (event) => {
          state.image = event.target.value.trim();
          updateRequestText();
          scheduleRefresh();
        });
      }

      if (el("imageUpload")) {
        el("imageUpload").addEventListener("change", async (event) => {
          const file = event.target.files && event.target.files[0];
          if (file) {
            await handleFile(file);
          }
        });
      }

      if (el("sourceCard")) {
        ["dragenter", "dragover"].forEach((type) => {
          el("sourceCard").addEventListener(type, (event) => {
            event.preventDefault();
            el("sourceCard").classList.add("drag");
          });
        });
        ["dragleave", "drop"].forEach((type) => {
          el("sourceCard").addEventListener(type, (event) => {
            event.preventDefault();
            el("sourceCard").classList.remove("drag");
          });
        });
        el("sourceCard").addEventListener("drop", async (event) => {
          const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
          if (file) {
            await handleFile(file);
          }
        });
      }

      if (el("clearFileBtn")) {
        el("clearFileBtn").addEventListener("click", () => {
          updateFileState(null);
          if (el("imageUpload")) el("imageUpload").value = "";
          scheduleRefresh();
        });
      }

      if (el("refreshBtn")) {
        el("refreshBtn").addEventListener("click", refreshPreview);
      }

      if (el("copyRequestBtn2")) {
        el("copyRequestBtn2").addEventListener("click", async () => {
          await root.navigator.clipboard.writeText(el("requestText").value);
          updatePreviewStatus("已复制", state.renderMode === "browser" ? "base64 已复制到剪贴板" : "请求文本已复制到剪贴板");
        });
      }

      if (el("copyQueryBtn2")) {
        el("copyQueryBtn2").addEventListener("click", async () => {
          const text = state.renderMode === "browser" ? el("requestText").value : queryParams().toString();
          await root.navigator.clipboard.writeText(text);
          updatePreviewStatus("已复制", "内容已复制到剪贴板");
        });
      }

      wireMarginInputs();
    }

    function updateRequestModeHint() {
      if (!el("requestHint")) return;
      if (state.renderMode === "browser") {
        el("requestHint").textContent = "浏览器端模式会显示 JS 对象快照，包含全部参数和值。";
      } else if (state.imageMode === "post") {
        el("requestHint").textContent = "POST 模式会把文件直接发给 /icon。";
      } else {
        el("requestHint").textContent = apiImageBedUploadUrl
          ? "GET 模式下选文件会先上传到独立图床，再写入 image 参数。"
          : "当前未配置图床，GET 模式下只能输入 URL、相对路径或 data URL。";
      }
    }

    function updateUi() {
      updateModeLabels();
      updateShapeButtons();
      updateFieldLabels();
      updateToggles();
      updateMarginVisibility();
      updateSourceUi();
      updateRequestModeHint();
      setText("requestOutputTitle", state.renderMode === "browser" ? "JS 对象" : "请求文本");
      setText("previewMode", state.renderMode === "browser" ? "BROWSER" : "SERVER");
      setText("requestMode", renderModeLabels[state.renderMode] || state.renderMode);
      setText(
        "requestModeInput",
        state.renderMode === "browser" ? "BROWSER / base64" : `${state.imageMode.toUpperCase()} /icon`
      );
      setText("fileName", state.fileName || "未选择文件");
      setText("imageState", state.file ? "FILE" : state.image ? "TEXT" : "EMPTY");
      updateRequestText();
    }

    async function refreshPreview() {
      const token = ++previewToken;
      updatePreviewStatus("加载中", state.renderMode === "browser" ? "浏览器本地渲染" : `${state.imageMode.toUpperCase()} /icon`);
      clearPreviewObjectUrl();

      try {
        if (state.renderMode === "browser") {
          const source = getBrowserSource();
          const result = await browser.renderIcon(runtimeState(), source);
          if (token !== previewToken) return;
          setPreviewImages(result.dataUrl);
          updateRequestText(result);
          updatePreviewStatus(
            "已更新",
            `浏览器输出 ${browser.describeSource(source)} · ${result.effectiveResizeStrategy}`
          );
          await refreshInfo();
          return;
        }

        if (state.file && state.imageMode === "get" && apiImageBedUploadUrl && !state.image) {
          await ensureServerImageFromFile();
        }

        const params = queryParams();
        if (state.imageMode === "post" && state.file) {
          const formData = new root.FormData();
          for (const [key, value] of params.entries()) {
            if (key === "image") continue;
            formData.append(key, value);
          }
          formData.append("image", state.file, state.fileName || "image.png");
          const res = await root.fetch(apiIconUrl, { method: "POST", body: formData });
          if (!res.ok) {
            throw new Error(`预览失败：HTTP ${res.status}`);
          }
          const blob = await res.blob();
          if (token !== previewToken) return;
          previewObjectUrl = root.URL.createObjectURL(blob);
          setPreviewImages(previewObjectUrl);
          updatePreviewStatus("已更新", `POST /icon · ${state.fileName || "本地文件"}`);
        } else {
          const res = await root.fetch(`${apiIconUrl}?${params.toString()}`, {
            headers: { Accept: "image/png" },
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `预览失败：HTTP ${res.status}`);
          }
          const blob = await res.blob();
          if (token !== previewToken) return;
          previewObjectUrl = root.URL.createObjectURL(blob);
          setPreviewImages(previewObjectUrl);
          updatePreviewStatus("已更新", `GET /icon · ${state.imageMode.toUpperCase()}`);
        }
        updateRequestText();
        await refreshInfo();
      } catch (error) {
        if (token !== previewToken) return;
        clearPreviewImages();
        updatePreviewStatus("预览失败", error.message);
        updateRequestText();
      }
    }

    function scheduleRefresh() {
      writePersistedState();
      root.clearTimeout(previewTimer);
      previewTimer = root.setTimeout(() => {
        refreshPreview();
      }, 100);
    }

    async function uploadFileToBed(file) {
      if (!apiImageBedUploadUrl) {
        throw new Error("未配置图床地址，无法在 GET 模式下上传文件");
      }
      const formData = new root.FormData();
      formData.append("image", file);
      const res = await root.fetch(apiImageBedUploadUrl, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`图床上传失败：HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.url) {
        throw new Error("图床上传失败：响应中缺少 url");
      }
      return data.url;
    }

    async function ensureServerImageFromFile() {
      if (!state.file || state.imageMode !== "get" || !apiImageBedUploadUrl) return;
      const token = ++uploadToken;
      updatePreviewStatus("上传中", "文件正在写入独立图床");
      const url = await uploadFileToBed(state.file);
      if (token !== uploadToken) return;
      state.image = url;
      setValue("image", url);
      updateRequestText();
    }

    function clearPreviewImages() {
      ["previewImageDark", "previewImageLight", "previewImageChecker"].forEach((id) => {
        const node = el(id);
        if (node) node.removeAttribute("src");
      });
    }

    function setPreviewImages(src) {
      ["previewImageDark", "previewImageLight", "previewImageChecker"].forEach((id) => {
        const node = el(id);
        if (node) node.src = src;
      });
    }

    function updatePreviewStatus(status, tip) {
      setText("previewStatus", status);
      setText("previewTip", tip);
    }

    function setState(patch) {
      Object.assign(state, patch);
      updateUi();
      scheduleRefresh();
    }

    function updateFieldOnChange(id, key, transform = (v) => v) {
      const node = el(id);
      if (!node) return;
      node.addEventListener("change", (event) => {
        setState({ [key]: transform(event.target.value) });
      });
    }

    function updateFieldOnInput(id, key, transform = (v) => v) {
      const node = el(id);
      if (!node) return;
      node.addEventListener("input", (event) => {
        setState({ [key]: transform(event.target.value) });
      });
    }

    function attachEvents() {
      document.querySelectorAll("#shapeSelect .shape-card").forEach((card) => {
        card.addEventListener("click", () => {
          setState({ shape: card.dataset.shape });
        });
      });

      document.querySelectorAll(".preset-chip[data-size]").forEach((chip) => {
        chip.addEventListener("click", () => {
          setState({ iconSize: Number(chip.dataset.size) || state.iconSize });
        });
      });

      updateFieldOnInput("iconSizeRange", "iconSize", Number);
      updateFieldOnInput("iconSizeInput", "iconSize", Number);
      updateFieldOnInput("imageScaleRange", "imageScale", Number);
      updateFieldOnInput("imageScaleInput", "imageScale", Number);
      updateFieldOnInput("imageOffsetYRange", "imageOffsetY", Number);
      updateFieldOnInput("imageOffsetYInput", "imageOffsetY", Number);
      updateFieldOnInput("borderWidthRange", "borderWidth", Number);
      updateFieldOnInput("borderWidthInput", "borderWidth", Number);
      updateFieldOnInput("contourOuterGlowRange", "contourOuterGlow", Number);
      updateFieldOnInput("contourOuterGlowInput", "contourOuterGlow", Number);
      updateFieldOnInput("contourOuterWidthRange", "contourOuterWidth", Number);
      updateFieldOnInput("contourOuterWidthInput", "contourOuterWidth", Number);
      updateFieldOnInput("contourMainWidthRange", "contourMainWidth", Number);
      updateFieldOnInput("contourMainWidthInput", "contourMainWidth", Number);
      updateFieldOnInput("contourInnerWidthRange", "contourInnerWidth", Number);
      updateFieldOnInput("contourInnerWidthInput", "contourInnerWidth", Number);
      updateFieldOnInput("contourCornerSoftnessRange", "contourCornerSoftness", Number);
      updateFieldOnInput("contourCornerSoftnessInput", "contourCornerSoftness", Number);
      updateFieldOnInput("shadowBlurRange", "shadowBlur", Number);
      updateFieldOnInput("shadowBlurInput", "shadowBlur", Number);
      updateFieldOnInput("shadowOffsetYRange", "shadowOffsetY", Number);
      updateFieldOnInput("shadowOffsetYInput", "shadowOffsetY", Number);

      bindToggle("contourEnhanceSwitch", "contourEnhance");
      bindToggle("enableShadowSwitch", "enableShadow");
      bindToggle("exportSquareSwitch", "exportSquare");

      bindColorPair("borderColor", "borderColorHex", "borderColor");
      bindColorPair("bgColor", "bgColorHex", "bgColor");

      bindSelect("lineJoinSelect", "lineJoin");
      bindSelect("exportStrategySelect", "exportStrategy");
      bindSelect("resizeStrategySelect", "resizeStrategy");
      bindSelect("antiAliasScaleSelect", "antiAliasScale", Number);
      bindSelect("imageModeSelect", "imageMode");
      bindSelect("renderModeSelect", "renderMode");

      if (el("image")) {
        el("image").addEventListener("input", (event) => {
          state.image = event.target.value.trim();
          updateRequestText();
          scheduleRefresh();
        });
      }

      if (el("imageUpload")) {
        el("imageUpload").addEventListener("change", async (event) => {
          const file = event.target.files && event.target.files[0];
          if (file) {
            await handleFile(file);
          }
        });
      }

      if (el("sourceCard")) {
        ["dragenter", "dragover"].forEach((type) => {
          el("sourceCard").addEventListener(type, (event) => {
            event.preventDefault();
            el("sourceCard").classList.add("drag");
          });
        });
        ["dragleave", "drop"].forEach((type) => {
          el("sourceCard").addEventListener(type, (event) => {
            event.preventDefault();
            el("sourceCard").classList.remove("drag");
          });
        });
        el("sourceCard").addEventListener("drop", async (event) => {
          const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
          if (file) {
            await handleFile(file);
          }
        });
      }

      if (el("clearFileBtn")) {
        el("clearFileBtn").addEventListener("click", () => {
          updateFileState(null);
          if (el("imageUpload")) el("imageUpload").value = "";
          scheduleRefresh();
        });
      }

      if (el("refreshBtn")) {
        el("refreshBtn").addEventListener("click", refreshPreview);
      }

      const bindCopy = (selector, getText, tip) => {
        document.querySelectorAll(selector).forEach((node) => {
          node.addEventListener("click", async () => {
            try {
              await copyTextToClipboard(getText());
              updatePreviewStatus("已复制", tip);
            } catch (error) {
              updatePreviewStatus("复制失败", error.message);
            }
          });
        });
      };

      bindCopy("#copyCallBtnTop, #copyCallBtn", buildCallText, "调用代码已复制到剪贴板");
      bindCopy("#copyConfigBtnTop, #copyConfigBtn", buildConfigText, "配置 JSON 已复制到剪贴板");

      bindMarginInputs();
    }

    function bindColorPair(colorId, hexId, key) {
      const color = el(colorId);
      const hex = el(hexId);
      if (!color || !hex) return;
      color.addEventListener("input", (event) => {
        hex.value = event.target.value;
        setState({ [key]: event.target.value });
      });
      hex.addEventListener("input", (event) => {
        color.value = event.target.value;
        setState({ [key]: event.target.value });
      });
    }

    function bindSelect(id, key, transform = (v) => v) {
      const node = el(id);
      if (!node) return;
      node.addEventListener("change", (event) => {
        setState({ [key]: transform(event.target.value) });
      });
    }

    function bindToggle(id, key) {
      const node = el(id);
      if (!node) return;
      node.addEventListener("click", () => {
        setState({ [key]: !state[key] });
      });
    }

    function bindMarginInputs() {
      const syncSquare = () => {
        state.marginX = Number(el("marginSquareInput")?.value || 0);
        state.marginY = state.marginX;
        state.marginSquareUnit = el("marginSquareUnitSelect")?.value || "px";
        state.marginXUnit = state.marginSquareUnit;
        state.marginYUnit = state.marginSquareUnit;
        updateUi();
        scheduleRefresh();
      };

      const syncX = () => {
        state.marginX = Number(el("marginXInput")?.value || 0);
        state.marginXUnit = el("marginXUnitSelect")?.value || "px";
        updateUi();
        scheduleRefresh();
      };

      const syncY = () => {
        state.marginY = Number(el("marginYInput")?.value || 0);
        state.marginYUnit = el("marginYUnitSelect")?.value || "px";
        updateUi();
        scheduleRefresh();
      };

      if (el("marginSquareInput")) el("marginSquareInput").addEventListener("input", syncSquare);
      if (el("marginSquareUnitSelect")) el("marginSquareUnitSelect").addEventListener("change", syncSquare);
      if (el("marginXInput")) el("marginXInput").addEventListener("input", syncX);
      if (el("marginXUnitSelect")) el("marginXUnitSelect").addEventListener("change", syncX);
      if (el("marginYInput")) el("marginYInput").addEventListener("input", syncY);
      if (el("marginYUnitSelect")) el("marginYUnitSelect").addEventListener("change", syncY);
    }

    function updateModeHint() {
      if (!el("requestHint")) return;
      if (state.renderMode === "browser") {
        el("requestHint").textContent = "浏览器端会输出可直接运行的调用代码，并可单独复制配置 JSON。";
      } else if (state.imageMode === "post") {
        el("requestHint").textContent = "POST 模式会生成可直接粘贴的 FormData + fetch 调用代码。";
      } else {
        el("requestHint").textContent = apiImageBedUploadUrl
          ? "GET 模式下选文件会先上传到独立图床，再写入 image 参数。"
          : "当前未配置图床，GET 模式下只能输入 URL、相对路径或 data URL。";
      }
    }

    function updateUi() {
      updateModeLabels();
      updateShapeButtons();
      updateFieldLabels();
      updateToggles();
      updateMarginVisibility();
      updateSourceUi();
      updateModeHint();
      setText("requestOutputTitle", "调用代码");
      setText("previewMode", state.renderMode === "browser" ? "BROWSER" : "SERVER");
      setText("fileName", state.fileName || "未选择文件");
      setText("imageState", state.file ? "FILE" : state.image ? "TEXT" : "EMPTY");
      updateRequestText();
    }

    function setState(patch) {
      Object.assign(state, patch);
      updateUi();
      scheduleRefresh();
    }

    async function handleFile(file) {
      if (!file) return;
      if (state.filePreviewUrl) {
        root.URL.revokeObjectURL(state.filePreviewUrl);
      }
      state.file = file;
      state.fileName = file.name || "image";
      state.image = "";
      state.filePreviewUrl = root.URL.createObjectURL(file);
      updateFilePreview(state.filePreviewUrl);
      if (el("image")) el("image").value = "";
      updateSourceUi();
      if (state.renderMode === "server" && state.imageMode === "get" && apiImageBedUploadUrl) {
        await ensureServerImageFromFile();
      }
      scheduleRefresh();
    }

    async function refreshPreview() {
      const token = ++previewToken;
      updatePreviewStatus(
        "加载中",
        state.renderMode === "browser" ? "浏览器本地渲染" : `${state.imageMode.toUpperCase()} /icon`
      );
      clearPreviewObjectUrl();

      try {
        if (state.renderMode === "browser") {
          const source = getBrowserSource();
          const result = await browser.renderIcon(runtimeState(), source);
          if (token !== previewToken) return;
          setPreviewImages(result.dataUrl);
          updateRequestText(result);
          updatePreviewStatus(
            "已更新",
            `浏览器输出 ${browser.describeSource(source)} · ${result.effectiveResizeStrategy}`
          );
          await refreshInfo();
          return;
        }

        if (state.file && state.imageMode === "get" && apiImageBedUploadUrl && !state.image) {
          await ensureServerImageFromFile();
        }

        const params = queryParams();
        if (state.imageMode === "post" && state.file) {
          const formData = new root.FormData();
          for (const [key, value] of params.entries()) {
            if (key === "image") continue;
            formData.append(key, value);
          }
          formData.append("image", state.file, state.fileName || "image.png");
          const res = await root.fetch(apiIconUrl, { method: "POST", body: formData });
          if (!res.ok) {
            throw new Error(`预览失败：HTTP ${res.status}`);
          }
          const blob = await res.blob();
          if (token !== previewToken) return;
          previewObjectUrl = root.URL.createObjectURL(blob);
          setPreviewImages(previewObjectUrl);
          updatePreviewStatus("已更新", `POST /icon · ${state.fileName || "本地文件"}`);
        } else {
          const res = await root.fetch(`${apiIconUrl}?${params.toString()}`, {
            headers: { Accept: "image/png" },
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `预览失败：HTTP ${res.status}`);
          }
          const blob = await res.blob();
          if (token !== previewToken) return;
          previewObjectUrl = root.URL.createObjectURL(blob);
          setPreviewImages(previewObjectUrl);
          updatePreviewStatus("已更新", `GET /icon · ${state.imageMode.toUpperCase()}`);
        }
        updateRequestText();
        await refreshInfo();
      } catch (error) {
        if (token !== previewToken) return;
        clearPreviewImages();
        updatePreviewStatus("预览失败", error.message);
        updateRequestText();
      }
    }

    async function uploadFileToBed(file) {
      if (!apiImageBedUploadUrl) {
        throw new Error("未配置图床地址，无法在 GET 模式下上传文件");
      }
      const formData = new root.FormData();
      formData.append("image", file);
      const res = await root.fetch(apiImageBedUploadUrl, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`图床上传失败：HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.url) {
        throw new Error("图床上传失败：响应中缺少 url");
      }
      return data.url;
    }

    async function ensureServerImageFromFile() {
      if (!state.file || state.imageMode !== "get" || !apiImageBedUploadUrl) return;
      const token = ++uploadToken;
      updatePreviewStatus("上传中", "文件正在写入独立图床");
      const url = await uploadFileToBed(state.file);
      if (token !== uploadToken) return;
      state.image = url;
      setValue("image", url);
      updateRequestText();
    }

    async function refreshInfo() {
      if (state.renderMode === "browser") {
        const layout = core.getLayout(state);
        const contour = state.contourEnhance ? "增强" : "普通";
        const info = `形状=${shapeLabels[state.shape] || state.shape}，轮廓=${contour}，超采样=${state.antiAliasScale}x，缩小=${resizeStrategyLabels[browser.getEffectiveResizeStrategy(state)] || browser.getEffectiveResizeStrategy(state)}，尺寸=${layout.width} × ${layout.height}`;
        setText("previewSize", `${layout.width} × ${layout.height}`);
        setText("previewInfo", info);
        return;
      }

      const params = queryParams();
      const res = await root.fetch(`${apiInfoUrl}?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`info 请求失败：HTTP ${res.status}`);
      }
      const info = await res.json();
      const infoText = `形状=${shapeLabels[info.state.shape] || info.state.shape}，轮廓=${info.state.contourEnhance ? "增强" : "普通"}，超采样=${info.state.antiAliasScale}x，缩小=${resizeStrategyLabels[info.state.resizeStrategy] || info.state.resizeStrategy}，渲染=${info.renderWidth} × ${info.renderHeight}`;
      setText("previewSize", `${info.width} × ${info.height}`);
      setText("previewInfo", infoText);
    }

    function cleanup() {
      if (state.filePreviewUrl) {
        root.URL.revokeObjectURL(state.filePreviewUrl);
        state.filePreviewUrl = "";
      }
      clearPreviewObjectUrl();
    }

    updateUi();
    attachEvents();
    refreshPreview();

    return {
      state,
      refreshPreview,
      cleanup,
    };
  }

  return {
    bootstrap,
  };
});
