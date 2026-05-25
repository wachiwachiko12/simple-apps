'use strict';

// ==================== 練習テキストデータ ====================
const TEXT_DATA = {
  'english-basic': [
    'the quick brown fox jumps over the lazy dog',
    'apple banana cherry date elderberry fig grape',
    'time flies when you are having fun',
    'practice makes perfect every single day',
    'hello world this is a typing practice test',
    'the sun rises in the east and sets in the west',
    'a journey of a thousand miles begins with a single step',
    'work hard play hard and never give up',
    'simple clean and fast is always the best approach',
    'reading books every day improves your vocabulary',
    'coffee tea water juice milk are popular drinks',
    'monday tuesday wednesday thursday friday saturday sunday',
    'january february march april may june july august',
    'north south east west are the four directions',
    'keyboard mouse screen printer speaker monitor cable',
    'python javascript ruby java swift kotlin typescript',
    'bread butter cheese egg bacon sausage toast',
    'river mountain forest ocean desert valley plain',
    'spring summer autumn winter are the four seasons',
    'red blue green yellow orange purple black white',
  ],
  'english-programming': [
    'function const let var return async await',
    'array object string number boolean undefined null',
    'for loop while loop do while break continue',
    'if else switch case default try catch finally',
    'class extends interface implements abstract static',
    'import export default module require node npm',
    'git commit push pull merge branch checkout clone',
    'html css javascript typescript react vue angular',
    'api rest graphql json xml http https fetch',
    'database sql nosql mysql postgres mongodb redis',
    'docker container image volume network compose',
    'linux ubuntu debian centos arch terminal bash',
    'variable declaration assignment expression statement',
    'recursion iteration memoization dynamic programming',
    'binary search sorting algorithm big o notation',
    'component state props hook effect context reducer',
  ],
  'english-quotes': [
    'be yourself everyone else is already taken',
    'the only way to do great work is to love what you do',
    'in the middle of every difficulty lies opportunity',
    'it does not matter how slowly you go as long as you do not stop',
    'success is not final failure is not fatal it is the courage that counts',
    'the future belongs to those who believe in the beauty of their dreams',
    'do not watch the clock do what it does keep going',
    'life is what happens when you are busy making other plans',
    'the best time to plant a tree was twenty years ago the second best time is now',
    'you miss one hundred percent of the shots you do not take',
  ],
  'japanese-proverbs': [
    'ちりもつもればやまとなる',
    'はやおきはさんもんのとく',
    'いしのうえにもさんねん',
    'なせばなる なさねばならぬ なにごとも',
    'ごうにいればごうにしたがえ',
    'ことばはこころのかがみ',
    'あくじせんりをはしる',
    'たなからぼたもち',
    'でるくいはうたれる',
    'ねこにこばん',
    'すもうにかちまけなし',
    'うまのじはみずのごとし',
  ],
  'japanese-tech': [
    'かんすうはしょりのかたまりです',
    'へんすうにはいろいろなかたがあります',
    'はいれつはおなじかたのあつまりです',
    'くりかえしはるーぷともいいます',
    'じょうけんぶんきはいふぶんをつかいます',
    'じょうほうしょりのきそをまなびましょう',
    'でーたべーすにはでーたをほぞんします',
    'ねっとわーくはせかいをつないでいます',
    'せきゅりてぃはたいせつなぎじゅつです',
    'あるごりずむはもんだいのかいきかたです',
    'きかいがくしゅうはにゅーらるねっとをつかいます',
    'じんこうちのうはにんげんのちのうをもほうします',
    'くらうどこんぴゅーてぃんぐはさーばをかりるしくみです',
    'おーぷんそーすはだれでもつかえるそふとです',
    'でばっぐはばぐをさがしてなおすさぎょうです',
    'りふぁくたりんぐはこーどをよみやすくなおします',
  ],
  'japanese-sentences': [
    'きょうはいいてんきです',
    'まいにちれんしゅうするとはやくなります',
    'きーぼーどをみないでうちましょう',
    'せいかくにうつことがたいせつです',
    'たいぴんぐはなんどもれんしゅうしてみにつきます',
    'しごとでぱそこんをつかうひとはおおいです',
    'もじをはやくうてるとべんりです',
    'まいにちすこしずつれんしゅうしましょう',
    'あせらずにおちついてうちましょう',
    'めひょうをきめてれんしゅうするとこうかてきです',
  ],
};

