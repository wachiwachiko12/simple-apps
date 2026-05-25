'use strict';

// ===== SM-2 アルゴリズム =====
function sm2(card, quality) {
  // quality: 0=もう一度, 3=難しい, 4=普通, 5=簡単
  if (quality < 3) {
    card.repetitions = 0;
    card.interval = 1;
  } else {
    if (card.repetitions === 0) card.interval = 1;
    else if (card.repetitions === 1) card.interval = 6;
    else card.interval = Math.round(card.interval * card.easeFactor);
    card.repetitions++;
  }
  card.easeFactor = Math.max(
    1.3,
    card.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );
  card.nextReview = Date.now() + card.interval * 86400000;
  return card;
}

// ===== データモデル =====
const STORAGE_KEY = 'flashcard_data_v1';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { decks: [] };
  } catch {
    return { decks: [] };
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 容量超過時は無視
  }
}

function createDeck(name) {
  return {
    id: 'deck_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name,
    cards: [],
    createdAt: Date.now()
  };
}

function createCard(front, back) {
  return {
    id: 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    front,
    back,
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReview: 0, // 0 = 新規（即座に出題）
    createdAt: Date.now()
  };
}

// ===== カードステータス判定 =====
function getCardStatus(card) {
  if (card.repetitions === 0 && card.nextReview === 0) return 'new';
  if (card.repetitions >= 3 && card.interval >= 21) return 'mastered';
  return 'learning';
}

function isDueToday(card) {
  return card.nextReview <= Date.now();
}

function getDueCards(deck) {
  return deck.cards.filter(c => isDueToday(c));
}

// ===== アプリ状態 =====
let appData = loadData();
let currentDeckId = null;
let currentDeck = null;
let studyQueue = [];
let studyIndex = 0;
let sessionStats = { again: 0, hard: 0, good: 0, easy: 0 };

// ===== DOM 参照 =====
const views = {
  decks: document.getElementById('deck-view'),
  manage: document.getElementById('card-manage-view'),
  study: document.getElementById('study-view'),
  complete: document.getElementById('complete-view')
};

// デッキ一覧
const btnNewDeck = document.getElementById('btn-new-deck');
const newDeckForm = document.getElementById('new-deck-form');
const newDeckNameInput = document.getElementById('new-deck-name');
const btnCreateDeck = document.getElementById('btn-create-deck');
const btnCancelDeck = document.getElementById('btn-cancel-deck');
const deckListEl = document.getElementById('deck-list');
const noDecksMsgEl = document.getElementById('no-decks-msg');

// カード管理
const btnBackToDecks = document.getElementById('btn-back-to-decks');
const manageDeckTitle = document.getElementById('manage-deck-title');
const btnStartStudy = document.getElementById('btn-start-study');
const cardFrontInput = document.getElementById('card-front');
const cardBackInput = document.getElementById('card-back');
const btnAddCard = document.getElementById('btn-add-card');
const cardListEl = document.getElementById('card-list');
const noCardsMsgEl = document.getElementById('no-cards-msg');
const cardCountBadge = document.getElementById('card-count-badge');
const csvFileInput = document.getElementById('csv-file');
const btnExportCsv = document.getElementById('btn-export-csv');
const csvMsg = document.getElementById('csv-msg');

// 統計バー
const segNew = document.getElementById('seg-new');
const segLearning = document.getElementById('seg-learning');
const segMastered = document.getElementById('seg-mastered');
const countNew = document.getElementById('count-new');
const countLearning = document.getElementById('count-learning');
const countMastered = document.getElementById('count-mastered');

// 学習画面
const btnBackToManage = document.getElementById('btn-back-to-manage');
const studyDeckTitle = document.getElementById('study-deck-title');
const studyProgress = document.getElementById('study-progress');
const flashcard = document.getElementById('flashcard');
const cardFrontText = document.getElementById('card-front-text');
const cardBackText = document.getElementById('card-back-text');
const revealArea = document.getElementById('reveal-area');
const btnReveal = document.getElementById('btn-reveal');
const ratingArea = document.getElementById('rating-area');

