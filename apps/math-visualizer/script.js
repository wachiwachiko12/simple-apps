'use strict';

// ============================================================
// 定数
// ============================================================
const COLORS = ['#e74c3c', '#2980b9', '#27ae60'];
const MAX_FUNCS = 3;

// ============================================================
// 状態
// ============================================================
const state = {
  functions: [
    { expr: 'sin(x)', visible: true }
  ],
  params: { a: 1.0, b: 1.0, c: 0.0 },
  range: { xMin: -10, xMax: 10, yMin: -5, yMax: 5 }
};

// ============================================================
// DOM 参照
// ============================================================
const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const coordDisplay = document.getElementById('coord-display');
const presetSelect = document.getElementById('preset-select');
const funcList = document.getElementById('function-list');
const addFuncBtn = document.getElementById('add-func-btn');
const paramA = document.getElementById('param-a');
const paramB = document.getElementById('param-b');
const paramC = document.getElementById('param-c');
const paramAVal = document.getElementById('param-a-val');
const paramBVal = document.getElementById('param-b-val');
const paramCVal = document.getElementById('param-c-val');
const xMinInput = document.getElementById('x-min');
const xMaxInput = document.getElementById('x-max');
const yMinInput = document.getElementById('y-min');
const yMaxInput = document.getElementById('y-max');
const autoRangeBtn = document.getElementById('auto-range-btn');
const downloadBtn = document.getElementById('download-btn');

// ============================================================
// 数式パーサー
// サポート: +, -, *, /, ^, sin, cos, tan, asin, acos, atan,
//           sqrt, abs, exp, log/ln, log10, PI, E, a, b, c
// ============================================================
function buildEvaluator(exprStr) {
  // パラメータ置換は評価時に行う
  // 式の検証・コンパイル
  const sanitized = sanitizeExpr(exprStr);
  // テスト評価（x=1, a=1, b=1, c=0 で構文チェック）
  try {
    evalExpr(sanitized, 1, 1, 1, 0);
  } catch (e) {
    throw new Error('式が正しくありません: ' + exprStr);
  }
  return (x, a, b, c) => evalExpr(sanitized, x, a, b, c);
}

