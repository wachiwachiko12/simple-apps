/**
 * 正規表現ビジュアルフローチャート化ツール
 * Regex Railroad Diagram Visualizer
 */

'use strict';

/* =============================================
   TOKEN TYPES & COLORS
   ============================================= */

const TOKEN_TYPES = {
  LITERAL:     'literal',
  CHAR_CLASS:  'charClass',
  QUANTIFIER:  'quantifier',
  GROUP_OPEN:  'groupOpen',
  GROUP_CLOSE: 'groupClose',
  ANCHOR:      'anchor',
  SPECIAL:     'special',
  ALT:         'alt',
  NAMED_GROUP: 'namedGroup',
  NON_CAPTURE: 'nonCapture',
  LOOKAHEAD:   'lookahead',
  LOOKBEHIND:  'lookbehind',
};

const TOKEN_COLORS = {
  [TOKEN_TYPES.LITERAL]:     '#3b82f6',
  [TOKEN_TYPES.CHAR_CLASS]:  '#10b981',
  [TOKEN_TYPES.QUANTIFIER]:  '#f97316',
  [TOKEN_TYPES.GROUP_OPEN]:  '#8b5cf6',
  [TOKEN_TYPES.GROUP_CLOSE]: '#8b5cf6',
  [TOKEN_TYPES.ANCHOR]:      '#ef4444',
  [TOKEN_TYPES.SPECIAL]:     '#6b7280',
  [TOKEN_TYPES.ALT]:         '#eab308',
  [TOKEN_TYPES.NAMED_GROUP]: '#8b5cf6',
  [TOKEN_TYPES.NON_CAPTURE]: '#a78bfa',
  [TOKEN_TYPES.LOOKAHEAD]:   '#ec4899',
  [TOKEN_TYPES.LOOKBEHIND]:  '#f43f5e',
};

const TOKEN_LABELS_JA = {
  [TOKEN_TYPES.LITERAL]:     'リテラル',
  [TOKEN_TYPES.CHAR_CLASS]:  '文字クラス',
  [TOKEN_TYPES.QUANTIFIER]:  '量詞',
  [TOKEN_TYPES.GROUP_OPEN]:  'グループ開始',
  [TOKEN_TYPES.GROUP_CLOSE]: 'グループ終了',
  [TOKEN_TYPES.ANCHOR]:      'アンカー',
  [TOKEN_TYPES.SPECIAL]:     '特殊文字',
  [TOKEN_TYPES.ALT]:         '交替（OR）',
  [TOKEN_TYPES.NAMED_GROUP]: '名前付きグループ',
  [TOKEN_TYPES.NON_CAPTURE]: '非キャプチャグループ',
  [TOKEN_TYPES.LOOKAHEAD]:   '先読み',
  [TOKEN_TYPES.LOOKBEHIND]:  '後読み',
};

const TOKEN_DESC_JA = {
  [TOKEN_TYPES.LITERAL]:     '文字そのものにマッチします。',
  [TOKEN_TYPES.CHAR_CLASS]:  '[]内のいずれか1文字にマッチします。[^...]は否定です。',
  [TOKEN_TYPES.QUANTIFIER]:  '直前の要素の繰り返し回数を指定します。*は0回以上、+は1回以上、?は0か1回、{n,m}はn〜m回です。',
  [TOKEN_TYPES.GROUP_OPEN]:  'キャプチャグループの開始。マッチ結果をグループとして取得できます。',
  [TOKEN_TYPES.GROUP_CLOSE]: 'グループの終了。',
  [TOKEN_TYPES.ANCHOR]:      '文字列や単語の位置を指定します。^は行頭、$は行末、\\bは単語境界です。',
  [TOKEN_TYPES.SPECIAL]:     '\\dは数字、\\wは単語文字、\\sは空白文字、.は改行以外の任意1文字にマッチします。',
  [TOKEN_TYPES.ALT]:         'どちらか一方のパターンにマッチします（OR条件）。',
  [TOKEN_TYPES.NAMED_GROUP]: '名前付きキャプチャグループ。(?<name>...)の形式です。',
  [TOKEN_TYPES.NON_CAPTURE]: 'グループ化しますが結果をキャプチャしません。(?:...)の形式です。',
  [TOKEN_TYPES.LOOKAHEAD]:   '(?=...)は後に続くパターンを確認するだけでマッチ位置を進めません（先読み）。(?!...)は否定先読みです。',
  [TOKEN_TYPES.LOOKBEHIND]:  '(?<=...)は直前のパターンを確認します（後読み）。(?<!...)は否定後読みです。',
};

