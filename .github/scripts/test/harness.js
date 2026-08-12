/**
 * 各アプリの script.js をブラウザ無しで読み込み、計算関数を直接呼べるようにする。
 *
 * アプリはビルド無しの素のJSで、DOM前提で書かれている（トップレベルで
 * getElementById を呼ぶ、計算関数が入力値をDOMから読む等）。
 * そこで最小限のDOMを偽装して vm で評価し、定義された関数を取り出す。
 *
 * 依存パッケージは使わない。Node標準のみで動く。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..', '..', '..');

/** テストから値を差し込める偽の要素 */
function makeElement(id, values) {
  const el = {
    id,
    value: values && Object.prototype.hasOwnProperty.call(values, id) ? String(values[id]) : '',
    textContent: '',
    innerHTML: '',
    checked: false,
    hidden: false,
    style: {},
    dataset: {},
    children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    removeChild() {},
    insertBefore(c) { el.children.push(c); return c; },
    querySelector: () => makeElement('', values),
    querySelectorAll: () => [],
    closest: () => null,
    getContext: () => null,
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    focus() {},
    click() {},
    scrollIntoView() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  };
  return el;
}

/**
 * 指定アプリの script.js を評価し、グローバルに定義された関数群を返す。
 *
 * @param {string} app            apps/ 配下のディレクトリ名
 * @param {object} inputValues    要素ID -> 入力値。計算関数がDOMから読む値を差し込む
 * @returns {object}              script.js が定義したトップレベルの関数・変数
 */
function loadApp(app, inputValues = {}) {
  const file = path.join(REPO, 'apps', app, 'script.js');
  const code = fs.readFileSync(file, 'utf8');

  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id, inputValues));
    return elements.get(id);
  };

  const documentStub = {
    getElementById: getEl,
    querySelector: (sel) => getEl(String(sel).replace(/^[#.]/, '')),
    querySelectorAll: () => [],
    createElement: (tag) => makeElement(tag, inputValues),
    createTextNode: (t) => ({ textContent: t }),
    addEventListener() {},
    body: makeElement('body', inputValues),
    documentElement: makeElement('html', inputValues),
    head: makeElement('head', inputValues),
  };

  const sandbox = {
    document: documentStub,
    window: {
      addEventListener() {},
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      localStorage: {
        _d: {},
        getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
        setItem(k, v) { this._d[k] = String(v); },
        removeItem(k) { delete this._d[k]; },
        clear() { this._d = {}; },
      },
      print() {},
      scrollTo() {},
    },
    console: { log() {}, warn() {}, error() {}, info() {} },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp, Error,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    Intl, Map, Set, Promise,
    // Chart.js 等のCDNライブラリはテスト対象外なのでダミーを置く
    Chart: function Chart() { return { destroy() {}, update() {} }; },
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.localStorage = sandbox.window.localStorage;
  sandbox.alert = () => {};

  vm.createContext(sandbox);

  // 関数宣言はサンドボックスのグローバルに載るが、const / let は
  // レキシカルスコープに閉じてしまい外から参照できない。
  // トップレベルの宣言名を拾って、末尾で明示的に公開する。
  const topLevelBindings = [...code.matchAll(/^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/gm)].map((m) => m[1]);
  const exportTail = topLevelBindings.length
    ? '\n;(function(){' +
      topLevelBindings
        .map((n) => `try{ globalThis[${JSON.stringify(n)}] = ${n}; }catch(e){}`)
        .join('') +
      '})();'
    : '';

  new vm.Script(code + exportTail, { filename: `apps/${app}/script.js` }).runInContext(sandbox);

  // テスト側から入力値を差し替えられるようにしておく
  sandbox.__setInput = (id, v) => { getEl(id).value = String(v); };
  sandbox.__getElement = getEl;
  return sandbox;
}

module.exports = { loadApp };
