'use strict';

const PRESETS = {
  aircon:      { name: 'エアコン（冷房）',      watt: 800,  hours: 8,   days: 30 },
  fridge:      { name: '冷蔵庫',                watt: 55,   hours: 24,  days: 30 },
  tv32:        { name: 'テレビ（32型）',         watt: 100,  hours: 4,   days: 30 },
  tv50:        { name: 'テレビ（50型）',         watt: 180,  hours: 4,   days: 30 },
  washer:      { name: '洗濯機',                watt: 500,  hours: 1,   days: 25 },
  microwave:   { name: '電子レンジ',            watt: 1500, hours: 0.3, days: 30 },
  ih:          { name: 'IHクッキングヒーター',   watt: 3000, hours: 1,   days: 25 },
  kettle:      { name: '電気ケトル',            watt: 1300, hours: 0.5, days: 30 },
  led:         { name: 'LED照明',               watt: 8,    hours: 6,   days: 30 },
  fluorescent: { name: '蛍光灯',               watt: 30,   hours: 6,   days: 30 },
  'desktop-pc':{ name: 'PC（デスクトップ）',    watt: 200,  hours: 6,   days: 20 },
  'laptop-pc': { name: 'PC（ノート）',          watt: 45,   hours: 6,   days: 20 },
};

let appliances = [];
let nextId = 0;
let costChart = null;
let lastMonthly = 0;

function calcCost(watt, hours, days, price) {
  return watt * hours * days / 1000 * price;
}

