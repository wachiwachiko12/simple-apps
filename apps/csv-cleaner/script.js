/* ============================================================
   CSV Cleaner — script.js
   ブラウザ完結・ローカル処理のCSVクリーニングツール
   ============================================================ */

'use strict';

// ----------------------------------------------------------------
// 状態管理
// ----------------------------------------------------------------
let currentData = [];      // 現在の行データ（配列of配列）
let headers = [];          // ヘッダー行
let activeColumns = [];    // 表示中の列インデックス
let history = [];          // undoスタック [{headers, data, label}]

// ----------------------------------------------------------------
// DOM参照
// ----------------------------------------------------------------
const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const csvPaste       = document.getElementById('csv-paste');
const parsePasteBtn  = document.getElementById('parse-paste-btn');
const uploadStatus   = document.getElementById('upload-status');

const operationsSection = document.getElementById('operations-section');
const previewSection    = document.getElementById('preview-section');
const downloadSection   = document.getElementById('download-section');

const dataInfo       = document.getElementById('data-info');
const btnDedup       = document.getElementById('btn-dedup');
const btnEmpty       = document.getElementById('btn-empty');
const btnTrim        = document.getElementById('btn-trim');
const colCheckboxes  = document.getElementById('col-checkboxes');
const btnApplyCols   = document.getElementById('btn-apply-cols');
const filterCol      = document.getElementById('filter-col');
const filterType     = document.getElementById('filter-type');
const filterValue    = document.getElementById('filter-value');
const btnApplyFilter = document.getElementById('btn-apply-filter');
const renameInputs   = document.getElementById('rename-inputs');
const btnApplyRename = document.getElementById('btn-apply-rename');
const historyList    = document.getElementById('history-list');
const btnUndo        = document.getElementById('btn-undo');

const previewNote  = document.getElementById('preview-note');
const previewThead = document.getElementById('preview-thead');
const previewTbody = document.getElementById('preview-tbody');

const encodingSelect = document.getElementById('encoding-select');
const btnDownload    = document.getElementById('btn-download');

// ----------------------------------------------------------------
// CSV パーサー（RFC 4180準拠・簡易版）
// ----------------------------------------------------------------
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row = [];
    // 行末まで読む
    while (i < len) {
      if (text[i] === '"') {
        // クォートフィールド
        let field = '';
        i++; // 開きクォートをスキップ
        while (i < len) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // 閉じクォートをスキップ
              break;
            }
          } else {
            field += text[i++];
          }
        }
        row.push(field);
        // 区切り文字 or 改行を読み飛ばす
        if (text[i] === ',') i++;
        else if (text[i] === '\r' && text[i + 1] === '\n') { i += 2; break; }
        else if (text[i] === '\n' || text[i] === '\r') { i++; break; }
        else if (i >= len) break;
      } else {
        // 非クォートフィールド
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i++];
        }
        row.push(field);
        if (text[i] === ',') { i++; }
        else if (text[i] === '\r' && text[i + 1] === '\n') { i += 2; break; }
        else if (text[i] === '\n' || text[i] === '\r') { i++; break; }
        else if (i >= len) break;
      }
    }
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

// ----------------------------------------------------------------
// Shift-JIS 自動判別読み込み
// ----------------------------------------------------------------
function readFileWithEncoding(file, callback) {
  const readerUtf8 = new FileReader();
  readerUtf8.onload = function (e) {
    let text = e.target.result;
    // 文字化けチェック（置換文字 U+FFFD が多い場合 Shift-JIS として再試行）
    const replacementCount = (text.match(/�/g) || []).length;
    if (replacementCount > 5) {
      const readerSjis = new FileReader();
      readerSjis.onload = function (e2) {
        callback(e2.target.result);
      };
      readerSjis.readAsText(file, 'Shift-JIS');
    } else {
      callback(text);
    }
  };
  readerUtf8.readAsText(file, 'UTF-8');
}

// ----------------------------------------------------------------
// 読み込み後の初期化
// ----------------------------------------------------------------
function initData(text, source) {
  const rows = parseCSV(text.trim());
  if (rows.length < 2) {
    showStatus('CSVの読み込みに失敗しました。ヘッダー行と1行以上のデータが必要です。', 'error');
    return;
  }
  headers = rows[0].map(h => h.trim());
  currentData = rows.slice(1);
  activeColumns = headers.map((_, i) => i);
  history = [];

  showStatus(`読み込み完了：${currentData.length.toLocaleString()}行 × ${headers.length}列（${source}）`, 'success');
  showSections();
  renderAll();
}

function showSections() {
  operationsSection.classList.remove('hidden');
  previewSection.classList.remove('hidden');
  downloadSection.classList.remove('hidden');
}

function showStatus(msg, type) {
  uploadStatus.textContent = msg;
  uploadStatus.className = 'status-message ' + (type || '');
}

// ----------------------------------------------------------------
// Undo スタック
// ----------------------------------------------------------------
function saveHistory(label) {
  history.push({
    headers: [...headers],
    data: currentData.map(r => [...r]),
    activeColumns: [...activeColumns],
    label
  });
  renderHistoryList();
  btnUndo.disabled = false;
}

