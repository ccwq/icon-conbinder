<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { renderIcon } from 'icon-combinder'

// 默认参数
const defaultState = {
  shape: 'pin',
  iconSize: 128,
  image: '/sample-icon.png',
  imageScale: 1.0,
  imageOffsetY: 0,
  borderWidth: 4,
  lineJoin: 'round',
  borderColor: '#ef4444',
  bgColor: '#ffffff',
  enableShadow: true,
  shadowBlur: 10,
  shadowOffsetY: 5,
  exportSquare: true,
  exportStrategy: 'center',
  antiAliasScale: 1,
  resizeStrategy: 'smooth-high',
  contourEnhance: true,
  contourOuterGlow: 2,
  contourOuterWidth: 6,
  contourMainWidth: 3,
  contourInnerWidth: 1,
  contourCornerSoftness: 0.12,
}

// 持久化配置
const STORAGE_KEY = 'icon-combinder.browser-ui.v1'
const PERSIST_KEYS = [
  'shape', 'iconSize', 'image', 'imageScale', 'imageOffsetY', 'borderWidth', 'lineJoin',
  'borderColor', 'bgColor', 'contourEnhance', 'contourOuterGlow', 'contourOuterWidth',
  'contourMainWidth', 'contourInnerWidth', 'contourCornerSoftness', 'enableShadow',
  'shadowBlur', 'shadowOffsetY', 'exportSquare', 'exportStrategy', 'antiAliasScale', 'resizeStrategy',
]

// localStorage 操作
function getStorage() {
  try {
    return localStorage
  } catch {
    return null
  }
}

function readPersistedState() {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const uiState = parsed.ui && typeof parsed.ui === 'object' ? parsed.ui : parsed
    if (parsed.form || parsed.expandedSections || parsed.sourceKind || parsed.sourceFileName) {
      const restoredForm = {}
      const sourceForm = parsed.form && typeof parsed.form === 'object' ? parsed.form : {}
      for (const key of PERSIST_KEYS) {
        if (Object.prototype.hasOwnProperty.call(sourceForm, key)) {
          restoredForm[key] = sourceForm[key]
        }
      }
      const sourceState = parsed.source && typeof parsed.source === 'object' ? parsed.source : parsed
      return {
        form: restoredForm,
        expandedSections:
          parsed.expandedSections && typeof parsed.expandedSections === 'object'
            ? parsed.expandedSections
            : null,
        sourceKind:
          typeof sourceState.sourceKind === 'string'
            ? sourceState.sourceKind
            : typeof sourceState.kind === 'string'
              ? sourceState.kind
              : null,
        sourceFileName: typeof sourceState.sourceFileName === 'string' ? sourceState.sourceFileName : '',
        sourcePreviewUrl:
          typeof sourceState.sourcePreviewUrl === 'string' ? sourceState.sourcePreviewUrl : '',
        sourceDataUrl: typeof sourceState.sourceDataUrl === 'string' ? sourceState.sourceDataUrl : '',
        imageScaleLinked:
          typeof uiState.imageScaleLinked === 'boolean' ? uiState.imageScaleLinked : null,
        previewBackgroundColor:
          typeof uiState.previewBackgroundColor === 'string' ? uiState.previewBackgroundColor : '',
      }
    }
    const restoredForm = {}
    for (const key of PERSIST_KEYS) {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        restoredForm[key] = parsed[key]
      }
    }
    return {
      form: restoredForm,
      expandedSections: null,
      sourceKind: typeof parsed.sourceKind === 'string' ? parsed.sourceKind : null,
      sourceFileName: typeof parsed.sourceFileName === 'string' ? parsed.sourceFileName : '',
      sourcePreviewUrl: typeof parsed.sourcePreviewUrl === 'string' ? parsed.sourcePreviewUrl : '',
      sourceDataUrl: typeof parsed.sourceDataUrl === 'string' ? parsed.sourceDataUrl : '',
      imageScaleLinked:
        typeof uiState.imageScaleLinked === 'boolean' ? uiState.imageScaleLinked : null,
      previewBackgroundColor:
        typeof uiState.previewBackgroundColor === 'string' ? uiState.previewBackgroundColor : '',
    }
  } catch {
    return null
  }
}

function writePersistedState() {
  const storage = getStorage()
  if (!storage) return
  try {
    const snapshot = {}
    for (const key of PERSIST_KEYS) {
      if (Object.prototype.hasOwnProperty.call(form.value, key)) {
        snapshot[key] = form.value[key]
      }
    }
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        form: snapshot,
        sourceKind: sourceKind.value,
        sourceFileName: sourceFileName.value,
        sourcePreviewUrl: sourcePreviewUrl.value,
        sourceDataUrl: sourceDataUrl.value,
        expandedSections: expandedSections.value,
        ui: {
          imageScaleLinked: imageScaleLinked.value,
          previewBackgroundColor: previewBackgroundColor.value,
        },
      })
    )
  } catch {
    // localStorage 不可用时静默降级
  }
}

// 表单数据
const form = ref({ ...defaultState })

// 图像来源
const sourceKind = ref('url')
const sourceFile = ref(null)
const sourceFileName = ref('')
const sourcePreviewUrl = ref('')
const sourceDataUrl = ref('')
const sourceObjectUrl = ref('')
const previewBackgroundColor = ref('#ef4444')
const imageScaleLinked = ref(true)
const imageScaleLinkPaused = ref(false)
const sizePresets = [24, 30, 36, 45, 54]
const previewBackgroundCards = [
  { key: 'dark', label: '黑色', note: 'Dark' },
  { key: 'light', label: '白色', note: 'Light' },
  { key: 'grid', label: '网格', note: 'Grid' },
  { key: 'custom', label: '自定义', note: 'Color' },
]
let imageScaleLinkTimer = null
let imageScaleLinkBase = {
  iconSize: defaultState.iconSize,
  imageScale: defaultState.imageScale,
}
let syncingImageScaleFromSize = false

const sourceModes = [
  { value: 'url', label: 'URL', meta: 'browser' },
  { value: 'file', label: '本地文件', meta: 'browser' },
  { value: 'preset-cache', label: '预设缓存上传', meta: 'node-only', disabled: true },
]

// 预览图片
const previewUrl = ref('')
const isRendering = ref(false)

// 形状选项
const shapes = [
  { value: 'pin', label: '图钉' },
  { value: 'circle', label: '圆形' },
  { value: 'square', label: '方形' },
  { value: 'squircle', label: '圆角方' },
  { value: 'hexagon', label: '六边形' },
]

// 缩小策略选项
const resizeStrategies = [
  { value: 'smooth-high', label: '高质量' },
  { value: 'pixelated', label: '像素风' },
  { value: 'step-down', label: '逐步递减' },
]

