'use strict';

// ============================================================
// State
// ============================================================
let currentJson = null; // 最後にパース成功したJSONオブジェクト

// ============================================================
// DOM References
// ============================================================
const jsonInput      = document.getElementById('json-input');
const editorStatus   = document.getElementById('editor-status');
const statusIcon     = document.getElementById('status-icon');
const statusMsg      = document.getElementById('status-msg');
const charCount      = document.getElementById('char-count');
const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const treeView       = document.getElementById('tree-view');
const schemaOutput   = document.getElementById('schema-output');
const validateJson   = document.getElementById('validate-json');
const validateSchema = document.getElementById('validate-schema');
const validateResult = document.getElementById('validate-result');
const convertOutput  = document.getElementById('convert-output');
const convertError   = document.getElementById('convert-error');
const convertOutputHeader = document.getElementById('convert-output-header');

// ============================================================
// Tab Navigation
// ============================================================
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    tabBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById('tab-' + target).classList.add('active');

    // ツリータブに切り替えたとき自動更新
    if (target === 'tree' && currentJson !== null) {
      renderTree(currentJson);
    }
  });
});

// ============================================================
// JSON Parse & Validation
// ============================================================
function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function setStatus(state, msg) {
  editorStatus.className = 'status-bar ' + state;
  if (state === 'ok') {
    statusIcon.textContent = '✓';
  } else if (state === 'error') {
    statusIcon.textContent = '✕';
  } else {
    statusIcon.textContent = '';
  }
  statusMsg.textContent = msg;
}

function updateCharCount() {
  const len = jsonInput.value.length;
  charCount.textContent = len > 0 ? len.toLocaleString('ja-JP') + ' 文字' : '';
}

jsonInput.addEventListener('input', () => {
  updateCharCount();
  const text = jsonInput.value.trim();
  if (!text) {
    currentJson = null;
    setStatus('neutral', 'JSONを入力してください');
    return;
  }
  const result = parseJson(text);
  if (result.ok) {
    currentJson = result.value;
    const type = Array.isArray(currentJson) ? 'array' : typeof currentJson;
    setStatus('ok', '有効なJSON (' + type + ')');
  } else {
    currentJson = null;
    setStatus('error', 'JSON構文エラー: ' + result.error);
  }
});

// ============================================================
// Prettify / Minify
// ============================================================
document.getElementById('btn-prettify').addEventListener('click', () => {
  const text = jsonInput.value.trim();
  if (!text) return;
  const result = parseJson(text);
  if (!result.ok) {
    setStatus('error', '整形失敗: ' + result.error);
    return;
  }
  jsonInput.value = JSON.stringify(result.value, null, 2);
  currentJson = result.value;
  updateCharCount();
  setStatus('ok', '整形完了');
});

document.getElementById('btn-minify').addEventListener('click', () => {
  const text = jsonInput.value.trim();
  if (!text) return;
  const result = parseJson(text);
  if (!result.ok) {
    setStatus('error', '圧縮失敗: ' + result.error);
    return;
  }
  jsonInput.value = JSON.stringify(result.value);
  currentJson = result.value;
  updateCharCount();
  setStatus('ok', '圧縮完了');
});

// ============================================================
// Clear / Copy
// ============================================================
document.getElementById('btn-clear-editor').addEventListener('click', () => {
  jsonInput.value = '';
  currentJson = null;
  updateCharCount();
  setStatus('neutral', 'JSONを入力してください');
});

document.getElementById('btn-copy-json').addEventListener('click', () => {
  copyToClipboard(jsonInput.value, 'JSONをコピーしました');
});

// ============================================================
// File Input & Drag & Drop
// ============================================================
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) readFile(file);
  fileInput.value = '';
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) readFile(file);
});