// ==================== ローマ字変換テーブル ====================
const ROMAJI_TABLE = [
  // 特殊（優先度高いものを先に）
  ['kkya', 'っきゃ'], ['kkyu', 'っきゅ'], ['kkyo', 'っきょ'],
  ['ssya', 'っしゃ'], ['ssyu', 'っしゅ'], ['ssyo', 'っしょ'],
  ['ttya', 'っちゃ'], ['ttyu', 'っちゅ'], ['ttyo', 'っちょ'],
  ['hhya', 'っひゃ'], ['hhyu', 'っひゅ'], ['hhyo', 'っひょ'],
  ['nnna', 'んな'], ['nnni', 'んに'], ['nnnu', 'んぬ'], ['nnne', 'んね'], ['nnno', 'んの'],

  // きゃ行
  ['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ'],
  // しゃ行
  ['sha', 'しゃ'], ['shu', 'しゅ'], ['she', 'しぇ'], ['sho', 'しょ'],
  ['sya', 'しゃ'], ['syu', 'しゅ'], ['syo', 'しょ'],
  // ちゃ行
  ['cha', 'ちゃ'], ['chi', 'ち'], ['chu', 'ちゅ'], ['che', 'ちぇ'], ['cho', 'ちょ'],
  ['tya', 'ちゃ'], ['tyu', 'ちゅ'], ['tyo', 'ちょ'],
  // つ
  ['tsu', 'つ'],
  // にゃ行
  ['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ'],
  // ひゃ行
  ['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ'],
  // みゃ行
  ['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ'],
  // りゃ行
  ['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ'],
  // ぎゃ行
  ['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ'],
  // じゃ行
  ['ja', 'じゃ'], ['ji', 'じ'], ['ju', 'じゅ'], ['je', 'じぇ'], ['jo', 'じょ'],
  ['zya', 'じゃ'], ['zyu', 'じゅ'], ['zyo', 'じょ'],
  // びゃ行
  ['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ'],
  // ぴゃ行
  ['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ'],

  // 促音（っ）
  ['kka', 'っか'], ['kki', 'っき'], ['kku', 'っく'], ['kke', 'っけ'], ['kko', 'っこ'],
  ['ssa', 'っさ'], ['ssi', 'っし'], ['ssu', 'っす'], ['sse', 'っせ'], ['sso', 'っそ'],
  ['tta', 'った'], ['tti', 'っち'], ['ttu', 'っつ'], ['tte', 'って'], ['tto', 'っと'],
  ['hha', 'っは'], ['hhi', 'っひ'], ['hhu', 'っふ'], ['hhe', 'っへ'], ['hho', 'っほ'],
  ['ppa', 'っぱ'], ['ppi', 'っぴ'], ['ppu', 'っぷ'], ['ppe', 'っぺ'], ['ppo', 'っぽ'],

  // 基本50音
  ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
  ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
  ['sa', 'さ'], ['si', 'し'], ['shi', 'し'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
  ['ta', 'た'], ['ti', 'ち'], ['tu', 'つ'], ['te', 'て'], ['to', 'と'],
  ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
  ['ha', 'は'], ['hi', 'ひ'], ['fu', 'ふ'], ['hu', 'ふ'], ['he', 'へ'], ['ho', 'ほ'],
  ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
  ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
  ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
  ['wa', 'わ'], ['wi', 'ゐ'], ['we', 'ゑ'], ['wo', 'を'],
  ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
  ['za', 'ざ'], ['zi', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
  ['da', 'だ'], ['di', 'ぢ'], ['du', 'づ'], ['de', 'で'], ['do', 'ど'],
  ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
  ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
  // ん
  ['nn', 'ん'], ['xn', 'ん'],
  // 小文字
  ['xa', 'ぁ'], ['xi', 'ぃ'], ['xu', 'ぅ'], ['xe', 'ぇ'], ['xo', 'ぉ'],
  ['xya', 'ゃ'], ['xyu', 'ゅ'], ['xyo', 'ょ'],
  ['ltsu', 'っ'], ['xtu', 'っ'],
  // ー（長音）
  ['-', 'ー'],
  // 記号
  [' ', '　'],
];

// ローマ字→かな変換関数
function romajiToKana(romaji) {
  let result = '';
  let i = 0;
  const lower = romaji.toLowerCase();
  while (i < lower.length) {
    let matched = false;
    // 最長一致（4文字→3文字→2文字→1文字の順）
    for (let len = Math.min(4, lower.length - i); len >= 1; len--) {
      const chunk = lower.slice(i, i + len);
      const entry = ROMAJI_TABLE.find(([r]) => r === chunk);
      if (entry) {
        result += entry[1];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += lower[i];
      i++;
    }
  }
  return result;
}

// ==================== アプリ状態 ====================
const state = {
  mode: 'english',           // 'english' | 'romaji' | 'kana'
  category: 'english-basic',
  texts: [],
  currentTextIndex: 0,
  targetText: '',            // 表示テキスト（かなの場合はかな文字）
  targetChars: [],           // 表示文字の配列
  inputBuffer: '',           // 現在の入力バッファ
  typedCount: 0,             // 正しくタイプした文字数
  mistakeCount: 0,
  totalKeystrokes: 0,
  startTime: null,
  timerInterval: null,
  isRunning: false,
  isFinished: false,
  currentCharIndex: 0,       // 次に入力すべき文字のインデックス
};

// ==================== DOM要素 ====================
const dom = {
  modeTabs: document.querySelectorAll('.mode-tab'),
  categorySelect: document.getElementById('text-category'),
  wpm: document.getElementById('wpm'),
  accuracy: document.getElementById('accuracy'),
  elapsed: document.getElementById('elapsed'),
  progressBar: document.getElementById('progress-bar'),
  displayText: document.getElementById('display-text'),
  romajiHint: document.getElementById('romaji-hint'),
  typingInput: document.getElementById('typing-input'),
  bestScoreDisplay: document.getElementById('best-score-display'),
  startBtn: document.getElementById('start-btn'),
  resetBtn: document.getElementById('reset-btn'),
  resultModal: document.getElementById('result-modal'),
  rankDisplay: document.getElementById('rank-display'),
  resultWpm: document.getElementById('result-wpm'),
  resultAccuracy: document.getElementById('result-accuracy'),
  resultMistakes: document.getElementById('result-mistakes'),
  resultTime: document.getElementById('result-time'),
  newBest: document.getElementById('new-best'),
  retryBtn: document.getElementById('retry-btn'),
  closeModalBtn: document.getElementById('close-modal-btn'),
};

// ==================== ベストスコア ====================
function getBestScoreKey() {
  return `typing-best-${state.mode}-${state.category}`;
}

function loadBestScore() {
  const score = parseInt(localStorage.getItem(getBestScoreKey()), 10);
  return isNaN(score) ? null : score;
}

function saveBestScore(wpm) {
  const key = getBestScoreKey();
  const current = loadBestScore();
  if (current === null || wpm > current) {
    localStorage.setItem(key, wpm.toString());
    return true; // 新記録
  }
  return false;
}

function updateBestScoreDisplay() {
  const best = loadBestScore();
  dom.bestScoreDisplay.textContent = best !== null ? `ベスト: ${best} WPM` : 'ベスト: -- WPM';
}

// ==================== テキスト準備 ====================
function prepareTexts() {
  const category = state.category;
  const mode = state.mode;

  // カテゴリとモードの整合性チェック
  const isJapanese = category.startsWith('japanese-');
  const isEnglishMode = mode === 'english';

  // モードとカテゴリが合わない場合は自動調整
  let effectiveCategory = category;
  if (isEnglishMode && isJapanese) {
    effectiveCategory = 'english-basic';
    dom.categorySelect.value = 'english-basic';
    state.category = 'english-basic';
  } else if (!isEnglishMode && !isJapanese) {
    effectiveCategory = 'japanese-proverbs';
    dom.categorySelect.value = 'japanese-proverbs';
    state.category = 'japanese-proverbs';
  }

  state.texts = [...TEXT_DATA[effectiveCategory]];
  // シャッフル
  for (let i = state.texts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.texts[i], state.texts[j]] = [state.texts[j], state.texts[i]];
  }
  state.currentTextIndex = 0;
}

function loadCurrentText() {
  const raw = state.texts[state.currentTextIndex % state.texts.length];
  state.targetText = raw;
  state.targetChars = raw.split('');
  state.currentCharIndex = 0;
  state.inputBuffer = '';
  renderDisplayText();
  updateRomajiHint();
  dom.progressBar.style.width = '0%';
}

// ==================== 表示テキストのレンダリング ====================
function renderDisplayText() {
  const chars = state.targetChars;
  const fragment = document.createDocumentFragment();

  chars.forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch;
    span.classList.add('char');

    if (i < state.currentCharIndex) {
      span.classList.add('correct');
    } else if (i === state.currentCharIndex) {
      span.classList.add('current');
    } else {
      span.classList.add('pending');
    }
    fragment.appendChild(span);
  });

  dom.displayText.innerHTML = '';
  dom.displayText.appendChild(fragment);
}

