/* =========================================================
   CSS Animation Editor — script.js
   ========================================================= */

'use strict';

/* ===== プリセット定義 ===== */
const PRESETS = {
  'fade-in': {
    keyframes: [
      { percent: 0,   opacity: '0',    transform: '',                 color: '',       background: '' },
      { percent: 100, opacity: '1',    transform: '',                 color: '',       background: '' }
    ],
    timing: { duration: 0.8, delay: 0, iteration: '1', direction: 'normal', timingFn: 'ease' }
  },
  'fade-out': {
    keyframes: [
      { percent: 0,   opacity: '1',    transform: '',                 color: '',       background: '' },
      { percent: 100, opacity: '0',    transform: '',                 color: '',       background: '' }
    ],
    timing: { duration: 0.8, delay: 0, iteration: '1', direction: 'normal', timingFn: 'ease' }
  },
  'slide-in-left': {
    keyframes: [
      { percent: 0,   opacity: '0',    transform: 'translateX(-60px)', color: '',      background: '' },
      { percent: 100, opacity: '1',    transform: 'translateX(0)',      color: '',      background: '' }
    ],
    timing: { duration: 0.6, delay: 0, iteration: '1', direction: 'normal', timingFn: 'ease-out' }
  },
  'slide-in-right': {
    keyframes: [
      { percent: 0,   opacity: '0',    transform: 'translateX(60px)',   color: '',      background: '' },
      { percent: 100, opacity: '1',    transform: 'translateX(0)',       color: '',      background: '' }
    ],
    timing: { duration: 0.6, delay: 0, iteration: '1', direction: 'normal', timingFn: 'ease-out' }
  },
  'slide-up': {
    keyframes: [
      { percent: 0,   opacity: '0',    transform: 'translateY(40px)',   color: '',      background: '' },
      { percent: 100, opacity: '1',    transform: 'translateY(0)',       color: '',      background: '' }
    ],
    timing: { duration: 0.6, delay: 0, iteration: '1', direction: 'normal', timingFn: 'ease-out' }
  },
  'bounce': {
    keyframes: [
      { percent: 0,   opacity: '1',    transform: 'translateY(0)',       color: '',      background: '' },
      { percent: 30,  opacity: '1',    transform: 'translateY(-30px)',   color: '',      background: '' },
      { percent: 60,  opacity: '1',    transform: 'translateY(-10px)',   color: '',      background: '' },
      { percent: 80,  opacity: '1',    transform: 'translateY(-5px)',    color: '',      background: '' },
      { percent: 100, opacity: '1',    transform: 'translateY(0)',       color: '',      background: '' }
    ],
    timing: { duration: 1.0, delay: 0, iteration: 'infinite', direction: 'normal', timingFn: 'ease' }
  },
  'pulse': {
    keyframes: [
      { percent: 0,   opacity: '1',    transform: 'scale(1)',            color: '',      background: '' },
      { percent: 50,  opacity: '1',    transform: 'scale(1.12)',         color: '',      background: '' },
      { percent: 100, opacity: '1',    transform: 'scale(1)',            color: '',      background: '' }
    ],
    timing: { duration: 1.2, delay: 0, iteration: 'infinite', direction: 'normal', timingFn: 'ease-in-out' }
  },
  'spin': {
    keyframes: [
      { percent: 0,   opacity: '1',    transform: 'rotate(0deg)',        color: '',      background: '' },
      { percent: 100, opacity: '1',    transform: 'rotate(360deg)',      color: '',      background: '' }
    ],
    timing: { duration: 1.0, delay: 0, iteration: 'infinite', direction: 'normal', timingFn: 'linear' }
  },
  'shake': {
    keyframes: [
      { percent: 0,   opacity: '1',    transform: 'translateX(0)',       color: '',      background: '' },
      { percent: 20,  opacity: '1',    transform: 'translateX(-8px)',    color: '',      background: '' },
      { percent: 40,  opacity: '1',    transform: 'translateX(8px)',     color: '',      background: '' },
      { percent: 60,  opacity: '1',    transform: 'translateX(-6px)',    color: '',      background: '' },
      { percent: 80,  opacity: '1',    transform: 'translateX(6px)',     color: '',      background: '' },
      { percent: 100, opacity: '1',    transform: 'translateX(0)',       color: '',      background: '' }
    ],
    timing: { duration: 0.6, delay: 0, iteration: '3', direction: 'normal', timingFn: 'ease-in-out' }
  },
  'zoom-in': {
    keyframes: [
      { percent: 0,   opacity: '0',    transform: 'scale(0.5)',          color: '',      background: '' },
      { percent: 100, opacity: '1',    transform: 'scale(1)',            color: '',      background: '' }
    ],
    timing: { duration: 0.5, delay: 0, iteration: '1', direction: 'normal', timingFn: 'ease-out' }
  }
};

