'use strict';

// ===== サンプルテキスト =====
const SAMPLE_TEXT = `現代のビジネス環境において、わかりやすい文章を書く能力は非常に重要です。特に、メールや報告書、提案書などのビジネス文書では、相手に正確に意図を伝えることが求められます。

読みやすい文章を書くための基本は、一文を短くすることです。一つの文章に一つの情報だけを入れることで、読み手は内容を整理しやすくなります。また、難しい漢語よりも、やさしい言葉を選ぶことも大切です。

さらに、段落ごとにテーマを明確にすることも効果的です。段落の冒頭に結論を述べ、そのあとに根拠や補足を続けると、読み手が内容をすばやく把握できます。このような構成は、ビジネス文書だけでなく、ブログ記事やSNSの投稿にも応用できます。

文章を書いたあとは、必ず読み直しを行いましょう。聴き手の立場に立って読むことで、言葉の不自然さや情報の抜け漏れに気づくことができます。`;

// ===== 文字種判定 =====
const KANJI_RANGE = /[一-鿿㐀-䶿]/;
const HIRAGANA_RANGE = /[ぁ-ゖ]/;
const KATAKANA_RANGE = /[ァ-ヶ]/;
const PUNCTUATION_RANGE = /[。、！？！？]/;
const SENTENCE_END = /[。！？！？]/;
const WHITESPACE = /[\s　]/g;

function isKanji(ch) { return KANJI_RANGE.test(ch); }
function isHiragana(ch) { return HIRAGANA_RANGE.test(ch); }
function isKatakana(ch) { return KATAKANA_RANGE.test(ch); }
function isPunctuation(ch) { return PUNCTUATION_RANGE.test(ch); }

// ===== 分析ロジック =====

/**
 * テキストを受け取り各指標オブジェクトを返す
 * @param {string} text
 * @returns {object}
 */
function analyzeText(text) {
  // スペース・改行を除いた文字列
  const stripped = text.replace(WHITESPACE, '');
  const totalChars = stripped.length;

  if (totalChars === 0) {
    return null;
  }

  // 文字種カウント
  let kanjiCount = 0;
  let hiraganaCount = 0;
  let katakanaCount = 0;
  let punctuationCount = 0;

  for (const ch of stripped) {
    if (isKanji(ch)) kanjiCount++;
    else if (isHiragana(ch)) hiraganaCount++;
    else if (isKatakana(ch)) katakanaCount++;
    if (isPunctuation(ch)) punctuationCount++;
  }

  // 文章数（句点・！・？ の数で数える; 末尾が句点で終わらない場合も1文として加算）
  const sentenceMatches = text.match(/[。！？！？]+/g) || [];
  let sentenceCount = sentenceMatches.length;
  // 句点なしで文字がある場合は最低1文
  const textTrimmed = text.trim();
  if (sentenceCount === 0 && totalChars > 0) {
    sentenceCount = 1;
  }

  // 段落数（連続する空行で区切り）
  const paragraphs = textTrimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  // 平均文長
  const avgSentenceLength = sentenceCount > 0 ? Math.round(totalChars / sentenceCount) : 0;

  // 各密度（%）
  const kanjiDensity = totalChars > 0 ? parseFloat((kanjiCount / totalChars * 100).toFixed(1)) : 0;
  const hiraganaDensity = totalChars > 0 ? parseFloat((hiraganaCount / totalChars * 100).toFixed(1)) : 0;
  const katakanaDensity = totalChars > 0 ? parseFloat((katakanaCount / totalChars * 100).toFixed(1)) : 0;
  const punctuationDensity = totalChars > 0 ? parseFloat((punctuationCount / totalChars * 100).toFixed(1)) : 0;

  // 読了時間（400文字/分 〜 600文字/分 の中間: 500文字/分）
  const readTimeMin = Math.ceil(totalChars / 600);
  const readTimeMax = Math.ceil(totalChars / 400);

  return {
    totalChars,
    sentenceCount,
    avgSentenceLength,
    kanjiDensity,
    hiraganaDensity,
    katakanaDensity,
    punctuationDensity,
    paragraphCount,
    readTimeMin,
    readTimeMax,
  };
}

// ===== 個別指標の評価 =====

/**
 * @returns {{ rating: 'good'|'average'|'poor'|'neutral', label: string }}
 */
