const ETO = ['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'];
function getEto(year) { return ETO[year % 12]; }

const ERAS = [
  { key: 'reiwa',  name: '令和', start: 2019, startMonth: 5,  startDay: 1  },
  { key: 'heisei', name: '平成', start: 1989, startMonth: 1,  startDay: 8  },
  { key: 'showa',  name: '昭和', start: 1926, startMonth: 12, startDay: 25 },
  { key: 'taisho', name: '大正', start: 1912, startMonth: 7,  startDay: 30 },
  { key: 'meiji',  name: '明治', start: 1868, startMonth: 1,  startDay: 25 },
];

const ERA_END = {
  reiwa:  null,
  heisei: { year: 2019, month: 4,  day: 30 },
  showa:  { year: 1989, month: 1,  day: 7  },
  taisho: { year: 1926, month: 12, day: 24 },
  meiji:  { year: 1912, month: 7,  day: 29 },
};

function seirekiToWareki(year) {
  const results = [];
  for (const era of ERAS) {
    if (year < era.start) continue;
    const waYear = year - era.start + 1;
    const end = ERA_END[era.key];
    if (end && year > end.year) continue;
    const gannen = waYear === 1 ? `${era.name}元年` : `${era.name}${waYear}年`;
    results.push({ era, waYear, gannen });
  }
  return results;
}

function warekiToSeireki(eraKey, waYear) {
  const era = ERAS.find(e => e.key === eraKey);
  if (!era) return null;
  const seireki = era.start + waYear - 1;
  const end = ERA_END[eraKey];
  if (end && seireki > end.year) return null;
  if (seireki < era.start) return null;
  return seireki;
}

function showResult(el, mainText, subText, isError) {
  el.innerHTML = `<div class="main-result">${mainText}</div>${subText ? `<div class="sub-result">${subText}</div>` : ''}`;
  el.style.display = 'block';
  el.classList.toggle('error', !!isError);
}

function buildQuickTable() {
  const tbody = document.getElementById('quick-table-body');
  const currentYear = new Date().getFullYear();
  const rows = [];

  for (const era of ERAS) {
    const end = ERA_END[era.key];
    const endYear = end ? end.year : currentYear;
    for (let y = era.start; y <= endYear; y++) {
      const waYear = y - era.start + 1;
      rows.push({ seireki: y, era, waYear });
    }
  }

  rows.sort((a, b) => b.seireki - a.seireki);
  const recent = rows.slice(0, 60);

  tbody.innerHTML = recent.map(r => {
    const isCurrent = r.seireki === currentYear;
    const waLabel = r.waYear === 1 ? `${r.era.name}元年` : `${r.era.name}${r.waYear}年`;
    return `<tr${isCurrent ? ' class="current-year"' : ''}>
      <td>${r.era.name}</td>
      <td>${waLabel}${isCurrent ? ' ★今年' : ''}</td>
      <td>${r.seireki}年</td>
    </tr>`;
  }).join('');
}

