(function () {
  const STORAGE_KEY = "mindmap.local.v1";

  function loadModel() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return new MindMapModel();
      }
      const data = JSON.parse(raw);
      return new MindMapModel(data);
    } catch (err) {
      console.error("Failed to load saved map", err);
      return new MindMapModel();
    }
  }

  function saveModel(model) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(model.toJSON()));
    } catch (err) {
      console.error("Failed to save map", err);
      alert("保存に失敗しました。ブラウザの保存領域を確認してください。");
    }
  }

  function applyModelData(targetModel, sourceModel) {
    targetModel.version = sourceModel.version;
    targetModel.nextId = sourceModel.nextId;
    targetModel.rootId = sourceModel.rootId;
    targetModel.title = sourceModel.title;
    targetModel.hierarchyNames = sourceModel.hierarchyNames;
    targetModel.nodes = sourceModel.nodes;
  }

  function normalizeHierarchyName(value, index) {
    const text = typeof value === "string" ? value.trim() : "";
    return text || ("Level." + (index + 1));
  }

  function normalizeLevelWidth(value) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) {
      return 240;
    }
    return Math.max(140, Math.min(560, Math.round(raw)));
  }

  function ensureLevelWidths(model, count) {
    if (!Array.isArray(model.levelWidths)) {
      model.levelWidths = [];
    }

    const nextWidths = [];
    for (let i = 0; i < count; i += 1) {
      nextWidths.push(normalizeLevelWidth(model.levelWidths[i]));
    }
    model.levelWidths = nextWidths;
  }

  function applyHierarchyWidths(model, container) {
    const cols = Array.from(container.querySelectorAll(".hierarchy-col"));
    if (cols.length === 0) {
      return;
    }

    ensureLevelWidths(model, cols.length);

    for (let i = 0; i < cols.length; i += 1) {
      const width = model.levelWidths[i];
      const col = cols[i];
      const input = col.querySelector(".hierarchy-input");

      col.style.width = width + "px";
      if (input) {
        input.style.width = Math.max(100, width - 60) + "px";
      }
    }
  }

  function getTreeLevelCount(model) {
    if (!model.rootId || !model.getNode(model.rootId)) {
      return 1;
    }

    let maxDepth = 0;

    function walk(nodeId, depth) {
      const node = model.getNode(nodeId);
      if (!node) {
        return;
      }

      if (depth > maxDepth) {
        maxDepth = depth;
      }

      for (const childId of node.children) {
        walk(childId, depth + 1);
      }
    }

    walk(model.rootId, 0);
    return maxDepth + 1;
  }

  function renderHierarchyFields(model, container) {
    const count = getTreeLevelCount(model);
    if (!Array.isArray(model.hierarchyNames)) {
      model.hierarchyNames = [];
    }

    const nextNames = [];
    for (let i = 0; i < count; i += 1) {
      nextNames.push(normalizeHierarchyName(model.hierarchyNames[i], i));
    }
    model.hierarchyNames = nextNames;
    ensureLevelWidths(model, count);

    container.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const col = document.createElement("div");
      col.className = "hierarchy-col";
      col.dataset.levelIndex = String(i);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "hierarchy-input";
      input.dataset.levelIndex = String(i);
      input.value = normalizeHierarchyName(model.hierarchyNames[i], i);

      input.addEventListener("input", function () {
        model.hierarchyNames[i] = input.value;
        saveModel(model);
      });

      input.addEventListener("blur", function () {
        model.hierarchyNames[i] = normalizeHierarchyName(input.value, i);
        input.value = model.hierarchyNames[i];
        saveModel(model);
      });

      col.appendChild(input);
      container.appendChild(col);
    }

    applyHierarchyWidths(model, container);
  }

  function sanitizeFileName(title) {
    return (title || "mindmap").replace(/[\\/:*?"<>|]/g, "_").trim() || "mindmap";
  }

  function saveMapToFile(model) {
    const json = JSON.stringify(model.toJSON(), null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const base = sanitizeFileName(model.title);
    const fileName = base + "_" + date + ".json";

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importMapFromFile(file, model, ui) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = new MindMapModel(parsed);

      applyModelData(model, imported);
      document.getElementById("map-title").textContent = model.title;
      renderHierarchyFields(model, document.getElementById("hierarchy-fields"));
      ui.setSelected(model.rootId);
      ui.render();
      saveModel(model);
    } catch (err) {
      console.error("Failed to import map", err);
      alert("インポートに失敗しました。MindMap保存で出力したJSONファイルを選択してください。");
    }
  }

  function boot() {
    const model = loadModel();
    const titleEl = document.getElementById("map-title");
    const hierarchyFieldsEl = document.getElementById("hierarchy-fields");

    // タイトル表示を初期化
    titleEl.textContent = model.title;

    // タイトル編集イベント: input で即時反映・保存
    titleEl.addEventListener("input", function () {
      const text = titleEl.textContent.trim();
      model.title = text || "Mind Map";
      saveModel(model);
    });

    // Enterキーで確定(改行させない)
    titleEl.addEventListener("keydown", function (evt) {
      if (evt.key === "Enter") {
        evt.preventDefault();
        titleEl.blur();
      }
    });

    // フォーカスを外した際に空なら既定値に戻す
    titleEl.addEventListener("blur", function () {
      if (!titleEl.textContent.trim()) {
        model.title = "Mind Map";
        titleEl.textContent = "Mind Map";
        saveModel(model);
      }
    });

    renderHierarchyFields(model, hierarchyFieldsEl);

    const elements = {
      board: document.getElementById("board"),
      nodeLayer: document.getElementById("node-layer"),
      linkLayer: document.getElementById("link-layer"),
      levelGuideLayer: document.getElementById("level-guide-layer"),
      addChildBtn: document.getElementById("add-child-btn"),
      editBtn: document.getElementById("edit-node-btn"),
      deleteBtn: document.getElementById("delete-node-btn"),
      saveMapBtn: document.getElementById("save-map-btn"),
      importMapBtn: document.getElementById("import-map-btn"),
      importMapFile: document.getElementById("import-map-file"),
      contextMenu: document.getElementById("node-context-menu"),
      nodeEditor: document.getElementById("node-editor"),
      editorText: document.getElementById("editor-text"),
      editorColor: document.getElementById("editor-color"),
      editorSaveBtn: document.getElementById("editor-save-btn"),
      editorCancelBtn: document.getElementById("editor-cancel-btn"),
      exportBtn: document.getElementById("export-excel-btn"),
      newMapBtn: document.getElementById("new-map-btn")
    };

    const ui = new MindMapUI(model, elements, function () {
      renderHierarchyFields(model, hierarchyFieldsEl);
      saveModel(model);
    }, function () {
      applyHierarchyWidths(model, hierarchyFieldsEl);
    });

    elements.exportBtn.addEventListener("click", function () {
      exportMindMapToExcel(model);
    });

    elements.saveMapBtn.addEventListener("click", function () {
      saveMapToFile(model);
    });

    elements.importMapBtn.addEventListener("click", function () {
      elements.importMapFile.click();
    });

    elements.importMapFile.addEventListener("change", async function (evt) {
      const file = evt.target.files && evt.target.files[0] ? evt.target.files[0] : null;
      await importMapFromFile(file, model, ui);
      elements.importMapFile.value = "";
    });

    elements.newMapBtn.addEventListener("click", function () {
      const ok = confirm("現在のマップを破棄して新規作成します。よろしいですか？");
      if (!ok) {
        return;
      }

      const fresh = new MindMapModel();
      applyModelData(model, fresh);
      document.getElementById("map-title").textContent = model.title;
      renderHierarchyFields(model, document.getElementById("hierarchy-fields"));

      ui.setSelected(model.rootId);
      ui.render();
      saveModel(model);
    });

    saveModel(model);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();