// lineJoin 选项
const lineJoinOptions = [
  { value: 'round', label: '圆角' },
  { value: 'miter', label: '尖角' },
  { value: 'bevel', label: '斜角' },
]

// 示例图片URL
const sampleImageUrl = '/sample-icon.png'

// 展开/折叠控制
const expandedSections = ref({
  basic: true,
  shadow: true,
  antiAlias: false,
  contour: false,
  export: false,
})

const imageScaleLinkStatus = computed(() => {
  if (!imageScaleLinked.value) {
    return '联动关闭'
  }
  return imageScaleLinkPaused.value ? '输入中，300ms 后恢复' : '尺寸变化将自动同步缩放'
})

function toggleSection(key) {
  expandedSections.value[key] = !expandedSections.value[key]
  writePersistedState()
}

function selectSourceKind(kind) {
  if (kind === 'preset-cache') return
  sourceKind.value = kind
}

function clampNumber(value, min, max) {
  const number = Number(value)
  if (Number.isNaN(number)) return min
  return Math.min(max, Math.max(min, number))
}

function normalizeHexColor(value, fallback = '#ef4444') {
  const text = String(value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(text)) {
    return `#${text
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('')}`.toLowerCase()
  }
  return fallback
}

function syncImageScaleLinkBase() {
  imageScaleLinkBase = {
    iconSize: Math.max(1, Number(form.value.iconSize) || defaultState.iconSize),
    imageScale: Math.max(0.01, Number(form.value.imageScale) || defaultState.imageScale),
  }
}

function clearImageScaleLinkTimer() {
  if (imageScaleLinkTimer) {
    clearTimeout(imageScaleLinkTimer)
    imageScaleLinkTimer = null
  }
}

function pauseImageScaleLink() {
  if (!imageScaleLinked.value) return
  clearImageScaleLinkTimer()
  imageScaleLinkPaused.value = true
  imageScaleLinkTimer = setTimeout(() => {
    syncImageScaleLinkBase()
    imageScaleLinkPaused.value = false
    imageScaleLinkTimer = null
    writePersistedState()
  }, 300)
}

function applyLinkedImageScale(nextIconSize = form.value.iconSize) {
  if (!imageScaleLinked.value || imageScaleLinkPaused.value) return
  const baseSize = Math.max(1, Number(imageScaleLinkBase.iconSize) || defaultState.iconSize)
  const baseScale = Math.max(0.01, Number(imageScaleLinkBase.imageScale) || defaultState.imageScale)
  const targetScale = clampNumber((baseScale * (Number(nextIconSize) || 1)) / baseSize, 0.01, 10)
  if (Math.abs(targetScale - Number(form.value.imageScale)) < 1e-6) return
  syncingImageScaleFromSize = true
  form.value.imageScale = Number(targetScale.toFixed(2))
}

function setImageScaleLinked(enabled) {
  imageScaleLinked.value = !!enabled
  clearImageScaleLinkTimer()
  imageScaleLinkPaused.value = false
  if (imageScaleLinked.value) {
    syncImageScaleLinkBase()
  }
  writePersistedState()
}

function getSourceKindLabel(kind = sourceKind.value) {
  switch (kind) {
    case 'file':
      return '本地文件'
    case 'preset-cache':
      return '预设缓存上传'
    default:
      return 'URL'
  }
}

function revokeSourceObjectUrl() {
  if (sourceObjectUrl.value) {
    URL.revokeObjectURL(sourceObjectUrl.value)
    sourceObjectUrl.value = ''
  }
}

function resetSourceState() {
  revokeSourceObjectUrl()
  sourceKind.value = 'url'
  sourceFile.value = null
  sourceFileName.value = ''
  sourcePreviewUrl.value = ''
  sourceDataUrl.value = ''
}

function clearSourceFileInput() {
  resetSourceState()
  const fileInput = document.getElementById('sourceFileInput')
  if (fileInput) {
    fileInput.value = ''
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('读取本地文件失败'))
    reader.readAsDataURL(file)
  })
}

async function selectSourceFile(file) {
  if (!file) {
    clearSourceFileInput()
    return
  }

  sourceKind.value = 'file'
  sourceFile.value = file
  sourceFileName.value = file.name || 'local-image'
  sourceDataUrl.value = ''

  revokeSourceObjectUrl()
  sourceObjectUrl.value = URL.createObjectURL(file)
  sourcePreviewUrl.value = sourceObjectUrl.value

  try {
    const dataUrl = await readFileAsDataUrl(file)
    if (sourceFile.value !== file) return
    sourceDataUrl.value = dataUrl
    sourcePreviewUrl.value = dataUrl
    revokeSourceObjectUrl()
    writePersistedState()
    renderIcon_()
  } catch (error) {
    console.error('读取本地文件失败:', error)
  }
}

function handleSourceFileChange(event) {
  const file = event.target.files && event.target.files[0]
  selectSourceFile(file || null)
}

function handleSourceDrop(event) {
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
  if (file) {
    selectSourceFile(file)
  }
}

function getRenderSource() {
  const fallbackUrl = String(form.value.image || '').trim() || sampleImageUrl

  if (sourceKind.value === 'file') {
    if (sourceFile.value) {
      return { kind: 'file', file: sourceFile.value }
    }
    if (sourceDataUrl.value || sourcePreviewUrl.value) {
      return { kind: 'data', value: sourceDataUrl.value || sourcePreviewUrl.value }
    }
  }

  return { kind: 'url', value: fallbackUrl }
}

function buildCopyState() {
  const snapshot = { ...form.value }
  if (sourceKind.value === 'file') {
    snapshot.image = sourceFileName.value ? `file:${sourceFileName.value}` : 'file:local-image'
  } else {
    snapshot.image = String(form.value.image || '').trim() || sampleImageUrl
  }
  return {
    ...snapshot,
    sourceKind: sourceKind.value,
    sourceFileName: sourceFileName.value,
  }
}

// 渲染图标
async function renderIcon_() {
  try {
    isRendering.value = true
    const source = getRenderSource()
    const result = await renderIcon(form.value, source)
    previewUrl.value = result.dataUrl
  } catch (err) {
    console.error('渲染失败:', err)
  } finally {
    isRendering.value = false
  }
}

