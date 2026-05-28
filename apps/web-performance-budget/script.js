'use strict';

// ============================================================
// Preset configurations
// ============================================================
const PRESETS = {
  ec: {
    label: 'ECサイト',
    budgets: { js: 400, css: 80, img: 800, font: 150, total: 1500 },
    cwv:     { lcp: 2.5, inp: 200, cls: 0.1 }
  },
  blog: {
    label: 'ブログ',
    budgets: { js: 150, css: 40, img: 600, font: 80, total: 900 },
    cwv:     { lcp: 2.0, inp: 150, cls: 0.05 }
  },
  spa: {
    label: 'SPA',
    budgets: { js: 800, css: 120, img: 300, font: 100, total: 1400 },
    cwv:     { lcp: 3.0, inp: 300, cls: 0.1 }
  },
  lp: {
    label: 'ランディングページ',
    budgets: { js: 80,  css: 30, img: 400, font: 60, total: 600 },
    cwv:     { lcp: 1.8, inp: 100, cls: 0.05 }
  }
};

// CWV thresholds
const CWV_THRESHOLDS = {
  lcp:  { good: 2.5, ni: 4.0,  unit: 's',  decimals: 1 },
  inp:  { good: 200, ni: 500,  unit: 'ms', decimals: 0 },
  cls:  { good: 0.1, ni: 0.25, unit: '',   decimals: 2 }
};

const RESOURCES = ['js', 'css', 'img', 'font'];
const STORAGE_KEY = 'wpb_settings_v1';

// ============================================================
// State
// ============================================================
let state = {
  budgets: { js: '', css: '', img: '', font: '', total: '' },
  actuals: { js: '', css: '', img: '', font: '' },
  cwv:     { lcp: 2.5, inp: 200, cls: 0.1 },
  preset:  null
};

// ============================================================
// DOM refs
// ============================================================
const dom = {};

function initDom() {
  RESOURCES.forEach(r => {
    dom[`budget_${r}`]      = document.getElementById(`budget-${r}`);
    dom[`actual_${r}`]      = document.getElementById(`actual-${r}`);
    dom[`gauge_${r}`]       = document.getElementById(`gauge-${r}`);
    dom[`gaugeLabel_${r}`]  = document.getElementById(`gauge-label-${r}`);
  });
  dom.budget_total      = document.getElementById('budget-total');
  dom.gauge_total       = document.getElementById('gauge-total');
  dom.gaugeLabel_total  = document.getElementById('gauge-label-total');
  dom.totalActualDisplay = document.getElementById('total-actual-display');

  ['lcp', 'inp', 'cls'].forEach(m => {
    dom[`slider_${m}`] = document.getElementById(`slider-${m}`);
    dom[`val_${m}`]    = document.getElementById(`val-${m}`);
    dom[`badge_${m}`]  = document.getElementById(`badge-${m}`);
    dom[`card_${m}`]   = document.getElementById(`cwv-${m}-card`);
  });

  dom.btnExport   = document.getElementById('btn-export');
  dom.btnReset    = document.getElementById('btn-reset');
  dom.inputImport = document.getElementById('input-import');
  dom.importStatus = document.getElementById('import-status');
}

// ============================================================
// Gauge update
// ============================================================
function updateGauge(resource, actual, budget) {
  const gauge     = dom[`gauge_${resource}`];
  const label     = dom[`gaugeLabel_${resource}`];

  if (!budget || budget <= 0 || actual === '' || actual === null) {
    gauge.style.setProperty('--pct', '0%');
    gauge.style.setProperty('--gauge-color', '#4caf50');
    gauge.setAttribute('aria-valuenow', 0);
    label.textContent = '—';
    return;
  }

  const pct = Math.min((actual / budget) * 100, 200);
  const displayPct = Math.round((actual / budget) * 100);

  let color;
  if (displayPct > 100) {
    color = '#e53935';
  } else if (displayPct >= 80) {
    color = '#f9a825';
  } else {
    color = '#4caf50';
  }

  gauge.style.setProperty('--pct', Math.min(pct, 100) + '%');
  gauge.style.setProperty('--gauge-color', color);
  gauge.setAttribute('aria-valuenow', displayPct);
  label.textContent = displayPct + '%';
  label.style.color = displayPct > 100 ? '#e53935' : displayPct >= 80 ? '#d18000' : '#2e7d32';
}