function markIncorrect(index) {
  const spans = dom.displayText.querySelectorAll('.char');
  if (spans[index]) {
    spans[index].classList.remove('current', 'pending');
    spans[index].classList.add('incorrect', 'current');
  }
}

function updateRomajiHint() {
  if (state.mode !== 'kana') {
    dom.romajiHint.textContent = '';
    return;
  }
  const remaining = state.targetChars.slice(state.currentCharIndex).join('');
  if (!remaining) {
    dom.romajiHint.textContent = '';
    return;
  }
  // かなの場合、次の数文字のローマ字ヒントを表示
  // かな→ローマ字の逆引きは簡易的に行う
  const nextKana = remaining.slice(0, 5);
  const hint = kanaToRomajiHint(nextKana);
  dom.romajiHint.textContent = hint ? `ローマ字: ${hint}...` : '';
}

// かな→ローマ字の簡易ヒント生成
function kanaToRomajiHint(kana) {
  const kanaRomajiMap = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'nn',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'っ': 'tt', 'ー': '-', '　': ' ',
  };
  let result = '';
  for (const ch of kana) {
    result += kanaRomajiMap[ch] || ch;
  }
  return result;
}

// ==================== ゲームフロー ====================
function startGame() {
  if (state.isRunning) return;
  prepareTexts();
  resetStats();
  loadCurrentText();
  state.isRunning = true;
  state.isFinished = false;
  state.startTime = null; // 最初のキーストロークで開始
  dom.typingInput.disabled = false;
  dom.typingInput.value = '';
  dom.typingInput.placeholder = '入力を開始してください...';
  dom.typingInput.focus();
  dom.startBtn.textContent = '練習中...';
  dom.startBtn.disabled = true;
  updateBestScoreDisplay();
}

