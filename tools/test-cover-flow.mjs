// 端到端模拟封面流程，定位它究竟断在哪一步。
// 桩 DOM 记录子节点，因此可以从 DOM 树里找到按钮并触发点击。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let css = null;
const log = [];
const seen = [];

function mkEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    className: '', textContent: '', innerHTML: '', value: '', type: '', accept: '',
    hidden: false, disabled: false, tabIndex: 0, files: null,
    style: {}, dataset: {}, children: [], parent: null, handlers: {},
    setAttribute() {}, removeAttribute() {},
    remove() { if (el.parent) el.parent.children = el.parent.children.filter((c) => c !== el); },
    addEventListener(t, f) { el.handlers[t] = f; },
    removeEventListener() {},
    append(...cs) { for (const c of cs) { if (c) { c.parent = el; el.children.push(c); } } },
    appendChild(c) { el.append(c); },
    contains(n) { let p = n; while (p) { if (p === el) return true; p = p.parent; } return false; },
    click() { if (el.handlers.click) el.handlers.click({ stopPropagation() {}, preventDefault() {}, target: el }); },
    fire(t, ev) { if (el.handlers[t]) el.handlers[t](ev); },
    getContext() { return null; },
  };
  if (el.tagName === 'CANVAS') {
    el.getContext = () => ({
      setTransform() {}, clearRect() {}, drawImage() { seen.push('drawImage'); },
      fillRect() {}, beginPath() {}, arc() {}, fill() {},
      fillStyle: '', globalCompositeOperation: '',
    });
    el.toBlob = (cb) => { seen.push('toBlob'); cb({ type: 'image/webp', size: 4096 }); };
  }
  return el;
}

function findByClass(node, cls) {
  if (node.className && String(node.className).split(/\s+/).includes(cls)) return node;
  for (const c of node.children) { const hit = findByClass(c, cls); if (hit) return hit; }
  return null;
}
function findByText(node, text) {
  if (node.textContent === text) return node;
  for (const c of node.children) { const hit = findByText(c, text); if (hit) return hit; }
  return null;
}

class FakeImage {
  constructor() { this.width = 800; this.height = 600; }
  set src(v) { this._src = v; setTimeout(() => { if (this.onload) this.onload(); }, 0); }
  get src() { return this._src; }
}

const songs = [
  { id: 'a.mp3', title: 'a', audio: 'a.mp3', image: null, size: 100 },
];

const calls = [];
const fetchStub = async (url, opts) => {
  calls.push(String(opts?.method ?? 'GET') + ' ' + url);
  if (String(url).startsWith('/yoimiya-music/list')) {
    return { ok: true, status: 200, json: async () => ({ ok: true, dir: 'D:/music', songs }), text: async () => JSON.stringify({ ok: true, dir: 'D:/music', songs }) };
  }
  return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '{"ok":true}' };
};

const body = mkEl('body');
const document = {
  body,
  head: mkEl('head'),
  documentElement: mkEl('html'),
  hidden: false,
  getElementById: () => null,
  createElement: (tag) => {
    const e = mkEl(tag);
    if (tag === 'style') Object.defineProperty(e, 'textContent', { get: () => css, set: (v) => { css = v; } });
    return e;
  },
  querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
};

const window = {
  __ModuleLoader__: { load(spec) { globalThis.__spec = spec; } },
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {},
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  setTimeout: (f, t) => setTimeout(f, t), clearTimeout, setInterval: () => 1, clearInterval() {},
  performance: { now: () => 0 },
  matchMedia: () => ({ matches: false }),
  localStorage: { getItem: () => null, setItem() {} },
};

class MutationObserver { observe() {} disconnect() {} }