/* ===== State ===== */
const state = {
  animationName: 'my-animation',
  shape: 'square',
  duration: 1.0,
  delay: 0.0,
  iteration: '1',
  direction: 'normal',
  timingFn: 'ease',
  customBezier: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  keyframes: [
    { percent: 0,   opacity: '0', transform: '', color: '', background: '' },
    { percent: 100, opacity: '1', transform: '', color: '', background: '' }
  ],
  isPlaying: false
};

let styleEl = null;
let playTimeout = null;

/* ===== DOM References ===== */
const previewEl   = document.getElementById('preview-el');
const previewArea = document.getElementById('preview-area');
const durationIn  = document.getElementById('duration');
const durationVal = document.getElementById('duration-val');
const delayIn     = document.getElementById('delay');
const delayVal    = document.getElementById('delay-val');
const iterSel     = document.getElementById('iteration');
const dirSel      = document.getElementById('direction');
const timingSel   = document.getElementById('timing');
const bezierSec   = document.getElementById('bezier-section');
const bx1In       = document.getElementById('bx1');
const by1In       = document.getElementById('by1');
const bx2In       = document.getElementById('bx2');
const by2In       = document.getElementById('by2');
const bezierOut   = document.getElementById('bezier-output');
const bezierCanvas= document.getElementById('bezier-canvas');
const kfList      = document.getElementById('keyframe-list');
const addKfBtn    = document.getElementById('add-keyframe');
const btnPlay     = document.getElementById('btn-play');
const btnStop     = document.getElementById('btn-stop');
const btnCopy     = document.getElementById('btn-copy');
const copyMsg     = document.getElementById('copy-msg');
const cssCode     = document.getElementById('css-code');

/* ===== Inject style element ===== */
function ensureStyleEl() {
  if (!styleEl) {
    styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
  }
}

/* ===== Build timing function string ===== */
function getTimingFn() {
  if (state.timingFn === 'custom') {
    const { x1, y1, x2, y2 } = state.customBezier;
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  }
  return state.timingFn;
}

/* ===== Build CSS text ===== */
function buildCSS() {
  const kfs = [...state.keyframes].sort((a, b) => a.percent - b.percent);

  // @keyframes
  let kfCss = `@keyframes ${state.animationName} {\n`;
  kfs.forEach(kf => {
    const props = [];
    if (kf.opacity !== '')    props.push(`  opacity: ${kf.opacity};`);
    if (kf.transform !== '')  props.push(`  transform: ${kf.transform};`);
    if (kf.color !== '')      props.push(`  color: ${kf.color};`);
    if (kf.background !== '') props.push(`  background: ${kf.background};`);
    if (props.length === 0)   props.push('  /* no properties */');
    kfCss += `  ${kf.percent}% {\n${props.map(p => '  ' + p).join('\n')}\n  }\n`;
  });
  kfCss += `}`;

  // animation shorthand
  const timingFn = getTimingFn();
  const animCss =
    `.animated-element {\n` +
    `  animation-name: ${state.animationName};\n` +
    `  animation-duration: ${state.duration}s;\n` +
    `  animation-delay: ${state.delay}s;\n` +
    `  animation-iteration-count: ${state.iteration};\n` +
    `  animation-direction: ${state.direction};\n` +
    `  animation-timing-function: ${timingFn};\n` +
    `  animation-fill-mode: both;\n` +
    `}`;

  return `${kfCss}\n\n${animCss}`;
}

/* ===== Update CSS output panel ===== */
function updateOutput() {
  cssCode.textContent = buildCSS();
}

/* ===== Apply animation to preview ===== */
function applyAnimation() {
  ensureStyleEl();
  const css = buildCSS();
  // Replace .animated-element with #preview-el for preview
  const previewCss = css.replace(/\.animated-element/g, '#preview-el');
  styleEl.textContent = previewCss;
  // Re-trigger animation
  previewEl.classList.remove('animating');
  void previewEl.offsetWidth; // reflow
  previewEl.classList.add('animating');
  previewEl.style.animationName = state.animationName;
}