function resetGame() {
  clearInterval(state.timerInterval);
  state.isRunning = false;
  state.isFinished = false;
  state.startTime = null;
  resetStats();
  dom.typingInput.disabled = true;
  dom.typingInput.value = '';
  dom.typingInput.placeholder = 'ここに入力してください（スタートボタンで開始）';
  dom.startBtn.textContent = 'スタート';
  dom.startBtn.disabled = false;
  dom.wpm.textContent = '0';
  dom.accuracy.textContent = '100%';
  dom.elapsed.textContent = '00:00';
  dom.progressBar.style.width = '0%';
  dom.displayText.innerHTML = '';
  dom.romajiHint.textContent = '';
  dom.resultModal.hidden = true;
  updateBestScoreDisplay();
}

function resetStats() {
  state.typedCount = 0;
  state.mistakeCount = 0;
  state.totalKeystrokes = 0;
  state.currentCharIndex = 0;
  state.inputBuffer = '';
}

function startTimer() {
  state.startTime = Date.now();
  state.timerInterval = setInterval(updateStats, 200);
}

function updateStats() {
  if (!state.startTime) return;
  const elapsed = (Date.now() - state.startTime) / 1000;

  // 経過時間
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  dom.elapsed.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // WPM計算（文字数/5 を単語とみなす国際標準）
  const wpm = elapsed > 0 ? Math.round((state.typedCount / 5) / (elapsed / 60)) : 0;
  dom.wpm.textContent = wpm;

  // 正確率
  const accuracy = state.totalKeystrokes > 0
    ? Math.round(((state.totalKeystrokes - state.mistakeCount) / state.totalKeystrokes) * 100)
    : 100;
  dom.accuracy.textContent = `${accuracy}%`;

  // 進捗
  const total = state.targetChars.length;
  const progress = total > 0 ? (state.currentCharIndex / total) * 100 : 0;
  dom.progressBar.style.width = `${progress}%`;
}

// ==================== 入力処理 ====================
dom.typingInput.addEventListener('input', handleInput);
dom.typingInput.addEventListener('keydown', handleKeydown);