function updateAllGauges() {
  let totalActual = 0;
  let hasAnyActual = false;

  RESOURCES.forEach(r => {
    const actual  = parseFloat(state.actuals[r]) || 0;
    const budget  = parseFloat(state.budgets[r]) || 0;
    if (state.actuals[r] !== '') hasAnyActual = true;
    updateGauge(r, state.actuals[r] !== '' ? actual : '', budget);
    totalActual += actual;
  });

  // Total
  const totalBudget = parseFloat(state.budgets.total) || 0;
  if (hasAnyActual) {
    dom.totalActualDisplay.textContent = totalActual.toFixed(1).replace(/\.0$/, '');
    updateGauge('total', totalActual, totalBudget);
  } else {
    dom.totalActualDisplay.textContent = '—';
    updateGauge('total', '', totalBudget);
  }
}

// ============================================================
// CWV update
// ============================================================
function updateCwv(metric) {
  const th     = CWV_THRESHOLDS[metric];
  const value  = parseFloat(state.cwv[metric]);
  const card   = dom[`card_${metric}`];
  const badge  = dom[`badge_${metric}`];
  const valEl  = dom[`val_${metric}`];

  // Format display value
  let display;
  if (th.unit === 's') {
    display = value.toFixed(th.decimals) + 's';
  } else if (th.unit === 'ms') {
    display = Math.round(value) + 'ms';
  } else {
    display = value.toFixed(th.decimals);
  }
  valEl.textContent = display;

  // Grade
  let grade, badgeClass;
  if (value <= th.good) {
    grade = 'Good';
    badgeClass = '';
  } else if (value <= th.ni) {
    grade = 'Needs Improvement';
    badgeClass = 'badge-ni';
  } else {
    grade = 'Poor';
    badgeClass = 'badge-poor';
  }

  badge.textContent = grade;
  badge.className = 'cwv-badge' + (badgeClass ? ' ' + badgeClass : '');

  card.className = 'cwv-card ' + (grade === 'Good' ? 'cwv-good' : grade === 'Needs Improvement' ? 'cwv-ni' : 'cwv-poor');

  // aria-valuetext
  dom[`slider_${metric}`].setAttribute('aria-valuetext', display);
}

function updateAllCwv() {
  ['lcp', 'inp', 'cls'].forEach(m => updateCwv(m));
}

// ============================================================
// Preset
// ============================================================
function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;

  state.preset = key;
  Object.assign(state.budgets, p.budgets);
  Object.assign(state.cwv, p.cwv);

  // Apply budget inputs
  RESOURCES.forEach(r => {
    dom[`budget_${r}`].value = state.budgets[r];
  });
  dom.budget_total.value = state.budgets.total;

  // Apply CWV sliders
  ['lcp', 'inp', 'cls'].forEach(m => {
    dom[`slider_${m}`].value = state.cwv[m];
    updateCwv(m);
  });

  updateAllGauges();

  // Update preset button states
  document.querySelectorAll('.preset-btn').forEach(btn => {
    const pressed = btn.dataset.preset === key;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.classList.toggle('active', pressed);
  });

  saveToStorage();
}

// ============================================================
// Export / Import
// ============================================================
function buildExportData() {
  return {
    version: 1,
    preset:  state.preset,
    budgets: { ...state.budgets },
    actuals: { ...state.actuals },
    cwv:     { ...state.cwv }
  };
}

function exportJson() {
  const data = buildExportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'performance-budget.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      if (data.budgets) {
        Object.assign(state.budgets, data.budgets);
        RESOURCES.forEach(r => {
          if (state.budgets[r] !== undefined) {
            dom[`budget_${r}`].value = state.budgets[r] !== '' ? state.budgets[r] : '';
          }
        });
        if (state.budgets.total !== undefined) {
          dom.budget_total.value = state.budgets.total !== '' ? state.budgets.total : '';
        }
      }

      if (data.actuals) {
        Object.assign(state.actuals, data.actuals);
        RESOURCES.forEach(r => {
          if (state.actuals[r] !== undefined) {
            dom[`actual_${r}`].value = state.actuals[r] !== '' ? state.actuals[r] : '';
          }
        });
      }

      if (data.cwv) {
        Object.assign(state.cwv, data.cwv);
        ['lcp', 'inp', 'cls'].forEach(m => {
          if (state.cwv[m] !== undefined) {
            dom[`slider_${m}`].value = state.cwv[m];
            updateCwv(m);
          }
        });
      }

      if (data.preset) {
        state.preset = data.preset;
        document.querySelectorAll('.preset-btn').forEach(btn => {
          const pressed = btn.dataset.preset === data.preset;
          btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
          btn.classList.toggle('active', pressed);
        });
      }

      updateAllGauges();
      saveToStorage();
      showImportStatus('設定を読み込みました', false);
    } catch {
      showImportStatus('JSONの読み込みに失敗しました。正しいファイルか確認してください', true);
    }
  };
  reader.readAsText(file);
}