/* ===== Stop animation ===== */
function stopAnimation() {
  if (styleEl) styleEl.textContent = '';
  previewEl.classList.remove('animating');
  previewEl.style.animationName = 'none';
  state.isPlaying = false;
  if (playTimeout) { clearTimeout(playTimeout); playTimeout = null; }
}

/* ===== Render keyframe list ===== */
function renderKeyframes() {
  kfList.innerHTML = '';
  state.keyframes.forEach((kf, idx) => {
    const item = document.createElement('div');
    item.className = 'keyframe-item';
    item.innerHTML = `
      <div class="keyframe-header">
        <label for="kf-pct-${idx}">%</label>
        <input class="kf-percent" type="number" id="kf-pct-${idx}" min="0" max="100" value="${kf.percent}"
               data-idx="${idx}" data-field="percent" aria-label="${idx + 1}番目のキーフレーム位置">
        <button class="btn-remove-kf" data-idx="${idx}" aria-label="キーフレーム${idx + 1}を削除" title="削除">&#x2715;</button>
      </div>
      <div class="kf-props">
        <div class="kf-prop-group">
          <label for="kf-opacity-${idx}">opacity</label>
          <input type="text" id="kf-opacity-${idx}" value="${kf.opacity}" placeholder="例: 0.5"
                 data-idx="${idx}" data-field="opacity">
        </div>
        <div class="kf-prop-group">
          <label for="kf-transform-${idx}">transform</label>
          <input type="text" id="kf-transform-${idx}" value="${kf.transform}" placeholder="例: translateY(-20px)"
                 data-idx="${idx}" data-field="transform">
        </div>
        <div class="kf-prop-group">
          <label for="kf-color-${idx}">color</label>
          <input type="color" id="kf-color-${idx}" value="${kf.color || '#6366f1'}"
                 data-idx="${idx}" data-field="color" aria-label="文字色">
          <input type="text" id="kf-color-text-${idx}" value="${kf.color}" placeholder="例: #ff0000"
                 data-idx="${idx}" data-field="color" style="margin-top:2px;">
        </div>
        <div class="kf-prop-group">
          <label for="kf-bg-${idx}">background</label>
          <input type="color" id="kf-bg-${idx}" value="${kf.background || '#6366f1'}"
                 data-idx="${idx}" data-field="background" aria-label="背景色">
          <input type="text" id="kf-bg-text-${idx}" value="${kf.background}" placeholder="例: #6366f1"
                 data-idx="${idx}" data-field="background" style="margin-top:2px;">
        </div>
      </div>
    `;
    kfList.appendChild(item);
  });

  // Events for keyframe inputs
  kfList.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', onKfInput);
  });
  kfList.querySelectorAll('.btn-remove-kf').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      if (state.keyframes.length <= 2) return;
      state.keyframes.splice(idx, 1);
      renderKeyframes();
      refreshAll();
    });
  });

  // Sync color picker <-> text for color/background
  kfList.querySelectorAll('input[type="color"]').forEach(picker => {
    const idx   = parseInt(picker.dataset.idx, 10);
    const field = picker.dataset.field;
    const textId = field === 'color'
      ? `kf-color-text-${idx}`
      : `kf-bg-text-${idx}`;
    const textIn = document.getElementById(textId);
    picker.addEventListener('input', () => {
      if (textIn) textIn.value = picker.value;
      state.keyframes[idx][field] = picker.value;
      refreshAll();
    });
    if (textIn) {
      textIn.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(textIn.value)) {
          picker.value = textIn.value;
        }
        state.keyframes[idx][field] = textIn.value;
        refreshAll();
      });
    }
  });
}

function onKfInput(e) {
  const inp   = e.target;
  const idx   = parseInt(inp.dataset.idx, 10);
  const field = inp.dataset.field;
  if (field === 'percent') {
    state.keyframes[idx].percent = parseInt(inp.value, 10) || 0;
  } else {
    state.keyframes[idx][field] = inp.value;
  }
  refreshAll();
}

function refreshAll() {
  updateOutput();
  if (state.isPlaying) applyAnimation();
}

/* ===== cubic-bezier canvas ===== */
const CANVAS_PAD = 20;
const CANVAS_W   = 200;
const CANVAS_H   = 200;
const GRAPH_W    = CANVAS_W - CANVAS_PAD * 2;
const GRAPH_H    = CANVAS_H - CANVAS_PAD * 2;

let dragging = null; // 'p1' | 'p2' | null

function bezierToCanvas(x, y) {
  return {
    cx: CANVAS_PAD + x * GRAPH_W,
    cy: CANVAS_PAD + (1 - y) * GRAPH_H
  };
}