// 初始化
onMounted(async () => {
  // 恢复持久化状态
  const restored = readPersistedState()
  if (restored) {
    if (restored.form) {
      form.value = { ...defaultState, ...restored.form }
    } else {
      form.value = { ...defaultState, ...restored }
    }
    const restoredSourceKind = restored.sourceKind === 'file' || restored.sourceKind === 'url' ? restored.sourceKind : 'url'
    sourceKind.value = restoredSourceKind
    sourceFileName.value = restored.sourceFileName || ''
    sourceDataUrl.value = restored.sourceDataUrl || ''
    sourcePreviewUrl.value = restored.sourcePreviewUrl || (restoredSourceKind === 'file' ? restored.sourceDataUrl || '' : '')
    if (sourceKind.value === 'file' && !sourceDataUrl.value && !sourcePreviewUrl.value) {
      sourceKind.value = 'url'
    }
    if (sourceKind.value === 'file' && sourcePreviewUrl.value.startsWith('blob:') && !sourceDataUrl.value) {
      sourceKind.value = 'url'
      sourceFileName.value = ''
      sourcePreviewUrl.value = ''
    }
    if (restored.expandedSections) {
      expandedSections.value = { ...expandedSections.value, ...restored.expandedSections }
    }
    if (typeof restored.imageScaleLinked === 'boolean') {
      imageScaleLinked.value = restored.imageScaleLinked
    }
    if (typeof restored.previewBackgroundColor === 'string' && restored.previewBackgroundColor) {
      previewBackgroundColor.value = normalizeHexColor(restored.previewBackgroundColor, previewBackgroundColor.value)
    }
  }
  syncImageScaleLinkBase()
  await renderIcon_()
})

// 监听参数变化，重新渲染并保存
let saveTimer = null
function queuePersistAndRender() {
  // 防抖保存
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    writePersistedState()
  }, 300)
  renderIcon_()
}

watch(form, queuePersistAndRender, { deep: true })

watch([sourceKind, sourceFile, sourceDataUrl], queuePersistAndRender)

watch(expandedSections, () => {
  writePersistedState()
}, { deep: true })

watch(
  () => form.value.iconSize,
  (nextIconSize) => {
    applyLinkedImageScale(nextIconSize)
  }
)

watch(
  () => form.value.imageScale,
  () => {
    if (syncingImageScaleFromSize) {
      syncingImageScaleFromSize = false
      return
    }
    if (imageScaleLinked.value) {
      pauseImageScaleLink()
    }
  }
)

watch(imageScaleLinked, (enabled) => {
  clearImageScaleLinkTimer()
  imageScaleLinkPaused.value = false
  if (enabled) {
    syncImageScaleLinkBase()
  }
  writePersistedState()
})

watch(previewBackgroundColor, () => {
  previewBackgroundColor.value = normalizeHexColor(previewBackgroundColor.value, '#ef4444')
  writePersistedState()
})

// 重置参数
function resetParams() {
  form.value = { ...defaultState }
  imageScaleLinked.value = true
  imageScaleLinkPaused.value = false
  previewBackgroundColor.value = '#ef4444'
  clearImageScaleLinkTimer()
  syncImageScaleLinkBase()
  clearSourceFileInput()
  renderIcon_()
  writePersistedState()
}

// 导出图片
function downloadImage() {
  if (!previewUrl.value) return
  const link = document.createElement('a')
  link.href = previewUrl.value
  link.download = `icon-${form.value.shape}-${Date.now()}.png`
  link.click()
}

// 复制参数相关
const copyMode = ref('json') // json | url | cli
const copyFormats = [
  { value: 'json', label: 'JSON' },
  { value: 'url', label: 'URL' },
  { value: 'cli', label: 'CLI' },
]

const portalLinks = [
  { href: '../', label: '文档首页', note: 'Docs Home' },
  { href: '../api', label: 'API 参考', note: 'Reference' },
  { href: '../examples/basic', label: '示例说明', note: 'Examples' },
  { href: 'https://github.com/ccwq/icon-conbinder', label: 'GitHub', note: 'Repository', external: true },
]

const localLinks = [
  { href: '../guide/getting-started', label: '快速开始', meta: 'Guide' },
  { href: '../api', label: '文档 API', meta: 'Docs' },
  { href: '/icon', label: 'GET /icon', meta: 'Local server' },
  { href: '/info', label: 'GET /info', meta: 'Layout info' },
]

async function copyParams() {
  const text = generateParamsText()
  try {
    await navigator.clipboard.writeText(text)
    showCopySuccess()
  } catch (err) {
    console.error('复制失败:', err)
  }
}

