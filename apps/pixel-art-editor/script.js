'use strict';

// ============================================================
//  PALETTES
// ============================================================
const PALETTES = {
  gameboy: [
    '#0f380f','#306230','#8bac0f','#9bbc0f',
    '#1b3a1b','#2d5a27','#568b2e','#a8d54d',
    '#000000','#181818','#555555','#888888',
    '#aaaaaa','#cccccc','#dddddd','#ffffff',
  ],
  famicom: [
    '#000000','#ffffff','#ff0000','#00aa00',
    '#0000cc','#ffff00','#ff8800','#00cccc',
    '#880000','#004400','#000088','#888800',
    '#884400','#004488','#440088','#884488',
  ],
  nes: [
    '#7c7c7c','#0000fc','#0000bc','#4428bc',
    '#940084','#a80020','#a81000','#881400',
    '#503000','#007800','#006800','#005800',
    '#004058','#000000','#000000','#000000',
    '#bcbcbc','#0078f8','#0058f8','#6844fc',
    '#d800cc','#e40058','#f83800','#e45c10',
    '#ac7c00','#00b800','#00a800','#00a844',
    '#008888','#000000','#000000','#000000',
  ],
  custom: [],
};

// ============================================================
//  STATE
// ============================================================
const MAX_LAYERS  = 3;
const MAX_FRAMES  = 8;
const UNDO_LIMIT  = 20;

let state = {
  gridSize:       16,
  currentTool:    'pen',
  currentColor:   '#000000',
  showGrid:       true,
  currentLayer:   0,
  currentFrame:   0,
  currentPalette: 'gameboy',

  // frames[frameIndex][layerIndex] = ImageData | null
  frames: [],

  layers: [
    { name: 'レイヤー 1', visible: true, opacity: 100 },
  ],

  undoStack: [],
  redoStack: [],
};

// ============================================================
//  DOM REFS
// ============================================================
const pixelCanvas   = document.getElementById('pixel-canvas');
const gridCanvas    = document.getElementById('grid-canvas');
const ctx           = pixelCanvas.getContext('2d');
const gctx          = gridCanvas.getContext('2d');
const canvasSizeEl  = document.getElementById('canvas-size');
const btnToggleGrid = document.getElementById('btn-toggle-grid');
const btnUndo       = document.getElementById('btn-undo');
const btnRedo       = document.getElementById('btn-redo');
const btnClear      = document.getElementById('btn-clear');
const paletteGrid   = document.getElementById('palette-grid');
const paletteTabs   = document.querySelectorAll('.palette-tab');
const colorCurrent  = document.getElementById('color-current');
const colorPicker   = document.getElementById('color-picker-input');
const btnAddColor   = document.getElementById('btn-add-color');
const layerList     = document.getElementById('layer-list');
const btnAddLayer   = document.getElementById('btn-add-layer');
const frameList     = document.getElementById('frame-list');
const btnAddFrame   = document.getElementById('btn-add-frame');
const btnPreview    = document.getElementById('btn-preview');
const btnExport     = document.getElementById('btn-export');
const exportScale   = document.getElementById('export-scale');
const previewModal  = document.getElementById('preview-modal');
const previewCanvas = document.getElementById('preview-canvas');
const btnClosePrev  = document.getElementById('btn-close-preview');
const fpsSlider     = document.getElementById('fps-slider');
const fpsValue      = document.getElementById('fps-value');
const toolBtns      = document.querySelectorAll('.tool-btn');

// ============================================================
//  CANVAS SIZING
// ============================================================
/** Compute the CSS pixel size of one grid cell */
function getCellSize() {
  const wrapW = document.getElementById('canvas-wrap').clientWidth  - 24;
  const wrapH = document.getElementById('canvas-wrap').clientHeight - 24;
  const maxPx = Math.min(wrapW, wrapH, 512);
  return Math.max(4, Math.floor(maxPx / state.gridSize));
}

function resizeCanvases() {
  const cell = getCellSize();
  const px   = state.gridSize * cell;
  [pixelCanvas, gridCanvas].forEach(c => {
    c.width  = px;
    c.height = px;
    c.style.width  = px + 'px';
    c.style.height = px + 'px';
  });
}

