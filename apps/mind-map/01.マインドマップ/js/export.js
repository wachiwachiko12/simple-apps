(function () {
  function getHierarchyName(model, level) {
    const names = Array.isArray(model.hierarchyNames) ? model.hierarchyNames : [];
    const raw = names[level];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
    return "Level." + (level + 1);
  }

  function buildRows(model) {
    const rows = [];

    function walk(nodeId, level) {
      const node = model.getNode(nodeId);
      if (!node) {
        return;
      }

      rows.push({
        Level: getHierarchyName(model, level),
        Topic: new Array(level + 1).join("  ") + node.text
      });

      for (const childId of node.children) {
        walk(childId, level + 1);
      }
    }

    walk(model.rootId, 0);
    return rows;
  }

  function buildPackedLevelRows(model) {
    const matrix = [];
    let maxLevel = 0;

    function setCell(rowIndex, level, text) {
      if (!matrix[rowIndex]) {
        matrix[rowIndex] = [];
      }
      matrix[rowIndex][level] = text;
      if (level > maxLevel) {
        maxLevel = level;
      }
    }

    function walk(nodeId, startRow, level) {
      const node = model.getNode(nodeId);
      if (!node) {
        return 0;
      }

      setCell(startRow, level, node.text);

      if (node.children.length === 0) {
        return 1;
      }

      let usedRows = 0;
      for (const childId of node.children) {
        const childRows = walk(childId, startRow + usedRows, level + 1);
        usedRows += Math.max(1, childRows);
      }

      return Math.max(1, usedRows);
    }

    const totalRows = Math.max(1, walk(model.rootId, 0, 0));
    const rows = [];

    for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
      const row = {};
      for (let level = 0; level <= maxLevel; level += 1) {
        const value = matrix[rowIndex] && typeof matrix[rowIndex][level] === "string"
          ? matrix[rowIndex][level]
          : "";
        row[getHierarchyName(model, level)] = value;
      }
      rows.push(row);
    }

    return rows;
  }

  function sanitizeFileName(title) {
    return (title || "mindmap").replace(/[\\/:*?"<>|]/g, "_").trim() || "mindmap";
  }

  function exportMindMapToExcel(model) {
    const tabHierarchyRows = buildRows(model);
    const packedLevelRows = buildPackedLevelRows(model);
    const date = new Date().toISOString().slice(0, 10);
    const base = sanitizeFileName(model.title);
    const fileName = base + "_" + date + ".xlsx";

    if (window.XLSX && window.XLSX.utils) {
      const wb = XLSX.utils.book_new();

      const tabSheet = XLSX.utils.json_to_sheet(tabHierarchyRows);
      tabSheet["!cols"] = [{ wch: 8 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, tabSheet, "TabHierarchy");

      const packedSheet = XLSX.utils.json_to_sheet(packedLevelRows);
      const packedColCount = packedLevelRows.length > 0 ? Object.keys(packedLevelRows[0]).length : 1;
      packedSheet["!cols"] = new Array(packedColCount).fill(0).map(function () {
        return { wch: 24 };
      });
      XLSX.utils.book_append_sheet(wb, packedSheet, "LevelColumns");

      XLSX.writeFile(wb, fileName);
      return;
    }

    // CSV fallback supports only one sheet, so keep TabHierarchy format.
    const header = "Level,Topic\n";
    const body = tabHierarchyRows
      .map(function (row) {
        const topic = String(row.Topic).replace(/"/g, '""');
        return row.Level + ',"' + topic + '"';
      })
      .join("\n");
    const blob = new Blob(["\ufeff" + header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.xlsx$/, ".csv");
    a.click();
    URL.revokeObjectURL(url);
  }

  window.exportMindMapToExcel = exportMindMapToExcel;
})();