function generateParamsText() {
  const copyState = buildCopyState()
  switch (copyMode.value) {
    case 'url': {
      const params = new URLSearchParams()
      Object.entries(copyState).forEach(([key, value]) => {
        if (value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      return `/icon?${params.toString()}`
    }
    case 'cli': {
      const args = Object.entries(copyState)
        .filter(([, value]) => value !== null && value !== '')
        .map(([key, value]) => `--${key} ${typeof value === 'boolean' ? (value ? '1' : '0') : value}`)
        .join(' ')
      return `icon-combinder ${args}`
    }
    default: {
      return JSON.stringify(copyState, null, 2)
    }
  }
}

const showCopyToast = ref(false)
function showCopySuccess() {
  showCopyToast.value = true
  setTimeout(() => {
    showCopyToast.value = false
  }, 2000)
}
</script>

<template>
  <div class="app">
    <section class="hero-strip">
      <div class="hero-copy">
        <span class="hero-kicker">FULLSCREEN LAB</span>
        <h1>Icon Combinder 交互演示工作台</h1>
        <p>
          这里不再把交互演示塞进文档 iframe，而是作为独立全屏页面使用。文档、API、仓库和本地接口都从这里串联。
        </p>
      </div>
      <nav class="hero-links" aria-label="页面导航">
        <a
          v-for="item in portalLinks"
          :key="item.href"
          class="hero-link"
          :href="item.href"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noreferrer' : undefined"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.note }}</span>
        </a>
      </nav>
    </section>

    <header class="toolbar">
      <div class="toolbar-left">
        <div class="brand">
          <span class="eyebrow">ICON COMBINDER</span>
          <h1>参数编辑器</h1>
        </div>
        <span class="version">ESM Browser</span>
      </div>

      <div class="toolbar-center">
        <div class="status-chip" aria-live="polite">
          <span class="status-dot" :class="{ active: !isRendering }"></span>
          <span>{{ isRendering ? '渲染中' : '就绪' }}</span>
          <span class="status-sep">·</span>
          <span>{{ form.iconSize }}px</span>
          <span class="status-sep">·</span>
          <span>{{ form.shape }}</span>
          <span class="status-sep">·</span>
          <span>{{ getSourceKindLabel() }}</span>
        </div>
      </div>

      <div class="toolbar-right">
        <button @click="resetParams" class="btn-tool" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          重置
        </button>
        <button @click="downloadImage" class="btn-tool btn-primary" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出
        </button>
      </div>
    </header>

    <section class="jump-deck" aria-label="相关入口">
      <a
        v-for="item in localLinks"
        :key="item.href"
        class="jump-card"
        :href="item.href"
      >
        <span class="jump-meta">{{ item.meta }}</span>
        <strong>{{ item.label }}</strong>
      </a>
    </section>

    <main class="workspace">
      <aside class="panel panel-left">
        <div class="panel-header">
          <div class="panel-title-block">
            <span class="panel-kicker">SETTINGS</span>
            <strong>基础参数</strong>
          </div>
          <span class="panel-subtitle">形状 / 尺寸 / 颜色</span>
        </div>

        <div class="panel-content">
          <div class="param-group source-group">
            <div class="group-head">
              <span>图像来源</span>
              <span class="mono-chip">{{ getSourceKindLabel() }}</span>
            </div>
            <div class="source-tabs">
              <button
                v-for="mode in sourceModes"
                :key="mode.value"
                type="button"
                class="source-tab"
                :class="{ active: sourceKind === mode.value, disabled: mode.disabled }"
                :disabled="mode.disabled"
                :aria-pressed="sourceKind === mode.value ? 'true' : 'false'"
                @click="selectSourceKind(mode.value)"
              >
                <span>{{ mode.label }}</span>
                <small>{{ mode.meta === 'node-only' ? 'Node-only' : 'browser' }}</small>
              </button>
            </div>

            <div v-if="sourceKind === 'url'" class="source-pane">
              <input
                id="imageInput"
                v-model="form.image"
                type="text"
                class="param-text"
                placeholder="https://example.com/icon.png / /sample-icon.png / data:image/png;base64,..."
              />
              <div class="source-note">浏览器端直接读取 URL / data URI；Node-only 的图床与缓存上传保持灰显。</div>
            </div>

            <div v-else class="source-pane source-file-pane" @dragenter.prevent @dragover.prevent @drop.prevent="handleSourceDrop">
              <div class="source-file-row">
                <label class="file-picker">
                  <input id="sourceFileInput" type="file" accept="image/*" @change="handleSourceFileChange" />
                  <span>选择本地文件</span>
                </label>
                <button class="btn-mini" type="button" @click="clearSourceFileInput">清除</button>
              </div>
              <div class="source-preview-card">
                <img v-if="sourcePreviewUrl" :src="sourcePreviewUrl" alt="本地文件预览" class="source-preview-image" />
                <div v-else class="source-preview-empty">请选择本地文件</div>
                <div class="source-preview-meta">
                  <strong>{{ sourceFileName || '未选择文件' }}</strong>
                  <span>{{ sourceDataUrl ? 'data: 已缓存' : '临时文件' }}</span>
                </div>
              </div>
              <div class="source-note">本地文件会作为 `browser.renderIcon(..., { kind: 'file' })` 的输入；若已缓存为 data URL，刷新后还能继续使用。</div>
            </div>

            <div class="source-disabled-card">
              <div class="source-disabled-head">
                <span>预设缓存上传</span>
                <span class="mono-chip mono-chip--muted">NODE</span>
              </div>
              <button class="disabled-action" type="button" disabled>上传到缓存</button>
              <div class="source-note">这类操作依赖 Node 服务，只在 server 端可用；example 页仅灰显保留入口。</div>
            </div>
          </div>

          <div class="param-group">
            <div class="group-head">
              <span>图像参数</span>
              <span class="mono-chip">{{ imageScaleLinkStatus }}</span>
            </div>
            <div class="param-row">
              <div class="param-head">
                <label for="imageScaleRange">图片缩放</label>
                <span class="param-value">{{ form.imageScale.toFixed(2) }}</span>
              </div>
              <div class="range-group">
                <input id="imageScaleRange" type="range" v-model.number="form.imageScale" min="0.01" max="10" step="0.01" />
                <input id="imageScaleInput" type="number" v-model.number="form.imageScale" min="0.01" max="10" step="0.01" />
              </div>
            </div>
            <div class="link-row">
              <label class="switch-label">
                <input type="checkbox" v-model="imageScaleLinked" class="switch" />
                尺寸联动
              </label>
              <span class="link-status">{{ imageScaleLinkStatus }}</span>
            </div>
            <div class="param-row">
              <div class="param-head">
                <label for="imageOffsetYRange">垂直偏移</label>
                <span class="param-value">{{ form.imageOffsetY }}</span>
              </div>
              <div class="range-group">
                <input id="imageOffsetYRange" type="range" v-model.number="form.imageOffsetY" min="-50" max="50" step="1" />
                <input id="imageOffsetYInput" type="number" v-model.number="form.imageOffsetY" min="-50" max="50" step="1" />
              </div>
            </div>
          </div>

          <div class="param-group">
            <div class="group-head">
              <span>形状</span>
              <span class="mono-chip">{{ form.shape }}</span>
            </div>
            <div class="shape-grid">
              <button
                v-for="s in shapes"
                :key="s.value"
                class="shape-btn"
                :class="{ active: form.shape === s.value }"
                :aria-pressed="form.shape === s.value ? 'true' : 'false'"
                type="button"
                @click="form.shape = s.value"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

          <div class="param-row">
            <div class="param-head">
              <label for="iconSizeRange">尺寸</label>
              <span class="param-value">{{ form.iconSize }}px</span>
            </div>
            <div class="range-group">
              <input id="iconSizeRange" type="range" v-model.number="form.iconSize" min="32" max="512" step="8" />
              <input id="iconSizeInput" type="number" v-model.number="form.iconSize" min="32" max="512" step="8" />
            </div>
            <div class="preset-row">
              <button
                v-for="size in sizePresets"
                :key="size"
                type="button"
                class="preset-chip"
                :class="{ active: form.iconSize === size }"
                @click="form.iconSize = size"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <div class="param-row">
            <div class="param-head">
              <label for="borderWidthRange">描边宽度</label>
              <span class="param-value">{{ form.borderWidth }}</span>
            </div>
            <div class="range-group">
              <input id="borderWidthRange" type="range" v-model.number="form.borderWidth" min="0" max="20" step="0.5" />
              <span class="range-value">{{ form.borderWidth }}</span>
            </div>
          </div>

          <div class="param-row">
            <div class="param-head">
              <label for="lineJoinSelect">拐角类型</label>
              <span class="param-value">{{ lineJoinOptions.find((item) => item.value === form.lineJoin)?.label || form.lineJoin }}</span>
            </div>
            <select id="lineJoinSelect" v-model="form.lineJoin" class="param-select">
              <option v-for="lj in lineJoinOptions" :key="lj.value" :value="lj.value">{{ lj.label }}</option>
            </select>
          </div>

          <div class="param-row">
            <div class="param-head">
              <label for="borderColor">边框颜色</label>
              <span class="param-value mono-chip">{{ form.borderColor }}</span>
            </div>
            <div class="color-input-wrap">
              <input id="borderColor" type="color" v-model="form.borderColor" class="color-input" />
              <span class="color-hex">{{ form.borderColor }}</span>
            </div>
          </div>

          <div class="param-row">
            <div class="param-head">
              <label for="bgColor">背景颜色</label>
              <span class="param-value mono-chip">{{ form.bgColor }}</span>
            </div>
            <div class="color-input-wrap">
              <input id="bgColor" type="color" v-model="form.bgColor" class="color-input" />
              <span class="color-hex">{{ form.bgColor }}</span>
            </div>
          </div>
        </div>
      </aside>

      <section class="preview-zone">
        <div class="preview-header">
          <div>
            <span class="panel-kicker">PREVIEW CANVAS</span>
            <h2>实时预览</h2>
          </div>
          <div class="preview-header-meta">
            <span class="preview-pill">Fit</span>
            <span class="preview-pill">1x</span>
            <span class="preview-pill">{{ form.antiAliasScale }}x</span>
          </div>
        </div>

        <div class="preview-background-grid">
          <div
            v-for="card in previewBackgroundCards"
            :key="card.key"
            class="preview-background-card"
            :class="`preview-background-card--${card.key}`"
          >
            <div
              class="preview-background-surface"
              :class="`preview-background-surface--${card.key}`"
              :style="card.key === 'custom' ? { '--preview-custom-bg': previewBackgroundColor } : null"
              :aria-label="`${card.label}预览背景`"
            >
              <img v-if="previewUrl" :src="previewUrl" alt="背景预览" class="preview-background-image" />
              <label v-if="card.key === 'custom'" class="preview-background-picker">
                <input type="color" v-model="previewBackgroundColor" aria-label="自定义背景颜色" />
                <span>{{ previewBackgroundColor }}</span>
              </label>
              <div class="preview-background-label">
                <strong>{{ card.label }}</strong>
                <span>{{ card.note }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="preview-info">
          <span class="info-item">{{ form.iconSize }}×{{ form.iconSize }}</span>
          <span class="info-item">{{ form.shape }}</span>
          <span class="info-item">{{ getSourceKindLabel() }}</span>
          <span class="info-item">{{ form.enableShadow ? 'shadow on' : 'shadow off' }}</span>
          <span class="info-item">{{ form.antiAliasScale }}x</span>
        </div>
      </section>

      <section class="export-panel">
        <div class="export-head">
          <div>
            <span class="panel-kicker">EXPORT</span>
            <h2>代码输出</h2>
          </div>
          <div class="export-meta">
            <span class="preview-pill">{{ copyMode.toUpperCase() }}</span>
            <span class="preview-pill">{{ form.shape }}</span>
          </div>
        </div>

        <div class="copy-tabs">
          <button
            v-for="fmt in copyFormats"
            :key="fmt.value"
            class="copy-tab"
            :class="{ active: copyMode === fmt.value }"
            type="button"
            @click="copyMode = fmt.value"
          >
            {{ fmt.label }}
          </button>
        </div>

        <div class="copy-content">
          <pre class="copy-preview">{{ generateParamsText() }}</pre>
          <button @click="copyParams" class="btn-copy" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            复制
          </button>
        </div>
      </section>

      <aside class="panel panel-right">
        <div class="panel-section">
          <button
            class="section-header"
            :aria-expanded="expandedSections.shadow ? 'true' : 'false'"
            aria-controls="shadow-section"
            type="button"
            @click="toggleSection('shadow')"
          >
            <span class="section-title">
              <span class="panel-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 1 0 20" />
                </svg>
              </span>
              阴影效果
            </span>
            <span class="toggle-icon" :class="{ collapsed: !expandedSections.shadow }">▼</span>
          </button>
          <div id="shadow-section" class="section-body" v-show="expandedSections.shadow">
            <div class="param-row">
              <label class="switch-label">
                <input type="checkbox" v-model="form.enableShadow" class="switch" />
                启用阴影
              </label>
            </div>
            <template v-if="form.enableShadow">
              <div class="param-row">
                <div class="param-head">
                  <label for="shadowBlurRange">模糊半径</label>
                  <span class="param-value">{{ form.shadowBlur }}</span>
                </div>
                <div class="range-group">
                  <input id="shadowBlurRange" type="range" v-model.number="form.shadowBlur" min="0" max="50" step="1" />
                  <span class="range-value">{{ form.shadowBlur }}</span>
                </div>
              </div>
              <div class="param-row">
                <div class="param-head">
                  <label for="shadowOffsetYRange">垂直偏移</label>
                  <span class="param-value">{{ form.shadowOffsetY }}</span>
                </div>
                <div class="range-group">
                  <input id="shadowOffsetYRange" type="range" v-model.number="form.shadowOffsetY" min="-20" max="20" step="1" />
                  <span class="range-value">{{ form.shadowOffsetY }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="panel-section">
          <button
            class="section-header"
            :aria-expanded="expandedSections.antiAlias ? 'true' : 'false'"
            aria-controls="anti-alias-section"
            type="button"
            @click="toggleSection('antiAlias')"
          >
            <span class="section-title">
              <span class="panel-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              </span>
              抗锯齿
            </span>
            <span class="toggle-icon" :class="{ collapsed: !expandedSections.antiAlias }">▼</span>
          </button>
          <div id="anti-alias-section" class="section-body" v-show="expandedSections.antiAlias">
            <div class="param-row">
              <div class="param-head">
                <label for="antiAliasScaleSelect">超采样倍率</label>
                <span class="param-value">{{ form.antiAliasScale }}x</span>
              </div>
              <select id="antiAliasScaleSelect" v-model.number="form.antiAliasScale" class="param-select">
                <option :value="1">1x</option>
                <option :value="2">2x</option>
                <option :value="4">4x</option>
              </select>
            </div>
            <div class="param-row">
              <div class="param-head">
                <label for="resizeStrategySelect">缩小策略</label>
                <span class="param-value">{{ resizeStrategies.find((item) => item.value === form.resizeStrategy)?.label || form.resizeStrategy }}</span>
              </div>
              <select id="resizeStrategySelect" v-model="form.resizeStrategy" class="param-select">
                <option v-for="rs in resizeStrategies" :key="rs.value" :value="rs.value">{{ rs.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <button
            class="section-header"
            :aria-expanded="expandedSections.contour ? 'true' : 'false'"
            aria-controls="contour-section"
            type="button"
            @click="toggleSection('contour')"
          >
            <span class="section-title">
              <span class="panel-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </span>
              轮廓增强
            </span>
            <span class="toggle-icon" :class="{ collapsed: !expandedSections.contour }">▼</span>
          </button>
          <div id="contour-section" class="section-body" v-show="expandedSections.contour">
            <div class="param-row">
              <label class="switch-label">
                <input type="checkbox" v-model="form.contourEnhance" class="switch" />
                启用轮廓
              </label>
            </div>
            <template v-if="form.contourEnhance">
              <div class="param-row">
                <div class="param-head">
                  <label for="contourOuterGlowRange">外发光</label>
                  <span class="param-value">{{ form.contourOuterGlow }}</span>
                </div>
                <div class="range-group">
                  <input id="contourOuterGlowRange" type="range" v-model.number="form.contourOuterGlow" min="0" max="20" step="0.5" />
                  <span class="range-value">{{ form.contourOuterGlow }}</span>
                </div>
              </div>
              <div class="param-row">
                <div class="param-head">
                  <label for="contourOuterWidthRange">外宽度</label>
                  <span class="param-value">{{ form.contourOuterWidth }}</span>
                </div>
                <div class="range-group">
                  <input id="contourOuterWidthRange" type="range" v-model.number="form.contourOuterWidth" min="0" max="20" step="0.5" />
                  <span class="range-value">{{ form.contourOuterWidth }}</span>
                </div>
              </div>
              <div class="param-row">
                <div class="param-head">
                  <label for="contourMainWidthRange">主宽度</label>
                  <span class="param-value">{{ form.contourMainWidth }}</span>
                </div>
                <div class="range-group">
                  <input id="contourMainWidthRange" type="range" v-model.number="form.contourMainWidth" min="0" max="20" step="0.5" />
                  <span class="range-value">{{ form.contourMainWidth }}</span>
                </div>
              </div>
              <div class="param-row">
                <div class="param-head">
                  <label for="contourInnerWidthRange">内宽度</label>
                  <span class="param-value">{{ form.contourInnerWidth }}</span>
                </div>
                <div class="range-group">
                  <input id="contourInnerWidthRange" type="range" v-model.number="form.contourInnerWidth" min="0" max="20" step="0.5" />
                  <span class="range-value">{{ form.contourInnerWidth }}</span>
                </div>
              </div>
              <div class="param-row">
                <div class="param-head">
                  <label for="contourCornerSoftnessRange">拐角柔和度</label>
                  <span class="param-value">{{ form.contourCornerSoftness.toFixed(2) }}</span>
                </div>
                <div class="range-group">
                  <input id="contourCornerSoftnessRange" type="range" v-model.number="form.contourCornerSoftness" min="0" max="1" step="0.01" />
                  <span class="range-value">{{ form.contourCornerSoftness.toFixed(2) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="panel-section">
          <button
            class="section-header"
            :aria-expanded="expandedSections.export ? 'true' : 'false'"
            aria-controls="export-section"
            type="button"
            @click="toggleSection('export')"
          >
            <span class="section-title">
              <span class="panel-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              导出设置
            </span>
            <span class="toggle-icon" :class="{ collapsed: !expandedSections.export }">▼</span>
          </button>
          <div id="export-section" class="section-body" v-show="expandedSections.export">
            <div class="param-row">
              <label class="switch-label">
                <input type="checkbox" v-model="form.exportSquare" class="switch" />
                正方形画布
              </label>
            </div>
            <div class="param-row">
              <div class="param-head">
                <label for="exportStrategySelect">对齐策略</label>
                <span class="param-value">{{ form.exportStrategy === 'center' ? '居中' : '底部' }}</span>
              </div>
              <select id="exportStrategySelect" v-model="form.exportStrategy" class="param-select">
                <option value="center">居中</option>
                <option value="bottom">底部</option>
              </select>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <Transition name="toast">
      <div v-if="showCopyToast" class="toast">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12" />
        </svg>
        已复制到剪贴板
      </div>
    </Transition>
  </div>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html, body) {
  min-height: 100%;
}

:global(body) {
  margin: 0;
  color: #e8edf7;
  font-family: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
  background:
    radial-gradient(circle at 12% 12%, rgba(56, 189, 248, 0.15), transparent 26%),
    radial-gradient(circle at 84% 16%, rgba(239, 68, 68, 0.12), transparent 22%),
    linear-gradient(180deg, #070b11 0%, #0b1118 52%, #080c12 100%);
}

:global(button, input, select, textarea) {
  font: inherit;
}

:global(button) {
  cursor: pointer;
}

.app {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 14px;
  color: #e8edf7;
  position: relative;
  overflow-x: hidden;
}

.app::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 32px 32px, 32px 32px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1));
  opacity: 0.55;
  z-index: 0;
}

.hero-strip,
.toolbar,
.jump-deck,
.workspace,
.export-panel,
.toast {
  position: relative;
  z-index: 1;
}

.hero-strip {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.95fr);
  gap: 16px;
  align-items: stretch;
  padding: 18px 20px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.14), transparent 28%),
    radial-gradient(circle at 82% 22%, rgba(14, 165, 233, 0.2), transparent 26%),
    linear-gradient(135deg, rgba(8, 13, 20, 0.94), rgba(15, 23, 42, 0.9));
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.28);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
}

.hero-kicker {
  color: #7dd3fc;
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 52px);
  line-height: 0.95;
  letter-spacing: -0.06em;
  font-weight: 700;
}

.hero-copy p {
  margin: 0;
  max-width: 58ch;
  color: #b6c4d8;
  font-size: 14px;
  line-height: 1.6;
}

.hero-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.hero-link,
.jump-card {
  text-decoration: none;
}

.hero-link {
  min-height: 112px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent),
    rgba(4, 9, 16, 0.72);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.hero-link:hover,
.jump-card:hover {
  transform: translateY(-2px);
  border-color: rgba(125, 211, 252, 0.42);
}

.hero-link strong,
.jump-card strong {
  color: #f8fbff;
  font-size: 15px;
  font-weight: 700;
}

.hero-link span {
  color: #8fa0b7;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(10, 14, 20, 0.88);
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.28);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.eyebrow {
  font-size: 10px;
  letter-spacing: 0.22em;
  color: #8aa0ba;
}

.brand h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.version {
  padding: 6px 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.8);
  color: #9fb0c9;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.toolbar-center {
  justify-self: center;
}