// 完了画面
const btnStudyAgain = document.getElementById('btn-study-again');
const btnBackFromComplete = document.getElementById('btn-back-from-complete');

// ===== ビュー切り替え =====
function showView(name) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
}

// ===== デッキ一覧レンダリング =====
function renderDeckList() {
  deckListEl.innerHTML = '';
  const decks = appData.decks;

  if (decks.length === 0) {
    noDecksMsgEl.classList.remove('hidden');
    return;
  }
  noDecksMsgEl.classList.add('hidden');

  decks.forEach(deck => {
    const due = getDueCards(deck).length;
    const total = deck.cards.length;

    const el = document.createElement('div');
    el.className = 'deck-card';
    el.setAttribute('role', 'listitem');

    const todayBadgeHtml = due > 0
      ? `<span class="today-badge" aria-label="今日${due}枚復習">今日${due}枚</span>`
      : '';

    el.innerHTML = `
      <div class="deck-card-info">
        <div class="deck-card-name">${escapeHtml(deck.name)}</div>
        <div class="deck-card-meta">計${total}枚${todayBadgeHtml}</div>
      </div>
      <div class="deck-card-actions">
        <button class="btn-icon btn-rename" data-id="${deck.id}" title="名前を変更" aria-label="デッキ名を変更">✏️</button>
        <button class="btn-icon btn-delete" data-id="${deck.id}" title="削除" aria-label="デッキを削除">🗑</button>
        <button class="btn-study" data-id="${deck.id}" aria-label="${escapeHtml(deck.name)}を${due > 0 ? '学習開始' : 'カード管理'}">
          ${due > 0 ? '学習' : 'カード追加'}
        </button>
      </div>
    `;
    deckListEl.appendChild(el);
  });

  // イベント委任
  deckListEl.querySelectorAll('.btn-rename').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      renameDeck(btn.dataset.id);
    });
  });

  deckListEl.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteDeck(btn.dataset.id);
    });
  });

  deckListEl.querySelectorAll('.btn-study').forEach(btn => {
    btn.addEventListener('click', () => {
      openDeckManage(btn.dataset.id);
    });
  });
}

function renameDeck(id) {
  const deck = appData.decks.find(d => d.id === id);
  if (!deck) return;
  const newName = prompt('新しいデッキ名を入力してください:', deck.name);
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed) { alert('デッキ名を入力してください。'); return; }
  deck.name = trimmed;
  saveData(appData);
  renderDeckList();
}

function deleteDeck(id) {
  if (!confirm('このデッキとすべてのカードを削除します。よろしいですか？')) return;
  appData.decks = appData.decks.filter(d => d.id !== id);
  saveData(appData);
  renderDeckList();
}

// ===== デッキ作成 =====
btnNewDeck.addEventListener('click', () => {
  newDeckForm.classList.remove('hidden');
  newDeckNameInput.focus();
});

btnCancelDeck.addEventListener('click', () => {
  newDeckForm.classList.add('hidden');
  newDeckNameInput.value = '';
});

btnCreateDeck.addEventListener('click', createNewDeck);
newDeckNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') createNewDeck();
});

function createNewDeck() {
  const name = newDeckNameInput.value.trim();
  if (!name) { alert('デッキ名を入力してください。'); return; }
  const deck = createDeck(name);
  appData.decks.push(deck);
  saveData(appData);
  newDeckForm.classList.add('hidden');
  newDeckNameInput.value = '';
  renderDeckList();
}

// ===== カード管理画面 =====
function openDeckManage(id) {
  currentDeckId = id;
  currentDeck = appData.decks.find(d => d.id === id);
  if (!currentDeck) return;
  manageDeckTitle.textContent = currentDeck.name;
  showView('manage');
  renderCardManage();
}

