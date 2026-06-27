'use strict';

/* ============================================================
   消費税計算ツール — script.js
   ============================================================ */

// ---------- Utility ----------

function applyRounding(value, mode) {
  switch (mode) {
    case 'ceil':  return Math.ceil(value);
    case 'round': return Math.round(value);
    default:      return Math.floor(value);  // 'floor'
  }
}

function formatYen(n) {
  return '¥' + Math.abs(n).toLocaleString('ja-JP');
}

// ---------- Tab switching ----------

const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach(p => {
      p.classList.remove('active');
      p.hidden = true;
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panel = document.getElementById('panel-' + target);
    panel.classList.add('active');
    panel.hidden = false;
  });
});

/* ============================================================
   TAB 1: 基本計算
   ============================================================ */

const amountInput     = document.getElementById('amount-input');
const rateSelect      = document.getElementById('rate-select');
const directionSelect = document.getElementById('direction-select');
const calcBasicBtn    = document.getElementById('calc-basic-btn');
const basicResult     = document.getElementById('basic-result');
const basicResultGrid = document.getElementById('basic-result-grid');

calcBasicBtn.addEventListener('click', calcBasic);
amountInput.addEventListener('keydown', e => { if (e.key === 'Enter') calcBasic(); });

function getRounding() {
  return document.querySelector('input[name="rounding"]:checked').value;
}