function readFile(file) {
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    setStatus('error', 'JSONファイルを選択してください (.json)');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    jsonInput.value = ev.target.result;
    updateCharCount();
    // trigger validation
    const result = parseJson(ev.target.result.trim());
    if (result.ok) {
      currentJson = result.value;
      setStatus('ok', 'ファイルを読み込みました: ' + escapeHtml(file.name));
    } else {
      currentJson = null;
      setStatus('error', 'JSON構文エラー: ' + result.error);
    }
  };
  reader.onerror = () => setStatus('error', 'ファイルの読み込みに失敗しました');
  reader.readAsText(file);
}

// ============================================================
// Tree View
// ============================================================
document.getElementById('btn-expand-all').addEventListener('click', () => {
  treeView.querySelectorAll('.tree-toggle.collapsed').forEach(t => {
    t.classList.remove('collapsed');
    const ul = t.closest('li')?.querySelector(':scope > ul');
    if (ul) ul.hidden = false;
  });
});

document.getElementById('btn-collapse-all').addEventListener('click', () => {
  treeView.querySelectorAll('.tree-toggle:not(.collapsed)').forEach(t => {
    // ルートノードは折りたたまない
    if (t.closest('#tree-view > .tree-node > ul')) {
      t.classList.add('collapsed');
      const ul = t.closest('li')?.querySelector(':scope > ul');
      if (ul) ul.hidden = true;
    }
  });
});

function renderTree(data) {
  treeView.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'tree-node';
  root.setAttribute('role', 'tree');
  const rootList = document.createElement('ul');
  rootList.setAttribute('role', 'group');
  buildTreeNode(rootList, data, null);
  root.appendChild(rootList);
  treeView.appendChild(root);
}

function buildTreeNode(parentUl, value, key) {
  const li = document.createElement('li');
  li.setAttribute('role', 'treeitem');

  const keySpan = key !== null
    ? '<span class="tree-key">' + escapeHtml(String(key)) + '</span>: '
    : '';

  if (value === null) {
    li.innerHTML = keySpan + '<span class="tree-null">null</span>';
    parentUl.appendChild(li);
    return;
  }

  if (typeof value === 'string') {
    li.innerHTML = keySpan + '<span class="tree-string">"' + escapeHtml(value) + '"</span>';
    parentUl.appendChild(li);
    return;
  }

  if (typeof value === 'number') {
    li.innerHTML = keySpan + '<span class="tree-number">' + value + '</span>';
    parentUl.appendChild(li);
    return;
  }

  if (typeof value === 'boolean') {
    li.innerHTML = keySpan + '<span class="tree-boolean">' + value + '</span>';
    parentUl.appendChild(li);
    return;
  }

  // Object or Array
  const isArray = Array.isArray(value);
  const entries = isArray ? value : Object.entries(value);
  const count = isArray ? value.length : entries.length;
  const label = isArray ? 'array' : 'object';
  const badgeClass = isArray ? 'badge-array' : 'badge-object';
  const openBracket  = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'tree-toggle';
  toggleBtn.setAttribute('aria-expanded', 'true');

  const inner = document.createElement('span');
  inner.innerHTML =
    keySpan +
    '<span class="tree-type-badge ' + badgeClass + '">' + label + '</span>' +
    ' ' + openBracket + '…' + count + '…' + closeBracket;
  toggleBtn.appendChild(inner);

  const childUl = document.createElement('ul');
  childUl.setAttribute('role', 'group');

  toggleBtn.addEventListener('click', () => {
    const collapsed = toggleBtn.classList.toggle('collapsed');
    childUl.hidden = collapsed;
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  });

  li.appendChild(toggleBtn);
  li.appendChild(childUl);
  parentUl.appendChild(li);

  if (isArray) {
    value.forEach((item, i) => buildTreeNode(childUl, item, i));
  } else {
    Object.entries(value).forEach(([k, v]) => buildTreeNode(childUl, v, k));
  }
}