// ============================================================
//  FRAME / LAYER DATA
// ============================================================
function newLayerData() {
  const data = new ImageData(state.gridSize, state.gridSize);
  // Fill transparent
  return data;
}

function initFrames() {
  state.frames = [];
  const frame = state.layers.map(() => newLayerData());
  state.frames.push(frame);
}

function getLayerData(frameIdx, layerIdx) {
  return state.frames[frameIdx][layerIdx];
}

function setPixel(imageData, x, y, r, g, b, a) {
  const i = (y * imageData.width + x) * 4;
  imageData.data[i]     = r;
  imageData.data[i + 1] = g;
  imageData.data[i + 2] = b;
  imageData.data[i + 3] = a;
}

function getPixel(imageData, x, y) {
  const i = (y * imageData.width + x) * 4;
  return [
    imageData.data[i],
    imageData.data[i + 1],
    imageData.data[i + 2],
    imageData.data[i + 3],
  ];
}

function hexToRgba(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function rgbaToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function cloneImageData(src) {
  const dst = new ImageData(src.width, src.height);
  dst.data.set(src.data);
  return dst;
}

// ============================================================
//  RENDER
// ============================================================
function renderAll() {
  renderPixels();
  if (state.showGrid) renderGrid();
  else gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  updateFrameThumbs();
}

function renderPixels() {
  const sz = state.gridSize;
  const cell = pixelCanvas.width / sz;
  ctx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);

  // Draw layers bottom to top
  for (let li = state.layers.length - 1; li >= 0; li--) {
    const layer = state.layers[li];
    if (!layer.visible) continue;
    const imgData = getLayerData(state.currentFrame, li);
    const alpha = layer.opacity / 100;

    // Render each pixel
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        const [r, g, b, a] = getPixel(imgData, x, y);
        if (a === 0) continue;
        ctx.globalAlpha = (a / 255) * alpha;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function renderGrid() {
  const sz   = state.gridSize;
  const cell = gridCanvas.width / sz;
  gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  gctx.strokeStyle = 'rgba(255,255,255,0.12)';
  gctx.lineWidth = 0.5;

  for (let i = 0; i <= sz; i++) {
    const p = i * cell;
    gctx.beginPath();
    gctx.moveTo(p, 0);
    gctx.lineTo(p, gridCanvas.height);
    gctx.stroke();
    gctx.beginPath();
    gctx.moveTo(0, p);
    gctx.lineTo(gridCanvas.width, p);
    gctx.stroke();
  }
}

// ============================================================
//  UNDO / REDO
// ============================================================
function saveUndo() {
  // Deep-copy all frame/layer data
  const snapshot = state.frames.map(frame =>
    frame.map(cloneImageData)
  );
  state.undoStack.push(snapshot);
  if (state.undoStack.length > UNDO_LIMIT) state.undoStack.shift();
  state.redoStack = [];
  updateUndoButtons();
}

function applySnapshot(snapshot) {
  state.frames = snapshot.map(frame => frame.map(cloneImageData));
  renderAll();
}

function undo() {
  if (!state.undoStack.length) return;
  const current = state.frames.map(frame => frame.map(cloneImageData));
  state.redoStack.push(current);
  applySnapshot(state.undoStack.pop());
  updateUndoButtons();
}

function redo() {
  if (!state.redoStack.length) return;
  const current = state.frames.map(frame => frame.map(cloneImageData));
  state.undoStack.push(current);
  applySnapshot(state.redoStack.pop());
  updateUndoButtons();
}

function updateUndoButtons() {
  btnUndo.disabled = state.undoStack.length === 0;
  btnRedo.disabled = state.redoStack.length === 0;
}

// ============================================================
//  DRAWING TOOLS
// ============================================================
function posToCell(e) {
  const rect = pixelCanvas.getBoundingClientRect();
  const scaleX = pixelCanvas.width  / rect.width;
  const scaleY = pixelCanvas.height / rect.height;
  let clientX, clientY;
  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  const x = Math.floor((clientX - rect.left) * scaleX / (pixelCanvas.width / state.gridSize));
  const y = Math.floor((clientY - rect.top)  * scaleY / (pixelCanvas.height / state.gridSize));
  return [x, y];
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < state.gridSize && y < state.gridSize;
}

function applyPen(x, y) {
  if (!inBounds(x, y)) return;
  const imgData = getLayerData(state.currentFrame, state.currentLayer);
  const [r, g, b, a] = hexToRgba(state.currentColor);
  setPixel(imgData, x, y, r, g, b, a);
}

function applyEraser(x, y) {
  if (!inBounds(x, y)) return;
  const imgData = getLayerData(state.currentFrame, state.currentLayer);
  setPixel(imgData, x, y, 0, 0, 0, 0);
}

function applyFill(x, y) {
  if (!inBounds(x, y)) return;
  const imgData = getLayerData(state.currentFrame, state.currentLayer);
  const [tr, tg, tb, ta] = getPixel(imgData, x, y);
  const [fr, fg, fb, fa] = hexToRgba(state.currentColor);
  // Same color check
  if (tr === fr && tg === fg && tb === fb && ta === fa) return;

  const queue = [[x, y]];
  const visited = new Uint8Array(state.gridSize * state.gridSize);
  visited[y * state.gridSize + x] = 1;

  while (queue.length) {
    const [cx, cy] = queue.shift();
    const [cr, cg, cb, ca] = getPixel(imgData, cx, cy);
    if (cr !== tr || cg !== tg || cb !== tb || ca !== ta) continue;
    setPixel(imgData, cx, cy, fr, fg, fb, fa);

    const neighbors = [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]];
    for (const [nx, ny] of neighbors) {
      if (inBounds(nx, ny) && !visited[ny * state.gridSize + nx]) {
        visited[ny * state.gridSize + nx] = 1;
        queue.push([nx, ny]);
      }
    }
  }
}

function applyPicker(x, y) {
  if (!inBounds(x, y)) return;
  // Sample composite (top visible layer)
  let pickedR = 0, pickedG = 0, pickedB = 0, pickedA = 0;
  for (let li = 0; li < state.layers.length; li++) {
    const layer = state.layers[li];
    if (!layer.visible) continue;
    const imgData = getLayerData(state.currentFrame, li);
    const [r, g, b, a] = getPixel(imgData, x, y);
    if (a > 0) { pickedR = r; pickedG = g; pickedB = b; pickedA = a; break; }
  }
  if (pickedA === 0) return;
  setCurrentColor(rgbaToHex(pickedR, pickedG, pickedB));
  // Switch back to pen
  selectTool('pen');
}

function applyTool(x, y) {
  switch (state.currentTool) {
    case 'pen':    applyPen(x, y);    break;
    case 'eraser': applyEraser(x, y); break;
    case 'fill':   applyFill(x, y);   break;
    case 'picker': applyPicker(x, y); break;
  }
}

// ============================================================
//  POINTER / TOUCH EVENTS
// ============================================================
let isDrawing = false;
let lastCell  = null;

function startDraw(e) {
  e.preventDefault();
  if (state.currentTool === 'fill' || state.currentTool === 'picker') {
    saveUndo();
    const [x, y] = posToCell(e);
    applyTool(x, y);
    renderAll();
    return;
  }
  isDrawing = true;
  saveUndo();
  const [x, y] = posToCell(e);
  lastCell = [x, y];
  applyTool(x, y);
  renderAll();
}

function continueDraw(e) {
  e.preventDefault();
  if (!isDrawing) return;
  const [x, y] = posToCell(e);
  if (lastCell && lastCell[0] === x && lastCell[1] === y) return;
  // Draw line between last and current to avoid gaps
  if (lastCell) {
    const [lx, ly] = lastCell;
    const steps = Math.max(Math.abs(x - lx), Math.abs(y - ly));
    for (let s = 0; s <= steps; s++) {
      const t  = steps === 0 ? 0 : s / steps;
      const ix = Math.round(lx + (x - lx) * t);
      const iy = Math.round(ly + (y - ly) * t);
      applyTool(ix, iy);
    }
  } else {
    applyTool(x, y);
  }
  lastCell = [x, y];
  renderAll();
}

function endDraw(e) {
  if (isDrawing) {
    isDrawing = false;
    lastCell  = null;
    updateFrameThumbs();
  }
}

pixelCanvas.addEventListener('mousedown',  startDraw,    { passive: false });
pixelCanvas.addEventListener('mousemove',  continueDraw, { passive: false });
pixelCanvas.addEventListener('mouseup',    endDraw);
pixelCanvas.addEventListener('mouseleave', endDraw);

pixelCanvas.addEventListener('touchstart', startDraw,    { passive: false });
pixelCanvas.addEventListener('touchmove',  continueDraw, { passive: false });
pixelCanvas.addEventListener('touchend',   endDraw,      { passive: false });

// ============================================================
//  TOOL SELECTION
// ============================================================
function selectTool(tool) {
  state.currentTool = tool;
  toolBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
}

toolBtns.forEach(btn => {
  btn.addEventListener('click', () => selectTool(btn.dataset.tool));
});

// ============================================================
//  COLOR
// ============================================================
function setCurrentColor(hex) {
  state.currentColor = hex;
  colorCurrent.style.background = hex;
  colorPicker.value = hex;
  // Update swatch selection
  document.querySelectorAll('.palette-swatch').forEach(sw => {
    sw.classList.toggle('selected', sw.dataset.color === hex);
  });
}

colorPicker.addEventListener('input', () => setCurrentColor(colorPicker.value));
colorCurrent.addEventListener('click', () => colorPicker.click());

// ============================================================
//  PALETTE
// ============================================================
function renderPalette() {
  paletteGrid.innerHTML = '';
  const colors = PALETTES[state.currentPalette];
  colors.forEach(hex => {
    const sw = document.createElement('div');
    sw.className = 'palette-swatch';
    sw.style.background = hex;
    sw.dataset.color = hex;
    sw.setAttribute('role', 'option');
    sw.setAttribute('aria-label', hex);
    sw.setAttribute('title', hex);
    if (hex === state.currentColor) sw.classList.add('selected');
    sw.addEventListener('click', () => setCurrentColor(hex));
    paletteGrid.appendChild(sw);
  });
}

paletteTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    paletteTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.currentPalette = tab.dataset.palette;
    renderPalette();
  });
});

