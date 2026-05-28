'use strict';

/* ===================================================
   文章密度ビジュアライザー — script.js
   =================================================== */

// ---- DOM references ----
const textInput     = document.getElementById('text-input');
const charCountEl   = document.getElementById('char-count-display');
const resultsArea   = document.getElementById('results-area');
const statsGrid     = document.getElementById('stats-grid');
const suggestionsSection = document.getElementById('suggestions-section');
const suggestionsList    = document.getElementById('suggestions-list');
const heatmapEl     = document.getElementById('heatmap');
const btnSample     = document.getElementById('btn-sample');
const btnClear      = document.getElementById('btn-clear');

// ---- Chart.js instance ----
let sentenceChart = null;

// ---- Sample text ----
const SAMPLE_TEXT = `ブログ記事を書く際には、読者がすぐに離脱しないよう、文章の密度や長さに気をつけることが重要です。一般的に、1段落あたりの文字数は100〜200文字程度が読みやすいとされています。

段落が長すぎると、読者は視覚的な圧迫感を感じてしまい、途中で読むのをやめてしまう可能性があります。特にスマートフォンで閲覧するユーザーにとって、長い段落は画面いっぱいに文字が広がるため、非常に読みにくくなります。Webコンテンツでは、モバイル環境での読みやすさを最優先に考える必要があります。

また、漢字の使い方も重要なポイントです。漢字が多すぎると硬い印象を与え、ひらがなが多すぎると子どもっぽく見えます。

文の長さも意識しましょう。1文は40文字以下が目安です。長い文は読点や接続詞で区切ることで、グンと読みやすくなります。

このツールを使って、あなたの文章を客観的に分析してみてください。数値として見える化することで、改善のヒントが見つかるはずです。`;