.status-chip,
.preview-pill,
.mono-chip,
.info-item {
  font-family: 'IBM Plex Mono', 'Cascadia Mono', Consolas, monospace;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.8);
  color: #b9c5d8;
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.08);
}

.status-dot.active {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
}

.status-sep {
  color: #54637e;
}

.toolbar-right {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-tool {
  min-height: 36px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.84);
  color: #c9d3e3;
  font-size: 12px;
  font-weight: 600;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.btn-tool:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.45);
  background: rgba(30, 41, 59, 0.9);
}

.btn-tool.btn-primary {
  border-color: rgba(59, 130, 246, 0.45);
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: #fff;
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.22);
}

.jump-deck {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.jump-card {
  min-height: 84px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(12, 17, 26, 0.72);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.jump-card:hover {
  background: rgba(15, 23, 42, 0.84);
}

.jump-meta {
  color: #7dd3fc;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(420px, 1.18fr) minmax(246px, 0.78fr) minmax(240px, 0.64fr);
  gap: 10px 12px;
  padding: 2px 0 10px;
  align-items: start;
  grid-auto-rows: min-content;
}

.panel,
.preview-zone,
.export-panel {
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 20px;
  background: rgba(12, 17, 26, 0.88);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}

.panel {
  overflow: hidden;
}

.panel-left {
  grid-column: 1;
  grid-row: 1 / span 2;
  animation: fade-slide-in 0.45s ease both;
}

.panel-right {
  grid-column: 3;
  grid-row: 1 / span 2;
  animation: fade-slide-in 0.45s ease 0.06s both;
}

.preview-zone {
  grid-column: 2;
  grid-row: 1;
  padding: 10px 10px 8px;
  animation: fade-slide-in 0.45s ease 0.03s both;
}

.export-panel {
  grid-column: 2;
  grid-row: 2;
  margin-top: 0;
  padding: 10px 12px 12px;
  animation: fade-slide-in 0.45s ease 0.1s both;
}

@keyframes fade-slide-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header,
.export-head,
.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-header {
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(15, 23, 42, 0.42);
}

.panel-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-kicker {
  font-size: 10px;
  letter-spacing: 0.18em;
  color: #73839a;
}

.panel-header strong,
.export-head h2,
.preview-header h2 {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
}

.panel-subtitle {
  color: #91a0b7;
  font-size: 12px;
  white-space: nowrap;
}

.panel-content {
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-items: start;
}

.param-group,
.param-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 8px 9px 9px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  background: rgba(8, 13, 20, 0.72);
}

.panel-content > .source-group {
  grid-column: 1 / -1;
}

.group-head,
.param-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.group-head,
.param-head label {
  color: #c9d3e3;
  font-size: 10px;
  font-weight: 600;
}

.mono-chip,
.param-value,
.range-value,
.color-hex {
  color: #7dd3fc;
  font-size: 9px;
}

.mono-chip {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(125, 211, 252, 0.2);
}

.shape-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.shape-btn {
  min-height: 36px;
  padding: 0 9px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.86);
  color: #aab8cc;
  font-size: 10px;
  font-weight: 600;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.shape-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.45);
}