function sanitizeExpr(expr) {
  // 空白除去
  let s = expr.trim();
  // 全角→半角
  s = s.replace(/[Ａ-Ｚａ-ｚ０-９＋－＊／＾（）．]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  // 全角マイナス
  s = s.replace(/－/g, '-');
  // 日本語かな混入チェック
  if (/[ぁ-ん]/.test(s) || /[ァ-ン]/.test(s)) {
    throw new Error('不正な文字が含まれています');
  }
  // 許可リスト: 数字・演算子・括弧・小数点・許可済み識別子のみ
  // 許可する識別子: x, a, b, c, sin, cos, tan, asin, acos, atan,
  //                 sqrt, abs, exp, log, ln, log10, PI, E, pow
  const ALLOWED_IDENTS = /^(x|a|b|c|sin|cos|tan|asin|acos|atan|sqrt|abs|exp|log10|log|ln|PI|E|pow)$/;
  // 識別子部分を抽出して許可リスト外を検出
  const identPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  let match;
  while ((match = identPattern.exec(s)) !== null) {
    if (!ALLOWED_IDENTS.test(match[0])) {
      throw new Error('不正な識別子: ' + match[0]);
    }
  }
  // 許可文字セット以外が残っていれば拒否（英数字・演算子・括弧・ドット・アンダースコアのみ）
  if (/[^0-9a-zA-Z_.+\-*/^()\s]/.test(s)) {
    throw new Error('不正な文字が含まれています');
  }
  return s;
}

function evalExpr(expr, x, a, b, c) {
  // セキュリティ: Function コンストラクタで評価
  // 変数 x, a, b, c, および Math 関数のみを渡す
  /* eslint-disable no-new-func */
  const fn = new Function(
    'x', 'a', 'b', 'c',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sqrt', 'abs', 'exp', 'log', 'ln', 'log10',
    'PI', 'E', 'pow',
    '"use strict"; return (' + expr
      .replace(/\^/g, '**')
      .replace(/\bPI\b/g, 'PI')
      .replace(/\bE\b/g, 'E')
    + ');'
  );
  return fn(
    x, a, b, c,
    Math.sin, Math.cos, Math.tan, Math.asin, Math.acos, Math.atan,
    Math.sqrt, Math.abs, Math.exp, Math.log, Math.log, x => Math.log(x) / Math.LN10,
    Math.PI, Math.E, Math.pow
  );
}

// ============================================================
// キャンバスサイズ設定
// ============================================================
function resizeCanvas() {
  const wrapper = canvas.parentElement;
  const w = wrapper.clientWidth - 32; // padding
  const size = Math.min(Math.max(w, 280), 640);
  canvas.width = size;
  canvas.height = size;
  drawGraph();
}

// ============================================================
// グラフ描画
// ============================================================
function drawGraph() {
  const W = canvas.width;
  const H = canvas.height;
  const { xMin, xMax, yMin, yMax } = state.range;
  const { a, b, c } = state.params;

  ctx.clearRect(0, 0, W, H);

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 座標変換ヘルパー
  const toCanvasX = (x) => ((x - xMin) / (xMax - xMin)) * W;
  const toCanvasY = (y) => H - ((y - yMin) / (yMax - yMin)) * H;

  // グリッド描画
  drawGrid(W, H, xMin, xMax, yMin, yMax, toCanvasX, toCanvasY);

  // 軸描画
  drawAxes(W, H, xMin, xMax, yMin, yMax, toCanvasX, toCanvasY);

  // 関数描画
  state.functions.forEach((fn, i) => {
    if (!fn.visible) return;
    try {
      const evaluator = buildEvaluator(fn.expr);
      drawFunction(evaluator, i, W, H, xMin, xMax, a, b, c, toCanvasX, toCanvasY);
      // エラー表示クリア
      clearFuncError(i);
    } catch (e) {
      setFuncError(i, '式エラー');
    }
  });
}

function drawGrid(W, H, xMin, xMax, yMin, yMax, toCanvasX, toCanvasY) {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const xStep = niceStep(xRange / 10);
  const yStep = niceStep(yRange / 8);

  ctx.strokeStyle = '#e8ecf0';
  ctx.lineWidth = 1;

  // 縦グリッド
  const xStart = Math.ceil(xMin / xStep) * xStep;
  for (let x = xStart; x <= xMax + 1e-9; x += xStep) {
    const cx = toCanvasX(x);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
  }

  // 横グリッド
  const yStart = Math.ceil(yMin / yStep) * yStep;
  for (let y = yStart; y <= yMax + 1e-9; y += yStep) {
    const cy = toCanvasY(y);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
  }
}

function drawAxes(W, H, xMin, xMax, yMin, yMax, toCanvasX, toCanvasY) {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const xStep = niceStep(xRange / 10);
  const yStep = niceStep(yRange / 8);

  // x=0 の縦軸
  const axisX = Math.max(0, Math.min(W, toCanvasX(0)));
  // y=0 の横軸
  const axisY = Math.max(0, Math.min(H, toCanvasY(0)));

  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;

  // 横軸
  ctx.beginPath();
  ctx.moveTo(0, axisY);
  ctx.lineTo(W, axisY);
  ctx.stroke();

  // 縦軸
  ctx.beginPath();
  ctx.moveTo(axisX, 0);
  ctx.lineTo(axisX, H);
  ctx.stroke();

  // 目盛りとラベル
  ctx.fillStyle = '#777';
  ctx.font = `${Math.max(10, Math.min(13, W * 0.025))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const xStart = Math.ceil(xMin / xStep) * xStep;
  for (let x = xStart; x <= xMax + 1e-9; x += xStep) {
    if (Math.abs(x) < xStep * 0.01) continue;
    const cx = toCanvasX(x);
    ctx.beginPath();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.moveTo(cx, axisY - 4);
    ctx.lineTo(cx, axisY + 4);
    ctx.stroke();
    if (axisY + 6 < H - 4) {
      ctx.fillText(formatNum(x), cx, axisY + 6);
    } else {
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatNum(x), cx, axisY - 6);
      ctx.textBaseline = 'top';
    }
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yStart = Math.ceil(yMin / yStep) * yStep;
  for (let y = yStart; y <= yMax + 1e-9; y += yStep) {
    if (Math.abs(y) < yStep * 0.01) continue;
    const cy = toCanvasY(y);
    ctx.beginPath();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.moveTo(axisX - 4, cy);
    ctx.lineTo(axisX + 4, cy);
    ctx.stroke();
    if (axisX - 6 > 4) {
      ctx.fillText(formatNum(y), axisX - 6, cy);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(formatNum(y), axisX + 6, cy);
      ctx.textAlign = 'right';
    }
  }

  // 軸ラベル
  ctx.fillStyle = '#444';
  ctx.font = `bold ${Math.max(11, Math.min(14, W * 0.025))}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('x', W - 4, axisY + 4);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('y', axisX + 4, 4);
}

function drawFunction(evaluator, colorIndex, W, H, xMin, xMax, a, b, c, toCanvasX, toCanvasY) {
  const steps = W * 2;
  const dx = (xMax - xMin) / steps;

  ctx.strokeStyle = COLORS[colorIndex % COLORS.length];
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  let penDown = false;
  let prevY = null;

  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    let y;
    try {
      y = evaluator(x, a, b, c);
    } catch (e) {
      penDown = false;
      continue;
    }

    if (!isFinite(y) || isNaN(y)) {
      penDown = false;
      prevY = null;
      continue;
    }

    // 不連続点チェック（急激なジャンプ）
    const yRange = state.range.yMax - state.range.yMin;
    if (prevY !== null && Math.abs(y - prevY) > yRange * 3) {
      penDown = false;
    }

    const cx = toCanvasX(x);
    const cy = toCanvasY(y);

    if (!penDown) {
      ctx.moveTo(cx, cy);
      penDown = true;
    } else {
      ctx.lineTo(cx, cy);
    }
    prevY = y;
  }

  ctx.stroke();
}