function handleKeydown(e) {
  // IMEによる入力を無視（isComposing）
  if (e.isComposing || e.keyCode === 229) return;

  // Backspaceを無効化（削除禁止）— ただしかなモードはIME経由のため除外
  if (e.key === 'Backspace' && state.mode !== 'kana') {
    e.preventDefault();
    return;
  }
}

function handleInput(e) {
  if (!state.isRunning || state.isFinished) return;
  if (e.isComposing) return;

  // 最初のキーストロークでタイマー開始
  if (!state.startTime) {
    startTimer();
  }

  const inputVal = dom.typingInput.value;
  if (!inputVal) return;

  // 入力された最後の文字を取得
  const inputChar = inputVal.slice(-1);
  dom.typingInput.value = ''; // 常にクリア

  processChar(inputChar);
}

function processChar(inputChar) {
  const mode = state.mode;

  if (mode === 'english') {
    processEnglishChar(inputChar);
  } else if (mode === 'romaji') {
    processRomajiChar(inputChar);
  } else if (mode === 'kana') {
    processKanaChar(inputChar);
  }
}

// --- 英語モード ---
function processEnglishChar(ch) {
  if (state.currentCharIndex >= state.targetChars.length) return;

  state.totalKeystrokes++;
  const expected = state.targetChars[state.currentCharIndex];

  if (ch === expected) {
    state.typedCount++;
    state.currentCharIndex++;
    renderDisplayText();
    updateRomajiHint();
    checkCompletion();
  } else {
    state.mistakeCount++;
    markIncorrect(state.currentCharIndex);
    triggerShake();
    updateStats();
  }
}

// --- ローマ字モード（日本語テキストをローマ字で入力） ---
function processRomajiChar(ch) {
  if (state.currentCharIndex >= state.targetChars.length) return;

  // ローマ字はすべて英小文字で処理
  const lch = ch.toLowerCase();
  state.inputBuffer += lch;
  state.totalKeystrokes++;

  // バッファからかなを変換試行
  const converted = romajiToKana(state.inputBuffer);
  const expected = state.targetChars[state.currentCharIndex];

  if (converted === expected) {
    // 完全一致
    state.typedCount += state.inputBuffer.length;
    state.inputBuffer = '';
    state.currentCharIndex++;
    renderDisplayText();
    updateRomajiHint();
    checkCompletion();
  } else if (expected.startsWith(converted) || isRomajiPrefixOf(state.inputBuffer, expected)) {
    // まだ入力途中（部分一致OK）
    // バッファをそのまま保持
  } else {
    // ミス
    state.mistakeCount++;
    state.inputBuffer = '';
    markIncorrect(state.currentCharIndex);
    triggerShake();
    updateStats();
  }
}

// ローマ字バッファが期待するかなの前置詞になっているか確認
function isRomajiPrefixOf(buffer, kana) {
  for (const [roman, k] of ROMAJI_TABLE) {
    if (k === kana && roman.startsWith(buffer)) return true;
  }
  return false;
}

// --- かなモード（直接かなで入力） ---
// かなモードではIMEを使わず、テキストのひらがなをローマ字ボタンで対応させる
// ただしかな入力キーボードは環境依存のため、かなモードでは
// キーボードから直接ひらがなを入力できる場合のみ有効
// 実用的な実装として: かなテキストをIME経由で入力させる
function processKanaChar(ch) {
  if (state.currentCharIndex >= state.targetChars.length) return;

  state.totalKeystrokes++;
  const expected = state.targetChars[state.currentCharIndex];

  if (ch === expected) {
    state.typedCount++;
    state.currentCharIndex++;
    renderDisplayText();
    updateRomajiHint();
    checkCompletion();
  } else {
    state.mistakeCount++;
    markIncorrect(state.currentCharIndex);
    triggerShake();
    updateStats();
  }
}

// ==================== 完了チェック ====================
function checkCompletion() {
  updateStats();
  if (state.currentCharIndex >= state.targetChars.length) {
    // テキスト完了
    state.currentTextIndex++;
    if (state.currentTextIndex >= state.texts.length) {
      // 全テキスト完了
      finishSession();
    } else {
      // 次のテキストへ
      loadCurrentText();
    }
  }
}