function calcBasic() {
  const raw = parseFloat(amountInput.value);
  if (isNaN(raw) || raw < 0) {
    amountInput.focus();
    amountInput.style.borderColor = '#ef4444';
    setTimeout(() => { amountInput.style.borderColor = ''; }, 1200);
    return;
  }

  const rate      = parseFloat(rateSelect.value) / 100;  // 0.10 or 0.08
  const direction = directionSelect.value;
  const rounding  = getRounding();
  const ratePct   = rateSelect.value + '%';
  const items     = [];

  if (direction === 'ex-to-inc' || direction === 'both') {
    // 入力値 = 税抜
    const exPrice = applyRounding(raw, 'floor');
    const taxAmt  = applyRounding(raw * rate, rounding);
    const incPrice = exPrice + taxAmt;
    items.push(
      { label: '税抜価格',  value: formatYen(exPrice),  cls: '' },
      { label: '消費税（' + ratePct + '）', value: formatYen(taxAmt), cls: 'tax-value' },
      { label: '税込価格',  value: formatYen(incPrice), cls: 'inc-value' }
    );
  }

  if (direction === 'inc-to-ex' || direction === 'both') {
    if (direction === 'both') {
      // セパレーターとして再計算ブロック
      items.push({ separator: true });
    }
    // 入力値 = 税込
    const incPrice  = applyRounding(raw, 'floor');
    const exPrice   = applyRounding(raw / (1 + rate), rounding);
    const taxAmt    = incPrice - exPrice;
    items.push(
      { label: '税込価格',  value: formatYen(incPrice),  cls: '' },
      { label: '消費税（' + ratePct + '）', value: formatYen(taxAmt < 0 ? 0 : taxAmt), cls: 'tax-value' },
      { label: '税抜価格',  value: formatYen(exPrice),   cls: 'inc-value' }
    );
  }

  // Render
  basicResultGrid.innerHTML = '';
  if (direction === 'both') {
    // 2グループ横並びラベル
    basicResultGrid.style.gridTemplateColumns = '1fr';
  }

  let html = '';
  let groupLabel = direction === 'both' ? ['税抜 → 税込', '税込 → 税抜'] : [];
  let groupIdx = 0;

  items.forEach(item => {
    if (item.separator) {
      html += `<div class="result-separator">
        <hr style="border:none;border-top:1px dashed #cbd5e1;margin:0.25rem 0">
        <p style="font-size:0.75rem;color:var(--text-muted);font-weight:600;margin-top:0.5rem">${groupLabel[1]}</p>
      </div>`;
      return;
    }
    html += `<div class="result-item">
      <span class="result-item-label">${item.label}</span>
      <span class="result-item-value ${item.cls}">${item.value}</span>
    </div>`;
  });

  if (direction === 'both') {
    html = `<p style="font-size:0.75rem;color:var(--text-muted);font-weight:600;margin-bottom:0.25rem">${groupLabel[0]}</p>` + html;
  }

  basicResultGrid.innerHTML = html;
  basicResult.hidden = false;
  basicResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ============================================================
   TAB 2: 複数品目計算
   ============================================================ */

const addRowBtn    = document.getElementById('add-row-btn');
const itemsTbody   = document.getElementById('items-tbody');
const calcMultiBtn = document.getElementById('calc-multi-btn');
const copyMultiBtn = document.getElementById('copy-multi-btn');
const copyMultiMsg = document.getElementById('copy-multi-msg');
const multiTotal   = document.getElementById('multi-total');
const totalEx      = document.getElementById('total-ex');
const totalTax     = document.getElementById('total-tax');
const totalInc     = document.getElementById('total-inc');

const MAX_ROWS = 10;
let rowCount = 0;

function addRow() {
  if (rowCount >= MAX_ROWS) {
    addRowBtn.textContent = '最大10行まで';
    addRowBtn.disabled = true;
    return;
  }
  rowCount++;
  const tr = document.createElement('tr');
  tr.dataset.rowId = rowCount;
  tr.innerHTML = `
    <td><input type="text" class="item-name-input" placeholder="品目名" aria-label="品目名"></td>
    <td><input type="number" class="item-amount-input" placeholder="0" min="0" step="1" aria-label="金額（税抜）"></td>
    <td>
      <select class="item-rate-select rate-10" aria-label="税率">
        <option value="10">10%</option>
        <option value="8">8%</option>
      </select>
    </td>
    <td class="item-calc-cell item-tax">—</td>
    <td class="item-calc-cell item-inc">—</td>
    <td>
      <button type="button" class="btn-del-row" aria-label="この行を削除">
        <i class="bi bi-trash3-fill"></i>
      </button>
    </td>
  `;

  const rateEl = tr.querySelector('.item-rate-select');
  rateEl.addEventListener('change', () => {
    rateEl.className = 'item-rate-select rate-' + rateEl.value;
    updateRowCalc(tr);
  });

  tr.querySelector('.item-amount-input').addEventListener('input', () => updateRowCalc(tr));

  tr.querySelector('.btn-del-row').addEventListener('click', () => {
    tr.remove();
    rowCount--;
    addRowBtn.disabled = false;
    addRowBtn.innerHTML = '<i class="bi bi-plus-lg"></i> 行を追加';
    resetMultiTotal();
  });

  itemsTbody.appendChild(tr);
  tr.querySelector('.item-name-input').focus();
}

function updateRowCalc(tr) {
  const amtEl   = tr.querySelector('.item-amount-input');
  const rateEl  = tr.querySelector('.item-rate-select');
  const taxCell = tr.querySelector('.item-tax');
  const incCell = tr.querySelector('.item-inc');
  const raw = parseFloat(amtEl.value);
  if (isNaN(raw) || raw < 0) {
    taxCell.textContent = '—';
    incCell.textContent = '—';
    return;
  }
  const rate   = parseFloat(rateEl.value) / 100;
  const taxAmt = Math.floor(raw * rate);
  const inc    = raw + taxAmt;
  taxCell.textContent = formatYen(taxAmt);
  incCell.textContent = formatYen(inc);
}

function resetMultiTotal() {
  multiTotal.hidden = true;
  totalEx.textContent  = '¥0';
  totalTax.textContent = '¥0';
  totalInc.textContent = '¥0';
}

function calcMulti() {
  const rows = itemsTbody.querySelectorAll('tr');
  let sumEx = 0, sumTax = 0;
  let valid = false;
  rows.forEach(tr => {
    const raw = parseFloat(tr.querySelector('.item-amount-input').value);
    if (isNaN(raw) || raw < 0) return;
    valid = true;
    const rate   = parseFloat(tr.querySelector('.item-rate-select').value) / 100;
    const taxAmt = Math.floor(raw * rate);
    sumEx  += raw;
    sumTax += taxAmt;
  });
  if (!valid) return;
  totalEx.textContent  = formatYen(sumEx);
  totalTax.textContent = formatYen(sumTax);
  totalInc.textContent = formatYen(sumEx + sumTax);
  multiTotal.hidden = false;
  multiTotal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyMultiTable() {
  const rows = itemsTbody.querySelectorAll('tr');
  const lines = ['品目名\t税抜\t税率\t消費税\t税込'];
  rows.forEach(tr => {
    const name   = tr.querySelector('.item-name-input').value || '（品目名なし）';
    const amtRaw = parseFloat(tr.querySelector('.item-amount-input').value);
    const rate   = tr.querySelector('.item-rate-select').value + '%';
    if (isNaN(amtRaw)) return;
    const taxAmt = Math.floor(amtRaw * (parseFloat(tr.querySelector('.item-rate-select').value) / 100));
    const inc    = amtRaw + taxAmt;
    lines.push(`${name}\t¥${amtRaw.toLocaleString()}\t${rate}\t¥${taxAmt.toLocaleString()}\t¥${inc.toLocaleString()}`);
  });
  if (!multiTotal.hidden) {
    lines.push('');
    lines.push(`税抜合計\t${totalEx.textContent}`);
    lines.push(`消費税合計\t${totalTax.textContent}`);
    lines.push(`税込合計\t${totalInc.textContent}`);
  }
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    copyMultiMsg.hidden = false;
    setTimeout(() => { copyMultiMsg.hidden = true; }, 2500);
  });
}