// ============================================================
// JSON Schema Generation (draft-07)
// ============================================================
document.getElementById('btn-copy-schema').addEventListener('click', () => {
  copyToClipboard(schemaOutput.value, 'スキーマをコピーしました');
});

function generateSchema(value) {
  if (value === null) return { type: 'null' };

  if (typeof value === 'string') return { type: 'string' };

  if (typeof value === 'number') {
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
  }

  if (typeof value === 'boolean') return { type: 'boolean' };

  if (Array.isArray(value)) {
    const schema = {
      '$schema': undefined,
      type: 'array',
    };
    if (value.length === 0) {
      schema.items = {};
    } else {
      // 全アイテムのスキーマをマージ
      const itemSchemas = value.map(item => generateSchema(item));
      schema.items = mergeSchemas(itemSchemas);
    }
    return schema;
  }

  // Object
  const schema = {
    type: 'object',
    required: [],
    properties: {},
  };

  Object.entries(value).forEach(([k, v]) => {
    schema.required.push(k);
    schema.properties[k] = generateSchema(v);
  });

  if (schema.required.length === 0) delete schema.required;

  return schema;
}

function generateRootSchema(value) {
  const schema = generateSchema(value);
  return Object.assign(
    { '$schema': 'http://json-schema.org/draft-07/schema#' },
    schema
  );
}

// スキーマ生成（$schema付与）
document.getElementById('btn-generate-schema').addEventListener('click', () => {
  const text = jsonInput.value.trim();
  if (!text) {
    schemaOutput.value = '// エディタタブにJSONを入力してからスキーマを生成してください';
    return;
  }
  const result = parseJson(text);
  if (!result.ok) {
    schemaOutput.value = '// JSON構文エラー: ' + result.error;
    return;
  }
  const schema = generateRootSchema(result.value);
  schemaOutput.value = JSON.stringify(schema, null, 2);
});

/**
 * 複数スキーマを単純マージ（型が一致すれば共通化、一致しなければ anyOf）
 */
function mergeSchemas(schemas) {
  if (schemas.length === 0) return {};
  if (schemas.length === 1) return schemas[0];

  const types = [...new Set(schemas.map(s => s.type).filter(Boolean))];
  if (types.length === 1 && types[0] === 'object') {
    // 全部 object → properties をマージ
    const merged = { type: 'object', properties: {} };
    const allKeys = new Set(schemas.flatMap(s => Object.keys(s.properties || {})));
    allKeys.forEach(k => {
      const propSchemas = schemas
        .map(s => s.properties && s.properties[k])
        .filter(Boolean);
      if (propSchemas.length > 0) {
        merged.properties[k] = mergeSchemas(propSchemas);
      }
    });
    const requiredInAll = schemas[0].required
      ? schemas[0].required.filter(k => schemas.every(s => s.required && s.required.includes(k)))
      : [];
    if (requiredInAll.length > 0) merged.required = requiredInAll;
    return merged;
  }

  if (types.length === 1) return schemas[0];

  // 型が混在 → anyOf
  return { anyOf: schemas };
}

// ============================================================
// Schema Validation
// ============================================================
document.getElementById('btn-validate').addEventListener('click', () => {
  validateResult.hidden = false;

  const jsonText    = validateJson.value.trim();
  const schemaText  = validateSchema.value.trim();

  if (!jsonText || !schemaText) {
    showValidateResult(false, ['JSONとJSON Schemaの両方を入力してください']);
    return;
  }

  const jsonParsed   = parseJson(jsonText);
  const schemaParsed = parseJson(schemaText);

  if (!jsonParsed.ok) {
    showValidateResult(false, ['JSON構文エラー: ' + jsonParsed.error]);
    return;
  }
  if (!schemaParsed.ok) {
    showValidateResult(false, ['JSON Schema構文エラー: ' + schemaParsed.error]);
    return;
  }

  const errors = validateAgainstSchema(jsonParsed.value, schemaParsed.value, '$');
  if (errors.length === 0) {
    showValidateResult(true, []);
  } else {
    showValidateResult(false, errors);
  }
});