btnAddColor.addEventListener('click', () => {
  if (!PALETTES.custom.includes(state.currentColor)) {
    PALETTES.custom.push(state.currentColor);
    if (state.currentPalette === 'custom') renderPalette();
    // Auto switch to custom tab
    paletteTabs.forEach(t => {
      if (t.dataset.palette === 'custom') {
        t.click();
      }
    });
  }
});

// ============================================================
//  LAYERS
// ============================================================
function renderLayerList() {
  layerList.innerHTML = '';
  state.layers.forEach((layer, li) => {
    const item = document.createElement('div');
    item.className = 'layer-item' + (li === state.currentLayer ? ' active' : '');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', layer.name);
    item.addEventListener('click', () => {
      state.currentLayer = li;
      renderLayerList();
    });

    // Visibility toggle
    const visBtn = document.createElement('button');
    visBtn.className = 'layer-vis-btn';
    visBtn.textContent = layer.visible ? '👁' : '🚫';
    visBtn.title = layer.visible ? '非表示にする' : '表示する';
    visBtn.addEventListener('click', ev => {
      ev.stopPropagation();
      layer.visible = !layer.visible;
      renderLayerList();
      renderAll();
    });
    item.appendChild(visBtn);

    // Name
    const nameEl = document.createElement('span');
    nameEl.className = 'layer-name';
    nameEl.textContent = layer.name;
    item.appendChild(nameEl);

    // Opacity
    const opInput = document.createElement('input');
    opInput.type = 'number';
    opInput.className = 'layer-opacity';
    opInput.min = 0;
    opInput.max = 100;
    opInput.value = layer.opacity;
    opInput.title = '不透明度';
    opInput.addEventListener('click', ev => ev.stopPropagation());
    opInput.addEventListener('change', ev => {
      layer.opacity = Math.min(100, Math.max(0, parseInt(ev.target.value) || 100));
      renderAll();
    });
    item.appendChild(opInput);

    // Delete (only if more than 1 layer)
    if (state.layers.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'layer-del-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'レイヤー削除';
      delBtn.addEventListener('click', ev => {
        ev.stopPropagation();
        saveUndo();
        state.layers.splice(li, 1);
        state.frames.forEach(frame => frame.splice(li, 1));
        state.currentLayer = Math.min(state.currentLayer, state.layers.length - 1);
        renderLayerList();
        renderAll();
      });
      item.appendChild(delBtn);
    }

    layerList.appendChild(item);
  });
}

