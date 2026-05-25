'use strict';

// ===== CONSTANTS =====
const STORAGE_KEY = 'quiz-tool-weak-map';
const SAMPLE_CSV = `問題文,選択肢A,選択肢B,選択肢C,選択肢D,正解,解説
"【ITパスポート】CPUの性能を表す単位として適切なものはどれか。",MHz,GB,dpi,lm,A,"MHzはクロック周波数の単位でCPUの処理速度を表す。GBはメモリ・ストレージ容量の単位。"
"【ITパスポート】OSの役割として適切なものはどれか。",数値計算,ハードウェア管理,データ暗号化,ネットワーク監視,B,"OSはハードウェアとソフトウェアを仲介し、プロセス・メモリ・入出力などの資源管理を行う。"
"【ITパスポート】ランサムウェアの説明として適切なものはどれか。",個人情報を盗むソフトウェア,ファイルを暗号化して身代金を要求するマルウェア,広告を強制表示するプログラム,CPUを過負荷にするウイルス,B,"ランサムウェアはファイルを暗号化し、復号と引き換えに金銭を要求する悪意あるソフトウェア。"
"【FP3級】生命保険の保険料のうち、保険会社の経費に充てられる部分を何というか。",純保険料,付加保険料,特約保険料,割増保険料,B,"付加保険料は保険会社の運営経費（代理店手数料・人件費など）に充てられる部分。純保険料は保険金支払いに充てられる部分。"
"【FP3級】全期前納払いの説明として正しいものはどれか。",保険料を一括して前払いし、保険会社が預かる方式,毎月口座から自動引き落としされる方式,保険料を割引して一時払いする方式,保険料を年2回まとめて支払う方式,A,"全期前納払いは残りの全保険料を保険会社に預け、毎回の支払日に充当していく方式。一時払いとは異なる。"
"【宅建】宅地建物取引業を営むには原則として何が必要か。",国土交通大臣または都道府県知事の免許,法務局への登記,市区町村長への届出,宅地建物取引士の資格のみ,A,"宅地建物取引業を営む者は、国土交通大臣または都道府県知事の免許を受ける必要がある（宅建業法第3条）。"
"【宅建】媒介契約のうち、依頼者が他の業者に重ねて依頼できない契約を何というか。",一般媒介契約,専任媒介契約,専属専任媒介契約,委任媒介契約,C,"専属専任媒介契約は他業者への依頼を禁止し、自己発見取引も不可。専任媒介契約は他業者への依頼が不可だが自己発見取引は可能。"
`;

// ===== STATE =====
let questions = [];     // 全問題
let session = [];       // 現在セッションの出題リスト
let sessionIdx = 0;     // セッション内の現在インデックス
let correct = 0;        // 正解数
let weakMap = {};       // { questionHash: missCount }
let answered = false;   // 現在問題の回答済みフラグ

// ===== DOM REFERENCES =====
const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const sampleDlBtn    = document.getElementById('sample-download-btn');
const fileInfo       = document.getElementById('file-info');
const fileNameDisp   = document.getElementById('file-name-display');
const qCountDisp     = document.getElementById('question-count-display');
const modeSettings   = document.getElementById('mode-settings');
const modeSelect     = document.getElementById('mode-select');
const startBtn       = document.getElementById('start-btn');

const importSection  = document.getElementById('import-section');
const quizSection    = document.getElementById('quiz-section');
const resultSection  = document.getElementById('result-section');

const progressFill   = document.getElementById('progress-fill');
const questionCounter= document.getElementById('question-counter');
const scoreDisplay   = document.getElementById('score-display');
const questionText   = document.getElementById('question-text');
const choiceBtns     = Array.from(document.querySelectorAll('.choice-btn'));
const feedbackArea   = document.getElementById('feedback-area');
const feedbackText   = document.getElementById('feedback-text');
const explanationText= document.getElementById('explanation-text');
const nextBtn        = document.getElementById('next-btn');

const finalScoreNum  = document.getElementById('final-score-num');
const finalDetail    = document.getElementById('final-detail');
const weakListArea   = document.getElementById('weak-list-area');
const weakList       = document.getElementById('weak-list');
const retryBtn       = document.getElementById('retry-btn');
const retryWeakBtn   = document.getElementById('retry-weak-btn');
const backImportBtn  = document.getElementById('back-import-btn');