.shape-btn.active {
  border-color: rgba(96, 165, 250, 0.6);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.32), rgba(14, 165, 233, 0.18));
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 10px 24px rgba(37, 99, 235, 0.16);
}

.range-group {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px;
  align-items: center;
  gap: 7px;
}

.range-group input[type='range'] {
  width: 100%;
  appearance: none;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563eb 0%, #22d3ee 100%);
}

.range-group input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #06111e;
  background: #e8edf7;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.14);
}

.range-group input[type='number'] {
  width: 100%;
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.92);
  color: #e8edf7;
  font-variant-numeric: tabular-nums;
}

.range-value {
  text-align: right;
  color: #e6ebf5;
  font-variant-numeric: tabular-nums;
}

.preset-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.preset-chip {
  min-height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.8);
  color: #9fb0c9;
  font-size: 10px;
  font-weight: 600;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.preset-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.42);
  background: rgba(30, 41, 59, 0.94);
}

.preset-chip.active {
  border-color: rgba(96, 165, 250, 0.62);
  color: #fff;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(14, 165, 233, 0.16));
}

.link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 1px 2px 0;
}

.link-status {
  color: #93c5fd;
  font-size: 9px;
  font-family: 'IBM Plex Mono', 'Cascadia Mono', Consolas, monospace;
  white-space: nowrap;
}