btnAddLayer.addEventListener('click', () => {
  if (state.layers.length >= MAX_LAYERS) {
    alert(`レイヤーは最大${MAX_LAYERS}枚までです。`);
    return;
  }
  saveUndo();
  const newIdx = state.layers.length;
  state.layers.push({ name: `レイヤー ${newIdx + 1}`, visible: true, opacity: 100 });
  state.frames.forEach(frame => frame.push(newLayerData()));
  state.currentLayer = newIdx;
  renderLayerList();
  renderAll();
});

// ============================================================
//  FRAMES
// ============================================================
function updateFrameThumbs() {
  // Render thumbnails
  document.querySelectorAll('.frame-thumb canvas').forEach((thumbCanvas, fi) => {
    const tctx = thumbCanvas.getContext('2d');
    const sz   = state.gridSize;
    thumbCanvas.width  = sz;
    thumbCanvas.height = sz;
    tctx.clearRect(0, 0, sz, sz);
    for (let li = state.layers.length - 1; li >= 0; li--) {
      const layer = state.layers[li];
      if (!layer.visible) continue;
      const imgData = getLayerData(fi, li);
      const alpha = layer.opacity / 100;
      for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
          const [r, g, b, a] = getPixel(imgData, x, y);
          if (a === 0) continue;
          tctx.globalAlpha = (a / 255) * alpha;
          tctx.fillStyle = `rgb(${r},${g},${b})`;
          tctx.fillRect(x, y, 1, 1);
        }
      }
      tctx.globalAlpha = 1;
    }
  });
}