function rateAvgSentenceLength(val) {
  if (val <= 40) return { rating: 'good', label: '◎ 良好' };
  if (val <= 60) return { rating: 'average', label: '○ 普通' };
  return { rating: 'poor', label: '△ 要改善' };
}

function rateKanjiDensity(val) {
  if (val >= 20 && val <= 35) return { rating: 'good', label: '◎ 良好' };
  if (val >= 15 && val <= 40) return { rating: 'average', label: '○ 普通' };
  return { rating: 'poor', label: '△ 要改善' };
}

function rateHiraganaDensity(val) {
  if (val >= 40 && val <= 60) return { rating: 'good', label: '◎ 良好' };
  if (val >= 30 && val <= 70) return { rating: 'average', label: '○ 普通' };
  return { rating: 'poor', label: '△ 要改善' };
}

function ratePunctuationDensity(val) {
  if (val >= 4 && val <= 8) return { rating: 'good', label: '◎ 良好' };
  if (val >= 2 && val <= 10) return { rating: 'average', label: '○ 普通' };
  return { rating: 'poor', label: '△ 要改善' };
}

// ===== 総合スコア計算 =====

/**
 * 各指標の評価を数値化して総合スコアを算出（100点満点）
 * 評価対象: 平均文長・漢字密度・句読点密度・ひらがな密度（加重平均）
 */
function calcTotalScore(metrics) {
  const ratingToPoints = { good: 100, average: 65, poor: 30, neutral: 50 };

  const weights = {
    avgSentenceLength: 0.35,
    kanjiDensity: 0.25,
    punctuationDensity: 0.25,
    hiraganaDensity: 0.15,
  };

  const pts = {
    avgSentenceLength: ratingToPoints[rateAvgSentenceLength(metrics.avgSentenceLength).rating],
    kanjiDensity: ratingToPoints[rateKanjiDensity(metrics.kanjiDensity).rating],
    punctuationDensity: ratingToPoints[ratePunctuationDensity(metrics.punctuationDensity).rating],
    hiraganaDensity: ratingToPoints[rateHiraganaDensity(metrics.hiraganaDensity).rating],
  };

  const score = Object.keys(weights).reduce((sum, key) => {
    return sum + pts[key] * weights[key];
  }, 0);

  return Math.round(score);
}

function scoreComment(score) {
  if (score >= 85) return '非常に読みやすい文章です。このクオリティを維持しましょう。';
  if (score >= 70) return '読みやすい文章ですが、いくつかの指標を改善するとさらに良くなります。';
  if (score >= 55) return '普通の読みやすさです。△マークの指標を重点的に改善しましょう。';
  return '文章の読みやすさに改善の余地があります。平均文長・漢字密度を中心に見直してください。';
}

// ===== 指標カード定義 =====

function buildMetricDefs(m) {
  return [
    {
      name: '総文字数',
      value: m.totalChars.toLocaleString(),
      unit: '文字',
      rating: 'neutral',
      ratingLabel: '—',
      hint: 'スペース・改行を除く',
    },
    {
      name: '文章数',
      value: m.sentenceCount,
      unit: '文',
      rating: 'neutral',
      ratingLabel: '—',
      hint: '句点・！・？で区切り',
    },
    {
      name: '平均文長',
      value: m.avgSentenceLength,
      unit: '文字/文',
      ...rateAvgSentenceLength(m.avgSentenceLength),
      hint: '目安: 40文字以下が◎',
    },
    {
      name: '漢字密度',
      value: m.kanjiDensity,
      unit: '%',
      ...rateKanjiDensity(m.kanjiDensity),
      hint: '目安: 20〜35%が◎',
    },
    {
      name: 'ひらがな密度',
      value: m.hiraganaDensity,
      unit: '%',
      ...rateHiraganaDensity(m.hiraganaDensity),
      hint: '目安: 40〜60%が◎',
    },
    {
      name: 'カタカナ密度',
      value: m.katakanaDensity,
      unit: '%',
      rating: 'neutral',
      ratingLabel: '—',
      hint: '外来語・専門語の割合',
    },
    {
      name: '句読点密度',
      value: m.punctuationDensity,
      unit: '%',
      ...ratePunctuationDensity(m.punctuationDensity),
      hint: '目安: 4〜8%が◎',
    },
    {
      name: '段落数',
      value: m.paragraphCount,
      unit: '段落',
      rating: 'neutral',
      ratingLabel: '—',
      hint: '空行で区切った段落',
    },
    {
      name: '読了時間',
      value: m.readTimeMin === m.readTimeMax
        ? `約${m.readTimeMin}`
        : `${m.readTimeMin}〜${m.readTimeMax}`,
      unit: '分',
      rating: 'neutral',
      ratingLabel: '—',
      hint: '400〜600文字/分で推定',
    },
  ];
}