function showValidateResult(pass, errors) {
  validateResult.className = 'validate-result ' + (pass ? 'pass' : 'fail');
  if (pass) {
    validateResult.innerHTML = '✓ バリデーション通過 — JSONはスキーマに準拠しています';
  } else {
    const ul = document.createElement('ul');
    errors.forEach(e => {
      const li = document.createElement('li');
      li.textContent = e;
      ul.appendChild(li);
    });
    validateResult.innerHTML = '';
    validateResult.appendChild(document.createTextNode('✕ バリデーション失敗'));
    validateResult.appendChild(ul);
  }
}

/**
 * 簡易JSON Schemaバリデーション（draft-07 主要キーワード対応）
 */
function validateAgainstSchema(data, schema, path) {
  if (!schema || typeof schema !== 'object') return [];
  const errors = [];

  // type
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = getJsonType(data);
    if (!types.includes(actualType)) {
      errors.push(path + ': 型が不正です（期待=' + types.join('|') + ', 実際=' + actualType + '）');
    }
  }

  // enum
  if (schema.enum !== undefined) {
    const match = schema.enum.some(v => JSON.stringify(v) === JSON.stringify(data));
    if (!match) {
      errors.push(path + ': enum に含まれていません（許可値: ' + JSON.stringify(schema.enum) + '）');
    }
  }

  // const
  if (schema.const !== undefined) {
    if (JSON.stringify(data) !== JSON.stringify(schema.const)) {
      errors.push(path + ': const と一致しません（期待=' + JSON.stringify(schema.const) + '）');
    }
  }

  // string
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(path + ': 文字数が少なすぎます（最小=' + schema.minLength + '）');
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(path + ': 文字数が多すぎます（最大=' + schema.maxLength + '）');
    }
    if (schema.pattern !== undefined) {
      try {
        if (!new RegExp(schema.pattern).test(data)) {
          errors.push(path + ': patternに一致しません（' + schema.pattern + '）');
        }
      } catch (_) {
        errors.push(path + ': patternが不正な正規表現です');
      }
    }
  }

  // number / integer
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(path + ': 値が小さすぎます（最小=' + schema.minimum + '）');
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(path + ': 値が大きすぎます（最大=' + schema.maximum + '）');
    }
    if (schema.exclusiveMinimum !== undefined && data <= schema.exclusiveMinimum) {
      errors.push(path + ': 値がexclusiveMinimumを満たしません（>' + schema.exclusiveMinimum + '）');
    }
    if (schema.exclusiveMaximum !== undefined && data >= schema.exclusiveMaximum) {
      errors.push(path + ': 値がexclusiveMaximumを満たしません（<' + schema.exclusiveMaximum + '）');
    }
    if (schema.multipleOf !== undefined && data % schema.multipleOf !== 0) {
      errors.push(path + ': ' + schema.multipleOf + ' の倍数ではありません');
    }
  }

  // object
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    if (schema.required) {
      schema.required.forEach(key => {
        if (!(key in data)) {
          errors.push(path + '.' + key + ': 必須フィールドが存在しません');
        }
      });
    }
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        if (key in data) {
          errors.push(...validateAgainstSchema(data[key], propSchema, path + '.' + key));
        }
      });
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      Object.keys(data).forEach(k => {
        if (!allowed.has(k)) {
          errors.push(path + '.' + k + ': additionalPropertiesが禁止されています');
        }
      });
    }
    if (schema.minProperties !== undefined && Object.keys(data).length < schema.minProperties) {
      errors.push(path + ': プロパティ数が少なすぎます（最小=' + schema.minProperties + '）');
    }
    if (schema.maxProperties !== undefined && Object.keys(data).length > schema.maxProperties) {
      errors.push(path + ': プロパティ数が多すぎます（最大=' + schema.maxProperties + '）');
    }
  }

  // array
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(path + ': 要素数が少なすぎます（最小=' + schema.minItems + '）');
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(path + ': 要素数が多すぎます（最大=' + schema.maxItems + '）');
    }
    if (schema.items) {
      data.forEach((item, i) => {
        errors.push(...validateAgainstSchema(item, schema.items, path + '[' + i + ']'));
      });
    }
    if (schema.uniqueItems && !isUniqueArray(data)) {
      errors.push(path + ': 配列に重複する要素があります');
    }
  }

  // anyOf / oneOf / allOf / not
  if (schema.anyOf) {
    const valid = schema.anyOf.some(s => validateAgainstSchema(data, s, path).length === 0);
    if (!valid) errors.push(path + ': anyOfのいずれのスキーマにも一致しません');
  }
  if (schema.allOf) {
    schema.allOf.forEach((s, i) => {
      errors.push(...validateAgainstSchema(data, s, path + '<allOf[' + i + ']>'));
    });
  }
  if (schema.oneOf) {
    const passCount = schema.oneOf.filter(s => validateAgainstSchema(data, s, path).length === 0).length;
    if (passCount !== 1) errors.push(path + ': oneOfのちょうど1つのスキーマに一致する必要があります（一致数=' + passCount + '）');
  }
  if (schema.not) {
    const notErrors = validateAgainstSchema(data, schema.not, path);
    if (notErrors.length === 0) errors.push(path + ': notスキーマに一致してしまっています');
  }

  return errors;
}

