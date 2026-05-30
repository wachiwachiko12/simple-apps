'use strict';

/* ============================================================
   Audio Waveform Visualizer — script.js
   Web Audio API + Canvas API のみ。再生なし・サーバー通信なし。
   ============================================================ */

/* ---------- DOM refs ---------- */
const dropZone       = document.getElementById('dropZone');
const audioFileInput = document.getElementById('audioFile');
const fileInfo       = document.getElementById('fileInfo');
const fileNameEl     = document.getElementById('fileName');
const btnClearFile   = document.getElementById('btnClearFile');
const btnMic         = document.getElementById('btnMic');
const micStatus      = document.getElementById('micStatus');

const canvasSizeEl   = document.getElementById('canvasSize');
const waveStyleEl    = document.getElementById('waveStyle');
const bgColorEl      = document.getElementById('bgColor');
const bgColorHexEl   = document.getElementById('bgColorHex');
const waveColor1El   = document.getElementById('waveColor1');
const waveColor1HexEl= document.getElementById('waveColor1Hex');
const waveColor2El   = document.getElementById('waveColor2');
const waveColor2HexEl= document.getElementById('waveColor2Hex');
const trackTitleEl   = document.getElementById('trackTitle');
const artistNameEl   = document.getElementById('artistName');
const fontColorEl    = document.getElementById('fontColor');
const fontColorHexEl = document.getElementById('fontColorHex');

const btnDraw        = document.getElementById('btnDraw');
const btnSave        = document.getElementById('btnSave');
const waveCanvas     = document.getElementById('waveCanvas');
const canvasPlaceholder = document.getElementById('canvasPlaceholder');

/* ---------- State ---------- */
let audioBuffer = null;       // decoded PCM buffer from file
let micStream   = null;       // MediaStream for mic
let micContext  = null;       // AudioContext for mic
let micAnimId   = null;       // requestAnimationFrame id for mic
let canvasReady = false;

/* ============================================================
   1. FILE INPUT — drag & drop + click
   ============================================================ */
dropZone.addEventListener('click', () => audioFileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    audioFileInput.click();
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadAudioFile(file);
});

audioFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadAudioFile(file);
});

btnClearFile.addEventListener('click', () => {
  audioBuffer = null;
  audioFileInput.value = '';
  fileInfo.hidden = true;
  btnDraw.disabled = true;
});

function loadAudioFile(file) {
  // Stop mic if running
  stopMic();

  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/wave', 'audio/x-wav'];
  if (!file.type.startsWith('audio/') && !validTypes.includes(file.type)) {
    alert('対応フォーマット（MP3・WAV・OGG）の音声ファイルを選択してください。');
    return;
  }

  // Show file name
  fileNameEl.textContent = file.name;
  fileInfo.hidden = false;

  // Read & decode via Web Audio API
  const reader = new FileReader();
  reader.onload = (ev) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.decodeAudioData(ev.target.result.slice(0), (buffer) => {
      audioBuffer = buffer;
      btnDraw.disabled = false;
      audioCtx.close();
    }, (err) => {
      console.error('decode error:', err);
      alert('音声ファイルの読み込みに失敗しました。別のファイルをお試しください。');
    });
  };
  reader.onerror = () => alert('ファイルの読み込みに失敗しました。');
  reader.readAsArrayBuffer(file);
}

/* ============================================================
   2. MIC INPUT — getUserMedia + AnalyserNode
   ============================================================ */
btnMic.addEventListener('click', () => {
  if (micStream) {
    stopMic();
  } else {
    startMic();
  }
});

async function startMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('このブラウザはマイク入力に対応していません。');
    return;
  }

  // Clear file buffer
  audioBuffer = null;
  fileInfo.hidden = true;
  audioFileInput.value = '';

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micContext = new (window.AudioContext || window.webkitAudioContext)();
    const source   = micContext.createMediaStreamSource(micStream);
    const analyser = micContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    btnMic.classList.add('active');
    btnMic.textContent = '停止';
    micStatus.textContent = '● マイク入力中 — 「波形を描画」でスナップショットを保存できます';
    micStatus.hidden = false;
    btnDraw.disabled = false;

    // Store analyser for draw
    micContext._analyser = analyser;

    // Live preview on canvas (scaled-down for performance)
    startMicPreview(analyser);

  } catch (err) {
    console.error(err);
    micStream = null;
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      alert('マイクへのアクセスが拒否されました。\nブラウザのアドレスバー左のマイクアイコンから許可してください。');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      alert('マイクが見つかりませんでした。マイクが接続されているか確認してください。');
    } else {
      alert('マイクの起動に失敗しました（' + err.name + '）。ページを再読み込みして再度お試しください。');
    }
  }
}

