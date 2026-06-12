(function () {
  class MindMapModel {
    constructor(data) {
      this.version = 1;
      this.nextId = 1;
      this.rootId = null;
      this.nodes = {};
      this.title = "Mind Map";
      this.hierarchyNames = this._defaultHierarchyNames(10);
      this.levelWidths = this._defaultLevelWidths(10);

      if (data) {
        this._load(data);
      } else {
        this.createRoot("中心テーマ");
      }
    }

    createRoot(text) {
      const id = this._newId();
      this.rootId = id;
      this.nodes[id] = this._createNode(id, text || "中心テーマ", null);
      return id;
    }

    addChild(parentId, text) {
      const parent = this.getNode(parentId);
      if (!parent) {
        return null;
      }

      const id = this._newId();
      this.nodes[id] = this._createNode(id, text || "新規ノード", parentId, "#ffffff");
      parent.children.push(id);
      return id;
    }

    updateNode(nodeId, text, color) {
      const node = this.getNode(nodeId);
      if (!node) {
        return false;
      }

      const trimmed = (text || "").trim();
      node.text = trimmed || "新規ノード";
      node.color = this._normalizeColor(color) || node.color || "#ffffff";
      return true;
    }

    setCollapsed(nodeId, collapsed) {
      const node = this.getNode(nodeId);
      if (!node) {
        return false;
      }

      node.collapsed = Boolean(collapsed);
      return true;
    }

    toggleCollapsed(nodeId) {
      const node = this.getNode(nodeId);
      if (!node) {
        return false;
      }

      node.collapsed = !Boolean(node.collapsed);
      return true;
    }

    updateText(nodeId, text) {
      const node = this.getNode(nodeId);
      if (!node) {
        return false;
      }
      return this.updateNode(nodeId, text, node.color);
    }

    deleteNode(nodeId) {
      const node = this.getNode(nodeId);
      if (!node || nodeId === this.rootId) {
        return false;
      }

      const parent = this.getNode(node.parentId);
      if (parent) {
        parent.children = parent.children.filter(function (id) {
          return id !== nodeId;
        });
      }

      const stack = [nodeId];
      while (stack.length > 0) {
        const currentId = stack.pop();
        const current = this.getNode(currentId);
        if (!current) {
          continue;
        }

        for (const childId of current.children) {
          stack.push(childId);
        }
        delete this.nodes[currentId];
      }

      return true;
    }

    moveNodeToParentEnd(nodeId, newParentId) {
      const node = this.getNode(nodeId);
      const newParent = this.getNode(newParentId);
      if (!node || !newParent) {
        return false;
      }
      if (nodeId === this.rootId || nodeId === newParentId) {
        return false;
      }
      if (this._isDescendant(newParentId, nodeId)) {
        return false;
      }
      if (node.parentId === newParentId) {
        return false;
      }

      const oldParent = this.getNode(node.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(function (id) {
          return id !== nodeId;
        });
      }

      node.parentId = newParentId;
      newParent.children.push(nodeId);
      return true;
    }

    reorderSibling(nodeId, targetSiblingId, placeAfter) {
      const node = this.getNode(nodeId);
      const target = this.getNode(targetSiblingId);
      if (!node || !target) {
        return false;
      }
      if (nodeId === this.rootId || nodeId === targetSiblingId) {
        return false;
      }
      if (!node.parentId || node.parentId !== target.parentId) {
        return false;
      }

      const parent = this.getNode(node.parentId);
      if (!parent) {
        return false;
      }

      const currentIndex = parent.children.indexOf(nodeId);
      const targetIndexRaw = parent.children.indexOf(targetSiblingId);
      if (currentIndex < 0 || targetIndexRaw < 0) {
        return false;
      }

      parent.children.splice(currentIndex, 1);

      let targetIndex = parent.children.indexOf(targetSiblingId);
      if (placeAfter) {
        targetIndex += 1;
      }

      if (targetIndex < 0) {
        targetIndex = 0;
      }
      if (targetIndex > parent.children.length) {
        targetIndex = parent.children.length;
      }

      parent.children.splice(targetIndex, 0, nodeId);
      return true;
    }

    isDescendant(candidateId, ancestorId) {
      return this._isDescendant(candidateId, ancestorId);
    }

    moveNodeToIndex(nodeId, newParentId, insertIndex) {
      const node = this.getNode(nodeId);
      const newParent = this.getNode(newParentId);
      if (!node || !newParent) {
        return false;
      }
      if (nodeId === this.rootId || nodeId === newParentId) {
        return false;
      }
      if (this._isDescendant(newParentId, nodeId)) {
        return false;
      }

      const oldParent = this.getNode(node.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(function (id) {
          return id !== nodeId;
        });
      }

      node.parentId = newParentId;
      const clamped = Math.max(0, Math.min(insertIndex, newParent.children.length));
      newParent.children.splice(clamped, 0, nodeId);
      return true;
    }

    getNode(nodeId) {
      return this.nodes[nodeId] || null;
    }

    toJSON() {
      return {
        version: this.version,
        nextId: this.nextId,
        rootId: this.rootId,
        title: this.title,
        hierarchyNames: this.hierarchyNames,
        levelWidths: this.levelWidths,
        nodes: this.nodes
      };
    }

    _load(data) {
      this.version = data.version || 1;
      this.nextId = data.nextId || 1;
      this.rootId = data.rootId || null;
      this.title = (typeof data.title === "string" && data.title.trim()) ? data.title.trim() : "Mind Map";
      this.hierarchyNames = this._normalizeHierarchyNames(data.hierarchyNames);
      this.levelWidths = this._normalizeLevelWidths(data.levelWidths);
      this.nodes = data.nodes || {};

      for (const id of Object.keys(this.nodes)) {
        const node = this.nodes[id];
        if (!Array.isArray(node.children)) {
          node.children = [];
        }
        if (typeof node.collapsed !== "boolean") {
          node.collapsed = false;
        }
        if (!node.color) {
          node.color = "#ffffff";
        } else {
          node.color = this._normalizeColor(node.color) || "#ffffff";
        }
      }

      if (!this.rootId || !this.nodes[this.rootId]) {
        this.nextId = 1;
        this.nodes = {};
        this.createRoot("中心テーマ");
      }
    }

    _defaultHierarchyNames(count) {
      const names = [];
      for (let i = 0; i < count; i += 1) {
        names.push("Level." + (i + 1));
      }
      return names;
    }

    _defaultLevelWidths(count) {
      const widths = [];
      for (let i = 0; i < count; i += 1) {
        widths.push(240);
      }
      return widths;
    }

    _normalizeHierarchyNames(names) {
      const defaults = this._defaultHierarchyNames(10);
      if (!Array.isArray(names)) {
        return defaults;
      }

      const normalized = defaults.slice();
      const limit = Math.max(defaults.length, names.length);
      for (let i = 0; i < limit; i += 1) {
        const raw = names[i];
        if (typeof raw === "string" && raw.trim()) {
          normalized[i] = raw.trim();
        } else if (!normalized[i]) {
          normalized[i] = "Level." + (i + 1);
        }
      }
      return normalized;
    }

    _normalizeLevelWidths(widths) {
      const defaults = this._defaultLevelWidths(10);
      if (!Array.isArray(widths)) {
        return defaults;
      }

      const normalized = defaults.slice();
      const limit = Math.max(defaults.length, widths.length);
      for (let i = 0; i < limit; i += 1) {
        const raw = Number(widths[i]);
        if (Number.isFinite(raw)) {
          normalized[i] = Math.max(140, Math.min(560, Math.round(raw)));
        } else if (!normalized[i]) {
          normalized[i] = 240;
        }
      }
      return normalized;
    }

    _newId() {
      const id = "n" + this.nextId;
      this.nextId += 1;
      return id;
    }

    _createNode(id, text, parentId, color) {
      return {
        id: id,
        text: text,
        parentId: parentId,
        children: [],
        collapsed: false,
        color: this._normalizeColor(color) || "#ffffff"
      };
    }

    _normalizeColor(color) {
      if (typeof color !== "string") {
        return null;
      }

      const value = color.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        return value.toLowerCase();
      }
      return null;
    }

    _isDescendant(candidateId, ancestorId) {
      if (!candidateId || !ancestorId) {
        return false;
      }

      let current = this.getNode(candidateId);
      while (current && current.parentId) {
        if (current.parentId === ancestorId) {
          return true;
        }
        current = this.getNode(current.parentId);
      }
      return false;
    }
  }

  window.MindMapModel = MindMapModel;
})();