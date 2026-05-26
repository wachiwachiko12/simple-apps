'use strict';

// ===== データモデル =====
const DEFAULT_TREE = {
  id: 'node-1',
  name: 'ホーム',
  type: 'top',
  collapsed: false,
  children: [
    {
      id: 'node-2',
      name: 'サービス',
      type: 'list',
      collapsed: false,
      children: [
        { id: 'node-3', name: 'サービスA詳細', type: 'detail', collapsed: false, children: [] },
        { id: 'node-4', name: 'サービスB詳細', type: 'detail', collapsed: false, children: [] }
      ]
    },
    {
      id: 'node-5',
      name: '事例・実績',
      type: 'list',
      collapsed: false,
      children: [
        { id: 'node-6', name: '事例詳細', type: 'detail', collapsed: false, children: [] }
      ]
    },
    { id: 'node-7', name: '会社概要', type: 'detail', collapsed: false, children: [] },
    { id: 'node-8', name: 'お問い合わせ', type: 'form', collapsed: false, children: [] }
  ]
};

const TYPE_CONFIG = {
  top:     { label: 'TOP', color: '#e74c3c' },
  list:    { label: '一覧', color: '#3498db' },
  detail:  { label: '詳細', color: '#27ae60' },
  form:    { label: 'F',   color: '#9b59b6' },
  feature: { label: '特集', color: '#e67e22' },
  lp:      { label: 'LP',  color: '#c0392b' }
};

const H_GAP = 54;   // 水平間隔（ノードの高さ基準）
const V_GAP = 200;  // 垂直間隔（ノードの幅基準）
const NODE_W = 160;
const NODE_H = 44;
const PADDING_TOP = 30;
const PADDING_LEFT = 30;

let treeData = null;
let selectedNodeId = null;
let zoomLevel = 1.0;
let nodeCounter = 100;

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  renderTree();
  bindEvents();
});

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('sitemap-planner-data');
    if (saved) {
      treeData = JSON.parse(saved);
    } else {
      treeData = JSON.parse(JSON.stringify(DEFAULT_TREE));
    }
    // nodeCounter を保存済みデータのIDから再構築
    const ids = getAllNodeIds(treeData);
    ids.forEach(id => {
      const num = parseInt(id.replace('node-', ''), 10);
      if (!isNaN(num) && num > nodeCounter) nodeCounter = num;
    });
  } catch (e) {
    treeData = JSON.parse(JSON.stringify(DEFAULT_TREE));
  }
}

function saveToStorage() {
  try {
    localStorage.setItem('sitemap-planner-data', JSON.stringify(treeData));
  } catch (e) {
    // localStorage unavailable
  }
}

function getAllNodeIds(node) {
  const ids = [node.id];
  (node.children || []).forEach(c => ids.push(...getAllNodeIds(c)));
  return ids;
}

// ===== イベントバインド =====
function bindEvents() {
  document.getElementById('btn-add-node').addEventListener('click', onAddNode);
  document.getElementById('new-node-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') onAddNode();
  });

  document.getElementById('btn-png').addEventListener('click', onExportPng);
  document.getElementById('btn-json-export').addEventListener('click', onJsonExport);
  document.getElementById('btn-json-import').addEventListener('change', onJsonImport);
  document.getElementById('btn-reset').addEventListener('click', onReset);
  document.getElementById('btn-zoom-in').addEventListener('click', () => setZoom(zoomLevel + 0.1));
  document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(zoomLevel - 0.1));
}

// ===== ノード追加 =====
function onAddNode() {
  const nameInput = document.getElementById('new-node-name');
  const typeSelect = document.getElementById('new-node-type');
  const name = nameInput.value.trim();
  const type = typeSelect.value;

  if (!name) {
    showToast('ページ名を入力してください');
    nameInput.focus();
    return;
  }

  if (!selectedNodeId) {
    showToast('追加先のノードを選択してください');
    return;
  }

  const parent = findNode(treeData, selectedNodeId);
  if (!parent) {
    showToast('選択中のノードが見つかりません');
    return;
  }

  nodeCounter++;
  const newNode = {
    id: 'node-' + nodeCounter,
    name,
    type,
    collapsed: false,
    children: []
  };
  parent.children.push(newNode);
  nameInput.value = '';
  saveToStorage();
  renderTree();
  selectedNodeId = newNode.id;
  showToast('ノードを追加しました');
}

// ===== ノード削除 =====
function deleteNode(nodeId) {
  if (nodeId === treeData.id) {
    showToast('ルートノードは削除できません');
    return;
  }
  const removed = removeNodeById(treeData, nodeId);
  if (removed) {
    if (selectedNodeId === nodeId) selectedNodeId = null;
    saveToStorage();
    renderTree();
  }
}