function stopMic() {
  if (micAnimId) {
    cancelAnimationFrame(micAnimId);
    micAnimId = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (micContext) {
    micContext.close();
    micContext = null;
  }
  btnMic.classList.remove('active');
  btnMic.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
    </svg>
    マイクから波形を取得`;
  micStatus.hidden = true;

  // Don't disable draw button — keep last mic capture available
}

function startMicPreview(analyser) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  // Use the actual output canvas for live preview (at display resolution)
  const [w, h] = getCanvasDimensions();
  waveCanvas.width  = w;
  waveCanvas.height = h;
  canvasPlaceholder.style.display = 'none';
  canvasReady = false; // mic preview ≠ final render

  function draw() {
    micAnimId = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);

    const ctx = waveCanvas.getContext('2d');
    ctx.fillStyle = bgColorEl.value;
    ctx.fillRect(0, 0, w, h);

    drawWaveformFromBytes(ctx, dataArray, w, h, true /* isTimeDomain */);
    drawTextOverlay(ctx, w, h);
  }
  draw();
}

/* ============================================================
   3. COLOR PICKERS — sync hex label
   ============================================================ */
function syncHex(input, label) {
  input.addEventListener('input', () => {
    label.textContent = input.value;
  });
}
syncHex(bgColorEl,    bgColorHexEl);
syncHex(waveColor1El, waveColor1HexEl);
syncHex(waveColor2El, waveColor2HexEl);
syncHex(fontColorEl,  fontColorHexEl);

/* ============================================================
   4. DRAW — from AudioBuffer (file) or AnalyserNode snapshot (mic)
   ============================================================ */
btnDraw.addEventListener('click', () => {
  if (micStream && micContext && micContext._analyser) {
    // Snapshot from mic
    stopMicPreview();
    renderFromMicSnapshot(micContext._analyser);
  } else if (audioBuffer) {
    // From decoded file
    renderFromBuffer(audioBuffer);
  }
});

function stopMicPreview() {
  if (micAnimId) {
    cancelAnimationFrame(micAnimId);
    micAnimId = null;
  }
}

function renderFromBuffer(buffer) {
  const channelData = buffer.getChannelData(0); // mono / left channel
  const [w, h] = getCanvasDimensions();

  waveCanvas.width  = w;
  waveCanvas.height = h;
  canvasPlaceholder.style.display = 'none';

  const ctx = waveCanvas.getContext('2d');
  ctx.fillStyle = bgColorEl.value;
  ctx.fillRect(0, 0, w, h);

  // Downsample: map float32 [-1, 1] to bars
  drawWaveformFromFloat32(ctx, channelData, w, h);
  drawTextOverlay(ctx, w, h);

  canvasReady = true;
  btnSave.disabled = false;
}

function renderFromMicSnapshot(analyser) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(dataArray);

  const [w, h] = getCanvasDimensions();
  waveCanvas.width  = w;
  waveCanvas.height = h;
  canvasPlaceholder.style.display = 'none';

  const ctx = waveCanvas.getContext('2d');
  ctx.fillStyle = bgColorEl.value;
  ctx.fillRect(0, 0, w, h);

  drawWaveformFromBytes(ctx, dataArray, w, h, true);
  drawTextOverlay(ctx, w, h);

  canvasReady = true;
  btnSave.disabled = false;
}

/* ============================================================
   5. WAVE DRAWING HELPERS
   ============================================================ */
function getCanvasDimensions() {
  const val = canvasSizeEl.value; // e.g. "1200x630"
  const [w, h] = val.split('x').map(Number);
  return [w, h];
}

/**
 * Draw waveform from Float32Array (file decoded PCM).
 * Samples are in range [-1, 1].
 */
function drawWaveformFromFloat32(ctx, data, w, h) {
  const style   = waveStyleEl.value;
  const barCount = style === 'bar' ? Math.min(256, Math.floor(w / 4)) : Math.min(512, w);
  const step    = Math.floor(data.length / barCount);

  // Build downsampled RMS per segment
  const amplitudes = [];
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const start = i * step;
    for (let j = 0; j < step; j++) {
      sum += data[start + j] * data[start + j];
    }
    amplitudes.push(Math.sqrt(sum / step));
  }

  // Normalize to [0, 1]
  const maxAmp = Math.max(...amplitudes, 0.001);
  const normalized = amplitudes.map(a => a / maxAmp);

  drawWaveform(ctx, normalized, w, h, style);
}

/**
 * Draw waveform from Uint8Array (AnalyserNode time-domain).
 * Values are in range [0, 255] where 128 = silence.
 */
function drawWaveformFromBytes(ctx, data, w, h, isTimeDomain) {
  const style = waveStyleEl.value;
  const barCount = style === 'bar' ? Math.min(256, Math.floor(w / 4)) : Math.min(512, w);
  const step = Math.max(1, Math.floor(data.length / barCount));

  const amplitudes = [];
  for (let i = 0; i < barCount; i++) {
    const idx = i * step;
    if (isTimeDomain) {
      // distance from center (128)
      amplitudes.push(Math.abs(data[idx] - 128) / 128);
    } else {
      amplitudes.push(data[idx] / 255);
    }
  }

  // Normalize
  const maxAmp = Math.max(...amplitudes, 0.001);
  const normalized = amplitudes.map(a => a / maxAmp);

  drawWaveform(ctx, normalized, w, h, style);
}

/**
 * Core rendering — bar or line, with gradient.
 * normalized: array of values in [0, 1]
 */
function drawWaveform(ctx, normalized, w, h, style) {
  const color1 = waveColor1El.value;
  const color2 = waveColor2El.value;

  // Create horizontal gradient
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);

  ctx.fillStyle   = grad;
  ctx.strokeStyle = grad;
  ctx.lineWidth   = 2;

  const count = normalized.length;
  const midY  = h / 2;

  if (style === 'bar') {
    const totalWidth = w * 0.9;
    const barW = totalWidth / count;
    const gap  = barW * 0.25;
    const actualBarW = Math.max(1, barW - gap);
    const xStart = (w - totalWidth) / 2;

    for (let i = 0; i < count; i++) {
      const amp    = normalized[i];
      const barH   = Math.max(2, amp * (h * 0.85));
      const x      = xStart + i * barW;
      const y      = midY - barH / 2;

      // Rounded top corners on taller bars
      const radius = actualBarW > 3 ? Math.min(actualBarW / 2, 3) : 0;
      roundRect(ctx, x, y, actualBarW, barH, radius);
      ctx.fill();
    }
  } else {
    // Smooth line waveform (upper + mirrored lower path)
    const step = w / (count - 1);

    ctx.beginPath();
    // Top half (positive)
    for (let i = 0; i < count; i++) {
      const x  = i * step;
      const y  = midY - normalized[i] * (h * 0.43);
      if (i === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
    }
    // Bottom half (mirrored, reverse order)
    for (let i = count - 1; i >= 0; i--) {
      const x = i * step;
      const y = midY + normalized[i] * (h * 0.43);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

/** Helper: draw a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  if (h < 2 * r) r = h / 2;
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

/* ============================================================
   6. TEXT OVERLAY
   ============================================================ */
function drawTextOverlay(ctx, w, h) {
  const title  = trackTitleEl.value.trim();
  const artist = artistNameEl.value.trim();
  const color  = fontColorEl.value;

  if (!title && !artist) return;

  ctx.fillStyle = color;
  ctx.textAlign = 'left';

  const baseFontSize = Math.max(16, Math.floor(h * 0.065));
  const subFontSize  = Math.max(12, Math.floor(h * 0.042));
  const padX = Math.floor(w * 0.045);
  const padY = Math.floor(h * 0.08);

  // Shadow for readability
  ctx.shadowColor   = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur    = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  if (title) {
    ctx.font = `bold ${baseFontSize}px -apple-system, sans-serif`;
    ctx.fillText(title, padX, h - padY - (artist ? subFontSize + 6 : 0));
  }
  if (artist) {
    ctx.font = `${subFontSize}px -apple-system, sans-serif`;
    ctx.fillText(artist, padX, h - padY + subFontSize * 0.15);
  }

  // Reset shadow
  ctx.shadowColor   = 'transparent';
  ctx.shadowBlur    = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/* ============================================================
   7. SAVE — Canvas.toBlob → PNG download
   ============================================================ */
btnSave.addEventListener('click', () => {
  if (!canvasReady && !micStream) return;

  waveCanvas.toBlob((blob) => {
    if (!blob) {
      alert('画像の生成に失敗しました。');
      return;
    }
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const sizeName = canvasSizeEl.value;
    a.href         = url;
    a.download     = `waveform-${sizeName}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
});

/* ============================================================
   8. CANVAS SIZE CHANGE — resize canvas placeholder
   ============================================================ */
canvasSizeEl.addEventListener('change', () => {
  if (!canvasReady) return;
  // Re-render on size change if buffer is available
  if (audioBuffer) renderFromBuffer(audioBuffer);
});

/* ============================================================
   9. KEYBOARD ACCESSIBILITY — space/enter on drop zone already handled
   ============================================================ */
// Allow tab navigation to clear button
btnClearFile.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    btnClearFile.click();
  }
});
