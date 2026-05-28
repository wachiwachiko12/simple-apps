'use strict';

/* ====================================================
   DEVICE MOCKUP TOOL — script.js
   Pure Canvas API implementation. No external libraries.
==================================================== */

// --------------- State ---------------
let uploadedImage = null;
let currentDevice = 'iphone';
let currentBg = 'solid';
let bgColor = '#f0f4ff';
let gradColor1 = '#667eea';
let gradColor2 = '#764ba2';
let scale = 0.80;

// --------------- DOM refs ---------------
const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const uploadStatus   = document.getElementById('upload-status');
const canvas         = document.getElementById('preview-canvas');
const placeholder    = document.getElementById('preview-placeholder');
const generateBtn    = document.getElementById('generate-btn');
const downloadBtn    = document.getElementById('download-btn');
const scaleSlider    = document.getElementById('scale-slider');
const scaleValue     = document.getElementById('scale-value');
const bgColorInput   = document.getElementById('bg-color');
const gradColor1Input= document.getElementById('grad-color1');
const gradColor2Input= document.getElementById('grad-color2');
const colorPickerWrap   = document.getElementById('color-picker-wrap');
const gradientPickerWrap= document.getElementById('gradient-picker-wrap');

const ctx = canvas.getContext('2d');

// --------------- Device frame specs (logical units, will be scaled) ---------------
// All frames define the canvas size, the screen rect, and a draw function.
const DEVICE_SPECS = {
  iphone: {
    canvasW: 390,
    canvasH: 780,
    screenX: 20,
    screenY: 50,
    screenW: 350,
    screenH: 665,
    draw: drawIphone,
  },
  ipad: {
    canvasW: 740,
    canvasH: 560,
    screenX: 50,
    screenY: 40,
    screenW: 640,
    screenH: 480,
    draw: drawIpad,
  },
  macbook: {
    canvasW: 780,
    canvasH: 540,
    screenX: 60,
    screenY: 35,
    screenW: 660,
    screenH: 415,
    draw: drawMacbook,
  },
  browser: {
    canvasW: 780,
    canvasH: 540,
    screenX: 0,
    screenY: 44,
    screenW: 780,
    screenH: 496,
    draw: drawBrowser,
  },
};

// --------------- Event listeners ---------------

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

// File input
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// Device buttons
document.querySelectorAll('.device-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.device-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentDevice = btn.dataset.device;
    if (uploadedImage) renderMockup();
  });
});

// Background type buttons
document.querySelectorAll('.bg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentBg = btn.dataset.bg;
    colorPickerWrap.style.display   = (currentBg === 'solid')    ? '' : 'none';
    gradientPickerWrap.style.display= (currentBg === 'gradient') ? '' : 'none';
    if (uploadedImage) renderMockup();
  });
});

// Color pickers
bgColorInput.addEventListener('input', () => {
  bgColor = bgColorInput.value;
  if (uploadedImage) renderMockup();
});
gradColor1Input.addEventListener('input', () => {
  gradColor1 = gradColor1Input.value;
  if (uploadedImage) renderMockup();
});
gradColor2Input.addEventListener('input', () => {
  gradColor2 = gradColor2Input.value;
  if (uploadedImage) renderMockup();
});

// Scale slider
scaleSlider.addEventListener('input', () => {
  scale = parseInt(scaleSlider.value, 10) / 100;
  scaleValue.textContent = scaleSlider.value;
  if (uploadedImage) renderMockup();
});

// Buttons
generateBtn.addEventListener('click', () => {
  if (uploadedImage) renderMockup();
});
downloadBtn.addEventListener('click', downloadPng);

// --------------- File handling ---------------
function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    setStatus('画像ファイル（PNG・JPEG等）を選択してください', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      setStatus(`読み込み完了: ${file.name}`);
      generateBtn.disabled = false;
      downloadBtn.disabled = false;
      renderMockup();
    };
    img.onerror = () => setStatus('画像の読み込みに失敗しました', true);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setStatus(msg, isError = false) {
  uploadStatus.textContent = msg;
  uploadStatus.className = 'upload-status' + (isError ? ' error' : '');
}