/* =============================================
   TOKENIZER
   ============================================= */

function tokenize(pattern) {
  const tokens = [];
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    // Escaped character
    if (ch === '\\') {
      const next = pattern[i + 1];
      if (!next) { tokens.push({ type: TOKEN_TYPES.LITERAL, raw: '\\', display: '\\' }); i++; continue; }
      if ('dDwWsSbBnrtfv0'.includes(next)) {
        const type = 'bB'.includes(next) ? TOKEN_TYPES.ANCHOR : TOKEN_TYPES.SPECIAL;
        tokens.push({ type, raw: '\\' + next, display: '\\' + next });
      } else {
        tokens.push({ type: TOKEN_TYPES.LITERAL, raw: '\\' + next, display: next });
      }
      i += 2; continue;
    }

    // Character class [...]
    if (ch === '[') {
      let raw = '[';
      i++;
      if (i < pattern.length && pattern[i] === '^') { raw += '^'; i++; }
      while (i < pattern.length && pattern[i] !== ']') {
        if (pattern[i] === '\\') { raw += pattern[i] + (pattern[i + 1] || ''); i += 2; }
        else { raw += pattern[i]; i++; }
      }
      if (i < pattern.length) { raw += ']'; i++; }
      tokens.push({ type: TOKEN_TYPES.CHAR_CLASS, raw, display: raw });
      continue;
    }

    // Group open with variants
    if (ch === '(') {
      if (pattern.slice(i, i + 3) === '(?:') {
        tokens.push({ type: TOKEN_TYPES.NON_CAPTURE, raw: '(?:', display: '(?:' });
        i += 3; continue;
      }
      if (pattern.slice(i, i + 4) === '(?<=') {
        tokens.push({ type: TOKEN_TYPES.LOOKBEHIND, raw: '(?<=', display: '(?<=' });
        i += 4; continue;
      }
      if (pattern.slice(i, i + 4) === '(?<!') {
        tokens.push({ type: TOKEN_TYPES.LOOKBEHIND, raw: '(?<!', display: '(?<!' });
        i += 4; continue;
      }
      if (pattern.slice(i, i + 3) === '(?=') {
        tokens.push({ type: TOKEN_TYPES.LOOKAHEAD, raw: '(?=', display: '(?=' });
        i += 3; continue;
      }
      if (pattern.slice(i, i + 3) === '(?!') {
        tokens.push({ type: TOKEN_TYPES.LOOKAHEAD, raw: '(?!', display: '(?!' });
        i += 3; continue;
      }
      // Named group (?<name>
      const namedMatch = pattern.slice(i).match(/^\(\?<([^>]+)>/);
      if (namedMatch) {
        tokens.push({ type: TOKEN_TYPES.NAMED_GROUP, raw: namedMatch[0], display: '(?<' + namedMatch[1] + '>' });
        i += namedMatch[0].length; continue;
      }
      tokens.push({ type: TOKEN_TYPES.GROUP_OPEN, raw: '(', display: '(' });
      i++; continue;
    }

    // Group close
    if (ch === ')') {
      tokens.push({ type: TOKEN_TYPES.GROUP_CLOSE, raw: ')', display: ')' });
      i++; continue;
    }

    // Alternation
    if (ch === '|') {
      tokens.push({ type: TOKEN_TYPES.ALT, raw: '|', display: '|' });
      i++; continue;
    }

    // Anchors
    if (ch === '^' || ch === '$') {
      tokens.push({ type: TOKEN_TYPES.ANCHOR, raw: ch, display: ch });
      i++; continue;
    }

    // Dot (any char)
    if (ch === '.') {
      tokens.push({ type: TOKEN_TYPES.SPECIAL, raw: '.', display: '.' });
      i++; continue;
    }

    // Quantifiers
    if ('*+?'.includes(ch)) {
      let raw = ch;
      if (pattern[i + 1] === '?') { raw += '?'; i++; } // lazy
      tokens.push({ type: TOKEN_TYPES.QUANTIFIER, raw, display: raw });
      i++; continue;
    }

    if (ch === '{') {
      const qMatch = pattern.slice(i).match(/^\{(\d+)(?:,(\d*))?\}/);
      if (qMatch) {
        let lazy = '';
        if (pattern[i + qMatch[0].length] === '?') { lazy = '?'; }
        tokens.push({ type: TOKEN_TYPES.QUANTIFIER, raw: qMatch[0] + lazy, display: qMatch[0] + lazy });
        i += qMatch[0].length + lazy.length; continue;
      }
      tokens.push({ type: TOKEN_TYPES.LITERAL, raw: '{', display: '{' });
      i++; continue;
    }

    // Literal
    tokens.push({ type: TOKEN_TYPES.LITERAL, raw: ch, display: ch });
    i++;
  }

  return tokens;
}