function renderHistoryList() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<li class="history-empty">操作はまだありません</li>';
    btnUndo.disabled = true;
    return;
  }
  history.forEach((item, idx) => {
    const li = document.createElement('li');
    const badge = document.createElement('span');
    badge.className = 'history-badge';
    badge.textContent = idx + 1;
    li.appendChild(badge);
    li.appendChild(document.createTextNode(' ' + item.label));
    historyList.insertBefore(li, historyList.firstChild);
  });
}

// ----------------------------------------------------------------
// レンダリング
// ----------------------------------------------------------------
function renderAll() {
  renderDataInfo();
  renderColCheckboxes();
  renderFilterCols();
  renderRenameInputs();
  renderPreview();
}

function renderDataInfo() {
  const visibleCols = activeColumns.length;
  dataInfo.textContent = `データ: ${currentData.length.toLocaleString()}行 × ${visibleCols}列表示中（全${headers.length}列）`;
}

function renderColCheckboxes() {
  colCheckboxes.innerHTML = '';
  headers.forEach((h, i) => {
    const item = document.createElement('label');
    item.className = 'col-checkbox-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = i;
    cb.checked = activeColumns.includes(i);
    item.appendChild(cb);
    item.appendChild(document.createTextNode(h || `列${i + 1}`));
    colCheckboxes.appendChild(item);
  });
}

function renderFilterCols() {
  filterCol.innerHTML = '';
  headers.forEach((h, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = h || `列${i + 1}`;
    filterCol.appendChild(opt);
  });
}

function renderRenameInputs() {
  renameInputs.innerHTML = '';
  headers.forEach((h, i) => {
    const row = document.createElement('div');
    row.className = 'rename-row';

    const orig = document.createElement('input');
    orig.type = 'text';
    orig.className = 'rename-input original';
    orig.value = h;
    orig.readOnly = true;
    orig.setAttribute('aria-label', `元の列名 ${i + 1}`);

    const arrow = document.createElement('span');
    arrow.className = 'rename-arrow';
    arrow.textContent = '→';

    const newName = document.createElement('input');
    newName.type = 'text';
    newName.className = 'rename-input';
    newName.value = h;
    newName.dataset.colIndex = i;
    newName.setAttribute('aria-label', `新しい列名 ${i + 1}`);

    row.appendChild(orig);
    row.appendChild(arrow);
    row.appendChild(newName);
    renameInputs.appendChild(row);
  });
}

function renderPreview() {
  const PREVIEW_LIMIT = 1000;
  const visibleData = currentData.slice(0, PREVIEW_LIMIT);

  // ヘッダー
  previewThead.innerHTML = '';
  const tr = document.createElement('tr');
  activeColumns.forEach(i => {
    const th = document.createElement('th');
    th.textContent = headers[i] || `列${i + 1}`;
    tr.appendChild(th);
  });
  previewThead.appendChild(tr);

  // データ行
  previewTbody.innerHTML = '';
  visibleData.forEach(row => {
    const tr = document.createElement('tr');
    activeColumns.forEach(i => {
      const td = document.createElement('td');
      td.textContent = row[i] !== undefined ? row[i] : '';
      td.title = row[i] !== undefined ? row[i] : '';
      tr.appendChild(td);
    });
    previewTbody.appendChild(tr);
  });

  const total = currentData.length;
  if (total > PREVIEW_LIMIT) {
    previewNote.textContent = `全${total.toLocaleString()}行中、最初の${PREVIEW_LIMIT.toLocaleString()}行を表示しています。`;
  } else {
    previewNote.textContent = `全${total.toLocaleString()}行を表示しています。`;
  }

  renderDataInfo();
}

