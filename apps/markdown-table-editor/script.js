/**
 * Markdownテーブルエディタ — script.js
 * Vanilla JS のみ。フレームワーク・外部APIなし。
 */

'use strict';

// ========== 定数 ==========
const STORAGE_KEY = 'md_table_editor_v1';
const DEFAULT_COLS = 3;
const DEFAULT_ROWS = 5; // ヘッダー除く
const ALIGN_OPTIONS = [
  { value: 'left',   label: '左揃え',  symbol: ':---' },
  { value: 'center', label: '中央',    symbol: ':---:' },
  { value: 'right',  label: '右揃え',  symbol: '---:' },
];

// ========== サンプルデータ ==========
const SAMPLE_DATA = {
  headers: ['機能', '説明', '対応状況'],
  rows: [
    ['GUI編集', 'Excelライクなセル編集', '対応済み'],
    ['Tab/Enter移動', 'キーボードでセル移動', '対応済み'],
    ['アライメント', '列ごとに揃えを設定', '対応済み'],
    ['Markdownコピー', 'ワンクリックでコピー', '対応済み'],
    ['自動保存', 'localStorageに保存', '対応済み'],
  ],
  alignments: ['left', 'left', 'center'],
};

// ========== ステート ==========
let state = {
  headers: [],
  rows: [],       // rows[rowIdx][colIdx] = string
  alignments: [], // 'left' | 'center' | 'right'
};

// ========== DOM参照 ==========
const tableHead = document.getElementById('table-head');
const tableBody = document.getElementById('table-body');
const alignControls = document.getElementById('alignment-controls');
const markdownOutput = document.getElementById('markdown-output');
const markdownInput = document.getElementById('markdown-input');

// ========== 初期化 ==========
function init() {
  const saved = loadFromStorage();
  if (saved) {
    state = saved;
  } else {
    state = {
      headers: [...SAMPLE_DATA.headers],
      rows: SAMPLE_DATA.rows.map(r => [...r]),
      alignments: [...SAMPLE_DATA.alignments],
    };
  }
  render();
  bindButtons();
}

// ========== レンダリング ==========
function render() {
  renderTable();
  renderAlignmentControls();
  updateMarkdown();
}

function renderTable() {
  const cols = state.headers.length;

  // --- thead ---
  tableHead.innerHTML = '';
  const trHead = document.createElement('tr');

  // 行番号ダミーセル
  const thNum = document.createElement('th');
  thNum.className = 'row-num';
  thNum.textContent = '#';
  thNum.setAttribute('aria-hidden', 'true');
  trHead.appendChild(thNum);

  state.headers.forEach((val, ci) => {
    const th = document.createElement('th');
    const inp = createCellInput(val, -1, ci);
    th.appendChild(inp);
    trHead.appendChild(th);
  });
  tableHead.appendChild(trHead);

  // --- tbody ---
  tableBody.innerHTML = '';
  state.rows.forEach((row, ri) => {
    const tr = document.createElement('tr');

    const tdNum = document.createElement('td');
    tdNum.className = 'row-num';
    tdNum.textContent = ri + 1;
    tdNum.setAttribute('aria-hidden', 'true');
    tr.appendChild(tdNum);

    for (let ci = 0; ci < cols; ci++) {
      const td = document.createElement('td');
      const inp = createCellInput(row[ci] || '', ri, ci);
      td.appendChild(inp);
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  });
}

function createCellInput(value, rowIdx, colIdx) {
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'cell-input';
  inp.value = value;
  inp.setAttribute('aria-label', rowIdx === -1
    ? `ヘッダー列${colIdx + 1}`
    : `行${rowIdx + 1} 列${colIdx + 1}`);

  inp.addEventListener('input', () => {
    setCellValue(rowIdx, colIdx, inp.value);
  });

  inp.addEventListener('keydown', (e) => {
    handleCellKeydown(e, rowIdx, colIdx);
  });

  inp.addEventListener('focus', () => {
    inp.select();
  });

  return inp;
}

function renderAlignmentControls() {
  alignControls.innerHTML = '';
  state.headers.forEach((_, ci) => {
    const wrap = document.createElement('label');
    wrap.className = 'align-select-label';
    wrap.textContent = `列${ci + 1}`;

    const sel = document.createElement('select');
    sel.className = 'align-select';
    sel.setAttribute('aria-label', `列${ci + 1}のアライメント`);

    ALIGN_OPTIONS.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (state.alignments[ci] === opt.value) option.selected = true;
      sel.appendChild(option);
    });

    sel.addEventListener('change', () => {
      state.alignments[ci] = sel.value;
      updateMarkdown();
      saveToStorage();
    });

    wrap.appendChild(sel);
    alignControls.appendChild(wrap);
  });
}