function getJsonType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'integer') return 'integer';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  return typeof value;
}

function isUniqueArray(arr) {
  const seen = new Set(arr.map(v => JSON.stringify(v)));
  return seen.size === arr.length;
}

// ============================================================
// Conversion: JSON to CSV
// ============================================================
document.getElementById('btn-to-csv').addEventListener('click', () => {
  const text = jsonInput.value.trim();
  if (!text) {
    showConvertError('エディタタブにJSONを入力してください');
    return;
  }
  const result = parseJson(text);
  if (!result.ok) {
    showConvertError('JSON構文エラー: ' + result.error);
    return;
  }

  let data = result.value;
  if (!Array.isArray(data)) {
    // 単一オブジェクトを配列に包む
    if (typeof data === 'object' && data !== null) {
      data = [data];
    } else {
      showConvertError('CSV変換にはオブジェクトまたはオブジェクトの配列が必要です');
      return;
    }
  }

  if (data.length === 0) {
    showConvertError('配列が空です');
    return;
  }

  try {
    const csv = jsonToCsv(data);
    showConvertOutput('CSV変換結果', csv);
  } catch (e) {
    showConvertError('CSV変換エラー: ' + e.message);
  }
});

function jsonToCsv(arr) {
  // 全オブジェクトのキーを収集（順序を保つ）
  const keys = [];
  arr.forEach(row => {
    if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
      Object.keys(row).forEach(k => {
        if (!keys.includes(k)) keys.push(k);
      });
    }
  });

  if (keys.length === 0) throw new Error('変換できるオブジェクトフィールドがありません');

  const lines = [];
  // Header
  lines.push(keys.map(k => csvEscape(k)).join(','));
  // Rows
  arr.forEach(row => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      lines.push(keys.map(() => '').join(','));
    } else {
      lines.push(
        keys.map(k => {
          const v = row[k];
          if (v === undefined || v === null) return '';
          if (typeof v === 'object') return csvEscape(JSON.stringify(v));
          return csvEscape(String(v));
        }).join(',')
      );
    }
  });

  return lines.join('\r\n');
}