// --------------- Render ---------------
function renderMockup() {
  const spec = DEVICE_SPECS[currentDevice];
  const dpr = window.devicePixelRatio || 1;

  // Base canvas dimensions (logical pixels * scale factor)
  const logicalW = spec.canvasW;
  const logicalH = spec.canvasH;

  // Output canvas is fixed logical size regardless of scale slider;
  // scale slider only controls device size within canvas.
  // We use a generous output size and place device centered.
  const padding = 40;
  const deviceW = Math.round(logicalW * scale);
  const deviceH = Math.round(logicalH * scale);
  const outW = deviceW + padding * 2;
  const outH = deviceH + padding * 2;

  canvas.width  = outW * dpr;
  canvas.height = outH * dpr;
  canvas.style.width  = outW + 'px';
  canvas.style.height = outH + 'px';
  ctx.scale(dpr, dpr);

  // Background
  drawBackground(outW, outH);

  // Draw device frame (translated & scaled)
  ctx.save();
  ctx.translate(padding, padding);
  ctx.scale(scale, scale);
  spec.draw(ctx, uploadedImage, spec);
  ctx.restore();

  // Show canvas
  canvas.style.display = 'block';
  placeholder.style.display = 'none';
}

function drawBackground(w, h) {
  if (currentBg === 'transparent') {
    ctx.clearRect(0, 0, w, h);
    return;
  }
  if (currentBg === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, gradColor1);
    grad.addColorStop(1, gradColor2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bgColor;
  }
  ctx.fillRect(0, 0, w, h);
}

// --------------- Device draw functions ---------------
// All drawing is in logical pixels (unscaled). The caller applies ctx.scale(scale, scale).