// ========== セル値の更新 ==========
function setCellValue(rowIdx, colIdx, value) {
  if (rowIdx === -1) {
    state.headers[colIdx] = value;
  } else {
    state.rows[rowIdx][colIdx] = value;
  }
  updateMarkdown();
  saveToStorage();
}

// ========== キーボードナビゲーション ==========
function handleCellKeydown(e, rowIdx, colIdx) {
  const cols = state.headers.length;
  const totalRows = state.rows.length; // ヘッダー除く

  let nextRow = rowIdx;
  let nextCol = colIdx;
  let handled = false;

  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      // Shift+Tab: 左
      nextCol = colIdx - 1;
      if (nextCol < 0) {
        nextCol = cols - 1;
        nextRow = rowIdx - 1;
        if (nextRow < -1) nextRow = totalRows - 1;
      }
    } else {
      // Tab: 右
      nextCol = colIdx + 1;
      if (nextCol >= cols) {
        nextCol = 0;
        nextRow = rowIdx + 1;
        if (nextRow >= totalRows) nextRow = -1;
      }
    }
    handled = true;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      nextRow = rowIdx - 1;
      if (nextRow < -1) nextRow = totalRows - 1;
    } else {
      nextRow = rowIdx + 1;
      if (nextRow >= totalRows) nextRow = -1;
    }
    handled = true;
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    nextRow = Math.min(rowIdx + 1, totalRows - 1);
    handled = true;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    nextRow = Math.max(rowIdx - 1, -1);
    handled = true;
  } else if (e.key === 'ArrowLeft') {
    // カーソルが先頭にあるときだけ左セルへ
    if (e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
      e.preventDefault();
      nextCol = Math.max(colIdx - 1, 0);
      handled = true;
    }
  } else if (e.key === 'ArrowRight') {
    // カーソルが末尾にあるときだけ右セルへ
    if (e.target.selectionStart === e.target.value.length) {
      e.preventDefault();
      nextCol = Math.min(colIdx + 1, cols - 1);
      handled = true;
    }
  }

  if (handled) {
    focusCell(nextRow, nextCol);
  }
}

function focusCell(rowIdx, colIdx) {
  const targetInput = getCellInput(rowIdx, colIdx);
  if (targetInput) {
    targetInput.focus();
    // カーソルを末尾に移動
    const len = targetInput.value.length;
    targetInput.setSelectionRange(len, len);
  }
}

function getCellInput(rowIdx, colIdx) {
  // rowIdx === -1 はヘッダー行
  const tr = rowIdx === -1
    ? tableHead.querySelector('tr')
    : tableBody.querySelectorAll('tr')[rowIdx];
  if (!tr) return null;
  // +1 は行番号セルの分
  const td = tr.querySelectorAll('th, td')[colIdx + 1];
  if (!td) return null;
  return td.querySelector('input');
}

// ========== 行・列の追加/削除 ==========
function addRow() {
  const cols = state.headers.length;
  state.rows.push(Array(cols).fill(''));
  render();
  saveToStorage();
  // 新しい行の最初のセルにフォーカス
  focusCell(state.rows.length - 1, 0);
}

function deleteRow() {
  if (state.rows.length <= 1) return;
  state.rows.pop();
  render();
  saveToStorage();
}

function addCol() {
  state.headers.push(`列${state.headers.length + 1}`);
  state.alignments.push('left');
  state.rows.forEach(row => row.push(''));
  render();
  saveToStorage();
}

function deleteCol() {
  if (state.headers.length <= 1) return;
  state.headers.pop();
  state.alignments.pop();
  state.rows.forEach(row => row.pop());
  render();
  saveToStorage();
}