/* =============================================
   SVG DIAGRAM BUILDER
   ============================================= */

const SVG_NS = 'http://www.w3.org/2000/svg';
const NODE_H = 34;
const NODE_PADDING_X = 12;
const START_END_W = 52;
const CONNECTOR_LEN = 24;
const ARROW_SIZE = 6;
const ROW_MARGIN_Y = 20;  // vertical gap between rows
const ALT_BRANCH_GAP = 50; // vertical gap between alt branches

function measureText(text, fontSize) {
  // approximation: each char ~0.62 * fontSize for monospace
  return Math.max(text.length * fontSize * 0.62, 30);
}

/**
 * Build a flat "row" of nodes from tokens, collapsing quantifiers onto previous node.
 * Returns an array of display items.
 */
function buildDisplayItems(tokens) {
  const items = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // Attach quantifier to previous item
    if (tok.type === TOKEN_TYPES.QUANTIFIER && items.length > 0) {
      items[items.length - 1].quantifier = tok.display;
      continue;
    }
    items.push({
      type: tok.type,
      display: tok.display,
      raw: tok.raw,
      quantifier: null,
    });
  }
  return items;
}

/**
 * Split items by ALT into branches
 */
function splitByAlt(items) {
  const branches = [];
  let current = [];
  for (const item of items) {
    if (item.type === TOKEN_TYPES.ALT) {
      branches.push(current);
      current = [];
    } else {
      current.push(item);
    }
  }
  branches.push(current);
  return branches;
}

function createSVGElement(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * Render a single branch (array of display items) into an SVG group.
 * Returns { group, width, height }
 */
function renderBranch(items, startX, startY) {
  const g = createSVGElement('g', {});
  let cx = startX;
  const cy = startY + NODE_H / 2;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const color = TOKEN_COLORS[item.type] || '#6b7280';
    const label = item.display;
    const nodeW = Math.ceil(measureText(label, 13)) + NODE_PADDING_X * 2;
    const extraY = item.quantifier ? 16 : 0;

    // Connector line before node
    if (i > 0) {
      g.appendChild(createSVGElement('line', {
        x1: cx, y1: cy + extraY, x2: cx + CONNECTOR_LEN, y2: cy + extraY,
        stroke: '#94a3b8', 'stroke-width': '1.5'
      }));
      // Arrow head
      const ax = cx + CONNECTOR_LEN;
      g.appendChild(createSVGElement('polygon', {
        points: `${ax - ARROW_SIZE},${cy + extraY - 3} ${ax},${cy + extraY} ${ax - ARROW_SIZE},${cy + extraY + 3}`,
        fill: '#94a3b8'
      }));
      cx += CONNECTOR_LEN;
    }

    // Quantifier label above box
    if (item.quantifier) {
      const qtx = cx + nodeW / 2;
      const qty = cy - NODE_H / 2 - 4;
      const qtEl = createSVGElement('text', {
        x: qtx, y: qty,
        'font-family': 'SFMono-Regular, Consolas, monospace',
        'font-size': '11',
        'font-weight': '700',
        fill: '#f97316',
        'text-anchor': 'middle',
        'dominant-baseline': 'auto',
      });
      qtEl.textContent = item.quantifier;
      g.appendChild(qtEl);
    }

    // Node rect
    const ry = cy - NODE_H / 2 + extraY;
    const isRound = item.type === TOKEN_TYPES.ANCHOR || item.type === TOKEN_TYPES.ALT;
    const rx = isRound ? NODE_H / 2 : 6;
    g.appendChild(createSVGElement('rect', {
      x: cx, y: ry, width: nodeW, height: NODE_H,
      rx, ry: rx,
      fill: color, stroke: darken(color, 0.2), 'stroke-width': '2'
    }));

    // Node label
    const txtEl = createSVGElement('text', {
      x: cx + nodeW / 2, y: ry + NODE_H / 2,
      'font-family': 'SFMono-Regular, Consolas, Liberation Mono, monospace',
      'font-size': '13',
      fill: '#fff',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    });
    txtEl.textContent = truncateLabel(label, nodeW);
    g.appendChild(txtEl);

    cx += nodeW;
  }

  const totalW = cx - startX;
  return { group: g, width: totalW, height: NODE_H };
}

