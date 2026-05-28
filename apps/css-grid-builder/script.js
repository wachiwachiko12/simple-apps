/* ============================
   CSS Grid Builder — script.js
   ============================ */

'use strict';

// ---- State ----
const state = {
  // Grid
  gridCols: 3,
  gridRows: 3,
  gridColGap: 16,
  gridRowGap: 16,
  gridColTemplate: 'repeat(N, 1fr)',
  gridColCustom: '',
  gridRowTemplate: 'auto',
  gridAlignItems: 'stretch',
  gridJustifyItems: 'stretch',
  // Cell overrides: key = "r_c", value = { colSpan, rowSpan, bg, label }
  cellOverrides: {},
  selectedCell: null, // { r, c }
  gridOutputMode: 'css', // 'css' | 'tailwind'

  // Flex
  flexDirection: 'row',
  flexWrap: 'nowrap',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  alignContent: 'normal',
  flexGap: 16,
  flexItemCount: 4,
  flexItemBasis: 'auto',
  flexItemGrow: '0',
  flexOutputMode: 'css',
};

// ---- Grid Presets ----
const GRID_PRESETS = {
  '2col': {
    gridCols: 2, gridRows: 2, gridColGap: 16, gridRowGap: 16,
    gridColTemplate: 'repeat(N, 1fr)', gridRowTemplate: 'auto',
    cellOverrides: {},
  },
  '3col': {
    gridCols: 3, gridRows: 2, gridColGap: 16, gridRowGap: 16,
    gridColTemplate: 'repeat(N, 1fr)', gridRowTemplate: 'auto',
    cellOverrides: {},
  },
  'header-sidebar-main': {
    gridCols: 3, gridRows: 3, gridColGap: 16, gridRowGap: 16,
    gridColTemplate: 'repeat(N, 1fr)', gridRowTemplate: 'auto',
    cellOverrides: {
      '0_0': { colSpan: 3, rowSpan: 1, bg: '#6366f1', label: 'header' },
      '1_0': { colSpan: 1, rowSpan: 1, bg: '#a5b4fc', label: 'sidebar' },
      '1_1': { colSpan: 2, rowSpan: 1, bg: '#c7d2fe', label: 'main' },
      '2_0': { colSpan: 3, rowSpan: 1, bg: '#818cf8', label: 'footer' },
    },
  },
  'card-grid': {
    gridCols: 3, gridRows: 2, gridColGap: 20, gridRowGap: 20,
    gridColTemplate: 'repeat(N, 1fr)', gridRowTemplate: 'auto',
    cellOverrides: {},
  },
  'holy-grail': {
    gridCols: 3, gridRows: 3, gridColGap: 16, gridRowGap: 16,
    gridColTemplate: 'repeat(N, 1fr)', gridRowTemplate: 'auto',
    cellOverrides: {
      '0_0': { colSpan: 3, rowSpan: 1, bg: '#6366f1', label: 'header' },
      '1_0': { colSpan: 1, rowSpan: 1, bg: '#a5b4fc', label: 'nav' },
      '1_1': { colSpan: 1, rowSpan: 1, bg: '#c7d2fe', label: 'main' },
      '1_2': { colSpan: 1, rowSpan: 1, bg: '#a5b4fc', label: 'aside' },
      '2_0': { colSpan: 3, rowSpan: 1, bg: '#818cf8', label: 'footer' },
    },
  },
};