// ========== Markdown生成 ==========
function generateMarkdown() {
  const cols = state.headers.length;

  // 各列の最大幅を計算（最低3文字）
  const colWidths = state.headers.map((h, ci) => {
    let max = Math.max(3, h.length);
    state.rows.forEach(row => {
      max = Math.max(max, (row[ci] || '').length);
    });
    // アライメントシンボルの最小幅も考慮
    const sym = ALIGN_OPTIONS.find(o => o.value === state.alignments[ci])?.symbol || ':---';
    max = Math.max(max, sym.length);
    return max;
  });

  // セルをパディング
  function padCell(text, width, align) {
    const str = text || '';
    if (align === 'right') return str.padStart(width);
    if (align === 'center') {
      const total = width - str.length;
      const left = Math.floor(total / 2);
      const right = total - left;
      return ' '.repeat(left) + str + ' '.repeat(right);
    }
    return str.padEnd(width);
  }

  // ヘッダー行
  const headerCells = state.headers.map((h, ci) =>
    ' ' + padCell(h, colWidths[ci], state.alignments[ci]) + ' '
  );
  const headerLine = '|' + headerCells.join('|') + '|';

  // セパレーター行
  const sepCells = state.alignments.map((align, ci) => {
    const width = colWidths[ci];
    if (align === 'left')   return ' :' + '-'.repeat(width - 1) + ' ';
    if (align === 'right')  return ' ' + '-'.repeat(width - 1) + ': ';
    if (align === 'center') return ' :' + '-'.repeat(width - 2) + ': ';
    return ' ' + '-'.repeat(width) + ' ';
  });
  const sepLine = '|' + sepCells.join('|') + '|';

  // データ行
  const dataLines = state.rows.map(row => {
    const cells = row.map((val, ci) =>
      ' ' + padCell(val, colWidths[ci], state.alignments[ci]) + ' '
    );
    return '|' + cells.join('|') + '|';
  });

  return [headerLine, sepLine, ...dataLines].join('\n');
}

function updateMarkdown() {
  markdownOutput.textContent = generateMarkdown();
}

// ========== コピー機能 ==========
function copyMarkdown(btn) {
  const text = markdownOutput.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'コピーしました!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = btn === document.getElementById('btn-copy') ? 'Markdownをコピー' : 'コピー';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // フォールバック: execCommand
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'コピーしました!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = btn === document.getElementById('btn-copy') ? 'Markdownをコピー' : 'コピー';
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ========== Markdown読み込み ==========
function importMarkdown() {
  const text = markdownInput.value.trim();
  if (!text) return;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 2) {
    alert('有効なMarkdownテーブルが見つかりませんでした。\n1行目はヘッダー、2行目は区切り線（|---|---|）が必要です。');
    return;
  }

  // セルパース（パイプをエスケープしない想定）
  function parseLine(line) {
    return line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  }

  const headerCells = parseLine(lines[0]);
  const sepCells = parseLine(lines[1]);

  // アライメント検出
  const alignments = sepCells.map(sep => {
    if (/^:-+:$/.test(sep)) return 'center';
    if (/^-+:$/.test(sep))  return 'right';
    return 'left';
  });

  const cols = headerCells.length;
  const rows = lines.slice(2).map(line => {
    const cells = parseLine(line);
    // 列数が足りない場合は空文字で埋める
    while (cells.length < cols) cells.push('');
    return cells.slice(0, cols);
  });

  state = {
    headers: headerCells,
    rows: rows.length > 0 ? rows : [Array(cols).fill('')],
    alignments,
  };

  markdownInput.value = '';
  render();
  saveToStorage();
}

// ========== LocalStorage ==========
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // ストレージが使えない環境では無視
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.headers || !parsed.rows || !parsed.alignments) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

// ========== ボタンバインド ==========
function bindButtons() {
  document.getElementById('btn-add-row').addEventListener('click', addRow);
  document.getElementById('btn-del-row').addEventListener('click', deleteRow);
  document.getElementById('btn-add-col').addEventListener('click', addCol);
  document.getElementById('btn-del-col').addEventListener('click', deleteCol);

  const btnCopy = document.getElementById('btn-copy');
  const btnCopy2 = document.getElementById('btn-copy2');
  btnCopy.addEventListener('click', () => copyMarkdown(btnCopy));
  btnCopy2.addEventListener('click', () => copyMarkdown(btnCopy2));

  document.getElementById('btn-import').addEventListener('click', importMarkdown);

  // Enterキーでも読み込めるように
  markdownInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      importMarkdown();
    }
  });
}

// ========== 起動 ==========
document.addEventListener('DOMContentLoaded', init);