function removeNodeById(node, targetId) {
  const idx = node.children.findIndex(c => c.id === targetId);
  if (idx !== -1) {
    node.children.splice(idx, 1);
    return true;
  }
  return node.children.some(c => removeNodeById(c, targetId));
}

// ===== ノード名変更 =====
function startEditing(nodeId, labelEl, nodeEl) {
  const node = findNode(treeData, nodeId);
  if (!node) return;

  const input = document.createElement('input');
  input.className = 'node-edit-input';
  input.value = node.name;
  input.maxLength = 30;
  input.setAttribute('aria-label', 'ページ名を編集');

  labelEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const newName = input.value.trim() || node.name;
    node.name = newName;
    saveToStorage();
    renderTree();
    selectedNodeId = nodeId;
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = node.name; input.blur(); }
  });
  // クリックで選択解除されないよう伝播を止める
  nodeEl.addEventListener('click', e => e.stopPropagation(), { once: true });
}

// ===== 折りたたみ =====
function toggleCollapse(nodeId) {
  const node = findNode(treeData, nodeId);
  if (!node) return;
  node.collapsed = !node.collapsed;
  saveToStorage();
  renderTree();
  selectedNodeId = nodeId;
}

// ===== ツリー検索 =====
function findNode(root, id) {
  if (root.id === id) return root;
  for (const child of (root.children || [])) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

// ===== レイアウト計算（Reingold-Tilford 簡易版） =====
function computeLayout(node, depth, xOffset, positions) {
  const cfg = positions;
  // 可視子ノード
  const visibleChildren = node.collapsed ? [] : (node.children || []);

  if (visibleChildren.length === 0) {
    node._x = xOffset;
    node._width = NODE_W;
    return xOffset + NODE_W + 20;
  }

  const startX = xOffset;
  let curX = xOffset;
  visibleChildren.forEach(child => {
    curX = computeLayout(child, depth + 1, curX, cfg);
  });

  // 自分はすべての子の中央
  const firstChild = visibleChildren[0];
  const lastChild = visibleChildren[visibleChildren.length - 1];
  node._x = (firstChild._x + lastChild._x + NODE_W) / 2 - NODE_W / 2;
  node._width = NODE_W;
  return curX;
}

function computePositions(node, depth, result) {
  result.push({ node, depth });
  const visibleChildren = node.collapsed ? [] : (node.children || []);
  visibleChildren.forEach(child => computePositions(child, depth + 1, result));
  return result;
}

function getSubtreeMaxX(node) {
  const visibleChildren = node.collapsed ? [] : (node.children || []);
  if (visibleChildren.length === 0) return node._x + NODE_W;
  return Math.max(node._x + NODE_W, ...visibleChildren.map(c => getSubtreeMaxX(c)));
}

function getSubtreeMaxDepth(node) {
  const visibleChildren = node.collapsed ? [] : (node.children || []);
  if (visibleChildren.length === 0) return 0;
  return 1 + Math.max(...visibleChildren.map(c => getSubtreeMaxDepth(c)));
}

// ===== レンダリング =====
function renderTree() {
  const nodesContainer = document.getElementById('tree-nodes');
  const svg = document.getElementById('tree-svg');
  const container = document.getElementById('tree-container');

  // レイアウト計算
  computeLayout(treeData, 0, 0, {});
  const allNodes = computePositions(treeData, 0, []);

  // キャンバスサイズ計算
  const maxX = getSubtreeMaxX(treeData) + PADDING_LEFT * 2;
  const maxDepth = getSubtreeMaxDepth(treeData);
  const canvasH = (maxDepth + 1) * (NODE_H + H_GAP) + PADDING_TOP * 2;
  const canvasW = Math.max(maxX + PADDING_LEFT, 600);

  // ズーム適用
  nodesContainer.style.transform = `scale(${zoomLevel})`;
  nodesContainer.style.transformOrigin = 'top left';
  nodesContainer.style.width = canvasW + 'px';
  nodesContainer.style.height = canvasH + 'px';

  svg.style.transform = `scale(${zoomLevel})`;
  svg.style.transformOrigin = 'top left';
  svg.setAttribute('width', canvasW);
  svg.setAttribute('height', canvasH);
  svg.setAttribute('viewBox', `0 0 ${canvasW} ${canvasH}`);

  container.style.minWidth = (canvasW * zoomLevel) + 'px';
  container.style.minHeight = (canvasH * zoomLevel) + 'px';

  // SVGクリア
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  // ノードコンテナクリア
  while (nodesContainer.firstChild) nodesContainer.removeChild(nodesContainer.firstChild);

  // ノード描画
  allNodes.forEach(({ node, depth }) => {
    const x = node._x + PADDING_LEFT;
    const y = depth * (NODE_H + H_GAP) + PADDING_TOP;

    node._px = x;
    node._py = y;

    // DOM要素作成
    const el = document.createElement('div');
    el.className = 'tree-node' + (node.id === selectedNodeId ? ' selected' : '');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = NODE_W + 'px';
    el.dataset.nodeId = node.id;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `ページ: ${node.name}、タイプ: ${TYPE_CONFIG[node.type]?.label || node.type}`);

    // バッジ
    const cfg = TYPE_CONFIG[node.type] || { label: '?', color: '#999' };
    const badge = document.createElement('span');
    badge.className = 'node-badge';
    badge.style.background = cfg.color;
    badge.textContent = cfg.label;
    el.appendChild(badge);

    // ラベル
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = node.name;
    el.appendChild(label);

    // 折りたたみボタン（子があるとき）
    const visibleChildren = node.collapsed ? [] : (node.children || []);
    if (node.children && node.children.length > 0) {
      const collapseBtn = document.createElement('button');
      collapseBtn.className = 'node-collapse-btn';
      collapseBtn.textContent = node.collapsed ? '▶' : '▼';
      collapseBtn.title = node.collapsed ? '展開' : '折りたたむ';
      collapseBtn.setAttribute('aria-label', node.collapsed ? '子ノードを展開' : '子ノードを折りたたむ');
      collapseBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleCollapse(node.id);
      });
      el.appendChild(collapseBtn);
    }

    // 削除ボタン（ルート以外）
    if (node.id !== treeData.id) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'node-delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'ノードを削除';
      deleteBtn.setAttribute('aria-label', `${node.name}を削除`);
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm(`「${node.name}」とその子ノードを削除しますか？`)) {
          deleteNode(node.id);
        }
      });
      el.appendChild(deleteBtn);
    }

    // クリック: 選択
    el.addEventListener('click', e => {
      selectedNodeId = node.id;
      document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
      el.classList.add('selected');
    });

    // ダブルクリック: 編集
    el.addEventListener('dblclick', e => {
      e.stopPropagation();
      startEditing(node.id, label, el);
    });

    // キーボード操作
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectedNodeId = node.id;
        document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
        el.classList.add('selected');
      }
    });

    nodesContainer.appendChild(el);
  });

  // SVG線描画
  allNodes.forEach(({ node }) => {
    const visibleChildren = node.collapsed ? [] : (node.children || []);
    visibleChildren.forEach(child => {
      const x1 = node._px + NODE_W / 2;
      const y1 = node._py + NODE_H;
      const x2 = child._px + NODE_W / 2;
      const y2 = child._py;

      const midY = (y1 + y2) / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'tree-line');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
      svg.appendChild(path);
    });
  });
}

