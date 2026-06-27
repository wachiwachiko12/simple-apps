/**
 * パスワード強度チェック・生成ツール — script.js
 * - 強度評価: zxcvbn.js
 * - パスワード生成: Web Crypto API
 */

'use strict';

// ===== 定数 =====
const STRENGTH_LABELS = ['非常に弱い', '弱い', '普通', '強い', '非常に強い'];
const STRENGTH_SCORE_CLASSES = ['score-0', 'score-1', 'score-2', 'score-3', 'score-4'];

const CRACK_TIME_MAP = {
  'less than a second':      '数秒以内',
  'less than a minute':      '1分以内',
  'less than an hour':       '1時間以内',
  'less than a day':         '1日以内',
  'less than a month':       '1ヶ月以内',
  'less than a year':        '1年以内',
  'centuries':               '数百年以上',
};

const ZXCVBN_SUGGESTION_MAP = {
  'Add another word or two. Uncommon words are better.':          'もう1〜2単語追加するか、一般的でない言葉を使いましょう。',
  'Use a longer keyboard pattern with more turns':                 'キーボードのパターンをより複雑にしましょう。',
  'Avoid repeated words and characters':                          '単語や文字の繰り返しを避けましょう。',
  'Avoid sequences':                                              '連続した文字（abc、123など）を避けましょう。',
  'Avoid recent years':                                           '最近の年号を使わないようにしましょう。',
  'Avoid years that are associated with you':                     '自分に関係する年号を使わないようにしましょう。',
  'Avoid dates and years that are associated with you':           '自分に関係する日付・年号を使わないようにしましょう。',
  "Capitalization doesn't help very much":                        '先頭を大文字にするだけではあまり効果がありません。',
  'All-uppercase is almost as easy to guess as all-lowercase':    '全大文字は全小文字とほぼ同じ強度です。',
  "Reversed words aren't much harder to guess":                   '逆順にした単語はあまり強くなりません。',
  "Predictable substitutions like '@' instead of 'a' don't help very much": '記号への予測可能な置き換え（@ → a など）はあまり効果がありません。',
  'Use a few words, avoiding common phrases':                     '一般的なフレーズを避け、複数の単語を組み合わせましょう。',
  'No need for symbols, digits, or uppercase letters':            '十分な長さがあれば、記号・数字・大文字がなくても強いパスワードになります。',
};