function finishSession() {
  clearInterval(state.timerInterval);
  state.isRunning = false;
  state.isFinished = true;
  dom.typingInput.disabled = true;
  dom.startBtn.textContent = 'スタート';
  dom.startBtn.disabled = false;

  const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 1;
  const wpm = Math.round((state.typedCount / 5) / (elapsed / 60));
  const accuracy = state.totalKeystrokes > 0
    ? Math.round(((state.totalKeystrokes - state.mistakeCount) / state.totalKeystrokes) * 100)
    : 100;

  showResult(wpm, accuracy, state.mistakeCount, elapsed);
}

// ==================== 結果モーダル ====================
function getRank(wpm) {
  if (wpm >= 80) return 'S';
  if (wpm >= 60) return 'A';
  if (wpm >= 40) return 'B';
  if (wpm >= 20) return 'C';
  return 'D';
}

function getRankColor(rank) {
  const colors = { S: '#f59e0b', A: '#22863a', B: '#2c7be5', C: '#8b5cf6', D: '#888' };
  return colors[rank] || '#888';
}

function showResult(wpm, accuracy, mistakes, elapsed) {
  const rank = getRank(wpm);
  const isNewBest = saveBestScore(wpm);

  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);

  dom.rankDisplay.textContent = rank;
  dom.rankDisplay.style.color = getRankColor(rank);
  dom.resultWpm.textContent = wpm;
  dom.resultAccuracy.textContent = `${accuracy}%`;
  dom.resultMistakes.textContent = mistakes;
  dom.resultTime.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  dom.newBest.hidden = !isNewBest;
  dom.resultModal.hidden = false;

  updateBestScoreDisplay();
}

// ==================== UIヘルパー ====================
function triggerShake() {
  dom.typingInput.classList.remove('input-error');
  // reflow を強制してアニメーションをリセット
  void dom.typingInput.offsetWidth;
  dom.typingInput.classList.add('input-error');
  setTimeout(() => dom.typingInput.classList.remove('input-error'), 300);
}

// ==================== イベントリスナー ====================

// モード切り替え
dom.modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // 練習中はリセットしてから切り替え
    if (state.isRunning) {
      resetGame();
    }
    dom.modeTabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    state.mode = tab.dataset.mode;

    // カテゴリをモードに合わせて変更
    if (state.mode === 'english') {
      updateCategoryForMode('english');
    } else {
      updateCategoryForMode('japanese');
    }

    updateBestScoreDisplay();
  });
});

function updateCategoryForMode(lang) {
  const options = dom.categorySelect.options;
  for (const opt of options) {
    if (lang === 'english' && opt.value.startsWith('english-')) {
      dom.categorySelect.value = opt.value;
      state.category = opt.value;
      break;
    } else if (lang === 'japanese' && opt.value.startsWith('japanese-')) {
      dom.categorySelect.value = opt.value;
      state.category = opt.value;
      break;
    }
  }
}

// カテゴリ変更
dom.categorySelect.addEventListener('change', () => {
  // 練習中はリセットしてから切り替え
  if (state.isRunning) {
    resetGame();
  }
  state.category = dom.categorySelect.value;

  // カテゴリに合わせてモードを切り替え
  const isJapanese = state.category.startsWith('japanese-');
  if (isJapanese && state.mode === 'english') {
    activateMode('romaji');
  } else if (!isJapanese && state.mode !== 'english') {
    activateMode('english');
  }

  updateBestScoreDisplay();
});

function activateMode(mode) {
  dom.modeTabs.forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
    if (t.dataset.mode === mode) {
      t.classList.add('active');
      t.setAttribute('aria-selected', 'true');
    }
  });
  state.mode = mode;
}

// スタートボタン
dom.startBtn.addEventListener('click', startGame);

// リセットボタン
dom.resetBtn.addEventListener('click', resetGame);

// モーダル: もう一度
dom.retryBtn.addEventListener('click', () => {
  dom.resultModal.hidden = true;
  startGame();
});

// モーダル: 閉じる
dom.closeModalBtn.addEventListener('click', () => {
  dom.resultModal.hidden = true;
  resetGame();
});

// Escキーでモーダルを閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dom.resultModal.hidden) {
    dom.resultModal.hidden = true;
    resetGame();
  }
});

// ==================== 初期化 ====================
function init() {
  state.mode = 'english';
  state.category = 'english-basic';
  updateBestScoreDisplay();
  dom.displayText.innerHTML = '<span style="color:#aaa;font-size:1rem;">① モード・テキストを選ぶ &nbsp;→&nbsp; ② スタートボタンを押す &nbsp;→&nbsp; ③ タイピング開始！</span>';
}

init();