// ===== ズーム =====
function setZoom(level) {
  zoomLevel = Math.min(2.0, Math.max(0.4, Math.round(level * 10) / 10));
  document.getElementById('zoom-label').textContent = Math.round(zoomLevel * 100) + '%';
  renderTree();
}

// ===== PNG書き出し =====
function onExportPng() {
  const container = document.getElementById('tree-container');
  showToast('PNG生成中...');

  // ズームを一時的に1.0に
  const prevZoom = zoomLevel;
  zoomLevel = 1.0;
  renderTree();

  const nodesEl = document.getElementById('tree-nodes');
  const svgEl = document.getElementById('tree-svg');

  setTimeout(() => {
    html2canvas(container, {
      backgroundColor: '#fafbfd',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      width: parseInt(svgEl.getAttribute('width')) || container.scrollWidth,
      height: parseInt(svgEl.getAttribute('height')) || container.scrollHeight,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'sitemap-' + formatDate() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('PNG保存完了');
      zoomLevel = prevZoom;
      renderTree();
    }).catch(err => {
      showToast('PNG生成に失敗しました');
      zoomLevel = prevZoom;
      renderTree();
    });
  }, 100);
}

// ===== JSON エクスポート =====
function onJsonExport() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tree: treeData
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'sitemap-' + formatDate() + '.json';
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  showToast('JSONをエクスポートしました');
}

// ===== JSON インポート =====
function onJsonImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      const tree = data.tree || data; // バージョン非対応のJSONも受け入れ
      if (!tree || !tree.id || !tree.name) throw new Error('不正なフォーマット');
      treeData = tree;
      selectedNodeId = null;
      saveToStorage();
      renderTree();
      showToast('JSONをインポートしました');
    } catch (err) {
      showToast('JSONの読み込みに失敗しました');
    }
    // 同じファイルを再インポートできるようにリセット
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ===== リセット =====
function onReset() {
  if (!confirm('ツリーをサンプルデータにリセットしますか？\n現在の設計データは失われます。')) return;
  treeData = JSON.parse(JSON.stringify(DEFAULT_TREE));
  selectedNodeId = null;
  nodeCounter = 100;
  saveToStorage();
  renderTree();
  showToast('リセットしました');
}

// ===== ユーティリティ =====
function formatDate() {
  const d = new Date();
  return d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
}

let toastTimer = null;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