function renderTable() {
  const tbody = document.getElementById('appliance-tbody');
  const empty = document.getElementById('empty-state');
  tbody.innerHTML = '';
  empty.style.display = appliances.length === 0 ? '' : 'none';

  const price = parseFloat(document.getElementById('unit-price').value) || 31;
  const calcDays = parseInt(document.getElementById('calc-days').value) || 30;

  appliances.forEach(a => {
    const cost = calcCost(a.watt, a.hours, a.days, price);
    const tr = document.createElement('tr');
    tr.dataset.id = a.id;
    tr.innerHTML = `
      <td><input type="text" class="tbl-input tbl-name" value="${a.name}" data-field="name" aria-label="家電名"></td>
      <td><input type="number" class="tbl-input tbl-num" value="${a.watt}" min="1" data-field="watt" aria-label="消費電力"></td>
      <td><input type="number" class="tbl-input tbl-num" value="${a.hours}" min="0" max="24" step="0.5" data-field="hours" aria-label="1日使用時間"></td>
      <td><input type="number" class="tbl-input tbl-num" value="${a.days}" min="1" max="31" data-field="days" aria-label="月使用日数"></td>
      <td class="col-cost-val">¥${Math.round(cost).toLocaleString()}</td>
      <td><button class="btn-del" data-id="${a.id}" aria-label="${a.name}を削除"><i class="bi bi-trash3"></i></button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.tbl-input').forEach(input => {
    input.addEventListener('change', onFieldChange);
  });
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => removeAppliance(parseInt(btn.dataset.id)));
  });
}

function onFieldChange(e) {
  const tr = e.target.closest('tr');
  const id = parseInt(tr.dataset.id);
  const field = e.target.dataset.field;
  const a = appliances.find(x => x.id === id);
  if (!a) return;
  if (field === 'name') {
    a.name = e.target.value;
  } else {
    a[field] = parseFloat(e.target.value) || 0;
  }
  const price = parseFloat(document.getElementById('unit-price').value) || 31;
  const costEl = tr.querySelector('.col-cost-val');
  costEl.textContent = '¥' + Math.round(calcCost(a.watt, a.hours, a.days, price)).toLocaleString();
}

function addPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  appliances.push({ id: nextId++, ...p });
  renderTable();
}

function removeAppliance(id) {
  appliances = appliances.filter(a => a.id !== id);
  renderTable();
}

function addCustom() {
  const nameEl  = document.getElementById('custom-name');
  const wattEl  = document.getElementById('custom-watt');
  const hoursEl = document.getElementById('custom-hours');
  const daysEl  = document.getElementById('custom-days');
  const errEl   = document.getElementById('custom-error');

  const name  = nameEl.value.trim() || 'カスタム家電';
  const watt  = parseFloat(wattEl.value);
  const hours = parseFloat(hoursEl.value);
  const days  = parseFloat(daysEl.value);

  errEl.hidden = true;
  if (!watt || watt <= 0 || !hours || hours < 0 || !days || days < 1) {
    errEl.textContent = '消費電力・使用時間・月使用日数を正しく入力してください。';
    errEl.hidden = false;
    return;
  }

  appliances.push({ id: nextId++, name, watt, hours, days });
  renderTable();
  nameEl.value = ''; wattEl.value = ''; hoursEl.value = ''; daysEl.value = '';
}

function calculate() {
  if (appliances.length === 0) return;
  const price    = parseFloat(document.getElementById('unit-price').value) || 31;
  const calcDays = parseInt(document.getElementById('calc-days').value) || 30;
  const CO2_FACTOR = 0.453;

  const items = appliances.map(a => ({
    name: a.name,
    watt: a.watt,
    hours: a.hours,
    days: a.days,
    cost: Math.round(calcCost(a.watt, a.hours, a.days, price)),
  }));

  const totalMonthly = items.reduce((s, i) => s + i.cost, 0);
  lastMonthly = totalMonthly;
  const totalYearly  = totalMonthly * 12;
  const totalKwh     = appliances.reduce((s, a) => s + a.watt * a.hours * a.days / 1000, 0);
  const co2          = (totalKwh * CO2_FACTOR).toFixed(1);

  document.getElementById('kpi-monthly').textContent = totalMonthly.toLocaleString();
  document.getElementById('kpi-yearly').textContent  = totalYearly.toLocaleString();
  document.getElementById('kpi-co2').textContent     = co2;

  renderChart(items);
  updateSim();
  renderAdvice(items, price);

  document.getElementById('results').hidden = false;
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderChart(items) {
  const sorted = [...items].sort((a, b) => b.cost - a.cost);
  const ctx = document.getElementById('cost-chart').getContext('2d');
  if (costChart) costChart.destroy();
  const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#64748b','#0ea5e9','#a855f7'];
  costChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(i => i.name),
      datasets: [{
        data: sorted.map(i => i.cost),
        backgroundColor: sorted.map((_, idx) => COLORS[idx % COLORS.length]),
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => '¥' + c.parsed.x.toLocaleString() + ' / 月' } },
      },
      scales: {
        x: { ticks: { callback: v => '¥' + v.toLocaleString() } },
      },
    },
  });
}

function updateSim() {
  const price = parseFloat(document.getElementById('unit-price').value) || 31;
  let simCost = lastMonthly;

  if (document.getElementById('sim-aircon').checked) {
    appliances.filter(a => a.name.includes('エアコン')).forEach(a => {
      simCost -= Math.round(calcCost(a.watt, a.hours, a.days, price) * 0.10);
    });
  }
  if (document.getElementById('sim-standby').checked) {
    simCost -= 200;
  }
  if (document.getElementById('sim-hours').checked) {
    appliances.forEach(a => {
      const reducedHours = Math.max(0, a.hours - 1);
      simCost -= Math.round(calcCost(a.watt, a.hours - reducedHours, a.days, price));
    });
  }
  if (document.getElementById('sim-led').checked) {
    appliances.filter(a => a.name.includes('蛍光灯')).forEach(a => {
      simCost -= Math.round(calcCost(a.watt * 0.75, a.hours, a.days, price));
    });
  }

  simCost = Math.max(0, Math.round(simCost));
  const diff   = lastMonthly - simCost;
  const annual = diff * 12;

  document.getElementById('sim-current').textContent = '¥' + lastMonthly.toLocaleString();
  document.getElementById('sim-after').textContent   = '¥' + simCost.toLocaleString();
  document.getElementById('sim-diff').textContent    = '-¥' + diff.toLocaleString();
  document.getElementById('sim-annual').textContent  = '-¥' + annual.toLocaleString();
}

function renderAdvice(items, price) {
  const list = document.getElementById('advice-list');
  list.innerHTML = '';
  const sorted = [...items].sort((a, b) => b.cost - a.cost);
  const top = sorted.slice(0, 3);

  const advices = [];
  top.forEach(item => {
    if (item.name.includes('エアコン')) {
      advices.push(`エアコンは電気代の大きな割合を占めています。設定温度を冷房は1度上げ・暖房は1度下げるだけで消費電力を約10%削減できます。フィルターの清掃も効果的です。`);
    } else if (item.name.includes('冷蔵庫')) {
      advices.push(`冷蔵庫は24時間稼働のため電気代が積み重なります。温度設定を「中」にし、扉の開け閉めを減らすことで年間数百円の節約になります。`);
    } else if (item.name.includes('テレビ')) {
      advices.push(`テレビの画面輝度を下げると消費電力を削減できます。見ていない時はこまめに消し、スタンバイ電力も節約しましょう。`);
    } else if (item.name.includes('IH') || item.name.includes('電子レンジ')) {
      advices.push(`${item.name}は瞬間消費電力が高い家電です。調理時間を短縮するレシピや電子レンジでの下ごしらえが有効です。`);
    } else if (item.name.includes('蛍光灯')) {
      advices.push(`蛍光灯をLEDに交換すると消費電力を約75%削減できます。交換コストは数年で回収できる場合が多いです。`);
    } else {
      advices.push(`${item.name}（月¥${item.cost.toLocaleString()}）は電気代上位の家電です。使用時間の見直しや省エネモードの活用を検討してください。`);
    }
  });

  if (advices.length === 0) {
    advices.push('プリセット家電を追加して計算すると、家電別の節電アドバイスが表示されます。');
  }

  advices.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => addPreset(btn.dataset.preset));
  });
  document.getElementById('custom-add-btn').addEventListener('click', addCustom);
  document.getElementById('calc-btn').addEventListener('click', calculate);
  document.querySelectorAll('.sim-check').forEach(cb => {
    cb.addEventListener('change', () => { if (lastMonthly > 0) updateSim(); });
  });

  // Default presets on load
  addPreset('aircon');
  addPreset('fridge');
  addPreset('tv32');
  addPreset('led');
});