function darken(hex, amount) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function truncateLabel(label, maxW) {
  const charMax = Math.floor((maxW - 8) / 8);
  if (label.length <= charMax) return label;
  return label.slice(0, Math.max(1, charMax - 1)) + '…';
}

/**
 * Build the full SVG diagram from a pattern string.
 */
function buildDiagram(pattern, svgEl) {
  // Clear
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

  if (!pattern) return;

  const tokens = tokenize(pattern);
  const items = buildDisplayItems(tokens);
  const branches = splitByAlt(items);

  const PAD = 16;
  const branchGap = 14; // gap between alt branches

  // Pre-compute branch widths
  const branchWidths = branches.map(branch => {
    if (branch.length === 0) return 30;
    let w = 0;
    for (let i = 0; i < branch.length; i++) {
      const item = branch[i];
      const lbl = item.display;
      w += Math.ceil(measureText(lbl, 13)) + NODE_PADDING_X * 2;
      if (i > 0) w += CONNECTOR_LEN;
    }
    return w;
  });

  const maxBranchW = Math.max(...branchWidths);
  const totalW = START_END_W + CONNECTOR_LEN + maxBranchW + CONNECTOR_LEN + START_END_W + PAD * 2;

  // If multiple branches, use vertical stacking
  const isMult = branches.length > 1;
  const totalH = isMult
    ? (branches.length * (NODE_H + branchGap)) + PAD * 2 + ROW_MARGIN_Y
    : NODE_H + PAD * 2 + ROW_MARGIN_Y;

  svgEl.setAttribute('width', totalW);
  svgEl.setAttribute('height', totalH);
  svgEl.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);

  const mainGroup = createSVGElement('g', {});
  svgEl.appendChild(mainGroup);

  const startX = PAD;
  const midY = isMult
    ? PAD + ((branches.length - 1) * (NODE_H + branchGap)) / 2 + NODE_H / 2
    : PAD + NODE_H / 2;

  // START node
  renderStartEnd(mainGroup, startX, midY, 'START', '#1e293b');
  const afterStartX = startX + START_END_W + CONNECTOR_LEN;

  if (isMult) {
    // Draw alternation: vertical branches
    for (let bi = 0; bi < branches.length; bi++) {
      const branchY = PAD + bi * (NODE_H + branchGap);
      const branchCY = branchY + NODE_H / 2;

      // Vertical line from midY to branchCY on left
      if (bi === 0 || bi === branches.length - 1) {
        mainGroup.appendChild(createSVGElement('line', {
          x1: afterStartX - CONNECTOR_LEN / 2, y1: midY,
          x2: afterStartX - CONNECTOR_LEN / 2, y2: branchCY,
          stroke: '#94a3b8', 'stroke-width': '1.5'
        }));
      }
      // Horizontal connector to branch
      mainGroup.appendChild(createSVGElement('line', {
        x1: afterStartX - CONNECTOR_LEN / 2, y1: branchCY,
        x2: afterStartX, y2: branchCY,
        stroke: '#94a3b8', 'stroke-width': '1.5'
      }));

      // Branch nodes
      const { group: bg, width: bw } = renderBranch(branches[bi], afterStartX, branchY);
      mainGroup.appendChild(bg);

      const endOfBranchX = afterStartX + bw;
      const mergeX = afterStartX + maxBranchW;

      // Horizontal connector from branch to merge
      mainGroup.appendChild(createSVGElement('line', {
        x1: endOfBranchX, y1: branchCY,
        x2: mergeX + CONNECTOR_LEN / 2, y2: branchCY,
        stroke: '#94a3b8', 'stroke-width': '1.5'
      }));

      // Vertical merge line
      if (bi === 0 || bi === branches.length - 1) {
        mainGroup.appendChild(createSVGElement('line', {
          x1: mergeX + CONNECTOR_LEN / 2, y1: midY,
          x2: mergeX + CONNECTOR_LEN / 2, y2: branchCY,
          stroke: '#94a3b8', 'stroke-width': '1.5'
        }));
      }
    }

    // Connector from merge to END
    const mergeX = afterStartX + maxBranchW;
    mainGroup.appendChild(createSVGElement('line', {
      x1: mergeX + CONNECTOR_LEN / 2, y1: midY,
      x2: mergeX + CONNECTOR_LEN, y2: midY,
      stroke: '#94a3b8', 'stroke-width': '1.5'
    }));
    mainGroup.appendChild(createSVGElement('polygon', {
      points: buildArrowPoints(mergeX + CONNECTOR_LEN, midY),
      fill: '#94a3b8'
    }));
    renderStartEnd(mainGroup, mergeX + CONNECTOR_LEN, midY, 'END', '#1e293b');

  } else {
    // Single branch
    // Connector from START to first node
    mainGroup.appendChild(createSVGElement('line', {
      x1: startX + START_END_W, y1: midY,
      x2: afterStartX, y2: midY,
      stroke: '#94a3b8', 'stroke-width': '1.5'
    }));
    mainGroup.appendChild(createSVGElement('polygon', {
      points: buildArrowPoints(afterStartX, midY),
      fill: '#94a3b8'
    }));

    const { group: bg, width: bw } = renderBranch(branches[0], afterStartX, PAD);
    mainGroup.appendChild(bg);

    // Connector from last node to END
    const endNodeX = afterStartX + bw;
    mainGroup.appendChild(createSVGElement('line', {
      x1: endNodeX, y1: midY,
      x2: endNodeX + CONNECTOR_LEN, y2: midY,
      stroke: '#94a3b8', 'stroke-width': '1.5'
    }));
    mainGroup.appendChild(createSVGElement('polygon', {
      points: buildArrowPoints(endNodeX + CONNECTOR_LEN, midY),
      fill: '#94a3b8'
    }));
    renderStartEnd(mainGroup, endNodeX + CONNECTOR_LEN, midY, 'END', '#1e293b');
  }
}