// ===== INIT =====
loadWeakMap();
bindEvents();

// ===== EVENT BINDING =====
function bindEvents() {
  // Drag & Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });
  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput && !e.target.classList.contains('file-btn')) {
      fileInput.click();
    }
  });

  // File input
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
    fileInput.value = '';
  });

  // Sample CSV download
  sampleDlBtn.addEventListener('click', downloadSampleCSV);

  // Start quiz
  startBtn.addEventListener('click', startQuiz);

  // Choice buttons
  choiceBtns.forEach((btn) => {
    btn.addEventListener('click', () => onChoiceClick(btn.dataset.key));
  });

  // Next question
  nextBtn.addEventListener('click', nextQuestion);

  // Result actions
  retryBtn.addEventListener('click', () => startQuizWithMode(modeSelect.value));
  retryWeakBtn.addEventListener('click', () => startQuizWithMode('weak'));
  backImportBtn.addEventListener('click', () => {
    showSection('import');
  });
}

// ===== FILE HANDLING =====
function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let parsed = [];
      if (ext === 'json') {
        parsed = parseJSON(e.target.result);
      } else {
        parsed = parseCSV(e.target.result);
      }
      if (parsed.length === 0) {
        alert('問題が1問も読み込めませんでした。フォーマットを確認してください。');
        return;
      }
      questions = parsed;
      fileNameDisp.textContent = file.name;
      qCountDisp.textContent = `(${questions.length}問)`;
      fileInfo.hidden = false;
      modeSettings.hidden = false;
    } catch (err) {
      alert('ファイルの読み込みに失敗しました。\n' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

// ===== CSV PARSER =====
function parseCSV(text) {
  const lines = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);

  const rows = lines.map((line) => splitCSVLine(line));
  // Skip header
  const data = rows.slice(1).filter((r) => r.length >= 6 && r[0].trim());
  const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);
  const invalidRows = [];
  const parsed = data.map((r, i) => {
    const answer = r[5].trim().toUpperCase();
    if (!VALID_ANSWERS.has(answer)) {
      invalidRows.push(`行${i + 2}: "${r[0].trim().slice(0, 20)}…" (正解列="${r[5].trim()}")`);
    }
    return {
      question: r[0].trim(),
      choices: {
        A: r[1].trim(),
        B: r[2].trim(),
        C: r[3].trim(),
        D: r[4].trim(),
      },
      answer,
      explanation: r[6] ? r[6].trim() : '',
    };
  }).filter((q) => VALID_ANSWERS.has(q.answer));
  if (invalidRows.length > 0) {
    alert(`以下の行は正解列がA〜D以外のためスキップしました:\n${invalidRows.slice(0, 5).join('\n')}${invalidRows.length > 5 ? `\n…他${invalidRows.length - 5}件` : ''}`);
  }
  return parsed;
}

function splitCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ===== JSON PARSER =====
function parseJSON(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('JSONはオブジェクトの配列である必要があります');
  const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);
  return data.map((item) => ({
    question: String(item.question || item.問題文 || ''),
    choices: {
      A: String(item.A || item.選択肢A || ''),
      B: String(item.B || item.選択肢B || ''),
      C: String(item.C || item.選択肢C || ''),
      D: String(item.D || item.選択肢D || ''),
    },
    answer: String(item.answer || item.正解 || '').toUpperCase(),
    explanation: String(item.explanation || item.解説 || ''),
  })).filter((q) => q.question && VALID_ANSWERS.has(q.answer));
}