function canvasToBezier(cx, cy) {
  return {
    x: Math.max(0, Math.min(1, (cx - CANVAS_PAD) / GRAPH_W)),
    y: (CANVAS_PAD + GRAPH_H - cy) / GRAPH_H
  };
}

function drawBezierCanvas() {
  const ctx = bezierCanvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Grid
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const x = CANVAS_PAD + i * GRAPH_W / 4;
    const y = CANVAS_PAD + i * GRAPH_H / 4;
    ctx.beginPath(); ctx.moveTo(x, CANVAS_PAD); ctx.lineTo(x, CANVAS_PAD + GRAPH_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CANVAS_PAD, y); ctx.lineTo(CANVAS_PAD + GRAPH_W, y); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CANVAS_PAD, CANVAS_PAD + GRAPH_H);
  ctx.lineTo(CANVAS_PAD, CANVAS_PAD);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CANVAS_PAD, CANVAS_PAD + GRAPH_H);
  ctx.lineTo(CANVAS_PAD + GRAPH_W, CANVAS_PAD + GRAPH_H);
  ctx.stroke();

  const { x1, y1, x2, y2 } = state.customBezier;
  const p0 = { cx: CANVAS_PAD, cy: CANVAS_PAD + GRAPH_H };
  const p3 = { cx: CANVAS_PAD + GRAPH_W, cy: CANVAS_PAD };
  const p1c = bezierToCanvas(x1, y1);
  const p2c = bezierToCanvas(x2, y2);

  // Control lines
  ctx.strokeStyle = '#a5b4fc';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(p0.cx, p0.cy); ctx.lineTo(p1c.cx, p1c.cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p3.cx, p3.cy); ctx.lineTo(p2c.cx, p2c.cy); ctx.stroke();
  ctx.setLineDash([]);

  // Bezier curve
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p0.cx, p0.cy);
  ctx.bezierCurveTo(p1c.cx, p1c.cy, p2c.cx, p2c.cy, p3.cx, p3.cy);
  ctx.stroke();

  // Control points
  [['#10b981', p1c], ['#f59e0b', p2c]].forEach(([color, pt]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pt.cx, pt.cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function getCanvasPos(e) {
  const rect = bezierCanvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  if (e.touches) {
    return {
      cx: (e.touches[0].clientX - rect.left) * scaleX,
      cy: (e.touches[0].clientY - rect.top)  * scaleY
    };
  }
  return {
    cx: (e.clientX - rect.left) * scaleX,
    cy: (e.clientY - rect.top)  * scaleY
  };
}

function hitTest(cx, cy) {
  const { x1, y1, x2, y2 } = state.customBezier;
  const p1c = bezierToCanvas(x1, y1);
  const p2c = bezierToCanvas(x2, y2);
  const d1 = Math.hypot(cx - p1c.cx, cy - p1c.cy);
  const d2 = Math.hypot(cx - p2c.cx, cy - p2c.cy);
  if (d1 < 10) return 'p1';
  if (d2 < 10) return 'p2';
  return null;
}

function onBezierDown(e) {
  e.preventDefault();
  const { cx, cy } = getCanvasPos(e);
  dragging = hitTest(cx, cy);
}

function onBezierMove(e) {
  if (!dragging) return;
  e.preventDefault();
  const { cx, cy } = getCanvasPos(e);
  const { x, y } = canvasToBezier(cx, cy);
  if (dragging === 'p1') {
    state.customBezier.x1 = parseFloat(x.toFixed(2));
    state.customBezier.y1 = parseFloat(y.toFixed(2));
  } else {
    state.customBezier.x2 = parseFloat(x.toFixed(2));
    state.customBezier.y2 = parseFloat(y.toFixed(2));
  }
  syncBezierInputs();
  drawBezierCanvas();
  refreshAll();
}

function onBezierUp() { dragging = null; }

function syncBezierInputs() {
  const { x1, y1, x2, y2 } = state.customBezier;
  bx1In.value = x1;
  by1In.value = y1;
  bx2In.value = x2;
  by2In.value = y2;
  bezierOut.textContent = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

bezierCanvas.addEventListener('mousedown',  onBezierDown);
bezierCanvas.addEventListener('mousemove',  onBezierMove);
bezierCanvas.addEventListener('mouseup',    onBezierUp);
bezierCanvas.addEventListener('mouseleave', onBezierUp);
bezierCanvas.addEventListener('touchstart', onBezierDown, { passive: false });
bezierCanvas.addEventListener('touchmove',  onBezierMove, { passive: false });
bezierCanvas.addEventListener('touchend',   onBezierUp);

[bx1In, by1In, bx2In, by2In].forEach(inp => {
  inp.addEventListener('input', () => {
    state.customBezier.x1 = parseFloat(bx1In.value) || 0;
    state.customBezier.y1 = parseFloat(by1In.value) || 0;
    state.customBezier.x2 = parseFloat(bx2In.value) || 0;
    state.customBezier.y2 = parseFloat(by2In.value) || 0;
    bezierOut.textContent = `cubic-bezier(${state.customBezier.x1}, ${state.customBezier.y1}, ${state.customBezier.x2}, ${state.customBezier.y2})`;
    drawBezierCanvas();
    refreshAll();
  });
});

/* ===== Timing controls ===== */
durationIn.addEventListener('input', () => {
  state.duration = parseFloat(durationIn.value);
  durationVal.textContent = state.duration.toFixed(1) + 's';
  refreshAll();
});

delayIn.addEventListener('input', () => {
  state.delay = parseFloat(delayIn.value);
  delayVal.textContent = state.delay.toFixed(1) + 's';
  refreshAll();
});

iterSel.addEventListener('change', () => {
  state.iteration = iterSel.value;
  refreshAll();
});

dirSel.addEventListener('change', () => {
  state.direction = dirSel.value;
  refreshAll();
});

timingSel.addEventListener('change', () => {
  state.timingFn = timingSel.value;
  bezierSec.hidden = (state.timingFn !== 'custom');
  refreshAll();
});

/* ===== Shape selector ===== */
document.querySelectorAll('.shape-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.shape-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    state.shape = btn.dataset.shape;
    applyShape();
  });
});