function buildAgeTable(eraFilter = 'all') {
  const tbody = document.getElementById('age-table-body');
  const currentYear = new Date().getFullYear();
  const rows = [];

  for (const era of ERAS) {
    const end = ERA_END[era.key];
    const endYear = end ? end.year : currentYear;
    for (let y = era.start; y <= endYear; y++) {
      const waYear = y - era.start + 1;
      const waLabel = waYear === 1 ? `${era.name}元年` : `${era.name}${waYear}年`;
      rows.push({ seireki: y, era, waLabel, age: currentYear - y });
    }
  }

  rows.sort((a, b) => b.seireki - a.seireki);
  const filtered = eraFilter === 'all' ? rows : rows.filter(r => r.era.key === eraFilter);

  tbody.innerHTML = filtered.map(r => {
    const isCurrent = r.seireki === currentYear;
    return `<tr${isCurrent ? ' class="current-year"' : ''}>
      <td>${r.waLabel}${isCurrent ? ' ★今年' : ''}</td>
      <td>${r.seireki}年</td>
      <td>${getEto(r.seireki)}</td>
      <td>${r.age >= 0 ? r.age + '歳' : '—'}</td>
    </tr>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const currentYear = new Date().getFullYear();
  document.getElementById('current-year-text').textContent = currentYear;

  buildQuickTable();
  buildAgeTable();

  document.querySelectorAll('.era-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.era-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildAgeTable(btn.dataset.era);
    });
  });

  // タブ切り替え
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tool-section').forEach(s => s.classList.add('hidden'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
    });
  });

  // 西暦 → 和暦
  document.getElementById('btn-s2w').addEventListener('click', () => {
    const val = parseInt(document.getElementById('seireki-input').value, 10);
    const el = document.getElementById('result-s2w');
    if (!val || val < 1868 || val > 2100) {
      showResult(el, '1868年〜2100年の範囲で入力してください', '', true);
      return;
    }
    const results = seirekiToWareki(val);
    if (!results.length) {
      showResult(el, '該当する和暦が見つかりませんでした', '', true);
      return;
    }
    const main = results.map(r => r.gannen).join('　または　');
    const sub = results.length > 1 ? '※改元をまたいでいるため複数の和暦が存在します' : `西暦 ${val} 年 = ${main}`;
    showResult(el, main, sub);
  });

  // 和暦 → 西暦
  document.getElementById('btn-w2s').addEventListener('click', () => {
    const eraKey = document.getElementById('era-select').value;
    const waYear = parseInt(document.getElementById('wareki-input').value, 10);
    const el = document.getElementById('result-w2s');
    const era = ERAS.find(e => e.key === eraKey);
    if (!waYear || waYear < 1) {
      showResult(el, '年を入力してください', '', true);
      return;
    }
    const seireki = warekiToSeireki(eraKey, waYear);
    if (!seireki) {
      const end = ERA_END[eraKey];
      const maxWa = end ? end.year - era.start + 1 : currentYear - era.start + 1;
      showResult(el, `${era.name}は1年〜${maxWa}年の範囲です`, '', true);
      return;
    }
    const waLabel = waYear === 1 ? `${era.name}元年` : `${era.name}${waYear}年`;
    showResult(el, `西暦 ${seireki} 年`, `${waLabel} = 西暦 ${seireki} 年`);
  });

  // 年齢計算
  document.getElementById('btn-age').addEventListener('click', () => {
    const birthEra = document.getElementById('birth-era').value;
    const birthInput = parseInt(document.getElementById('birth-year').value, 10);
    const el = document.getElementById('result-age');
    if (!birthInput || birthInput < 1) {
      showResult(el, '生まれた年を入力してください', '', true);
      return;
    }
    let birthSeireki;
    if (birthEra === 'seireki') {
      birthSeireki = birthInput;
    } else {
      birthSeireki = warekiToSeireki(birthEra, birthInput);
      if (!birthSeireki) {
        const era = ERAS.find(e => e.key === birthEra);
        showResult(el, `${era.name}の有効範囲外の年です`, '', true);
        return;
      }
    }
    if (birthSeireki < 1868 || birthSeireki > currentYear) {
      showResult(el, `1868年〜${currentYear}年の範囲で入力してください`, '', true);
      return;
    }
    const age = currentYear - birthSeireki;
    const warekiResults = seirekiToWareki(birthSeireki);
    const waLabel = warekiResults.length ? warekiResults.map(r => r.gannen).join('/') : '';
    showResult(
      el,
      `${age} 歳（または ${age + 1} 歳）`,
      `西暦 ${birthSeireki} 年生まれ${waLabel ? `（${waLabel}）` : ''}。誕生日によって${age}歳または${age + 1}歳です。`
    );
  });

  // Enterキー対応
  ['seireki-input', 'wareki-input', 'birth-year'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const map = { 'seireki-input': 'btn-s2w', 'wareki-input': 'btn-w2s', 'birth-year': 'btn-age' };
        document.getElementById(map[id])?.click();
      }
    });
  });
});