// ===== SAMPLE CSV DOWNLOAD =====
function downloadSampleCSV() {
  const bom = '﻿';
  const blob = new Blob([bom + SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-quiz.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== QUIZ LOGIC =====
function startQuiz() {
  startQuizWithMode(modeSelect.value);
}

function startQuizWithMode(mode) {
  session = buildSession(mode);
  sessionIdx = 0;
  correct = 0;
  showSection('quiz');
  renderQuestion();
}

function buildSession(mode) {
  if (mode === 'sequential') {
    return [...questions];
  }
  if (mode === 'weak') {
    const weakQs = questions.filter((q) => getWeakCount(q) > 0);
    const others = questions.filter((q) => getWeakCount(q) === 0);
    if (weakQs.length === 0) {
      alert('苦手問題がまだ記録されていません。ランダムモードで学習します。');
      return shuffle([...questions]);
    }
    // 苦手を先頭にして残りをランダム
    return [...shuffle(weakQs), ...shuffle(others)];
  }
  // random (default)
  return shuffle([...questions]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderQuestion() {
  const q = session[sessionIdx];
  answered = false;

  // Progress
  const pct = Math.round((sessionIdx / session.length) * 100);
  progressFill.style.width = pct + '%';
  progressFill.setAttribute('aria-valuenow', pct);

  // Meta
  questionCounter.textContent = `問題 ${sessionIdx + 1} / ${session.length}`;
  const rate = sessionIdx === 0 ? '--' : Math.round((correct / sessionIdx) * 100) + '%';
  scoreDisplay.textContent = `正解率 ${rate}`;

  // Question
  questionText.textContent = q.question;

  // Choices
  choiceBtns.forEach((btn) => {
    const key = btn.dataset.key;
    btn.className = 'choice-btn';
    btn.disabled = false;
    btn.innerHTML = `<span class="choice-key">${key}</span><span class="choice-label">${escapeHtml(q.choices[key])}</span>`;
  });

  // Hide feedback
  feedbackArea.hidden = true;
  feedbackText.className = 'feedback-text';
}

function onChoiceClick(key) {
  if (answered) return;
  answered = true;

  const q = session[sessionIdx];
  const isCorrect = key === q.answer;

  if (isCorrect) {
    correct++;
  } else {
    markWeak(q);
  }

  // Style buttons
  choiceBtns.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.key === q.answer) {
      btn.classList.add('correct');
    } else if (btn.dataset.key === key && !isCorrect) {
      btn.classList.add('wrong');
    }
  });

  // Feedback
  feedbackText.textContent = isCorrect ? '正解！' : `不正解 — 正解は ${q.answer}`;
  feedbackText.className = 'feedback-text ' + (isCorrect ? 'correct-msg' : 'wrong-msg');
  explanationText.textContent = q.explanation || '';
  feedbackArea.hidden = false;

  // Update score display immediately
  const rate = Math.round((correct / (sessionIdx + 1)) * 100);
  scoreDisplay.textContent = `正解率 ${rate}%`;

  // Last question: change button label
  if (sessionIdx === session.length - 1) {
    nextBtn.textContent = '結果を見る';
  } else {
    nextBtn.textContent = '次の問題 →';
  }
}

function nextQuestion() {
  sessionIdx++;
  if (sessionIdx >= session.length) {
    showResult();
  } else {
    renderQuestion();
  }
}

// ===== RESULT =====
function showResult() {
  showSection('result');

  const total = session.length;
  const rate = Math.round((correct / total) * 100);
  finalScoreNum.textContent = rate + '%';
  finalDetail.textContent = `${correct} / ${total} 問正解`;

  // Weak list
  const weakQs = questions.filter((q) => getWeakCount(q) > 0);
  if (weakQs.length > 0) {
    weakList.innerHTML = '';
    weakQs.slice(0, 20).forEach((q) => {
      const li = document.createElement('li');
      li.textContent = q.question;
      weakList.appendChild(li);
    });
    weakListArea.hidden = false;
    retryWeakBtn.hidden = false;
  } else {
    weakListArea.hidden = true;
    retryWeakBtn.hidden = true;
  }

  // Progress bar to 100%
  progressFill.style.width = '100%';
  progressFill.setAttribute('aria-valuenow', 100);
}

// ===== SECTION SWITCHER =====
function showSection(name) {
  importSection.hidden = name !== 'import';
  quizSection.hidden   = name !== 'quiz';
  resultSection.hidden = name !== 'result';
}

// ===== WEAK MAP (localStorage) =====
function loadWeakMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    weakMap = raw ? JSON.parse(raw) : {};
  } catch (e) {
    weakMap = {};
  }
}

function saveWeakMap() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weakMap));
  } catch (e) {
    // ストレージが使えない場合は無視
  }
}

function questionHash(q) {
  // 問題文の先頭60文字をキーとして使用
  return q.question.slice(0, 60);
}

function getWeakCount(q) {
  return weakMap[questionHash(q)] || 0;
}

function markWeak(q) {
  const key = questionHash(q);
  weakMap[key] = (weakMap[key] || 0) + 1;
  saveWeakMap();
}

// ===== UTILITY =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