function renderFrameList() {
  frameList.innerHTML = '';
  state.frames.forEach((_, fi) => {
    const thumb = document.createElement('div');
    thumb.className = 'frame-thumb' + (fi === state.currentFrame ? ' active' : '');
    thumb.title = `フレーム ${fi + 1}`;
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('tabindex', '0');
    thumb.setAttribute('aria-label', `フレーム ${fi + 1}`);

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width  = state.gridSize;
    thumbCanvas.height = state.gridSize;
    thumb.appendChild(thumbCanvas);

    // Delete button (show on hover via CSS)
    if (state.frames.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'frame-del-btn';
      delBtn.textContent = '✕';
      delBtn.title = `フレーム ${fi + 1} を削除`;
      delBtn.addEventListener('click', ev => {
        ev.stopPropagation();
        saveUndo();
        state.frames.splice(fi, 1);
        state.currentFrame = Math.min(state.currentFrame, state.frames.length - 1);
        renderFrameList();
        renderAll();
      });
      thumb.appendChild(delBtn);
    }

    thumb.addEventListener('click', () => {
      state.currentFrame = fi;
      renderFrameList();
      renderAll();
    });
    frameList.appendChild(thumb);
  });
  updateFrameThumbs();
}

btnAddFrame.addEventListener('click', () => {
  if (state.frames.length >= MAX_FRAMES) {
    alert(`フレームは最大${MAX_FRAMES}枚までです。`);
    return;
  }
  saveUndo();
  const newFrame = state.layers.map(() => newLayerData());
  state.frames.push(newFrame);
  state.currentFrame = state.frames.length - 1;
  renderFrameList();
  renderAll();
});

// ============================================================
//  CANVAS SIZE CHANGE
// ============================================================
canvasSizeEl.addEventListener('change', () => {
  if (!confirm('キャンバスサイズを変更すると描画内容がリセットされます。続けますか？')) {
    canvasSizeEl.value = state.gridSize;
    return;
  }
  state.gridSize    = parseInt(canvasSizeEl.value);
  state.currentLayer = 0;
  state.currentFrame = 0;
  state.layers = [{ name: 'レイヤー 1', visible: true, opacity: 100 }];
  state.undoStack = [];
  state.redoStack = [];
  initFrames();
  resizeCanvases();
  renderLayerList();
  renderFrameList();
  renderAll();
  updateUndoButtons();
});

// ============================================================
//  GRID TOGGLE
// ============================================================
btnToggleGrid.addEventListener('click', () => {
  state.showGrid = !state.showGrid;
  btnToggleGrid.style.opacity = state.showGrid ? '1' : '0.5';
  renderAll();
});

// ============================================================
//  UNDO / REDO BUTTONS
// ============================================================
btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);