// ---- Flex Presets ----
const FLEX_PRESETS = {
  'row-center': { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', alignContent: 'normal', flexGap: 16, flexItemCount: 3, flexItemBasis: 'auto', flexItemGrow: '0' },
  'col-center': { flexDirection: 'column', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', alignContent: 'normal', flexGap: 16, flexItemCount: 3, flexItemBasis: 'auto', flexItemGrow: '0' },
  'space-between': { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between', alignItems: 'center', alignContent: 'normal', flexGap: 0, flexItemCount: 4, flexItemBasis: 'auto', flexItemGrow: '0' },
  'nav-bar': { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between', alignItems: 'center', alignContent: 'normal', flexGap: 8, flexItemCount: 4, flexItemBasis: 'auto', flexItemGrow: '0' },
  'card-row': { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'stretch', alignContent: 'normal', flexGap: 20, flexItemCount: 4, flexItemBasis: '200px', flexItemGrow: '1' },
};

// ---- Tailwind mapping helpers ----
function gapToTailwind(px) {
  const map = { 0: '0', 4: '1', 8: '2', 12: '3', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 40: '10', 48: '12', 56: '14', 64: '16' };
  if (map[px] !== undefined) return map[px];
  // closest
  const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
  let closest = keys[0];
  for (const k of keys) {
    if (Math.abs(k - px) < Math.abs(closest - px)) closest = k;
  }
  return map[closest] + `/* ~${px}px */`;
}

function colsToTailwind(n) {
  const map = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: '11', 12: '12' };
  return map[n] || n;
}

// ---- DOM references ----
const elGridCols = document.getElementById('grid-cols');
const elGridRows = document.getElementById('grid-rows');
const elGridColGap = document.getElementById('grid-col-gap');
const elGridColGapVal = document.getElementById('grid-col-gap-val');
const elGridRowGap = document.getElementById('grid-row-gap');
const elGridRowGapVal = document.getElementById('grid-row-gap-val');
const elGridColTemplate = document.getElementById('grid-col-template');
const elGridColCustom = document.getElementById('grid-col-custom');
const elCustomColGroup = document.getElementById('custom-col-group');
const elGridRowTemplate = document.getElementById('grid-row-template');
const elGridAlignItems = document.getElementById('grid-align-items');
const elGridJustifyItems = document.getElementById('grid-justify-items');
const elGridPreview = document.getElementById('grid-preview');
const elSpanPanel = document.getElementById('span-panel');
const elSpanCellLabel = document.getElementById('span-cell-label');
const elSpanCol = document.getElementById('span-col');
const elSpanRow = document.getElementById('span-row');
const elSpanBg = document.getElementById('span-bg');
const elSpanLabelInput = document.getElementById('span-label-input');
const elGridCodeOutput = document.getElementById('grid-code-output');
const elCopyGridBtn = document.getElementById('copy-grid-btn');
const elResetSpanBtn = document.getElementById('reset-span-btn');

const elFlexDirection = document.getElementById('flex-direction');
const elFlexWrap = document.getElementById('flex-wrap');
const elJustifyContent = document.getElementById('justify-content');
const elAlignItems = document.getElementById('align-items');
const elAlignContent = document.getElementById('align-content');
const elFlexGap = document.getElementById('flex-gap');
const elFlexGapVal = document.getElementById('flex-gap-val');
const elFlexItemCount = document.getElementById('flex-item-count');
const elFlexItemBasis = document.getElementById('flex-item-basis');
const elFlexItemGrow = document.getElementById('flex-item-grow');
const elFlexPreview = document.getElementById('flex-preview');
const elFlexCodeOutput = document.getElementById('flex-code-output');
const elCopyFlexBtn = document.getElementById('copy-flex-btn');

// ---- Util ----
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function setSelectValue(el, val) {
  for (const opt of el.options) {
    if (opt.value === val) { el.value = val; return; }
  }
  // fallback: select first
  el.selectedIndex = 0;
}

// ---- Column template resolver ----
function resolveColTemplate() {
  const tpl = state.gridColTemplate;
  const n = state.gridCols;
  if (tpl === 'custom') {
    return state.gridColCustom || `repeat(${n}, 1fr)`;
  }
  return tpl.replace(/N/g, String(n));
}

function resolveRowTemplate() {
  const tpl = state.gridRowTemplate;
  const n = state.gridRows;
  if (tpl === 'auto') return 'auto';
  return tpl.replace(/N/g, String(n));
}

// ---- Grid Rendering ----
function renderGridPreview() {
  const cols = state.gridCols;
  const rows = state.gridRows;

  elGridPreview.style.gridTemplateColumns = resolveColTemplate();
  elGridPreview.style.gridTemplateRows = resolveRowTemplate();
  elGridPreview.style.columnGap = state.gridColGap + 'px';
  elGridPreview.style.rowGap = state.gridRowGap + 'px';
  elGridPreview.style.alignItems = state.gridAlignItems;
  elGridPreview.style.justifyItems = state.gridJustifyItems;

  elGridPreview.innerHTML = '';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r}_${c}`;
      const override = state.cellOverrides[key] || {};
      const colSpan = override.colSpan || 1;
      const rowSpan = override.rowSpan || 1;
      const bg = override.bg || '#c7d2fe';
      const label = override.label || `${r + 1}-${c + 1}`;

      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.style.gridColumn = `span ${colSpan}`;
      cell.style.gridRow = `span ${rowSpan}`;
      cell.style.background = bg;
      cell.textContent = label;
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', `セル ${label}, ${colSpan}列 × ${rowSpan}行`);

      if (state.selectedCell && state.selectedCell.r === r && state.selectedCell.c === c) {
        cell.classList.add('selected');
      }

      cell.addEventListener('click', () => onCellClick(r, c));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(r, c); }
      });

      elGridPreview.appendChild(cell);
    }
  }
}

function onCellClick(r, c) {
  state.selectedCell = { r, c };
  renderGridPreview();
  showSpanPanel(r, c);
}

function showSpanPanel(r, c) {
  const key = `${r}_${c}`;
  const override = state.cellOverrides[key] || {};
  elSpanCellLabel.textContent = `行${r + 1} / 列${c + 1}`;
  elSpanCol.value = override.colSpan || 1;
  elSpanRow.value = override.rowSpan || 1;
  elSpanBg.value = override.bg || '#c7d2fe';
  elSpanLabelInput.value = override.label || '';
  elSpanPanel.style.display = '';
}

function applyCellSpan() {
  if (!state.selectedCell) return;
  const { r, c } = state.selectedCell;
  const key = `${r}_${c}`;
  const colSpan = clamp(parseInt(elSpanCol.value) || 1, 1, state.gridCols - c);
  const rowSpan = clamp(parseInt(elSpanRow.value) || 1, 1, state.gridRows - r);
  state.cellOverrides[key] = {
    colSpan,
    rowSpan,
    bg: elSpanBg.value,
    label: elSpanLabelInput.value || `${r + 1}-${c + 1}`,
  };
  renderGridPreview();
  generateGridCode();
  saveState();
}

// ---- Grid Code Generation ----
function generateGridCode() {
  const colTpl = resolveColTemplate();
  const rowTpl = resolveRowTemplate();
  const colGap = state.gridColGap;
  const rowGap = state.gridRowGap;
  const alignItems = state.gridAlignItems;
  const justifyItems = state.gridJustifyItems;

  // Build item CSS for cells with spans
  const itemRules = [];
  for (const [key, ov] of Object.entries(state.cellOverrides)) {
    if (!ov) continue;
    const [r, c] = key.split('_').map(Number);
    const label = ov.label || `item-${r + 1}-${c + 1}`;
    const parts = [];
    if ((ov.colSpan || 1) > 1) parts.push(`  grid-column: span ${ov.colSpan};`);
    if ((ov.rowSpan || 1) > 1) parts.push(`  grid-row: span ${ov.rowSpan};`);
    if (parts.length) {
      itemRules.push(`/* ${label} */\n.${sanitizeClass(label)} {\n${parts.join('\n')}\n}`);
    }
  }

  if (state.gridOutputMode === 'css') {
    let code = `.container {\n  display: grid;\n  grid-template-columns: ${colTpl};`;
    if (rowTpl !== 'auto') code += `\n  grid-template-rows: ${rowTpl};`;
    if (colGap === rowGap) {
      code += `\n  gap: ${colGap}px;`;
    } else {
      code += `\n  column-gap: ${colGap}px;\n  row-gap: ${rowGap}px;`;
    }
    if (alignItems !== 'stretch') code += `\n  align-items: ${alignItems};`;
    if (justifyItems !== 'stretch') code += `\n  justify-items: ${justifyItems};`;
    code += '\n}';
    if (itemRules.length) {
      code += '\n\n' + itemRules.join('\n\n');
    }
    elGridCodeOutput.textContent = code;
  } else {
    // Tailwind
    const colClass = `grid-cols-${colsToTailwind(state.gridCols)}`;
    const gapColClass = colGap === rowGap
      ? `gap-${gapToTailwind(colGap)}`
      : `gap-x-${gapToTailwind(colGap)} gap-y-${gapToTailwind(rowGap)}`;
    const rowsClass = state.gridRows > 1 ? ` grid-rows-${state.gridRows}` : '';
    const alignClass = alignItems !== 'stretch' ? ` items-${alignItems.replace('flex-', '')}` : '';
    const justifyClass = justifyItems !== 'stretch' ? ` justify-items-${justifyItems}` : '';

    let code = `<!-- Container -->\n<div class="grid ${colClass}${rowsClass} ${gapColClass}${alignClass}${justifyClass}">`;

    // Item overrides
    for (const [key, ov] of Object.entries(state.cellOverrides)) {
      if (!ov) continue;
      const label = ov.label || `item`;
      const colSpanClass = (ov.colSpan || 1) > 1 ? ` col-span-${ov.colSpan}` : '';
      const rowSpanClass = (ov.rowSpan || 1) > 1 ? ` row-span-${ov.rowSpan}` : '';
      if (colSpanClass || rowSpanClass) {
        code += `\n  <div class="${(colSpanClass.trim() + ' ' + rowSpanClass.trim()).trim()}"><!-- ${label} --></div>`;
      }
    }

    code += '\n</div>';
    elGridCodeOutput.textContent = code;
  }
}

function sanitizeClass(str) {
  return str.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}

// ---- Flex Rendering ----
function renderFlexPreview() {
  elFlexPreview.style.flexDirection = state.flexDirection;
  elFlexPreview.style.flexWrap = state.flexWrap;
  elFlexPreview.style.justifyContent = state.justifyContent;
  elFlexPreview.style.alignItems = state.alignItems;
  elFlexPreview.style.alignContent = state.alignContent;
  elFlexPreview.style.gap = state.flexGap + 'px';

  elFlexPreview.innerHTML = '';
  for (let i = 0; i < state.flexItemCount; i++) {
    const item = document.createElement('div');
    item.className = 'flex-item';
    item.textContent = `Item ${i + 1}`;
    item.style.flexBasis = state.flexItemBasis;
    item.style.flexGrow = state.flexItemGrow;
    item.style.flexShrink = '1';
    elFlexPreview.appendChild(item);
  }
}

// ---- Flex Code Generation ----
function generateFlexCode() {
  if (state.flexOutputMode === 'css') {
    let code = `.container {\n  display: flex;\n  flex-direction: ${state.flexDirection};\n  flex-wrap: ${state.flexWrap};\n  justify-content: ${state.justifyContent};\n  align-items: ${state.alignItems};`;
    if (state.alignContent !== 'normal') code += `\n  align-content: ${state.alignContent};`;
    code += `\n  gap: ${state.flexGap}px;\n}`;

    const itemProps = [];
    if (state.flexItemBasis !== 'auto') itemProps.push(`  flex-basis: ${state.flexItemBasis};`);
    if (state.flexItemGrow !== '0') itemProps.push(`  flex-grow: ${state.flexItemGrow};`);
    if (itemProps.length) {
      code += `\n\n.container > * {\n${itemProps.join('\n')}\n}`;
    }
    elFlexCodeOutput.textContent = code;
  } else {
    // Tailwind
    const dirMap = { row: '', 'row-reverse': 'flex-row-reverse', column: 'flex-col', 'column-reverse': 'flex-col-reverse' };
    const wrapMap = { nowrap: 'flex-nowrap', wrap: 'flex-wrap', 'wrap-reverse': 'flex-wrap-reverse' };
    const justifyMap = { 'flex-start': 'justify-start', 'flex-end': 'justify-end', center: 'justify-center', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly' };
    const alignMap = { stretch: 'items-stretch', 'flex-start': 'items-start', 'flex-end': 'items-end', center: 'items-center', baseline: 'items-baseline' };

    const classes = ['flex'];
    if (dirMap[state.flexDirection]) classes.push(dirMap[state.flexDirection]);
    if (wrapMap[state.flexWrap] && state.flexWrap !== 'nowrap') classes.push(wrapMap[state.flexWrap]);
    if (justifyMap[state.justifyContent]) classes.push(justifyMap[state.justifyContent]);
    if (alignMap[state.alignItems] && state.alignItems !== 'stretch') classes.push(alignMap[state.alignItems]);
    classes.push(`gap-${gapToTailwind(state.flexGap)}`);

    let code = `<!-- Container -->\n<div class="${classes.join(' ')}">`;

    const itemClasses = [];
    if (state.flexItemGrow === '1') itemClasses.push('flex-1');
    if (itemClasses.length) {
      code += `\n  <!-- Each item: class="${itemClasses.join(' ')}" -->`;
    }

    code += '\n</div>';
    elFlexCodeOutput.textContent = code;
  }
}

// ---- localStorage ----
const LS_KEY = 'css-grid-builder-v1';

function saveState() {
  try {
    const toSave = {
      gridCols: state.gridCols,
      gridRows: state.gridRows,
      gridColGap: state.gridColGap,
      gridRowGap: state.gridRowGap,
      gridColTemplate: state.gridColTemplate,
      gridColCustom: state.gridColCustom,
      gridRowTemplate: state.gridRowTemplate,
      gridAlignItems: state.gridAlignItems,
      gridJustifyItems: state.gridJustifyItems,
      cellOverrides: state.cellOverrides,
      flexDirection: state.flexDirection,
      flexWrap: state.flexWrap,
      justifyContent: state.justifyContent,
      alignItems: state.alignItems,
      alignContent: state.alignContent,
      flexGap: state.flexGap,
      flexItemCount: state.flexItemCount,
      flexItemBasis: state.flexItemBasis,
      flexItemGrow: state.flexItemGrow,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
  } catch (_) { /* ignore */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch (_) { /* ignore */ }
}

// ---- Sync UI from state ----
function syncGridUI() {
  elGridCols.value = state.gridCols;
  elGridRows.value = state.gridRows;
  elGridColGap.value = state.gridColGap;
  elGridColGapVal.textContent = state.gridColGap + 'px';
  elGridRowGap.value = state.gridRowGap;
  elGridRowGapVal.textContent = state.gridRowGap + 'px';
  setSelectValue(elGridColTemplate, state.gridColTemplate);
  elGridColCustom.value = state.gridColCustom;
  elCustomColGroup.style.display = state.gridColTemplate === 'custom' ? '' : 'none';
  setSelectValue(elGridRowTemplate, state.gridRowTemplate);
  setSelectValue(elGridAlignItems, state.gridAlignItems);
  setSelectValue(elGridJustifyItems, state.gridJustifyItems);
}

function syncFlexUI() {
  setSelectValue(elFlexDirection, state.flexDirection);
  setSelectValue(elFlexWrap, state.flexWrap);
  setSelectValue(elJustifyContent, state.justifyContent);
  setSelectValue(elAlignItems, state.alignItems);
  setSelectValue(elAlignContent, state.alignContent);
  elFlexGap.value = state.flexGap;
  elFlexGapVal.textContent = state.flexGap + 'px';
  elFlexItemCount.value = state.flexItemCount;
  setSelectValue(elFlexItemBasis, state.flexItemBasis);
  setSelectValue(elFlexItemGrow, state.flexItemGrow);
}

// ---- Full update ----
function updateGrid() {
  renderGridPreview();
  generateGridCode();
  saveState();
}

function updateFlex() {
  renderFlexPreview();
  generateFlexCode();
  saveState();
}

// ---- Copy to clipboard ----
function copyCode(outputEl, btn) {
  const text = outputEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'コピー済み!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('copied');
    }, 1500);
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'コピー済み!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'コピー';
      btn.classList.remove('copied');
    }, 1500);
  });
}

// ---- Event Listeners ----
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  syncGridUI();
  syncFlexUI();
  updateGrid();
  updateFlex();

  // ---- Mode tabs ----
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const mode = btn.dataset.mode;
      document.getElementById('panel-grid').classList.toggle('hidden', mode !== 'grid');
      document.getElementById('panel-flex').classList.toggle('hidden', mode !== 'flex');
    });
  });

  // ---- Grid number controls ----
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const delta = parseInt(btn.dataset.delta);
      const input = document.getElementById(targetId);
      if (!input) return;
      const min = parseInt(input.min) || 1;
      const max = parseInt(input.max) || 99;
      input.value = clamp((parseInt(input.value) || 0) + delta, min, max);
      input.dispatchEvent(new Event('input'));
    });
  });

  // ---- Grid controls ----
  elGridCols.addEventListener('input', () => {
    state.gridCols = clamp(parseInt(elGridCols.value) || 1, 1, 12);
    // Clear invalid cell overrides
    cleanCellOverrides();
    updateGrid();
  });
  elGridRows.addEventListener('input', () => {
    state.gridRows = clamp(parseInt(elGridRows.value) || 1, 1, 8);
    cleanCellOverrides();
    updateGrid();
  });
  elGridColGap.addEventListener('input', () => {
    state.gridColGap = parseInt(elGridColGap.value);
    elGridColGapVal.textContent = state.gridColGap + 'px';
    updateGrid();
  });
  elGridRowGap.addEventListener('input', () => {
    state.gridRowGap = parseInt(elGridRowGap.value);
    elGridRowGapVal.textContent = state.gridRowGap + 'px';
    updateGrid();
  });
  elGridColTemplate.addEventListener('change', () => {
    state.gridColTemplate = elGridColTemplate.value;
    elCustomColGroup.style.display = state.gridColTemplate === 'custom' ? '' : 'none';
    updateGrid();
  });
  elGridColCustom.addEventListener('input', () => {
    state.gridColCustom = elGridColCustom.value;
    updateGrid();
  });
  elGridRowTemplate.addEventListener('change', () => {
    state.gridRowTemplate = elGridRowTemplate.value;
    updateGrid();
  });
  elGridAlignItems.addEventListener('change', () => {
    state.gridAlignItems = elGridAlignItems.value;
    updateGrid();
  });
  elGridJustifyItems.addEventListener('change', () => {
    state.gridJustifyItems = elGridJustifyItems.value;
    updateGrid();
  });

  // ---- Span panel ----
  [elSpanCol, elSpanRow, elSpanBg, elSpanLabelInput].forEach(el => {
    el.addEventListener('input', applyCellSpan);
  });

  elResetSpanBtn.addEventListener('click', () => {
    if (!state.selectedCell) return;
    const key = `${state.selectedCell.r}_${state.selectedCell.c}`;
    delete state.cellOverrides[key];
    renderGridPreview();
    generateGridCode();
    saveState();
    // refresh span panel
    showSpanPanel(state.selectedCell.r, state.selectedCell.c);
  });

  // ---- Grid presets ----
  document.querySelectorAll('.preset-btn:not(.flex-preset-btn)').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = GRID_PRESETS[btn.dataset.preset];
      if (!preset) return;
      Object.assign(state, preset);
      state.cellOverrides = JSON.parse(JSON.stringify(preset.cellOverrides));
      state.selectedCell = null;
      elSpanPanel.style.display = 'none';
      syncGridUI();
      updateGrid();
    });
  });

  // ---- Grid code tabs ----
  document.querySelectorAll('.code-tab:not(.flex-code-tab)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.code-tab:not(.flex-code-tab)').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      state.gridOutputMode = btn.dataset.output;
      generateGridCode();
    });
  });

  // ---- Copy grid ----
  elCopyGridBtn.addEventListener('click', () => copyCode(elGridCodeOutput, elCopyGridBtn));

  // ---- Flex controls ----
  elFlexDirection.addEventListener('change', () => { state.flexDirection = elFlexDirection.value; updateFlex(); });
  elFlexWrap.addEventListener('change', () => { state.flexWrap = elFlexWrap.value; updateFlex(); });
  elJustifyContent.addEventListener('change', () => { state.justifyContent = elJustifyContent.value; updateFlex(); });
  elAlignItems.addEventListener('change', () => { state.alignItems = elAlignItems.value; updateFlex(); });
  elAlignContent.addEventListener('change', () => { state.alignContent = elAlignContent.value; updateFlex(); });
  elFlexGap.addEventListener('input', () => {
    state.flexGap = parseInt(elFlexGap.value);
    elFlexGapVal.textContent = state.flexGap + 'px';
    updateFlex();
  });
  elFlexItemCount.addEventListener('input', () => {
    state.flexItemCount = clamp(parseInt(elFlexItemCount.value) || 1, 1, 12);
    updateFlex();
  });
  elFlexItemBasis.addEventListener('change', () => { state.flexItemBasis = elFlexItemBasis.value; updateFlex(); });
  elFlexItemGrow.addEventListener('change', () => { state.flexItemGrow = elFlexItemGrow.value; updateFlex(); });

  // ---- Flex presets ----
  document.querySelectorAll('.flex-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = FLEX_PRESETS[btn.dataset.flexPreset];
      if (!preset) return;
      Object.assign(state, preset);
      syncFlexUI();
      updateFlex();
    });
  });

  // ---- Flex code tabs ----
  document.querySelectorAll('.flex-code-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.flex-code-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      state.flexOutputMode = btn.dataset.output;
      generateFlexCode();
    });
  });

  // ---- Copy flex ----
  elCopyFlexBtn.addEventListener('click', () => copyCode(elFlexCodeOutput, elCopyFlexBtn));
});

// ---- Helpers ----
function cleanCellOverrides() {
  for (const key of Object.keys(state.cellOverrides)) {
    const [r, c] = key.split('_').map(Number);
    if (r >= state.gridRows || c >= state.gridCols) {
      delete state.cellOverrides[key];
    }
  }
  if (state.selectedCell) {
    const { r, c } = state.selectedCell;
    if (r >= state.gridRows || c >= state.gridCols) {
      state.selectedCell = null;
      elSpanPanel.style.display = 'none';
    }
  }
}