.param-select {
  width: 100%;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  color: #e8edf7;
}

.param-text {
  width: 100%;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  color: #e8edf7;
  font-family: 'IBM Plex Mono', 'Cascadia Mono', Consolas, monospace;
  font-size: 12px;
}

.param-text:focus,
.param-select:focus,
.range-group input[type='range']:focus,
.switch:focus {
  outline: none;
}

.source-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.source-tab {
  min-height: 38px;
  padding: 7px 9px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.84);
  color: #aab8cc;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.source-tab span {
  font-size: 10px;
  font-weight: 700;
}

.source-tab small {
  font-size: 8px;
  letter-spacing: 0.08em;
  color: #7d8ea8;
  text-transform: uppercase;
}

.source-tab:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.45);
  background: rgba(30, 41, 59, 0.92);
}

.source-tab.active {
  border-color: rgba(96, 165, 250, 0.62);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(14, 165, 233, 0.16));
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.source-tab.active small {
  color: #c4d6ec;
}

.source-tab.disabled {
  opacity: 0.54;
  cursor: not-allowed;
}

.source-pane {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.source-file-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.file-picker,
.btn-mini {
  min-height: 32px;
  padding: 0 9px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
  color: #d7e0ee;
  font-size: 11px;
  font-weight: 600;
}

.file-picker {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.file-picker input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.btn-mini {
  white-space: nowrap;
  cursor: pointer;
}

.btn-mini:hover {
  border-color: rgba(96, 165, 250, 0.42);
  background: rgba(30, 41, 59, 0.96);
}

.source-preview-card {
  padding: 9px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(4, 9, 16, 0.86);
  display: grid;
  gap: 8px;
}

.source-preview-image {
  width: 100%;
  min-height: 92px;
  max-height: 112px;
  object-fit: contain;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}

.source-preview-empty {
  min-height: 92px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px dashed rgba(125, 211, 252, 0.18);
  background: rgba(148, 163, 184, 0.04);
  color: #93a4bb;
  font-size: 12px;
}

.source-preview-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.source-preview-meta strong {
  font-size: 10px;
  color: #e8edf7;
}

.source-preview-meta span {
  font-size: 9px;
  color: #8f9eb3;
}

.source-disabled-card {
  padding: 9px;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.22);
  background: rgba(148, 163, 184, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: 0.82;
}

.source-disabled-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mono-chip--muted {
  color: #94a3b8;
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.64);
}

.disabled-action {
  min-height: 32px;
  padding: 0 9px;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.58);
  color: #8a99ad;
  font-size: 11px;
  font-weight: 600;
  cursor: not-allowed;
}

.source-note {
  color: #8f9eb3;
  font-size: 9px;
  line-height: 1.3;
}

.color-input-wrap {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.color-input {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: transparent;
}

.color-hex {
  justify-self: end;
}

.preview-zone {
  display: flex;
  flex-direction: column;
  gap: 7px;
  align-items: stretch;
  padding: 8px 8px 8px;
}

.preview-header-meta,
.export-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.preview-pill {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #b9c5d8;
  font-size: 10px;
}

.preview-stage {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  min-height: 188px;
}

.preview-frame {
  width: min(100%, 188px);
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%),
    linear-gradient(180deg, rgba(10, 15, 22, 0.95), rgba(4, 9, 16, 0.98));
  background-size: 22px 22px, 22px 22px, 22px 22px, 22px 22px, 100% 100%;
  background-position: 0 0, 0 11px, 11px -11px, -11px 0, 0 0;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    inset 0 0 0 10px rgba(255, 255, 255, 0.01),
    0 16px 34px rgba(0, 0, 0, 0.28);
}