const CHAR_SETS = {
  upper:  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:  'abcdefghijklmnopqrstuvwxyz',
  number: '0123456789',
  symbol: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

// ===== DOM =====
const passwordInput    = document.getElementById('password-input');
const toggleVisibility = document.getElementById('toggle-visibility');
const toggleIcon       = document.getElementById('toggle-icon');
const strengthBadge    = document.getElementById('strength-badge');
const strengthTime     = document.getElementById('strength-time');
const adviceList       = document.getElementById('advice-list');
const strengthSegments = document.querySelectorAll('.strength-segment');

const lengthSlider     = document.getElementById('length-slider');
const lengthDisplay    = document.getElementById('length-display');
const useUpper         = document.getElementById('use-upper');
const useLower         = document.getElementById('use-lower');
const useNumber        = document.getElementById('use-number');
const useSymbol        = document.getElementById('use-symbol');
const btnGenerate      = document.getElementById('btn-generate');
const generatedPwd     = document.getElementById('generated-password');
const btnCopy          = document.getElementById('btn-copy');
const copyIcon         = document.getElementById('copy-icon');
const copyText         = document.getElementById('copy-text');

// ===== 強度チェック =====

/**
 * zxcvbn の crack_times_display を日本語に変換する
 */
function translateCrackTime(raw) {
  if (!raw) return '';
  for (const [en, ja] of Object.entries(CRACK_TIME_MAP)) {
    if (raw.includes(en)) return ja;
  }
  // fallback: そのまま
  return raw;
}

/**
 * 改善アドバイスを生成する
 */
function buildAdvice(password, result) {
  const suggestions = [];

  if (!password) return suggestions;

  if (password.length < 8) {
    suggestions.push('8文字以上にしてください（推奨: 12文字以上）');
  } else if (password.length < 12) {
    suggestions.push('12文字以上にするとより安全です');
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('大文字 (A-Z) を追加してください');
  }
  if (!/[a-z]/.test(password)) {
    suggestions.push('小文字 (a-z) を追加してください');
  }
  if (!/[0-9]/.test(password)) {
    suggestions.push('数字 (0-9) を追加してください');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    suggestions.push('記号 (!@#$%^&* など) を追加してください');
  }

  // zxcvbn からの suggestions（日本語に変換）
  if (result && result.feedback && result.feedback.suggestions) {
    for (const s of result.feedback.suggestions) {
      const ja = ZXCVBN_SUGGESTION_MAP[s] || null;
      if (ja && !suggestions.includes(ja)) {
        suggestions.push(ja);
      }
    }
  }

  return suggestions;
}

/**
 * 強度メーターを更新する
 */
function updateMeter(score) {
  strengthSegments.forEach((seg, i) => {
    seg.className = 'strength-segment';
    if (i <= score) {
      seg.classList.add(`active-${score}`);
    }
  });
}

/**
 * 強度チェック処理本体
 */
function checkStrength(password) {
  // 空の場合はリセット
  if (!password) {
    strengthBadge.textContent = 'パスワードを入力してください';
    strengthBadge.className = 'strength-badge';
    strengthTime.textContent = '';
    adviceList.innerHTML = '';
    strengthSegments.forEach(seg => {
      seg.className = 'strength-segment';
    });
    return;
  }

  const result = zxcvbn(password);
  const score  = result.score; // 0〜4

  // メーター更新
  updateMeter(score);

  // バッジ更新
  strengthBadge.textContent = STRENGTH_LABELS[score];
  strengthBadge.className   = `strength-badge ${STRENGTH_SCORE_CLASSES[score]}`;

  // 解読時間
  const rawTime = result.crack_times_display
    ? result.crack_times_display.offline_slow_hashing_1e4_per_second
    : '';
  const jaTime = translateCrackTime(rawTime);
  strengthTime.textContent = jaTime ? `解読時間の目安: ${jaTime}` : '';

  // アドバイス
  const suggestions = buildAdvice(password, result);
  if (suggestions.length === 0 || score === 4) {
    adviceList.innerHTML = '';
    return;
  }

  adviceList.innerHTML = suggestions
    .map(s => `<div class="advice-item"><i class="bi bi-exclamation-circle-fill"></i><span>${s}</span></div>`)
    .join('');
}

// ===== パスワード生成 =====

/**
 * Web Crypto API を使って安全なランダムパスワードを生成する
 */
function generatePassword() {
  const length = parseInt(lengthSlider.value, 10);

  const charPool = [
    useUpper.checked  ? CHAR_SETS.upper  : '',
    useLower.checked  ? CHAR_SETS.lower  : '',
    useNumber.checked ? CHAR_SETS.number : '',
    useSymbol.checked ? CHAR_SETS.symbol : '',
  ].join('');

  if (!charPool) {
    alert('文字の種類を1つ以上選択してください。');
    return null;
  }

  // 各文字種から最低1文字ずつ確保（選択済みの場合）
  const required = [];
  if (useUpper.checked)  required.push(randomChar(CHAR_SETS.upper));
  if (useLower.checked)  required.push(randomChar(CHAR_SETS.lower));
  if (useNumber.checked) required.push(randomChar(CHAR_SETS.number));
  if (useSymbol.checked) required.push(randomChar(CHAR_SETS.symbol));

  // 残りをランダムに埋める
  const remaining = length - required.length;
  const extra = [];
  for (let i = 0; i < remaining; i++) {
    extra.push(randomChar(charPool));
  }

  // シャッフル
  const all = [...required, ...extra];
  shuffleArray(all);

  return all.join('');
}

/**
 * 暗号学的乱数で文字列から1文字選ぶ
 */
function randomChar(chars) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return chars[array[0] % chars.length];
}

/**
 * Fisher-Yates シャッフル（Crypto API使用）
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const randomArr = new Uint32Array(1);
    window.crypto.getRandomValues(randomArr);
    const j = randomArr[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ===== スライダー動的グラデーション更新 =====
function updateSliderBackground(slider) {
  const min = parseInt(slider.min, 10);
  const max = parseInt(slider.max, 10);
  const val = parseInt(slider.value, 10);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
}

// ===== コピー処理 =====
let copyTimeout = null;

function copyToClipboard(text) {
  if (!text || text === 'ボタンを押して生成してください') return;

  navigator.clipboard.writeText(text).then(() => {
    btnCopy.classList.add('copied');
    copyIcon.className = 'bi bi-check-lg';
    copyText.textContent = 'コピーしました！';

    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      btnCopy.classList.remove('copied');
      copyIcon.className = 'bi bi-clipboard';
      copyText.textContent = 'コピー';
    }, 2000);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);

    copyIcon.className = 'bi bi-check-lg';
    copyText.textContent = 'コピーしました！';
    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copyIcon.className = 'bi bi-clipboard';
      copyText.textContent = 'コピー';
    }, 2000);
  });
}

// ===== イベント登録 =====
document.addEventListener('DOMContentLoaded', () => {

  // 初期スライダーグラデーション
  updateSliderBackground(lengthSlider);

  // パスワード入力 → リアルタイム強度チェック
  passwordInput.addEventListener('input', () => {
    checkStrength(passwordInput.value);
  });

  // 表示/非表示トグル
  toggleVisibility.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  // スライダー変更
  lengthSlider.addEventListener('input', () => {
    lengthDisplay.textContent = lengthSlider.value;
    updateSliderBackground(lengthSlider);
  });

  // パスワード生成ボタン
  btnGenerate.addEventListener('click', () => {
    const pwd = generatePassword();
    if (!pwd) return;

    generatedPwd.textContent = pwd;

    // 強度チェックに自動反映
    passwordInput.value = pwd;
    checkStrength(pwd);
  });

  // コピーボタン
  btnCopy.addEventListener('click', () => {
    copyToClipboard(generatedPwd.textContent.trim());
  });
});