function csvEscape(str) {
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ============================================================
// Conversion: JSON to YAML
// ============================================================
document.getElementById('btn-to-yaml').addEventListener('click', () => {
  const text = jsonInput.value.trim();
  if (!text) {
    showConvertError('エディタタブにJSONを入力してください');
    return;
  }
  const result = parseJson(text);
  if (!result.ok) {
    showConvertError('JSON構文エラー: ' + result.error);
    return;
  }

  const yaml = jsonToYaml(result.value, 0);
  showConvertOutput('YAML変換結果', yaml);
});

function jsonToYaml(value, indent) {
  const pad = '  '.repeat(indent);

  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);

  if (typeof value === 'string') {
    // 特殊文字や改行を含む場合はダブルクォート
    if (value === '' || /[:#\[\]{}|>&*!,\n"']/.test(value) || /^\s|\s$/.test(value) ||
        value === 'true' || value === 'false' || value === 'null' || !isNaN(Number(value))) {
      return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map(item => {
      const rendered = jsonToYaml(item, indent + 1);
      if (typeof item === 'object' && item !== null) {
        return pad + '-\n' + rendered;
      }
      return pad + '- ' + rendered;
    }).join('\n');
  }

  // Object
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return keys.map(k => {
      const v = value[k];
      const yamlKey = pad + yamlEscapeKey(k) + ':';
      if (v === null) return yamlKey + ' null';
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0) {
        return yamlKey + '\n' + jsonToYaml(v, indent + 1);
      }
      if (Array.isArray(v) && v.length > 0) {
        return yamlKey + '\n' + jsonToYaml(v, indent + 1);
      }
      return yamlKey + ' ' + jsonToYaml(v, indent + 1);
    }).join('\n');
  }

  return String(value);
}

function yamlEscapeKey(key) {
  if (/[:#\[\]{}|>&*!,\n"'\s]/.test(key)) {
    return '"' + key.replace(/"/g, '\\"') + '"';
  }
  return key;
}

function showConvertOutput(label, text) {
  convertError.hidden = true;
  convertOutputHeader.hidden = false;
  document.getElementById('convert-label').textContent = label;
  convertOutput.hidden = false;
  convertOutput.value = text;
}

function showConvertError(msg) {
  convertOutputHeader.hidden = true;
  convertOutput.hidden = true;
  convertError.hidden = false;
  convertError.textContent = msg;
}

document.getElementById('btn-copy-convert').addEventListener('click', () => {
  copyToClipboard(convertOutput.value, '変換結果をコピーしました');
});

// ============================================================
// Clipboard Helper
// ============================================================
function copyToClipboard(text, successMsg) {
  if (!text) return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg || 'コピーしました');
    }).catch(() => {
      fallbackCopy(text);
      showToast(successMsg || 'コピーしました');
    });
  } else {
    fallbackCopy(text);
    showToast(successMsg || 'コピーしました');
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
}

// ============================================================
// Toast Notification
// ============================================================
let toastTimer = null;

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       '1.5rem',
      left:         '50%',
      transform:    'translateX(-50%)',
      background:   '#1e293b',
      color:        '#fff',
      padding:      '0.6rem 1.25rem',
      borderRadius: '6px',
      fontSize:     '0.875rem',
      fontWeight:   '600',
      zIndex:       '9999',
      pointerEvents:'none',
      opacity:      '0',
      transition:   'opacity 0.2s',
      whiteSpace:   'nowrap',
    });
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

// ============================================================
// Utilities
// ============================================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// Init
// ============================================================
(function init() {
  updateCharCount();
  setStatus('neutral', 'JSONを入力してください');

  // サンプルJSON（初回表示）
  const sample = JSON.stringify({
    "name": "Keisanlab",
    "version": "1.0.0",
    "features": ["editor", "tree", "schema", "validate", "convert"],
    "meta": {
      "free": true,
      "noLogin": true,
      "language": "ja"
    }
  }, null, 2);

  jsonInput.value = sample;
  const result = parseJson(sample);
  if (result.ok) {
    currentJson = result.value;
    setStatus('ok', '有効なJSON (object)');
    updateCharCount();
  }
})();