// ----------------------------------------------------------------
// クリーニング操作
// ----------------------------------------------------------------
btnDedup.addEventListener('click', () => {
  saveHistory('重複行を削除');
  const seen = new Set();
  const before = currentData.length;
  currentData = currentData.filter(row => {
    const key = activeColumns.map(i => row[i] ?? '').join('\x00');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const removed = before - currentData.length;
  showStatus(`重複削除: ${removed.toLocaleString()}行を削除しました。`, 'success');
  renderAll();
});

btnEmpty.addEventListener('click', () => {
  saveHistory('空白行を削除');
  const before = currentData.length;
  currentData = currentData.filter(row => row.some(cell => cell && cell.trim() !== ''));
  const removed = before - currentData.length;
  showStatus(`空白行削除: ${removed.toLocaleString()}行を削除しました。`, 'success');
  renderAll();
});

btnTrim.addEventListener('click', () => {
  saveHistory('前後の空白を除去');
  currentData = currentData.map(row => row.map(cell => (cell ? cell.trim() : cell)));
  showStatus('前後の空白を除去しました。', 'success');
  renderAll();
});

// ----------------------------------------------------------------
// 列の選択/除外
// ----------------------------------------------------------------
btnApplyCols.addEventListener('click', () => {
  const checked = Array.from(colCheckboxes.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => parseInt(cb.value, 10));
  if (checked.length === 0) {
    showStatus('少なくとも1列は選択してください。', 'error');
    return;
  }
  saveHistory(`列選択: ${checked.length}列を表示`);
  activeColumns = checked;
  showStatus(`列の選択を適用しました（${checked.length}列）。`, 'success');
  renderAll();
});

// ----------------------------------------------------------------
// フィルタリング
// ----------------------------------------------------------------
btnApplyFilter.addEventListener('click', () => {
  const colIdx = parseInt(filterCol.value, 10);
  const type = filterType.value;
  const keyword = filterValue.value;
  if (keyword === '') {
    showStatus('フィルターキーワードを入力してください。', 'error');
    return;
  }
  saveHistory(`フィルター: ${headers[colIdx] || `列${colIdx + 1}`} ${type} "${keyword}"`);
  const kw = keyword.toLowerCase();
  const before = currentData.length;
  currentData = currentData.filter(row => {
    const val = (row[colIdx] ?? '').toLowerCase();
    switch (type) {
      case 'contains':     return val.includes(kw);
      case 'not-contains': return !val.includes(kw);
      case 'equals':       return val === kw;
      case 'starts-with':  return val.startsWith(kw);
      case 'ends-with':    return val.endsWith(kw);
      default:             return true;
    }
  });
  const removed = before - currentData.length;
  showStatus(`フィルター適用: ${currentData.length.toLocaleString()}行が一致（${removed.toLocaleString()}行を除外）。`, 'success');
  renderAll();
});

// ----------------------------------------------------------------
// 列名変更
// ----------------------------------------------------------------
btnApplyRename.addEventListener('click', () => {
  const inputs = renameInputs.querySelectorAll('input.rename-input:not(.original)');
  const newHeaders = Array.from(inputs).map(inp => inp.value);
  saveHistory('列名を変更');
  headers = newHeaders;
  showStatus('列名を変更しました。', 'success');
  renderAll();
});

// ----------------------------------------------------------------
// Undo
// ----------------------------------------------------------------
btnUndo.addEventListener('click', () => {
  if (history.length === 0) return;
  const prev = history.pop();
  headers = prev.headers;
  currentData = prev.data;
  activeColumns = prev.activeColumns;
  renderHistoryList();
  showStatus(`「${prev.label}」を取り消しました。`, 'success');
  renderAll();
});

// ----------------------------------------------------------------
// CSVシリアライズ
// ----------------------------------------------------------------
function serializeCSV(hdrs, data, cols) {
  const escapeField = (val) => {
    const s = val !== undefined && val !== null ? String(val) : '';
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [];
  lines.push(cols.map(i => escapeField(hdrs[i])).join(','));
  data.forEach(row => {
    lines.push(cols.map(i => escapeField(row[i])).join(','));
  });
  return lines.join('\r\n');
}

// ----------------------------------------------------------------
// Shift-JIS変換（簡易・CP932マッピング）
// ----------------------------------------------------------------
function utf8ToShiftJIS(str) {
  // TextEncoder/Decoder ではShift-JISをサポートしていないブラウザがあるため
  // encoding.js CDN なしで簡易対応。UTF-8のままでBOM付きにする（Excelはこれで日本語認識）
  const bom = '﻿';
  return bom + str;
}

// ----------------------------------------------------------------
// ダウンロード
// ----------------------------------------------------------------
btnDownload.addEventListener('click', () => {
  if (currentData.length === 0) {
    showStatus('ダウンロードするデータがありません。', 'error');
    return;
  }
  const csvStr = serializeCSV(headers, currentData, activeColumns);
  const encoding = encodingSelect.value;
  let blob;

  if (encoding === 'shift-jis') {
    // BOM付きUTF-8（Excelで文字化けしない実用的な代替）
    blob = new Blob([utf8ToShiftJIS(csvStr)], { type: 'text/csv;charset=utf-8' });
  } else {
    blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8' });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cleaned_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus('ダウンロードを開始しました。', 'success');
});

// ----------------------------------------------------------------
// ドラッグ&ドロップ
// ----------------------------------------------------------------
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  handleFile(file);
});

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

// ----------------------------------------------------------------
// ファイル選択
// ----------------------------------------------------------------
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  handleFile(file);
  fileInput.value = '';
});

function handleFile(file) {
  if (!file.name.match(/\.csv$/i) && file.type !== 'text/csv') {
    showStatus('CSVファイル（.csv）のみ対応しています。', 'error');
    return;
  }
  showStatus('読み込み中...', '');
  readFileWithEncoding(file, (text) => {
    initData(text, `ファイル: ${file.name}`);
  });
}

// ----------------------------------------------------------------
// テキスト直接貼り付け
// ----------------------------------------------------------------
parsePasteBtn.addEventListener('click', () => {
  const text = csvPaste.value.trim();
  if (!text) {
    showStatus('CSVテキストを入力してください。', 'error');
    return;
  }
  initData(text, 'テキスト貼り付け');
  csvPaste.value = '';
});