// ============================================================
//  CLEAR
// ============================================================
btnClear.addEventListener('click', () => {
  if (!confirm('現在のレイヤーをクリアします。続けますか？')) return;
  saveUndo();
  state.frames[state.currentFrame][state.currentLayer] = newLayerData();
  renderAll();
});

// ============================================================
//  PREVIEW (ANIMATION)
// ============================================================
let previewInterval = null;
let previewFrameIdx = 0;

function stopPreview() {
  if (previewInterval) {
    clearInterval(previewInterval);
    previewInterval = null;
  }
}

function startPreview() {
  const sz  = state.gridSize;
  const fps = parseInt(fpsSlider.value);
  const scale = 8;
  previewCanvas.width  = sz * scale;
  previewCanvas.height = sz * scale;
  previewCanvas.style.width  = sz * scale + 'px';
  previewCanvas.style.height = sz * scale + 'px';
  const pctx = previewCanvas.getContext('2d');

  stopPreview();
  previewFrameIdx = 0;

  function drawFrame() {
    pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    const frameData = state.frames[previewFrameIdx];
    for (let li = state.layers.length - 1; li >= 0; li--) {
      const layer = state.layers[li];
      if (!layer.visible) continue;
      const imgData = frameData[li];
      const alpha = layer.opacity / 100;
      for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
          const [r, g, b, a] = getPixel(imgData, x, y);
          if (a === 0) continue;
          pctx.globalAlpha = (a / 255) * alpha;
          pctx.fillStyle = `rgb(${r},${g},${b})`;
          pctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      pctx.globalAlpha = 1;
    }
    previewFrameIdx = (previewFrameIdx + 1) % state.frames.length;
  }

  drawFrame();
  if (state.frames.length > 1) {
    previewInterval = setInterval(drawFrame, 1000 / fps);
  }
}

btnPreview.addEventListener('click', () => {
  previewModal.hidden = false;
  startPreview();
});

btnClosePrev.addEventListener('click', () => {
  stopPreview();
  previewModal.hidden = true;
});

previewModal.addEventListener('click', ev => {
  if (ev.target === previewModal) {
    stopPreview();
    previewModal.hidden = true;
  }
});

fpsSlider.addEventListener('input', () => {
  fpsValue.textContent = fpsSlider.value;
  if (!previewModal.hidden) startPreview();
});

// ============================================================
//  EXPORT PNG
// ============================================================
btnExport.addEventListener('click', () => {
  const sz    = state.gridSize;
  const scale = parseInt(exportScale.value);
  const out   = document.createElement('canvas');
  out.width   = sz * scale;
  out.height  = sz * scale;
  const octx  = out.getContext('2d');

  for (let li = state.layers.length - 1; li >= 0; li--) {
    const layer = state.layers[li];
    if (!layer.visible) continue;
    const imgData = getLayerData(state.currentFrame, li);
    const alpha = layer.opacity / 100;
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        const [r, g, b, a] = getPixel(imgData, x, y);
        if (a === 0) continue;
        octx.globalAlpha = (a / 255) * alpha;
        octx.fillStyle = `rgb(${r},${g},${b})`;
        octx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    octx.globalAlpha = 1;
  }

  out.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `pixel-art-${sz}x${sz}-${scale}x.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
});

// ============================================================
//  KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  // Don't fire when typing in input
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 'z') { e.preventDefault(); undo(); return; }
  if (ctrl && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }

  switch (e.key.toLowerCase()) {
    case 'p': selectTool('pen');    break;
    case 'e': selectTool('eraser'); break;
    case 'f': selectTool('fill');   break;
    case 'i': selectTool('picker'); break;
    case 'g':
      state.showGrid = !state.showGrid;
      btnToggleGrid.style.opacity = state.showGrid ? '1' : '0.5';
      renderAll();
      break;
  }
});

// ============================================================
//  RESIZE OBSERVER
// ============================================================
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => {
    resizeCanvases();
    renderAll();
  });
  ro.observe(document.getElementById('canvas-wrap'));
}

// ============================================================
//  INIT
// ============================================================
function init() {
  initFrames();
  resizeCanvases();
  setCurrentColor('#000000');
  renderPalette();
  renderLayerList();
  renderFrameList();
  renderAll();
  updateUndoButtons();
}

init();