function applyShape() {
  previewEl.className = 'preview-element';
  previewEl.textContent = '';
  if (state.shape === 'circle') {
    previewEl.classList.add('shape-circle');
  } else if (state.shape === 'text') {
    previewEl.classList.add('shape-text');
    previewEl.textContent = 'Hello';
  }
}

/* ===== Preset buttons ===== */
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    state.keyframes = preset.keyframes.map(kf => ({ ...kf }));
    state.duration  = preset.timing.duration;
    state.delay     = preset.timing.delay;
    state.iteration = preset.timing.iteration;
    state.direction = preset.timing.direction;
    state.timingFn  = preset.timing.timingFn;
    // Sync UI
    durationIn.value = state.duration;
    durationVal.textContent = state.duration.toFixed(1) + 's';
    delayIn.value    = state.delay;
    delayVal.textContent = state.delay.toFixed(1) + 's';
    iterSel.value    = state.iteration;
    dirSel.value     = state.direction;
    timingSel.value  = state.timingFn;
    bezierSec.hidden = true;
    renderKeyframes();
    updateOutput();
    playAnimation();
  });
});

/* ===== Add keyframe ===== */
addKfBtn.addEventListener('click', () => {
  const existing = state.keyframes.map(k => k.percent);
  let next = 50;
  while (existing.includes(next) && next < 100) next += 10;
  state.keyframes.push({ percent: next, opacity: '', transform: '', color: '', background: '' });
  renderKeyframes();
  refreshAll();
});

/* ===== Play / Stop ===== */
function playAnimation() {
  state.isPlaying = true;
  applyAnimation();
}

btnPlay.addEventListener('click', playAnimation);
btnStop.addEventListener('click', () => {
  stopAnimation();
  previewEl.style.animationName = '';
  previewEl.style.opacity = '';
  previewEl.style.transform = '';
});

/* ===== Copy CSS ===== */
btnCopy.addEventListener('click', async () => {
  const text = buildCSS();
  try {
    await navigator.clipboard.writeText(text);
    copyMsg.textContent = 'コピーしました！';
    setTimeout(() => { copyMsg.textContent = ''; }, 2000);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copyMsg.textContent = 'コピーしました！';
    setTimeout(() => { copyMsg.textContent = ''; }, 2000);
  }
});

/* ===== Init ===== */
function init() {
  ensureStyleEl();
  renderKeyframes();
  updateOutput();
  drawBezierCanvas();
  syncBezierInputs();
  // Apply default preset: fade-in
  const defaultPreset = document.querySelector('[data-preset="fade-in"]');
  if (defaultPreset) defaultPreset.click();
}

document.addEventListener('DOMContentLoaded', init);