// ===== DOM =====
const textInput = document.getElementById('text-input');
const charCountDisplay = document.getElementById('char-count-display');
const scoreSection = document.getElementById('score-section');
const metricsSection = document.getElementById('metrics-section');
const totalScoreEl = document.getElementById('total-score');
const scoreBar = document.getElementById('score-bar');
const scoreComment = document.getElementById('score-comment');
const metricsGrid = document.getElementById('metrics-grid');
const btnSample = document.getElementById('btn-sample');
const btnClear = document.getElementById('btn-clear');

// ===== レンダリング =====

function renderMetricCard(def) {
  const card = document.createElement('div');
  card.className = `metric-card rating-${def.rating}`;

  const name = document.createElement('div');
  name.className = 'metric-name';
  name.textContent = def.name;

  const valueRow = document.createElement('div');
  const valueEl = document.createElement('span');
  valueEl.className = 'metric-value';
  valueEl.textContent = def.value;
  const unitEl = document.createElement('span');
  unitEl.className = 'metric-unit';
  unitEl.textContent = def.unit;
  valueRow.appendChild(valueEl);
  valueRow.appendChild(unitEl);

  const ratingEl = document.createElement('div');
  ratingEl.className = `metric-rating ${def.rating}`;
  ratingEl.textContent = def.ratingLabel;

  const hintEl = document.createElement('div');
  hintEl.className = 'metric-hint';
  hintEl.textContent = def.hint;

  card.appendChild(name);
  card.appendChild(valueRow);
  card.appendChild(ratingEl);
  card.appendChild(hintEl);

  return card;
}

function renderResults(metrics) {
  const score = calcTotalScore(metrics);

  // 総合スコア
  scoreSection.classList.remove('hidden');
  totalScoreEl.textContent = score;
  totalScoreEl.className = 'score-number ' + (score >= 75 ? 'good' : score >= 55 ? 'average' : 'poor');
  scoreBar.style.width = score + '%';

  const comment = score >= 85
    ? '非常に読みやすい文章です。このクオリティを維持しましょう。'
    : score >= 70
    ? '読みやすい文章ですが、いくつかの指標を改善するとさらに良くなります。'
    : score >= 55
    ? '普通の読みやすさです。△マークの指標を重点的に改善しましょう。'
    : '文章の読みやすさに改善の余地があります。平均文長・漢字密度を中心に見直してください。';

  scoreComment.textContent = comment;

  // 指標カード
  metricsSection.classList.remove('hidden');
  metricsGrid.innerHTML = '';
  const defs = buildMetricDefs(metrics);
  defs.forEach(def => {
    metricsGrid.appendChild(renderMetricCard(def));
  });
}

function clearResults() {
  scoreSection.classList.add('hidden');
  metricsSection.classList.add('hidden');
  totalScoreEl.textContent = '--';
  totalScoreEl.className = 'score-number';
  scoreBar.style.width = '0%';
  scoreComment.textContent = '';
  metricsGrid.innerHTML = '';
}

// ===== 入力ハンドラ =====

function onInput() {
  const text = textInput.value;
  const stripped = text.replace(/[\s　]/g, '');
  charCountDisplay.textContent = stripped.length.toLocaleString() + '文字';

  if (stripped.length === 0) {
    clearResults();
    return;
  }

  const metrics = analyzeText(text);
  if (metrics) {
    renderResults(metrics);
  }
}

// ===== ボタンイベント =====

btnSample.addEventListener('click', () => {
  textInput.value = SAMPLE_TEXT;
  onInput();
  textInput.focus();
});

btnClear.addEventListener('click', () => {
  textInput.value = '';
  onInput();
  textInput.focus();
});

// ===== リアルタイム入力 =====

textInput.addEventListener('input', onInput);

// ===== 初期化 =====
onInput();