function renderCardManage() {
  if (!currentDeck) return;
  const cards = currentDeck.cards;
  cardCountBadge.textContent = `${cards.length}枚`;

  // 統計バー更新
  const newCount = cards.filter(c => getCardStatus(c) === 'new').length;
  const learningCount = cards.filter(c => getCardStatus(c) === 'learning').length;
  const masteredCount = cards.filter(c => getCardStatus(c) === 'mastered').length;
  const total = cards.length || 1;

  segNew.style.width = `${(newCount / total) * 100}%`;
  segLearning.style.width = `${(learningCount / total) * 100}%`;
  segMastered.style.width = `${(masteredCount / total) * 100}%`;
  countNew.textContent = newCount;
  countLearning.textContent = learningCount;
  countMastered.textContent = masteredCount;

  // カード一覧
  cardListEl.innerHTML = '';
  if (cards.length === 0) {
    noCardsMsgEl.classList.remove('hidden');
    return;
  }
  noCardsMsgEl.classList.add('hidden');

  cards.forEach(card => {
    const status = getCardStatus(card);
    const statusColors = { new: '#95a5a6', learning: '#f39c12', mastered: '#27ae60' };
    const statusLabels = { new: '新規', learning: '学習中', mastered: '習得済み' };

    const el = document.createElement('div');
    el.className = 'card-item';
    el.innerHTML = `
      <span class="card-status-dot" style="background:${statusColors[status]}" title="${statusLabels[status]}" aria-label="${statusLabels[status]}"></span>
      <div class="card-item-texts">
        <span class="card-front-preview">${escapeHtml(card.front)}</span>
        <span class="card-separator">→</span>
        <span class="card-back-preview">${escapeHtml(card.back)}</span>
      </div>
      <button class="btn-icon btn-delete" data-card-id="${card.id}" title="削除" aria-label="カードを削除">🗑</button>
    `;
    cardListEl.appendChild(el);
  });

  cardListEl.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteCard(btn.dataset.cardId));
  });
}

function deleteCard(cardId) {
  if (!currentDeck) return;
  currentDeck.cards = currentDeck.cards.filter(c => c.id !== cardId);
  saveData(appData);
  renderCardManage();
}

btnBackToDecks.addEventListener('click', () => {
  showView('decks');
  renderDeckList();
});

btnAddCard.addEventListener('click', addCard);

function addCard() {
  if (!currentDeck) return;
  const front = cardFrontInput.value.trim();
  const back = cardBackInput.value.trim();
  if (!front || !back) { alert('表面と裏面を両方入力してください。'); return; }
  currentDeck.cards.push(createCard(front, back));
  saveData(appData);
  cardFrontInput.value = '';
  cardBackInput.value = '';
  cardFrontInput.focus();
  renderCardManage();
}

// ===== CSV インポート =====
csvFileInput.addEventListener('change', () => {
  const file = csvFileInput.files[0];
  if (!file || !currentDeck) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    let count = 0;
    const errors = [];
    lines.forEach((line, idx) => {
      // CSVパース（簡易版: カンマ区切り、引用符対応）
      const parts = parseCsvLine(line);
      if (parts.length < 2) {
        errors.push(idx + 1);
        return;
      }
      const front = parts[0].trim();
      const back = parts[1].trim();
      if (!front || !back) { errors.push(idx + 1); return; }
      currentDeck.cards.push(createCard(front, back));
      count++;
    });
    saveData(appData);
    renderCardManage();
    csvFileInput.value = '';

    showCsvMsg(
      errors.length === 0
        ? `${count}枚のカードを読み込みました。`
        : `${count}枚読み込み完了（${errors.length}行スキップ）。`,
      errors.length === 0 ? 'success' : 'error'
    );
  };
  reader.readAsText(file, 'UTF-8');
});

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function showCsvMsg(text, type) {
  csvMsg.textContent = text;
  csvMsg.className = 'csv-msg ' + type;
  csvMsg.classList.remove('hidden');
  setTimeout(() => csvMsg.classList.add('hidden'), 4000);
}