function buildArrowPoints(x, y) {
  return `${x - ARROW_SIZE},${y - 3} ${x},${y} ${x - ARROW_SIZE},${y + 3}`;
}

function renderStartEnd(parent, cx, cy, label, color) {
  const g = createSVGElement('g', { class: 'start-end-node' });
  g.appendChild(createSVGElement('rect', {
    x: cx, y: cy - NODE_H / 2, width: START_END_W, height: NODE_H,
    rx: NODE_H / 2, ry: NODE_H / 2,
    fill: color, stroke: darken(color, 0.15), 'stroke-width': '2'
  }));
  const txt = createSVGElement('text', {
    x: cx + START_END_W / 2, y: cy,
    'font-family': '-apple-system, BlinkMacSystemFont, sans-serif',
    'font-size': '11',
    'font-weight': '700',
    fill: '#f1f5f9',
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
  });
  txt.textContent = label;
  g.appendChild(txt);
  parent.appendChild(g);
}

/* =============================================
   COMPONENT DESCRIPTION TABLE
   ============================================= */

function buildComponentTable(tokens) {
  const seen = new Set();
  const rows = [];
  for (const tok of tokens) {
    const key = tok.type + ':' + tok.display;
    if (!seen.has(key)) {
      seen.add(key);
      rows.push(tok);
    }
  }
  return rows;
}