// Helper: draw image fitted (cover) inside a rect
function drawImageFitted(img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Helper: rounded rect path
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ---- iPhone ---- */
function drawIphone(ctx, img, spec) {
  const { canvasW: W, canvasH: H } = spec;
  const bodyR = 36;
  const bodyPad = 0;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.30)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;

  // Body
  roundRect(bodyPad, bodyPad, W - bodyPad * 2, H - bodyPad * 2, bodyR);
  ctx.fillStyle = '#1c1c1e';
  ctx.fill();
  ctx.restore();

  // Body stroke (aluminum edge)
  roundRect(bodyPad, bodyPad, W - bodyPad * 2, H - bodyPad * 2, bodyR);
  ctx.strokeStyle = '#3a3a3c';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Screen background
  roundRect(spec.screenX, spec.screenY, spec.screenW, spec.screenH, 6);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Screenshot
  if (img) {
    ctx.save();
    roundRect(spec.screenX, spec.screenY, spec.screenW, spec.screenH, 6);
    ctx.clip();
    drawImageFitted(img, spec.screenX, spec.screenY, spec.screenW, spec.screenH);
    ctx.restore();
  }

  // Dynamic Island (notch)
  const niW = 110, niH = 30, niX = (W - niW) / 2, niY = spec.screenY + 10;
  roundRect(niX, niY, niW, niH, 15);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Camera dot inside notch
  ctx.beginPath();
  ctx.arc(niX + niW - 18, niY + niH / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(niX + niW - 18, niY + niH / 2, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();

  // Side buttons (right: power)
  ctx.fillStyle = '#2c2c2e';
  roundRect(W - bodyPad - 1.5, 170, 4, 60, 2);
  ctx.fill();

  // Side buttons (left: volume up + volume down + silent)
  ctx.fillStyle = '#2c2c2e';
  roundRect(bodyPad - 2.5, 130, 4, 28, 2);
  ctx.fill();
  roundRect(bodyPad - 2.5, 175, 4, 50, 2);
  ctx.fill();
  roundRect(bodyPad - 2.5, 240, 4, 50, 2);
  ctx.fill();

  // Home indicator
  const indW = 110, indH = 4;
  roundRect((W - indW) / 2, H - 20, indW, indH, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  // Status bar time text
  ctx.font = 'bold 14px -apple-system, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.fillText('9:41', spec.screenX + 18, spec.screenY + 42);

  // Status bar icons (simplified)
  const iconsX = spec.screenX + spec.screenW - 52;
  const iconsY = spec.screenY + 30;
  // Signal bars
  for (let i = 0; i < 4; i++) {
    const bH = 5 + i * 3;
    ctx.fillStyle = i < 3 ? 'white' : 'rgba(255,255,255,0.35)';
    ctx.fillRect(iconsX + i * 5, iconsY - bH, 3, bH);
  }
  // Battery
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.2;
  roundRect(iconsX + 22, iconsY - 10, 16, 9, 2);
  ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.fillRect(iconsX + 23, iconsY - 9, 10, 7);
  ctx.fillRect(iconsX + 38, iconsY - 7.5, 2, 4);
}

/* ---- iPad ---- */
function drawIpad(ctx, img, spec) {
  const { canvasW: W, canvasH: H } = spec;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  roundRect(0, 0, W, H, 18);
  ctx.fillStyle = '#1c1c1e';
  ctx.fill();
  ctx.restore();

  // Body stroke
  roundRect(0, 0, W, H, 18);
  ctx.strokeStyle = '#3a3a3c';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Screen bg
  roundRect(spec.screenX, spec.screenY, spec.screenW, spec.screenH, 4);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Screenshot
  if (img) {
    ctx.save();
    roundRect(spec.screenX, spec.screenY, spec.screenW, spec.screenH, 4);
    ctx.clip();
    drawImageFitted(img, spec.screenX, spec.screenY, spec.screenW, spec.screenH);
    ctx.restore();
  }

  // Front camera (center top)
  ctx.beginPath();
  ctx.arc(W / 2, spec.screenY / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Home button (right side, centered)
  const hbX = W - 22, hbY = H / 2;
  ctx.beginPath();
  ctx.arc(hbX, hbY, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#2c2c2e';
  ctx.fill();
  roundRect(hbX - 7, hbY - 7, 14, 14, 3);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* ---- MacBook ---- */
function drawMacbook(ctx, img, spec) {
  const { canvasW: W, canvasH: H } = spec;

  // Lid shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.30)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;

  // Lid (screen part)
  const lidH = H - 80;
  roundRect(0, 0, W, lidH, 10);
  ctx.fillStyle = '#d0d0d0';
  ctx.fill();
  ctx.restore();

  // Lid border
  roundRect(0, 0, W, lidH, 10);
  ctx.strokeStyle = '#b0b0b0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner bezel
  const bezelL = 12, bezelT = 14, bezelR = 12, bezelB = 16;
  const innerX = bezelL, innerY = bezelT;
  const innerW = W - bezelL - bezelR;
  const innerH = lidH - bezelT - bezelB;
  roundRect(innerX, innerY, innerW, innerH, 4);
  ctx.fillStyle = '#111';
  ctx.fill();

  // Screen area (inside inner bezel = same, no extra padding for max content)
  const sX = spec.screenX, sY = spec.screenY, sW = spec.screenW, sH = spec.screenH;
  roundRect(sX, sY, sW, sH, 3);
  ctx.fillStyle = '#111';
  ctx.fill();

  // Screenshot
  if (img) {
    ctx.save();
    roundRect(sX, sY, sW, sH, 3);
    ctx.clip();
    drawImageFitted(img, sX, sY, sW, sH);
    ctx.restore();
  }

  // FaceTime camera
  ctx.beginPath();
  ctx.arc(W / 2, bezelT / 2 + 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Apple logo hint (center of lid back — just a subtle circle)
  ctx.beginPath();
  ctx.arc(W / 2, lidH / 2, 10, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Base / keyboard body
  const baseY = lidH - 2;
  const baseH = 68;
  // Base shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 8;
  roundRect(0, baseY, W, baseH, 2);
  ctx.fillStyle = '#c8c8c8';
  ctx.fill();
  ctx.restore();

  roundRect(0, baseY, W, baseH, 2);
  ctx.fillStyle = '#cacaca';
  ctx.fill();

  // Hinge line
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  ctx.lineTo(W, baseY);
  ctx.strokeStyle = '#a0a0a0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Keyboard keys (simplified grid)
  ctx.fillStyle = '#b8b8b8';
  const keyRows = [
    { cols: 12, kw: 42, kh: 10, y: baseY + 10, startX: 10 },
    { cols: 12, kw: 42, kh: 10, y: baseY + 24, startX: 10 },
    { cols: 11, kw: 45, kh: 10, y: baseY + 38, startX: 10 },
  ];
  keyRows.forEach((row) => {
    const totalW = row.cols * row.kw + (row.cols - 1) * 3;
    const startX = (W - totalW) / 2;
    for (let i = 0; i < row.cols; i++) {
      roundRect(startX + i * (row.kw + 3), row.y, row.kw, row.kh, 2);
      ctx.fill();
    }
  });

  // Space bar
  roundRect(W / 2 - 90, baseY + 52, 180, 10, 2);
  ctx.fill();

  // Trackpad
  roundRect(W / 2 - 55, baseY + 34, 110, 28, 4);
  ctx.fillStyle = '#bbb';
  ctx.fill();
  roundRect(W / 2 - 55, baseY + 34, 110, 28, 4);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

/* ---- Browser (Chrome-style) ---- */
function drawBrowser(ctx, img, spec) {
  const { canvasW: W, canvasH: H } = spec;
  const tabBarH = 32;
  const toolbarH = 44;

  // Window shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRect(0, 0, W, H, 10);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  // Window border
  roundRect(0, 0, W, H, 10);
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tab bar
  roundRect(0, 0, W, tabBarH, 10);
  ctx.fillStyle = '#dee1e6';
  ctx.fill();
  // Fix bottom of tab bar (no radius at bottom)
  ctx.fillRect(0, tabBarH - 10, W, 10);

  // Active tab
  ctx.save();
  roundRect(12, 4, 180, tabBarH - 2, 6);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
  // Tab favicon placeholder
  ctx.fillStyle = '#999';
  roundRect(20, 13, 10, 10, 2);
  ctx.fill();
  // Tab text
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.fillText('Keisanlab', 36, 24);
  // Tab close button
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('×', 174, 24);

  // Add tab button
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText('+', 200, 24);

  // Toolbar
  ctx.fillStyle = '#f1f3f4';
  ctx.fillRect(0, tabBarH, W, toolbarH);
  ctx.fillRect(0, tabBarH + toolbarH - 1, W, 1);
  ctx.fillStyle = '#ddd';

  // Nav buttons
  const btnY = tabBarH + toolbarH / 2;
  // Back arrow
  ctx.beginPath();
  ctx.moveTo(18, btnY - 7);
  ctx.lineTo(10, btnY);
  ctx.lineTo(18, btnY + 7);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Forward arrow (grayed)
  ctx.beginPath();
  ctx.moveTo(30, btnY - 7);
  ctx.lineTo(38, btnY);
  ctx.lineTo(30, btnY + 7);
  ctx.strokeStyle = '#bbb';
  ctx.stroke();
  // Reload icon
  ctx.beginPath();
  ctx.arc(52, btnY, 7, 0.3, Math.PI * 2 - 0.3);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(59, btnY - 5);
  ctx.lineTo(59, btnY + 2);
  ctx.lineTo(54, btnY - 1);
  ctx.fillStyle = '#555';
  ctx.fill();

  // Address bar
  const addrX = 68, addrY = tabBarH + 8, addrW = W - 100, addrH = 28;
  roundRect(addrX, addrY, addrW, addrH, 14);
  ctx.fillStyle = '#fff';
  ctx.fill();
  roundRect(addrX, addrY, addrW, addrH, 14);
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Lock icon
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#4caf50';
  ctx.textAlign = 'left';
  ctx.fillText('🔒', addrX + 8, addrY + 19);
  // URL text
  ctx.font = '12px -apple-system, monospace';
  ctx.fillStyle = '#444';
  ctx.fillText('keisanlab.jp/apps/device-mockup/', addrX + 26, addrY + 19);

  // Menu dots
  ctx.fillStyle = '#555';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(W - 15, btnY - 5 + i * 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Page content area
  const pageY = tabBarH + toolbarH;
  const pageH = H - pageY;

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, pageY, W, pageH);
    ctx.clip();
    drawImageFitted(img, 0, pageY, W, pageH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, pageY, W, pageH);
  }

  // Scrollbar (decorative)
  roundRect(W - 6, pageY + 2, 4, 60, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();
}

// --------------- PNG Download ---------------
function downloadPng() {
  if (!uploadedImage) return;

  // Re-render at 2x resolution for export quality
  const spec = DEVICE_SPECS[currentDevice];
  const padding = 40;
  const deviceW = Math.round(spec.canvasW * scale);
  const deviceH = Math.round(spec.canvasH * scale);
  const outW = deviceW + padding * 2;
  const outH = deviceH + padding * 2;
  const exportDpr = 2;

  // Create off-screen canvas
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width  = outW * exportDpr;
  exportCanvas.height = outH * exportDpr;
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.scale(exportDpr, exportDpr);

  // Use a temporary global ctx reference for draw functions
  const origCtx = ctx;
  // We need to draw on exportCtx — temporarily swap ctx reference via closure trick
  drawOnContext(exportCtx, spec, outW, outH, padding);

  // Download
  const a = document.createElement('a');
  a.download = `mockup-${currentDevice}-${Date.now()}.png`;
  const bg = (currentBg === 'transparent') ? 'image/png' : 'image/png';
  a.href = exportCanvas.toDataURL(bg);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function drawOnContext(targetCtx, spec, outW, outH, padding) {
  // Background
  if (currentBg === 'transparent') {
    targetCtx.clearRect(0, 0, outW, outH);
  } else if (currentBg === 'gradient') {
    const grad = targetCtx.createLinearGradient(0, 0, outW, outH);
    grad.addColorStop(0, gradColor1);
    grad.addColorStop(1, gradColor2);
    targetCtx.fillStyle = grad;
    targetCtx.fillRect(0, 0, outW, outH);
  } else {
    targetCtx.fillStyle = bgColor;
    targetCtx.fillRect(0, 0, outW, outH);
  }

  // Temporarily replace ctx with targetCtx for device draw functions
  // We use a re-entrant approach: pass targetCtx directly to draw fn
  targetCtx.save();
  targetCtx.translate(padding, padding);
  targetCtx.scale(scale, scale);

  // Draw device on targetCtx
  const drawFn = spec.draw;
  // Wrap ctx calls in targetCtx by rebinding the helpers
  drawDeviceOnCtx(targetCtx, drawFn, spec);
  targetCtx.restore();
}

// Re-run the draw function but using a given ctx
function drawDeviceOnCtx(targetCtx, drawFn, spec) {
  // Save global state, swap to targetCtx
  const savedCtx = ctx;
  // We can't truly swap the module-level ctx const.
  // Instead, rebuild the draw functions inline to accept ctx as parameter.
  // Since draw functions use the module-level `ctx`, we use an adapter.

  // All draw functions reference `ctx` from module scope.
  // For export, we trick this by saving/restoring canvas reference.
  // Simplest solution: copy the current preview canvas data to exportCanvas.
  // → Re-render on main canvas at high res then copy.
  // Actually the cleanest way: just re-call renderMockup, grab imageData.
  // But we already have a clean canvas — just draw current preview scaled.

  const previewData = canvas.toDataURL();
  const img2 = new Image();
  img2.onload = function () {
    targetCtx.drawImage(img2, 0, 0);
  };
  // This is sync-unfriendly; instead we'll draw directly.
  // For simplicity, use the device draw fn with ctx re-routing via closure.
  drawFn(targetCtx, uploadedImage, spec);
}

// --------------- Init ---------------
// Override drawDeviceOnCtx to directly call draw functions with correct ctx
// by making all device draw functions accept ctx as first parameter (already done).
// So downloadPng can call them directly on exportCtx.

// Fix: rewrite downloadPng to use drawDeviceOnCtx properly
(function patchDownload() {
  const _download = downloadBtn;

  _download.addEventListener('click', () => {}, true); // already bound above

  // Override the download function
  window._doDownload = function () {
    if (!uploadedImage) return;
    const spec = DEVICE_SPECS[currentDevice];
    const padding = 40;
    const deviceW = Math.round(spec.canvasW * scale);
    const deviceH = Math.round(spec.canvasH * scale);
    const outW = deviceW + padding * 2;
    const outH = deviceH + padding * 2;
    const exportDpr = 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width  = outW * exportDpr;
    exportCanvas.height = outH * exportDpr;
    const ec = exportCanvas.getContext('2d');
    ec.scale(exportDpr, exportDpr);

    // Background
    if (currentBg === 'transparent') {
      ec.clearRect(0, 0, outW, outH);
    } else if (currentBg === 'gradient') {
      const grad = ec.createLinearGradient(0, 0, outW, outH);
      grad.addColorStop(0, gradColor1);
      grad.addColorStop(1, gradColor2);
      ec.fillStyle = grad;
      ec.fillRect(0, 0, outW, outH);
    } else {
      ec.fillStyle = bgColor;
      ec.fillRect(0, 0, outW, outH);
    }

    ec.save();
    ec.translate(padding, padding);
    ec.scale(scale, scale);
    spec.draw(ec, uploadedImage, spec);
    ec.restore();

    const a = document.createElement('a');
    a.download = 'mockup-' + currentDevice + '-' + Date.now() + '.png';
    a.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
})();

// Replace downloadBtn handler
downloadBtn.removeEventListener('click', downloadPng);
downloadBtn.addEventListener('click', () => {
  if (typeof window._doDownload === 'function') window._doDownload();
});