.preview-grid,
.preview-safety-ring {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.preview-grid {
  background-image:
    linear-gradient(rgba(125, 211, 252, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125, 211, 252, 0.08) 1px, transparent 1px);
  background-size: 32px 32px, 32px 32px;
  opacity: 0.45;
  mask-image: radial-gradient(circle at center, black 58%, transparent 100%);
}

.preview-safety-ring {
  inset: 10px;
  border-radius: 14px;
  border: 1px dashed rgba(125, 211, 252, 0.22);
}

.preview-image {
  position: absolute;
  inset: 0;
  margin: auto;
  max-width: 84%;
  max-height: 84%;
  width: auto;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 16px 28px rgba(0, 0, 0, 0.4));
}

.preview-background-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.preview-background-card {
  min-width: 0;
}

.preview-background-surface {
  position: relative;
  min-height: 118px;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    0 10px 22px rgba(0, 0, 0, 0.18);
}

.preview-background-surface {
  display: grid;
  place-items: center;
}

.preview-background-surface--dark {
  background:
    radial-gradient(circle at 20% 18%, rgba(148, 163, 184, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(5, 8, 13, 0.98), rgba(15, 23, 42, 0.98));
}

.preview-background-surface--light {
  background:
    radial-gradient(circle at 20% 18%, rgba(15, 23, 42, 0.04), transparent 30%),
    linear-gradient(180deg, #fafafa, #e5e7eb);
}

.preview-background-surface--grid {
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.06) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.06) 75%),
    linear-gradient(180deg, rgba(12, 17, 26, 0.95), rgba(5, 8, 13, 0.98));
  background-size: 18px 18px, 18px 18px, 18px 18px, 18px 18px, 100% 100%;
  background-position: 0 0, 0 9px, 9px -9px, -9px 0, 0 0;
}

.preview-background-surface--custom {
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.14), transparent 28%),
    linear-gradient(180deg, var(--preview-custom-bg, #ef4444), var(--preview-custom-bg, #ef4444));
}

.preview-background-image {
  position: absolute;
  inset: 0;
  margin: auto;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  object-fit: contain;
  filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.38));
}

.preview-background-picker {
  position: absolute;
  right: 8px;
  top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(7, 10, 15, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e8edf7;
  font-size: 9px;
  opacity: 0.92;
}

.preview-background-picker input {
  width: 20px;
  height: 20px;
  border: 0;
  padding: 0;
  background: transparent;
}

.preview-background-label {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 7px;
  border-radius: 10px;
  background: rgba(7, 10, 15, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e8edf7;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  pointer-events: none;
}

.preview-background-card:hover .preview-background-label,
.preview-background-card:focus-within .preview-background-label {
  opacity: 1;
  transform: translateY(0);
}

.preview-background-label strong {
  font-size: 10px;
  font-weight: 700;
}

.preview-background-label span {
  font-size: 8px;
  color: #c4d6ec;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.preview-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(4, 9, 16, 0.25);
}

.spinner {
  width: 34px;
  height: 34px;
  border: 3px solid rgba(148, 163, 184, 0.16);
  border-top-color: #7dd3fc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-info {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
}

.info-item {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.88);
  color: #dce4f0;
  font-size: 9px;
}

.panel-section {
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.panel-section:first-child {
  border-top: 0;
}

.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 11px 8px;
  border: 0;
  background: transparent;
  color: #d6deea;
  text-align: left;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 600;
}

.panel-icon {
  color: #7dd3fc;
  display: inline-flex;
}

.toggle-icon {
  color: #72839d;
  transition: transform 0.18s ease;
}

.toggle-icon.collapsed {
  transform: rotate(-90deg);
}

.section-body {
  padding: 0 11px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  color: #c9d3e3;
  cursor: pointer;
}

.switch {
  width: 38px;
  height: 22px;
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.9);
}

.switch::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #96a7bf;
  transition: transform 0.18s ease, background 0.18s ease;
}

.switch:checked {
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.22);
}

.switch:checked::before {
  transform: translateX(16px);
  background: #fff;
}

.copy-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 8px;
}

.copy-tab {
  min-height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.8);
  color: #9fb0c9;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.copy-tab.active {
  border-color: rgba(96, 165, 250, 0.5);
  color: #fff;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(14, 165, 233, 0.16));
}

.copy-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}

.copy-preview {
  margin: 0;
  min-height: 84px;
  max-height: 116px;
  overflow: auto;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(4, 9, 16, 0.92);
  color: #d7e0ee;
  font-family: 'IBM Plex Mono', 'Cascadia Mono', Consolas, monospace;
  font-size: 10px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.btn-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 84px;
  min-height: 34px;
  align-self: start;
  padding: 0 12px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  box-shadow: 0 16px 28px rgba(37, 99, 235, 0.22);
}

.btn-copy:hover {
  transform: translateY(-1px);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(34, 197, 94, 0.28);
  color: #dff7e7;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.3);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

@media (max-width: 1240px) {
  .hero-strip {
    grid-template-columns: 1fr;
  }

  .jump-deck {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar {
    grid-template-columns: 1fr;
    justify-items: stretch;
  }

  .toolbar-center {
    justify-self: start;
  }

  .workspace {
    grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  }

  .panel-left,
  .panel-right {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .preview-zone,
  .export-panel {
    grid-column: 1 / -1;
    grid-row: auto;
  }
}

@media (max-width: 920px) {
  .hero-links,
  .jump-deck {
    grid-template-columns: 1fr;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .preview-frame {
    width: min(100%, 188px);
  }

  .preview-background-grid {
    grid-template-columns: 1fr;
  }

  .copy-content {
    grid-template-columns: 1fr;
  }

  .btn-copy {
    width: 100%;
    min-height: 42px;
  }
}

@media (max-width: 640px) {
  .app {
    padding: 10px;
  }

  .hero-strip {
    padding: 16px;
    border-radius: 22px;
  }

  .hero-copy h1 {
    font-size: 30px;
  }

  .panel-subtitle {
    display: none;
  }

  .shape-grid {
    grid-template-columns: 1fr 1fr;
  }

  .preset-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .panel-content,
  .section-body,
  .preview-zone,
  .export-panel {
    padding-left: 12px;
    padding-right: 12px;
  }

  .toolbar-right {
    justify-content: stretch;
  }

  .btn-tool {
    flex: 1 1 auto;
  }
}
</style>