// ===== CSV エクスポート =====
btnExportCsv.addEventListener('click', () => {
  if (!currentDeck) return;
  if (currentDeck.cards.length === 0) { alert('カードがありません。'); return; }
  const rows = currentDeck.cards.map(c => `"${escapeCsv(c.front)}","${escapeCsv(c.back)}"`);
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentDeck.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

function escapeCsv(str) {
  return String(str).replace(/"/g, '""');
}

// ===== 学習開始 =====
btnStartStudy.addEventListener('click', startStudy);

function startStudy() {
  if (!currentDeck) return;
  const due = getDueCards(currentDeck);
  if (due.length === 0) {
    const noCardsEl = document.getElementById('no-cards-msg');
    const msg = currentDeck.cards.length === 0
      ? 'カードがありません。上のフォームからカードを追加してください。'
      : '今日の復習カードはありません。明日また来てください！';
    // カード管理画面にメッセージ表示（alert不使用）
    noCardsEl.textContent = msg;
    noCardsEl.classList.remove('hidden');
    return;
  }
  studyQueue = shuffleArray([...due]);
  studyIndex = 0;
  sessionStats = { again: 0, hard: 0, good: 0, easy: 0 };
  studyDeckTitle.textContent = currentDeck.name;
  showView('study');
  showStudyCard();
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showStudyCard() {
  if (studyIndex >= studyQueue.length) {
    showComplete();
    return;
  }
  const card = studyQueue[studyIndex];
  cardFrontText.textContent = card.front;
  cardBackText.textContent = card.back;
  studyProgress.textContent = `${studyIndex + 1}/${studyQueue.length}`;
  flashcard.classList.remove('flipped');
  revealArea.classList.remove('hidden');
  ratingArea.classList.add('hidden');
}

// カードをクリックしてフリップ
flashcard.addEventListener('click', revealCard);
flashcard.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    revealCard();
  }
});

btnReveal.addEventListener('click', revealCard);

function revealCard() {
  flashcard.classList.add('flipped');
  revealArea.classList.add('hidden');
  ratingArea.classList.remove('hidden');
}

// 評価ボタン
document.querySelectorAll('.btn-rating').forEach(btn => {
  btn.addEventListener('click', () => {
    const quality = parseInt(btn.dataset.quality, 10);
    rateCard(quality);
  });
});

function rateCard(quality) {
  const card = studyQueue[studyIndex];
  // currentDeck の実データを更新
  const realCard = currentDeck.cards.find(c => c.id === card.id);
  if (realCard) sm2(realCard, quality);
  saveData(appData);

  // セッション統計
  if (quality === 0) sessionStats.again++;
  else if (quality === 3) sessionStats.hard++;
  else if (quality === 4) sessionStats.good++;
  else if (quality === 5) sessionStats.easy++;

  // quality < 3 のカードはキューの末尾に再追加
  if (quality < 3) {
    studyQueue.push({ ...card });
  }

  studyIndex++;
  showStudyCard();
}

// 学習画面から戻る
btnBackToManage.addEventListener('click', () => {
  currentDeck = appData.decks.find(d => d.id === currentDeckId);
  showView('manage');
  renderCardManage();
});

// ===== セッション完了画面 =====
function showComplete() {
  const totalAnswered = sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
  document.getElementById('complete-msg').textContent =
    `${totalAnswered}回回答しました。お疲れ様でした！`;
  document.getElementById('c-again').textContent = sessionStats.again;
  document.getElementById('c-hard').textContent = sessionStats.hard;
  document.getElementById('c-good').textContent = sessionStats.good;
  document.getElementById('c-easy').textContent = sessionStats.easy;
  showView('complete');
}

btnStudyAgain.addEventListener('click', () => {
  currentDeck = appData.decks.find(d => d.id === currentDeckId);
  startStudy();
});

btnBackFromComplete.addEventListener('click', () => {
  showView('decks');
  renderDeckList();
});

// ===== XSS対策 =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== 初期化 =====
showView('decks');
renderDeckList();