addRowBtn.addEventListener('click', addRow);
calcMultiBtn.addEventListener('click', calcMulti);
copyMultiBtn.addEventListener('click', copyMultiTable);

// 初期1行追加
addRow();

/* ============================================================
   TAB 3: インボイスチェック
   ============================================================ */

const regNumberInput   = document.getElementById('reg-number-input');
const regValidBadge    = document.getElementById('reg-valid-badge');
const checkboxes       = document.querySelectorAll('.chk-box');
const invoiceProgress  = document.getElementById('invoice-progress');
const invoiceProgressL = document.getElementById('invoice-progress-label');
const invoiceResult    = document.getElementById('invoice-result');

function validateRegNumber(val) {
  return /^T\d{13}$/.test(val.trim());
}

regNumberInput.addEventListener('input', () => {
  const val = regNumberInput.value.trim();
  if (val.length === 0) {
    regValidBadge.hidden = true;
    return;
  }
  const ok = validateRegNumber(val);
  regValidBadge.hidden = false;
  regValidBadge.textContent = ok ? '形式OK' : '形式NG';
  regValidBadge.className   = 'reg-badge ' + (ok ? 'valid' : 'invalid');
});

checkboxes.forEach(chk => {
  chk.addEventListener('change', () => {
    const wrap = chk.closest('.check-item');
    if (chk.checked) {
      wrap.classList.add('checked');
    } else {
      wrap.classList.remove('checked');
    }
    updateInvoiceProgress();
  });
});

function updateInvoiceProgress() {
  const total   = checkboxes.length;
  const checked = document.querySelectorAll('.chk-box:checked').length;
  const pct     = Math.round((checked / total) * 100);
  invoiceProgress.style.width  = pct + '%';
  invoiceProgressL.textContent = `${checked} / ${total} 項目`;
  invoiceProgress.style.background = checked === total ? '#059669' : 'var(--primary)';

  if (checked === total) {
    invoiceResult.className = 'invoice-result ok';
    invoiceResult.innerHTML = '<i class="bi bi-check-circle-fill" style="font-size:1.25rem"></i> 適格請求書（インボイス）の7つの要件を全て満たしています。';
    invoiceResult.hidden = false;
  } else {
    invoiceResult.className = 'invoice-result ng';
    invoiceResult.innerHTML = `<i class="bi bi-exclamation-triangle-fill" style="font-size:1.25rem"></i> あと <strong>${total - checked} 項目</strong> が未チェックです。`;
    invoiceResult.hidden = (checked === 0);
  }
}

/* ============================================================
   AdSense 初期化
   ============================================================ */

try {
  (window.adsbygoogle = window.adsbygoogle || []).push({});
  (window.adsbygoogle = window.adsbygoogle || []).push({});
} catch(e) {}