// ============================================================
// ユーティリティ
// ============================================================
function niceStep(rawStep) {
  if (rawStep <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let nice;
  if (normalized < 1.5) nice = 1;
  else if (normalized < 3.5) nice = 2;
  else if (normalized < 7.5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

function formatNum(n) {
  if (Math.abs(n) < 1e-9) return '0';
  if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0)) {
    return n.toExponential(1);
  }
  // 小数点以下の余分なゼロを除去
  return parseFloat(n.toPrecision(4)).toString();
}

// ============================================================
// 関数エントリの追加・削除
// ============================================================
function addFuncEntry(index, expr, visible) {
  const colors = ['#e74c3c', '#2980b9', '#27ae60'];
  const div = document.createElement('div');
  div.className = 'func-entry';
  div.dataset.index = index;

  div.innerHTML = `
    <div class="func-header">
      <span class="func-color-dot" style="background:${colors[index]};" aria-hidden="true"></span>
      <span class="func-label">関数 ${index + 1}</span>
      <label class="func-visible-toggle" title="表示/非表示">
        <input type="checkbox" class="func-visible" ${visible ? 'checked' : ''} aria-label="関数${index + 1}を表示">
        <span>表示</span>
      </label>
      <button class="func-remove-btn" aria-label="関数${index + 1}を削除" ${state.functions.length <= 1 ? 'disabled' : ''}>削除</button>
    </div>
    <div class="func-expr-row">
      <label for="func-expr-${index}">y =</label>
      <input type="text" id="func-expr-${index}" class="func-expr" value="${expr}" placeholder="例: sin(x)" autocomplete="off" spellcheck="false">
      <span class="func-error" aria-live="polite"></span>
    </div>
  `;

  funcList.appendChild(div);
  bindFuncEntryEvents(div, index);
}

function bindFuncEntryEvents(div, index) {
  const exprInput = div.querySelector('.func-expr');
  const visibleCb = div.querySelector('.func-visible');
  const removeBtn = div.querySelector('.func-remove-btn');

  exprInput.addEventListener('input', () => {
    state.functions[index].expr = exprInput.value;
    drawGraph();
  });

  visibleCb.addEventListener('change', () => {
    state.functions[index].visible = visibleCb.checked;
    drawGraph();
  });

  removeBtn.addEventListener('click', () => {
    if (state.functions.length <= 1) return;
    state.functions.splice(index, 1);
    rebuildFuncList();
    updateAddBtnState();
    drawGraph();
  });
}

function rebuildFuncList() {
  funcList.innerHTML = '';
  state.functions.forEach((fn, i) => {
    addFuncEntry(i, fn.expr, fn.visible);
  });
  // 削除ボタンの有効/無効
  funcList.querySelectorAll('.func-remove-btn').forEach(btn => {
    btn.disabled = state.functions.length <= 1;
  });
}

function updateAddBtnState() {
  addFuncBtn.disabled = state.functions.length >= MAX_FUNCS;
  addFuncBtn.textContent = state.functions.length >= MAX_FUNCS
    ? '関数は最大3本まで'
    : '+ 関数を追加';
}

// ============================================================
// エラー表示
// ============================================================
function setFuncError(index, msg) {
  const entry = funcList.querySelector(`.func-entry[data-index="${index}"]`);
  if (!entry) return;
  entry.querySelector('.func-expr').classList.add('error');
  entry.querySelector('.func-error').textContent = msg;
}

function clearFuncError(index) {
  const entry = funcList.querySelector(`.func-entry[data-index="${index}"]`);
  if (!entry) return;
  entry.querySelector('.func-expr').classList.remove('error');
  entry.querySelector('.func-error').textContent = '';
}

// ============================================================
// 座標読み取り
// ============================================================
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;
  const { xMin, xMax, yMin, yMax } = state.range;
  const x = xMin + (canvasX / canvas.width) * (xMax - xMin);
  const y = yMax - (canvasY / canvas.height) * (yMax - yMin);
  return { x, y };
}