const src = readFileSync(join(root, 'bundle', 'client.js'), 'utf8');
// URL 必须传【类】而不是普通对象：真实浏览器里 typeof URL 是 'function'。
// 传普通对象会让 typeof URL === 'object' 这种错误写法蒙混过关——这个坑真踩过，
// 当时裁切弹窗在真实环境里根本打不开，测试却全绿。
class FakeURL {
  static createObjectURL() { return 'blob:fake'; }
  static revokeObjectURL() {}
}
new Function('window', 'document', 'MutationObserver', 'fetch', 'URL', 'Image', 'console', src)(
  window, document, MutationObserver, fetchStub, FakeURL, FakeImage, console,
);

const ex = globalThis.__spec.factory(() => {});
ex.apply({ get: (n) => (n === 'theme' ? { overrideTokens: () => () => {} } : undefined), effect: (f) => f });

const dock = findByClass(body, 'dsh-yoimiya-dock');
console.log('dock 挂载:', dock !== null);
console.log('  音乐面板:', findByClass(body, 'dsh-yoimiya-music') !== null);
console.log('  裁切弹窗:', findByClass(body, 'dsh-yoimiya-crop-back') !== null);
console.log('  封面选择器:', findByClass(body, 'dsh-yoimiya-music-picker') !== null);

const btnsRow = findByClass(body, 'dsh-yoimiya-dock-btns');
console.log('  按钮组:', btnsRow !== null, '子按钮数:', btnsRow ? btnsRow.children.length : 0);
const musicBtn = btnsRow.children[1];
console.log('  打开音乐面板…');
musicBtn.click();

await new Promise((r) => setTimeout(r, 30));

const listBtn = findByClass(body, 'dsh-yoimiya-music-listbtn');
console.log('  列表按钮:', listBtn !== null);
listBtn.click();
await new Promise((r) => setTimeout(r, 30));

const rowTitle = findByClass(body, 'dsh-yoimiya-music-title');
console.log('  列表出现曲目行:', rowTitle !== null, rowTitle ? rowTitle.textContent : '');
const thumb = findByClass(body, 'dsh-yoimiya-music-thumb');
console.log('  缩略图按钮:', thumb !== null, ' (tagName=' + (thumb ? thumb.tagName : '-') + ')');

console.log('');
console.log('--- 点缩略图 → 走封面流程 ---');
thumb.click();
await new Promise((r) => setTimeout(r, 20));

const line = findByClass(body, 'dsh-yoimiya-music-now');
console.log('  曲目行文字:', line.textContent);

// 新的封面路径：点缩略图 → 打开封面弹窗 → 往拖放区丢文件 → 裁切 → 上传
const coverBack = findByClass(body, 'dsh-yoimiya-modal-back');
let coverDialog = null;
(function walk(n) {
  if (n.className && String(n.className).includes('dsh-yoimiya-modal-back') && n.dataset.open === 'true') coverDialog = n;
  n.children.forEach(walk);
})(body);
console.log('  封面弹窗已打开:', coverDialog !== null);
console.log('  弹窗标题:', coverDialog ? (findByText(coverDialog, '设置封面') !== null) : false);

const drop = coverDialog ? findByClass(coverDialog, 'dsh-yoimiya-drop') : null;
console.log('  拖放区存在:', drop !== null);
drop.fire('drop', {
  preventDefault() {},
  dataTransfer: { files: [{ name: 'cover.jpg', type: 'image/jpeg', size: 1000 }] },
});
await new Promise((r) => setTimeout(r, 40));

// 合并后：同一个弹窗内切换视图，找裁切视图的确认按钮
const confirm = findByText(coverDialog, '使用这张');
console.log('  裁切视图确认按钮:', confirm !== null, confirm ? '(hidden=' + confirm.hidden + ')' : '');
if (confirm !== null) {
  confirm.click();
  await new Promise((r) => setTimeout(r, 60));
  console.log('  确认后封面弹窗:', coverBack.dataset.open);
  console.log('  确认后曲目行:', findByClass(body, 'dsh-yoimiya-music-now').textContent);
}

console.log('');
console.log('--- fetch 调用序列 ---');
calls.forEach((c) => console.log('  ' + c));
console.log('');
console.log('--- canvas 操作 ---');
console.log('  ' + (seen.join(', ') || '(无)'));
