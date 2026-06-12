(function () {
  class MindMapUI {
    constructor(model, elements, onMutate, onLayoutChange) {
      this.model = model;
      this.elements = elements;
      this.onMutate = onMutate;
      this.onLayoutChange = onLayoutChange;
      this.selectedId = model.rootId;
      this.layout = {};
      this.nodeMinHeight = 52;
      this.nodeMinWidth = 100;
      this.baseLeft = 80;
      this.defaultLevelWidth = 240;
      this.minLevelWidth = 140;
      this.maxLevelWidth = 560;
      this.levelInset = 60;
      this.contextMenuNodeId = null;
      this.editorState = null;
      this.resizeState = null;
      this.dragState = {
        draggedId: null,
        dropTargetId: null
      };

      this._wireEvents();
      this.render();
    }

    _wireEvents() {
      const self = this;
      const board = this.elements.board;
      const nodeLayer = this.elements.nodeLayer;

      board.addEventListener("click", function (evt) {
        if (evt.target === board || evt.target === nodeLayer || evt.target === self.elements.linkLayer) {
          self.setSelected(null);
          self._hideContextMenu();
        }
      });

      board.addEventListener("contextmenu", function (evt) {
        if (evt.target === board || evt.target === nodeLayer || evt.target === self.elements.linkLayer) {
          evt.preventDefault();
          self._hideContextMenu();
        }
      });

      this.elements.addChildBtn.addEventListener("click", function () {
        if (!self.selectedId) {
          return;
        }
        const parentId = self.selectedId;
        const newId = self.model.addChild(parentId, "新規ノード");
        if (!newId) {
          return;
        }
        self.render();
        self.setSelected(parentId);
        self.openNodeEditor(newId, parentId);
        self._commit();
      });

      this.elements.editBtn.addEventListener("click", function () {
        if (self.selectedId) {
          self.openNodeEditor(self.selectedId);
        }
      });

      this.elements.deleteBtn.addEventListener("click", function () {
        if (!self.selectedId) {
          return;
        }
        const node = self.model.getNode(self.selectedId);
        if (!node || self.selectedId === self.model.rootId) {
          return;
        }

        const ok = confirm("選択ノードと子孫を削除します。よろしいですか？");
        if (!ok) {
          return;
        }

        self.model.deleteNode(self.selectedId);
        self.setSelected(node.parentId);
        self.render();
        self._commit();
      });

      this.elements.contextMenu.addEventListener("click", function (evt) {
        const action = evt.target.dataset.action;
        if (!action) {
          return;
        }
        self._handleContextAction(action);
      });

      document.addEventListener("click", function () {
        self._hideContextMenu();
      });

      document.addEventListener("keydown", function (evt) {
        if (self._handleNavigationKey(evt)) {
          return;
        }

        if (evt.key === "Escape") {
          self._hideContextMenu();
          self.closeNodeEditor();
        }
      });

      this.elements.editorCancelBtn.addEventListener("click", function () {
        self.closeNodeEditor();
      });

      this.elements.editorSaveBtn.addEventListener("click", function () {
        self._saveNodeEditor();
      });

      this.elements.nodeEditor.addEventListener("click", function (evt) {
        if (evt.target === self.elements.nodeEditor) {
          self.closeNodeEditor();
        }
      });

      this.elements.nodeEditor.addEventListener("click", function (evt) {
        const swatch = evt.target.closest(".palette-swatch");
        if (!swatch) {
          return;
        }

        const color = swatch.dataset.color;
        if (!color) {
          return;
        }

        self.elements.editorColor.value = color;
        self._syncPaletteSelection(color);
      });

      this.elements.editorText.addEventListener("keydown", function (evt) {
        if (evt.key === "Enter") {
          self._saveNodeEditor();
        }
      });

      this.elements.editorColor.addEventListener("input", function () {
        self._syncPaletteSelection(self.elements.editorColor.value);
      });

      document.addEventListener("pointermove", function (evt) {
        self._handleLevelResizeMove(evt);
      });

      document.addEventListener("pointerup", function () {
        self._handleLevelResizeEnd();
      });

      document.addEventListener("pointercancel", function () {
        self._handleLevelResizeEnd();
      });
    }

    render() {
      this.layout = this._computeLayout();
      this._renderNodes();
      this._renderLinks();
      this._applyBoardSize();
      this._renderLevelGuides();
      this._syncToolbar();
    }

    setSelected(nodeId) {
      this.selectedId = nodeId;
      this._markSelectedNode();
      this._syncToolbar();
    }

    openNodeEditor(nodeId, returnToId) {
      const node = this.model.getNode(nodeId);
      if (!node) {
        return;
      }

      this.editorState = {
        nodeId: nodeId,
        returnToId: returnToId || nodeId
      };

      this.elements.editorText.value = node.text;
      this.elements.editorColor.value = node.color || "#ffffff";
      this._syncPaletteSelection(this.elements.editorColor.value);
      this.elements.nodeEditor.classList.add("visible");
      this.elements.nodeEditor.setAttribute("aria-hidden", "false");
      this.elements.editorText.focus();
      this.elements.editorText.select();
    }

    closeNodeEditor() {
      this.editorState = null;
      this.elements.nodeEditor.classList.remove("visible");
      this.elements.nodeEditor.setAttribute("aria-hidden", "true");
    }

    _syncPaletteSelection(color) {
      const value = typeof color === "string" ? color.toLowerCase() : "";
      const swatches = this.elements.nodeEditor.querySelectorAll(".palette-swatch");
      swatches.forEach(function (swatch) {
        const swatchColor = (swatch.dataset.color || "").toLowerCase();
        swatch.classList.toggle("selected", swatchColor === value);
      });
    }

    _saveNodeEditor() {
      if (!this.editorState) {
        return;
      }

      const nodeId = this.editorState.nodeId;
      const returnToId = this.editorState.returnToId;
      const text = this.elements.editorText.value;
      const color = this.elements.editorColor.value;
      this.model.updateNode(nodeId, text, color);
      this.closeNodeEditor();
      this.render();
      this.setSelected(returnToId);
      this._commit();
    }

    _computeLayout() {
      const layout = {};
      let leafIndex = 0;
      const self = this;

      function walk(nodeId, depth) {
        const node = self.model.getNode(nodeId);
        if (!node) {
          return 0;
        }

        const x = self._getNodeX(depth);
        let y = 0;

        const visibleChildren = node.collapsed ? [] : node.children;

        if (visibleChildren.length === 0) {
          y = 80 + leafIndex * 120;
          leafIndex += 1;
        } else {
          const childYs = [];
          for (const childId of visibleChildren) {
            walk(childId, depth + 1);
            childYs.push(layout[childId].y);
          }
          y = Math.round(childYs.reduce(function (a, b) { return a + b; }, 0) / childYs.length);
        }

        layout[nodeId] = { x: x, y: y, depth: depth };
        return y;
      }

      walk(this.model.rootId, 0);
      return layout;
    }

    _renderNodes() {
      const self = this;
      const nodeLayer = this.elements.nodeLayer;
      nodeLayer.innerHTML = "";

      Object.keys(this.layout).forEach(function (nodeId) {
        const node = self.model.getNode(nodeId);
        const point = self.layout[nodeId];
        const el = document.createElement("div");

        el.className = "node" + (nodeId === self.model.rootId ? " root" : "");
        el.dataset.nodeId = nodeId;
        el.draggable = nodeId !== self.model.rootId;
        el.style.left = point.x + "px";
        el.style.top = point.y + "px";
        el.style.width = self._getNodeWidth(point.depth) + "px";
        el.style.backgroundColor = node.color || "#ffffff";
        el.textContent = node.text;

        el.addEventListener("click", function (evt) {
          evt.stopPropagation();
          self.setSelected(nodeId);
          self._hideContextMenu();
        });

        el.addEventListener("contextmenu", function (evt) {
          evt.stopPropagation();
          evt.preventDefault();
          self.setSelected(nodeId);
          self._showContextMenu(nodeId, evt.clientX, evt.clientY);
        });

        el.addEventListener("dblclick", function (evt) {
          evt.stopPropagation();
          self.setSelected(nodeId);
          self.openNodeEditor(nodeId);
        });

        el.addEventListener("dragstart", function (evt) {
          self.dragState.draggedId = nodeId;
          self.dragState.dropTargetId = null;
          el.classList.add("drag-source");
          if (evt.dataTransfer) {
            evt.dataTransfer.effectAllowed = "move";
            evt.dataTransfer.setData("text/plain", nodeId);
          }
          setTimeout(function () { self._renderGapZones(); }, 0);
        });

        el.addEventListener("dragend", function () {
          self._removeGapZones();
          self._clearDragState();
        });

        el.addEventListener("dragover", function (evt) {
          if (!self._canDropOnNode(nodeId)) {
            return;
          }
          evt.preventDefault();
          self.dragState.dropTargetId = nodeId;
          self._markDropTarget(nodeId);
          if (evt.dataTransfer) {
            evt.dataTransfer.dropEffect = "move";
          }
        });

        el.addEventListener("dragleave", function () {
          if (self.dragState.dropTargetId === nodeId) {
            self._markDropTarget(null);
          }
        });

        el.addEventListener("drop", function (evt) {
          evt.preventDefault();
          const draggedId = self.dragState.draggedId;
          if (!draggedId) {
            return;
          }
          self._applyNodeDrop(draggedId, nodeId);
        });

        nodeLayer.appendChild(el);
      });

      this._renderCollapseToggles();

      this._markSelectedNode();
    }

    _renderCollapseToggles() {
      const self = this;
      const nodeLayer = this.elements.nodeLayer;

      Object.keys(this.layout).forEach(function (nodeId) {
        const node = self.model.getNode(nodeId);
        const point = self.layout[nodeId];
        if (!node || !point || node.children.length === 0) {
          return;
        }

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "branch-toggle";
        toggle.dataset.nodeId = nodeId;
        toggle.setAttribute("aria-label", node.collapsed ? "展開" : "折り畳み");
        toggle.textContent = node.collapsed ? "+" : "-";
        toggle.style.left = point.x + self._getNodeWidth(point.depth) + 8 + "px";
        toggle.style.top = point.y + self.nodeMinHeight / 2 - 10 + "px";

        toggle.addEventListener("click", function (evt) {
          evt.stopPropagation();
          self.model.toggleCollapsed(nodeId);
          self.render();
          self.setSelected(nodeId);
          self._commit();
        });

        nodeLayer.appendChild(toggle);
      });
    }

    _renderLinks() {
      const svg = this.elements.linkLayer;
      svg.innerHTML = "";

      for (const nodeId of Object.keys(this.layout)) {
        const node = this.model.getNode(nodeId);
        if (!node || !node.parentId) {
          continue;
        }

        const parentNode = this.model.getNode(node.parentId);
        if (parentNode && parentNode.collapsed) {
          continue;
        }

        const parentPoint = this.layout[node.parentId];
        const childPoint = this.layout[nodeId];
        if (!parentPoint || !childPoint) {
          continue;
        }

        const startX = parentPoint.x + this._getNodeWidth(parentPoint.depth);
        const startY = parentPoint.y + this.nodeMinHeight / 2;
        const endX = childPoint.x;
        const endY = childPoint.y + this.nodeMinHeight / 2;
        const c1x = startX + 70;
        const c2x = endX - 70;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "link-path");
        path.setAttribute("d", "M " + startX + " " + startY + " C " + c1x + " " + startY + ", " + c2x + " " + endY + ", " + endX + " " + endY);
        svg.appendChild(path);
      }
    }

    _applyBoardSize() {
      const points = Object.values(this.layout);
      if (points.length === 0) {
        return;
      }

      let maxX = 0;
      let maxY = 0;
      for (const p of points) {
        const right = p.x + this._getNodeWidth(p.depth);
        if (right > maxX) {
          maxX = right;
        }
        if (p.y > maxY) {
          maxY = p.y;
        }
      }

      const visibleLevels = this._getVisibleLevelCount();
      let levelRight = this.baseLeft;
      for (let i = 0; i < visibleLevels; i += 1) {
        levelRight += this._getLevelWidth(i);
      }
      if (levelRight > maxX) {
        maxX = levelRight;
      }

      const width = maxX + 180;
      const height = maxY + this.nodeMinHeight + 140;
      this.elements.nodeLayer.style.width = width + "px";
      this.elements.nodeLayer.style.height = height + "px";
      this.elements.linkLayer.setAttribute("width", String(width));
      this.elements.linkLayer.setAttribute("height", String(height));
      this.elements.linkLayer.setAttribute("viewBox", "0 0 " + width + " " + height);

      if (this.elements.levelGuideLayer) {
        this.elements.levelGuideLayer.style.width = width + "px";
        this.elements.levelGuideLayer.style.height = height + "px";
      }
    }

    _markSelectedNode() {
      const nodes = this.elements.nodeLayer.querySelectorAll(".node");
      nodes.forEach(function (el) {
        el.classList.remove("selected");
      });

      if (!this.selectedId) {
        return;
      }

      const selectedEl = this.elements.nodeLayer.querySelector('[data-node-id="' + this.selectedId + '"]');
      if (selectedEl) {
        selectedEl.classList.add("selected");
      }
    }

    _syncToolbar() {
      const hasSelection = Boolean(this.selectedId);
      const isRoot = this.selectedId === this.model.rootId;
      this.elements.addChildBtn.disabled = !hasSelection;
      this.elements.editBtn.disabled = !hasSelection;
      this.elements.deleteBtn.disabled = !hasSelection || isRoot;
    }

    _showContextMenu(nodeId, x, y) {
      this.contextMenuNodeId = nodeId;
      const menu = this.elements.contextMenu;
      menu.classList.add("visible");
      menu.setAttribute("aria-hidden", "false");

      const menuWidth = 170;
      const menuHeight = 124;
      const maxX = window.innerWidth - menuWidth - 8;
      const maxY = window.innerHeight - menuHeight - 8;
      const left = Math.max(8, Math.min(x, maxX));
      const top = Math.max(8, Math.min(y, maxY));

      menu.style.left = left + "px";
      menu.style.top = top + "px";
    }

    _hideContextMenu() {
      this.contextMenuNodeId = null;
      const menu = this.elements.contextMenu;
      menu.classList.remove("visible");
      menu.setAttribute("aria-hidden", "true");
    }

    _handleContextAction(action) {
      const nodeId = this.contextMenuNodeId;
      if (!nodeId) {
        this._hideContextMenu();
        return;
      }

      this.setSelected(nodeId);
      this._hideContextMenu();

      if (action === "add-child") {
        const newId = this.model.addChild(nodeId, "新規ノード");
        if (!newId) {
          return;
        }
        this.render();
        this.setSelected(nodeId);
        this.openNodeEditor(newId, nodeId);
        this._commit();
        return;
      }

      if (action === "edit-node") {
        this.openNodeEditor(nodeId);
        return;
      }

      if (action === "delete-node") {
        if (nodeId === this.model.rootId) {
          return;
        }
        const ok = confirm("選択ノードと子孫を削除します。よろしいですか？");
        if (!ok) {
          return;
        }
        const node = this.model.getNode(nodeId);
        this.model.deleteNode(nodeId);
        this.render();
        this.setSelected(node ? node.parentId : null);
        this._commit();
      }
    }

    _handleNavigationKey(evt) {
      if (this.editorState) {
        return false;
      }

      if (!this.selectedId) {
        return false;
      }

      if (evt.key === "Tab") {
        evt.preventDefault();
        if (evt.shiftKey) {
          this._moveToParent();
        } else {
          this._moveToChild();
        }
        return true;
      }

      if (evt.key === "ArrowUp") {
        evt.preventDefault();
        this._moveSibling(-1);
        return true;
      }

      if (evt.key === "ArrowDown") {
        evt.preventDefault();
        this._moveSibling(1);
        return true;
      }

      return false;
    }

    _moveToChild() {
      const node = this.model.getNode(this.selectedId);
      if (!node || node.children.length === 0) {
        return;
      }

      this.setSelected(node.children[0]);
    }

    _moveToParent() {
      const node = this.model.getNode(this.selectedId);
      if (!node || !node.parentId) {
        return;
      }

      this.setSelected(node.parentId);
    }

    _moveSibling(offset) {
      const node = this.model.getNode(this.selectedId);
      if (!node || !node.parentId) {
        return;
      }

      const parent = this.model.getNode(node.parentId);
      if (!parent) {
        return;
      }

      const index = parent.children.indexOf(this.selectedId);
      if (index < 0) {
        return;
      }

      const targetIndex = index + offset;
      if (targetIndex < 0 || targetIndex >= parent.children.length) {
        return;
      }

      this.setSelected(parent.children[targetIndex]);
    }

    _applyNodeDrop(draggedId, targetId) {
      if (!this._canDrop(draggedId, targetId)) {
        this._clearDragState();
        return;
      }

      const changed = this.model.moveNodeToParentEnd(draggedId, targetId);
      this._clearDragState();

      if (!changed) {
        return;
      }

      this.render();
      this.setSelected(draggedId);
      this._commit();
    }

    _canDropOnNode(targetId) {
      const draggedId = this.dragState.draggedId;
      return this._canDrop(draggedId, targetId);
    }

    _canDrop(draggedId, targetId) {
      if (!draggedId || !targetId || draggedId === targetId) {
        return false;
      }

      const dragged = this.model.getNode(draggedId);
      const target = this.model.getNode(targetId);
      if (!dragged || !target) {
        return false;
      }

      // Prevent dropping onto descendants to avoid cycle.
      if (this.model.isDescendant(targetId, draggedId)) {
        return false;
      }

      return true;
    }

    _markDropTarget(nodeId) {
      const nodes = this.elements.nodeLayer.querySelectorAll(".node");
      nodes.forEach(function (el) {
        el.classList.remove("drop-target");
      });

      const zones = this.elements.nodeLayer.querySelectorAll(".gap-zone");
      zones.forEach(function (z) {
        z.classList.remove("drop-target-zone");
      });

      if (!nodeId) {
        return;
      }

      const targetEl = this.elements.nodeLayer.querySelector('[data-node-id="' + nodeId + '"]');
      if (targetEl) {
        targetEl.classList.add("drop-target");
      }
    }

    _clearDragState() {
      this.dragState.draggedId = null;
      this.dragState.dropTargetId = null;

      this._removeGapZones();

      const nodes = this.elements.nodeLayer.querySelectorAll(".node");
      nodes.forEach(function (el) {
        el.classList.remove("drag-source");
        el.classList.remove("drop-target");
      });
    }

    _renderGapZones() {
      this._removeGapZones();
      const self = this;
      const draggedId = this.dragState.draggedId;
      if (!draggedId) {
        return;
      }

      Object.keys(this.model.nodes).forEach(function (parentId) {
        if (parentId === draggedId || self.model.isDescendant(parentId, draggedId)) {
          return;
        }

        const parent = self.model.getNode(parentId);
        if (!parent || parent.children.length === 0) {
          return;
        }

        const children = parent.children;
        const firstPoint = self.layout[children[0]];
        if (!firstPoint) {
          return;
        }

        for (let i = 0; i <= children.length; i++) {
          const zoneY = self._getZoneY(children, i);
          if (zoneY === null) {
            continue;
          }

          const zone = document.createElement("div");
          zone.className = "gap-zone";
          zone.dataset.zoneParent = parentId;
          zone.dataset.zoneIndex = String(i);
          zone.style.left = firstPoint.x + "px";
          zone.style.top = zoneY + "px";
          zone.style.width = self._getNodeWidth(firstPoint.depth) + "px";

          (function (capturedZone, capturedParentId, capturedIndex) {
            capturedZone.addEventListener("dragover", function (evt) {
              evt.preventDefault();
              self._markZoneDropTarget(capturedZone);
              if (evt.dataTransfer) {
                evt.dataTransfer.dropEffect = "move";
              }
            });

            capturedZone.addEventListener("dragleave", function () {
              capturedZone.classList.remove("drop-target-zone");
            });

            capturedZone.addEventListener("drop", function (evt) {
              evt.preventDefault();
              const currentDraggedId = self.dragState.draggedId;
              if (!currentDraggedId) {
                return;
              }
              self._applyZoneDrop(currentDraggedId, capturedParentId, capturedIndex);
            });
          })(zone, parentId, i);

          self.elements.nodeLayer.appendChild(zone);
        }
      });
    }

    _removeGapZones() {
      if (!this.elements || !this.elements.nodeLayer) {
        return;
      }
      const zones = this.elements.nodeLayer.querySelectorAll(".gap-zone");
      zones.forEach(function (el) {
        el.remove();
      });
    }

    _getZoneY(children, insertIndex) {
      if (insertIndex === 0) {
        const firstPoint = this.layout[children[0]];
        if (!firstPoint) {
          return null;
        }
        return firstPoint.y - 34;
      }

      if (insertIndex === children.length) {
        const lastPoint = this.layout[children[children.length - 1]];
        if (!lastPoint) {
          return null;
        }
        return lastPoint.y + this.nodeMinHeight + 10;
      }

      const prevPoint = this.layout[children[insertIndex - 1]];
      const nextPoint = this.layout[children[insertIndex]];
      if (!prevPoint || !nextPoint) {
        return null;
      }

      const gapTop = prevPoint.y + this.nodeMinHeight;
      const gapBottom = nextPoint.y;
      return Math.round((gapTop + gapBottom) / 2) - 10;
    }

    _markZoneDropTarget(zone) {
      const nodes = this.elements.nodeLayer.querySelectorAll(".node");
      nodes.forEach(function (el) {
        el.classList.remove("drop-target");
      });

      const zones = this.elements.nodeLayer.querySelectorAll(".gap-zone");
      zones.forEach(function (z) {
        z.classList.remove("drop-target-zone");
      });

      zone.classList.add("drop-target-zone");
    }

    _applyZoneDrop(draggedId, parentId, insertIndex) {
      const changed = this.model.moveNodeToIndex(draggedId, parentId, insertIndex);
      this._clearDragState();

      if (!changed) {
        return;
      }

      this.render();
      this.setSelected(draggedId);
      this._commit();
    }

    _renderLevelGuides() {
      const layer = this.elements.levelGuideLayer;
      if (!layer) {
        return;
      }

      layer.innerHTML = "";
      const levelCount = this._getVisibleLevelCount();
      if (levelCount === 0) {
        return;
      }

      const self = this;
      for (let i = 0; i < levelCount; i += 1) {
        const guide = document.createElement("div");
        guide.className = "level-guide";
        if (this.resizeState && this.resizeState.levelIndex === i) {
          guide.classList.add("resizing");
        }
        guide.dataset.levelIndex = String(i);
        guide.style.left = this._getLevelStartX(i) + this._getLevelWidth(i) + "px";

        guide.addEventListener("pointerdown", function (evt) {
          self._startLevelResize(evt, i);
        });

        layer.appendChild(guide);
      }
    }

    _startLevelResize(evt, levelIndex) {
      if (evt.button !== 0) {
        return;
      }

      evt.preventDefault();
      evt.stopPropagation();

      this.resizeState = {
        levelIndex: levelIndex,
        startClientX: evt.clientX,
        startWidth: this._getLevelWidth(levelIndex),
        changed: false
      };

      document.body.classList.add("resizing-level");
      this._renderLevelGuides();
    }

    _handleLevelResizeMove(evt) {
      if (!this.resizeState) {
        return;
      }

      const deltaX = evt.clientX - this.resizeState.startClientX;
      const nextWidth = this.resizeState.startWidth + deltaX;
      const changed = this._setLevelWidth(this.resizeState.levelIndex, nextWidth);
      if (changed) {
        this.resizeState.changed = true;
      }
    }

    _handleLevelResizeEnd() {
      if (!this.resizeState) {
        return;
      }

      const changed = this.resizeState.changed;
      this.resizeState = null;
      document.body.classList.remove("resizing-level");
      this._renderLevelGuides();

      if (changed) {
        this._commit();
      }
    }

    _setLevelWidth(levelIndex, width) {
      if (!Array.isArray(this.model.levelWidths)) {
        this.model.levelWidths = [];
      }

      const normalized = Math.max(this.minLevelWidth, Math.min(this.maxLevelWidth, Math.round(width)));
      const current = this._getLevelWidth(levelIndex);
      if (current === normalized) {
        return false;
      }

      this.model.levelWidths[levelIndex] = normalized;
      this.render();
      this._notifyLayoutChange();
      return true;
    }

    _getVisibleLevelCount() {
      const points = Object.values(this.layout);
      if (points.length === 0) {
        return 0;
      }

      let maxDepth = 0;
      for (const p of points) {
        const depth = Number.isFinite(p.depth) ? p.depth : 0;
        if (depth > maxDepth) {
          maxDepth = depth;
        }
      }
      return maxDepth + 1;
    }

    _getLevelWidth(depth) {
      if (!Array.isArray(this.model.levelWidths)) {
        this.model.levelWidths = [];
      }

      const raw = Number(this.model.levelWidths[depth]);
      const normalized = Number.isFinite(raw)
        ? Math.max(this.minLevelWidth, Math.min(this.maxLevelWidth, Math.round(raw)))
        : this.defaultLevelWidth;
      this.model.levelWidths[depth] = normalized;
      return normalized;
    }

    _getLevelStartX(depth) {
      let x = this.baseLeft;
      for (let i = 0; i < depth; i += 1) {
        x += this._getLevelWidth(i);
      }
      return x;
    }

    _getNodeWidth(depth) {
      return Math.max(this.nodeMinWidth, this._getLevelWidth(depth) - this.levelInset);
    }

    _getNodeX(depth) {
      const levelStartX = this._getLevelStartX(depth);
      const levelWidth = this._getLevelWidth(depth);
      const nodeWidth = this._getNodeWidth(depth);
      return levelStartX + Math.round((levelWidth - nodeWidth) / 2);
    }

    _notifyLayoutChange() {
      if (typeof this.onLayoutChange === "function") {
        this.onLayoutChange();
      }
    }

    _commit() {
      if (typeof this.onMutate === "function") {
        this.onMutate();
      }
    }
  }

  window.MindMapUI = MindMapUI;
})();