function updateCoordDisplay(x, y) {
  coordDisplay.textContent = `x = ${x.toFixed(3)}, y = ${y.toFixed(3)}`;
}

// ============================================================
// 自動 Y 軸範囲
// ============================================================
function autoYRange() {
  const { xMin, xMax } = state.range;
  const { a, b, c } = state.params;
  const steps = 400;
  const dx = (xMax - xMin) / steps;
  let yMin = Infinity;
  let yMax = -Infinity;

  state.functions.forEach(fn => {
    if (!fn.visible) return;
    try {
      const evaluator = buildEvaluator(fn.expr);
      for (let i = 0; i <= steps; i++) {
        const x = xMin + i * dx;
        let y;
        try { y = evaluator(x, a, b, c); } catch (e) { continue; }
        if (!isFinite(y) || isNaN(y)) continue;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      }
    } catch (e) { /* skip */ }
  });

  if (!isFinite(yMin) || !isFinite(yMax)) return;

  // 少し余白を追加
  const margin = (yMax - yMin) * 0.1 || 0.5;
  state.range.yMin = Math.floor(yMin - margin);
  state.range.yMax = Math.ceil(yMax + margin);
  yMinInput.value = state.range.yMin;
  yMaxInput.value = state.range.yMax;
  drawGraph();
}

// ============================================================
// プリセット読み込み
// ============================================================
const PRESETS = {
  sin: 'a*sin(b*x+c)',
  cos: 'a*cos(b*x+c)',
  tan: 'a*tan(b*x+c)',
  quad: 'a*x^2+b*x+c',
  cubic: 'a*x^3+b*x+c',
  exp: 'a*exp(b*x)',
  log: 'a*log(abs(b*x))',
  abs: 'a*abs(x+b)+c',
  sqrt: 'a*sqrt(abs(x+b))+c',
  linear: 'a*x+b'
};

// ============================================================
// イベント登録
// ============================================================
function initEvents() {
  // プリセット
  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (!val) return;
    state.functions[0].expr = PRESETS[val];
    rebuildFuncList();
    drawGraph();
    presetSelect.value = '';
  });

  // 関数追加
  addFuncBtn.addEventListener('click', () => {
    if (state.functions.length >= MAX_FUNCS) return;
    const exprs = ['cos(x)', 'x^2'];
    const newExpr = exprs[state.functions.length - 1] || 'x';
    state.functions.push({ expr: newExpr, visible: true });
    rebuildFuncList();
    updateAddBtnState();
    drawGraph();
  });

  // スライダー
  [paramA, paramB, paramC].forEach(slider => {
    slider.addEventListener('input', () => {
      state.params.a = parseFloat(paramA.value);
      state.params.b = parseFloat(paramB.value);
      state.params.c = parseFloat(paramC.value);
      paramAVal.textContent = state.params.a.toFixed(1);
      paramBVal.textContent = state.params.b.toFixed(1);
      paramCVal.textContent = state.params.c.toFixed(1);
      drawGraph();
    });
  });

  // 描画範囲
  [xMinInput, xMaxInput, yMinInput, yMaxInput].forEach(input => {
    input.addEventListener('change', () => {
      const xMin = parseFloat(xMinInput.value);
      const xMax = parseFloat(xMaxInput.value);
      const yMin = parseFloat(yMinInput.value);
      const yMax = parseFloat(yMaxInput.value);
      if (isNaN(xMin) || isNaN(xMax) || isNaN(yMin) || isNaN(yMax)) return;
      if (xMin >= xMax || yMin >= yMax) return;
      state.range = { xMin, xMax, yMin, yMax };
      drawGraph();
    });
  });

  // Y軸自動調整
  autoRangeBtn.addEventListener('click', autoYRange);

  // 座標読み取り (マウス)
  canvas.addEventListener('mousemove', e => {
    const { x, y } = getCanvasCoords(e);
    updateCoordDisplay(x, y);
  });

  // 座標読み取り (タッチ)
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    updateCoordDisplay(x, y);
  }, { passive: false });

  canvas.addEventListener('mouseleave', () => {
    coordDisplay.textContent = 'x = --, y = --';
  });

  // PNG ダウンロード
  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'graph.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // ウィンドウリサイズ
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 150);
  });
}

// ============================================================
// 初期化
// ============================================================
function init() {
  // 最初の関数エントリをバインド（HTML直書きのものを再利用）
  funcList.innerHTML = '';
  state.functions.forEach((fn, i) => {
    addFuncEntry(i, fn.expr, fn.visible);
  });
  updateAddBtnState();
  initEvents();
  resizeCanvas();
}

document.addEventListener('DOMContentLoaded', init);