// ---- Utility: split paragraphs ----
function splitParagraphs(text) {
  return text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

// ---- Utility: split sentences (Japanese) ----
function splitSentences(text) {
  // Split on sentence-ending punctuation
  const raw = text.split(/(?<=[。！？!?])/);
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

// ---- Utility: count kanji ----
function countKanji(text) {
  const m = text.match(/[一-鿿㐀-䶿]/g);
  return m ? m.length : 0;
}

// ---- Utility: count hiragana ----
function countHiragana(text) {
  const m = text.match(/[぀-ゟ]/g);
  return m ? m.length : 0;
}

// ---- Utility: remove whitespace / newlines for char count ----
function countChars(text) {
  return text.replace(/\s/g, '').length;
}

// ---- Analyze text ----
function analyzeText(text) {
  const chars      = countChars(text);
  const paragraphs = splitParagraphs(text);
  const sentences  = splitSentences(text);
  const kanji      = countKanji(text);
  const hiragana   = countHiragana(text);

  const kanjiRate    = chars > 0 ? Math.round((kanji / chars) * 100) : 0;
  const hiraganaRate = chars > 0 ? Math.round((hiragana / chars) * 100) : 0;

  const sentenceLengths = sentences.map(s => countChars(s));
  const avgSentenceLen  = sentenceLengths.length > 0
    ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
    : 0;

  // Reading time: 400 chars/min in Japanese
  const readingMinutes = chars > 0 ? Math.ceil(chars / 400) : 0;

  return {
    chars,
    paragraphs,
    sentences,
    sentenceLengths,
    kanjiRate,
    hiraganaRate,
    avgSentenceLen,
    readingMinutes,
  };
}

// ---- Rate helper ----
function rateKanji(rate) {
  if (rate < 15) return 'warn';
  if (rate > 30) return 'warn';
  return 'good';
}
function rateHiragana(rate) {
  if (rate < 40) return 'warn';
  if (rate > 70) return 'warn';
  return 'good';
}
function rateSentenceLen(len) {
  if (len > 60) return 'danger';
  if (len > 40) return 'warn';
  return 'good';
}

// ---- Render stat cards ----
function renderStats(result) {
  const { chars, paragraphs, sentences, kanjiRate, hiraganaRate, avgSentenceLen, readingMinutes } = result;

  const cards = [
    {
      name: '総文字数',
      value: chars.toLocaleString(),
      unit: '文字',
      hint: '',
      cls: '',
    },
    {
      name: '段落数',
      value: paragraphs.length,
      unit: '段落',
      hint: '',
      cls: '',
    },
    {
      name: '文数',
      value: sentences.length,
      unit: '文',
      hint: '',
      cls: '',
    },
    {
      name: '漢字密度',
      value: kanjiRate,
      unit: '%',
      hint: '目安: 20〜30%',
      cls: rateKanji(kanjiRate),
    },
    {
      name: 'ひらがな密度',
      value: hiraganaRate,
      unit: '%',
      hint: '目安: 50〜65%',
      cls: rateHiragana(hiraganaRate),
    },
    {
      name: '平均文長',
      value: avgSentenceLen,
      unit: '文字/文',
      hint: 'Web推奨: 40文字以下',
      cls: rateSentenceLen(avgSentenceLen),
    },
    {
      name: '読了時間',
      value: readingMinutes,
      unit: '分',
      hint: '400文字/分換算',
      cls: '',
    },
  ];

  statsGrid.innerHTML = cards.map(c => `
    <div class="stat-card ${c.cls}">
      <div class="stat-name">${c.name}</div>
      <div class="stat-value">${c.value}<span class="stat-unit">${c.unit}</span></div>
      ${c.hint ? `<div class="stat-hint">${c.hint}</div>` : ''}
    </div>
  `).join('');
}

// ---- Render suggestions ----
function renderSuggestions(result) {
  const { paragraphs, kanjiRate, hiraganaRate, avgSentenceLen } = result;
  const items = [];

  const longParas = paragraphs.filter(p => countChars(p) > 200);
  if (longParas.length > 0) {
    items.push(`200文字を超える長い段落が ${longParas.length} 件あります。段落を分割して読みやすくしましょう。`);
  }

  if (kanjiRate > 30) {
    items.push(`漢字密度が ${kanjiRate}% と高めです。ひらがな表記を増やすと読みやすくなります。`);
  } else if (kanjiRate < 15) {
    items.push(`漢字密度が ${kanjiRate}% と低めです。適度な漢字使用で文章に締まりが出ます。`);
  }

  if (hiraganaRate < 40) {
    items.push(`ひらがな密度が ${hiraganaRate}% と低めです。専門用語が多い場合はルビや言い換えを検討してください。`);
  } else if (hiraganaRate > 70) {
    items.push(`ひらがな密度が ${hiraganaRate}% と高めです。漢字を適度に使うとプロフェッショナルな印象になります。`);
  }

  if (avgSentenceLen > 60) {
    items.push(`平均文長が ${avgSentenceLen} 文字と長すぎます。「、」や接続詞で文を区切りましょう。`);
  } else if (avgSentenceLen > 40) {
    items.push(`平均文長が ${avgSentenceLen} 文字です。もう少し短くするとWebコンテンツとして読みやすくなります。`);
  }

  if (items.length === 0) {
    suggestionsSection.classList.add('hidden');
    return;
  }

  suggestionsList.innerHTML = items
    .map(t => `<li class="suggestion-item">${t}</li>`)
    .join('');
  suggestionsSection.classList.remove('hidden');
}

// ---- Heatmap color: blue(short) → red(long), baseline 150 chars ----
function heatColor(charCount) {
  const baseline = 150;
  const ratio = Math.min(charCount / baseline, 2); // 0〜2
  // 0: blue(30,100,220) → 1: yellow(230,170,0) → 2: red(220,30,30)
  let r, g, b;
  if (ratio <= 1) {
    r = Math.round(30  + (230 - 30)  * ratio);
    g = Math.round(100 + (170 - 100) * ratio);
    b = Math.round(220 + (0   - 220) * ratio);
  } else {
    const t = ratio - 1;
    r = Math.round(230 + (220 - 230) * t);
    g = Math.round(170 + (30  - 170) * t);
    b = Math.round(0);
  }
  return `rgb(${r},${g},${b})`;
}

// ---- Render heatmap ----
function renderHeatmap(paragraphs) {
  if (paragraphs.length === 0) {
    heatmapEl.innerHTML = '';
    return;
  }
  heatmapEl.innerHTML = paragraphs.map((p, i) => {
    const len   = countChars(p);
    const color = heatColor(len);
    const preview = p.length > 60 ? p.slice(0, 60) + '…' : p;
    return `
      <div class="heatmap-row">
        <span class="heatmap-label">P${i + 1}</span>
        <div class="heatmap-bar" style="background:${color};" title="${p.replace(/"/g, '&quot;')}">
          <span class="heatmap-text">${preview}</span>
          <span class="heatmap-count">${len}文字</span>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Render sentence-length chart ----
function renderChart(sentenceLengths) {
  const ctx = document.getElementById('sentence-chart').getContext('2d');

  if (sentenceChart) {
    sentenceChart.destroy();
    sentenceChart = null;
  }

  if (sentenceLengths.length === 0) return;

  const labels = sentenceLengths.map((_, i) => `文${i + 1}`);
  const colors = sentenceLengths.map(len => {
    if (len > 60) return 'rgba(220,38,38,0.7)';
    if (len > 40) return 'rgba(217,119,6,0.7)';
    return 'rgba(44,74,140,0.7)';
  });

  sentenceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '文字数',
        data: sentenceLengths,
        backgroundColor: colors,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y} 文字`,
          },
        },
      },
      scales: {
        x: {
          ticks: { font: { size: 10 }, maxRotation: 0 },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 } },
          title: { display: true, text: '文字数', font: { size: 10 } },
        },
      },
    },
  });
}

// ---- Update all ----
function update() {
  const text = textInput.value;

  // Char count display
  const len = text.length;
  charCountEl.textContent = `${len.toLocaleString()} / 5000文字`;
  charCountEl.classList.toggle('near-limit', len >= 4000);

  if (text.trim().length === 0) {
    resultsArea.classList.add('hidden');
    suggestionsSection.classList.add('hidden');
    if (sentenceChart) { sentenceChart.destroy(); sentenceChart = null; }
    return;
  }

  const result = analyzeText(text);
  renderStats(result);
  renderSuggestions(result);
  renderHeatmap(result.paragraphs);
  renderChart(result.sentenceLengths);
  resultsArea.classList.remove('hidden');
}

// ---- Event listeners ----
textInput.addEventListener('input', update);

btnSample.addEventListener('click', () => {
  textInput.value = SAMPLE_TEXT;
  update();
  textInput.focus();
});

btnClear.addEventListener('click', () => {
  textInput.value = '';
  update();
  textInput.focus();
});