function renderComponentTable(tokens) {
  const tbody = document.getElementById('component-tbody');
  const section = document.getElementById('component-section');
  const rows = buildComponentTable(tokens);

  if (rows.length === 0) {
    section.hidden = true;
    return;
  }

  tbody.innerHTML = '';
  for (const tok of rows) {
    const tr = document.createElement('tr');
    const color = TOKEN_COLORS[tok.type] || '#6b7280';
    const label = TOKEN_LABELS_JA[tok.type] || tok.type;
    const desc = TOKEN_DESC_JA[tok.type] || '';

    tr.innerHTML = `
      <td><span class="comp-badge" style="background:${color}">${escHtml(tok.display)}</span></td>
      <td>${escHtml(label)}</td>
      <td>${escHtml(desc)}</td>
    `;
    tbody.appendChild(tr);
  }
  section.hidden = false;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* =============================================
   MATCH TESTER
   ============================================= */

function runMatchTest(pattern, flags, testStr) {
  const matchResult = document.getElementById('match-result');
  const noMatch = document.getElementById('no-match');
  const matchCountLabel = document.getElementById('match-count-label');
  const matchHighlight = document.getElementById('match-highlight');
  const matchList = document.getElementById('match-list');

  matchResult.hidden = true;
  noMatch.hidden = true;

  if (!pattern || !testStr) return;

  let regex;
  try {
    regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (e) {
    return;
  }

  const matches = [...testStr.matchAll(regex)];
  if (matches.length === 0) {
    noMatch.hidden = false;
    return;
  }

  matchCountLabel.textContent = `${matches.length} 件マッチ`;

  // Build highlighted string
  let html = '';
  let lastIdx = 0;
  for (let mi = 0; mi < matches.length; mi++) {
    const m = matches[mi];
    const start = m.index;
    const end = start + m[0].length;
    html += escHtml(testStr.slice(lastIdx, start));
    const cls = mi === 0 ? 'match-first' : '';
    html += `<mark class="${cls}" title="マッチ${mi + 1}: ${escHtml(m[0])}">${escHtml(m[0])}</mark>`;
    lastIdx = end;
  }
  html += escHtml(testStr.slice(lastIdx));
  matchHighlight.innerHTML = html;

  // Match list
  matchList.innerHTML = '';
  matches.forEach((m, idx) => {
    const li = document.createElement('li');
    li.textContent = `[${idx + 1}] "${m[0]}" (index: ${m.index})`;
    matchList.appendChild(li);
  });

  matchResult.hidden = false;
}

/* =============================================
   MAIN CONTROLLER
   ============================================= */

let debounceTimer = null;

function getFlags() {
  const flags = [];
  document.querySelectorAll('.flags-wrap input[type="checkbox"]').forEach(cb => {
    if (cb.checked) flags.push(cb.value);
  });
  return flags.join('');
}

function update() {
  const pattern = document.getElementById('regex-input').value.trim();
  const flags = getFlags();
  const testStr = document.getElementById('test-input').value;
  const errorMsg = document.getElementById('error-msg');
  const diagramPlaceholder = document.getElementById('diagram-placeholder');
  const diagramScroll = document.getElementById('diagram-scroll');
  const svgEl = document.getElementById('regex-svg');

  errorMsg.hidden = true;

  if (!pattern) {
    diagramPlaceholder.hidden = false;
    diagramScroll.hidden = true;
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    document.getElementById('component-section').hidden = true;
    document.getElementById('match-result').hidden = true;
    document.getElementById('no-match').hidden = true;
    return;
  }

  // Validate regex
  try {
    new RegExp(pattern, flags);
  } catch (e) {
    errorMsg.textContent = '正規表現エラー: ' + e.message;
    errorMsg.hidden = false;
    diagramPlaceholder.hidden = false;
    diagramScroll.hidden = true;
    return;
  }

  // Build diagram
  try {
    buildDiagram(pattern, svgEl);
    diagramPlaceholder.hidden = true;
    diagramScroll.hidden = false;
  } catch (e) {
    errorMsg.textContent = 'ダイアグラム生成エラー: ' + e.message;
    errorMsg.hidden = false;
  }

  // Component table
  const tokens = tokenize(pattern);
  renderComponentTable(tokens);

  // Match test
  if (testStr) {
    runMatchTest(pattern, flags, testStr);
  }
}

function scheduleUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(update, 120);
}

document.addEventListener('DOMContentLoaded', () => {
  const regexInput = document.getElementById('regex-input');
  const testInput = document.getElementById('test-input');
  const clearBtn = document.getElementById('clear-btn');

  regexInput.addEventListener('input', scheduleUpdate);
  testInput.addEventListener('input', scheduleUpdate);

  document.querySelectorAll('.flags-wrap input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', scheduleUpdate);
  });

  clearBtn.addEventListener('click', () => {
    regexInput.value = '';
    testInput.value = '';
    update();
    regexInput.focus();
  });

  // Sample patterns
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const regex = btn.dataset.regex;
      if (regex) {
        regexInput.value = regex;
        regexInput.focus();
        scheduleUpdate();
      }
    });
  });

  // Initial state
  update();
});