function showImportStatus(message, isError) {
  dom.importStatus.textContent = message;
  dom.importStatus.className   = 'import-status' + (isError ? ' error' : '');
  setTimeout(() => {
    dom.importStatus.textContent = '';
    dom.importStatus.className   = 'import-status';
  }, 4000);
}

// ============================================================
// Reset
// ============================================================
function resetAll() {
  state = {
    budgets: { js: '', css: '', img: '', font: '', total: '' },
    actuals: { js: '', css: '', img: '', font: '' },
    cwv:     { lcp: 2.5, inp: 200, cls: 0.1 },
    preset:  null
  };

  RESOURCES.forEach(r => {
    dom[`budget_${r}`].value = '';
    dom[`actual_${r}`].value = '';
  });
  dom.budget_total.value = '';

  dom.slider_lcp.value = 2.5;
  dom.slider_inp.value = 200;
  dom.slider_cls.value = 0.1;

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', 'false');
    btn.classList.remove('active');
  });

  updateAllGauges();
  updateAllCwv();
  saveToStorage();
}

// ============================================================
// localStorage
// ============================================================
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or private mode — ignore
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    if (saved.budgets) Object.assign(state.budgets, saved.budgets);
    if (saved.actuals) Object.assign(state.actuals, saved.actuals);
    if (saved.cwv)     Object.assign(state.cwv,     saved.cwv);
    if (saved.preset)  state.preset = saved.preset;
  } catch {
    // corrupted — ignore
  }
}

function applyStateToUI() {
  RESOURCES.forEach(r => {
    dom[`budget_${r}`].value = state.budgets[r] !== '' ? state.budgets[r] : '';
    dom[`actual_${r}`].value = state.actuals[r] !== '' ? state.actuals[r] : '';
  });
  dom.budget_total.value = state.budgets.total !== '' ? state.budgets.total : '';

  dom.slider_lcp.value = state.cwv.lcp;
  dom.slider_inp.value = state.cwv.inp;
  dom.slider_cls.value = state.cwv.cls;

  if (state.preset) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const pressed = btn.dataset.preset === state.preset;
      btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      btn.classList.toggle('active', pressed);
    });
  }
}

// ============================================================
// Event listeners
// ============================================================
function attachListeners() {
  // Budget inputs
  RESOURCES.forEach(r => {
    dom[`budget_${r}`].addEventListener('input', () => {
      state.budgets[r] = dom[`budget_${r}`].value;
      state.preset = null;
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('active');
      });
      updateAllGauges();
      saveToStorage();
    });
  });

  dom.budget_total.addEventListener('input', () => {
    state.budgets.total = dom.budget_total.value;
    updateAllGauges();
    saveToStorage();
  });

  // Actual inputs
  RESOURCES.forEach(r => {
    dom[`actual_${r}`].addEventListener('input', () => {
      state.actuals[r] = dom[`actual_${r}`].value;
      updateAllGauges();
      saveToStorage();
    });
  });

  // CWV sliders
  ['lcp', 'inp', 'cls'].forEach(m => {
    dom[`slider_${m}`].addEventListener('input', () => {
      state.cwv[m] = parseFloat(dom[`slider_${m}`].value);
      updateCwv(m);
      saveToStorage();
    });
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  // Export
  dom.btnExport.addEventListener('click', exportJson);

  // Import
  dom.inputImport.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      importJson(file);
      e.target.value = '';
    }
  });

  // Reset
  dom.btnReset.addEventListener('click', () => {
    if (confirm('すべての設定をリセットしますか？')) {
      resetAll();
    }
  });
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initDom();
  loadFromStorage();
  applyStateToUI();
  updateAllGauges();
  updateAllCwv();
  attachListeners();
});
