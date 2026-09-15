// 宵宫主题 · 自检工具
//
//   node tools/verify.mjs
//
// 在不安装到 DSH 运行环境的前提下，把 DESIGN.md 的护眼验收清单变成
// 可执行的断言。覆盖五项：
//   1. token 覆盖层符合 validateOverrides 的 { light, dark } 形状要求
//   2. 关键前景/背景对比度达标（WCAG 相对亮度公式）
//   3. 不出现纯黑与纯白
//   4. 生成的样式表结构完整（括号配平、必需选择器存在）
//   5. 浏览器半边引用的资源路径与 Host 半边注册的路由完全一致
//
// 退出码非 0 表示有硬性项不达标。
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const notes = [];

const fail = (msg) => failures.push(msg);

// ── 1 · 在桩 DOM 里加载浏览器半边 ───────────────────────────────
const fakeEl = () => ({
  id: '',
  textContent: '',
  setAttribute() {},
  remove() {},
});

let captured = null;
const window = {
  __ModuleLoader__: {
    load(spec) {
      captured = spec;
    },
  },
};
const document = {
  getElementById: () => null,
  createElement: fakeEl,
  head: { append() {} },
  body: {},
  documentElement: { setAttribute() {}, removeAttribute() {} },
  querySelectorAll: () => [],
};
class MutationObserver {
  observe() {}
  disconnect() {}
}

const src = readFileSync(join(root, 'bundle', 'client.js'), 'utf8');
new Function('window', 'document', 'MutationObserver', src)(window, document, MutationObserver);

if (captured === null) {
  fail('bundle/client.js 未调用 window.__ModuleLoader__.load');
  report();
}
if (captured.id !== 'dsh-yoimiya-theme') {
  fail(`模块 id 应为 dsh-yoimiya-theme，实际为 ${captured.id}`);
}

let capturedTokens = null;
let capturedCss = null;
const exportsObj = captured.factory(() => {});
const ctx = {
  get: (name) =>
    name === 'theme'
      ? {
          overrideTokens: (_source, tokens) => {
            capturedTokens = tokens;
            return () => {};
          },
        }
      : undefined,
  effect: (fn) => fn,
};

// 拦截样式表内容
const origGetElementById = document.getElementById;
void origGetElementById;
document.createElement = (tag) => {
  const el = fakeEl();
  Object.defineProperty(el, 'textContent', {
    get: () => capturedCss ?? '',
    set: (v) => {
      capturedCss = v;
    },
  });
  return el;
};

try {
  exportsObj.apply(ctx);
} catch (err) {
  fail(`apply() 抛错：${err.message}`);
  report();
}

// ── 2 · token 形状校验（等价于 validateOverrides）────────────────
const tokens = capturedTokens ?? {};
const tokenNames = Object.keys(tokens);
if (tokenNames.length === 0) fail('未捕获到任何 token 覆盖');

const CONTRACT = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-overlay',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-brand-primary',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-state-error-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-warn-primary',
  '--dsw-specific-sidebar-fill',
];
for (const name of CONTRACT) {
  if (!(name in tokens)) fail(`缺少官方主题契约 token：${name}`);
}

for (const [name, value] of Object.entries(tokens)) {
  if (typeof value === 'string') {
    fail(`token ${name} 是裸字符串——validateOverrides 会抛 TypeError`);
    continue;
  }
  if (typeof value?.light !== 'string' || typeof value?.dark !== 'string') {
    fail(`token ${name} 不是 { light, dark } 字符串对`);
  }
}

// ── 3 · 对比度 ─────────────────────────────────────────────────
const srgb = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const lum = (hex) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// 正文实际坐落的底：暗档是 bg-layer-1 的实色替身 #1A1622，
// 亮档是底色 #FAF3E8。
const DARK_BASE = '#1A1622';
const LIGHT_BASE = '#FAF3E8';

const CONTRAST = [
  // [说明, 前景 token, 取 light 还是 dark, 底色, 下限]
  ['暗档正文', '--dsw-alias-label-primary', 'dark', DARK_BASE, 10],
  ['亮档正文', '--dsw-alias-label-primary', 'light', LIGHT_BASE, 10],
  ['暗档次要文本', '--dsw-alias-label-secondary', 'dark', DARK_BASE, 6],
  ['亮档次要文本', '--dsw-alias-label-secondary', 'light', LIGHT_BASE, 5.5],
  ['暗档占位符/三级', '--dsw-alias-label-tertiary', 'dark', DARK_BASE, 4.5],
  ['亮档占位符/三级', '--dsw-alias-label-tertiary', 'light', LIGHT_BASE, 4.5],
  ['暗档品牌橙', '--dsw-alias-brand-primary', 'dark', DARK_BASE, 4.5],
  ['亮档品牌橙', '--dsw-alias-brand-primary', 'light', LIGHT_BASE, 4.5],
  ['暗档错误色', '--dsw-alias-state-error-primary', 'dark', DARK_BASE, 4.5],
  ['亮档错误色', '--dsw-alias-state-error-primary', 'light', LIGHT_BASE, 4.5],
  ['暗档成功色', '--dsw-alias-state-success-primary', 'dark', DARK_BASE, 4.5],
  ['亮档成功色', '--dsw-alias-state-success-primary', 'light', LIGHT_BASE, 4.5],
  ['暗档警告色', '--dsw-alias-state-warn-primary', 'dark', DARK_BASE, 4.5],
  ['亮档警告色', '--dsw-alias-state-warn-primary', 'light', LIGHT_BASE, 4.5],
];

console.log('对比度实测（WCAG 相对亮度）');
console.log('─'.repeat(58));
for (const [label, token, mode, base, min] of CONTRAST) {
  const hex = tokens[token]?.[mode];
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    fail(`${label}：${token}.${mode} 不是十六进制颜色（实际 ${hex}）`);
    continue;
  }
  const r = ratio(hex, base);
  const ok = r >= min;
  if (!ok) fail(`${label} 对比度 ${r.toFixed(2)}:1 低于下限 ${min}:1`);
  console.log(
    `${ok ? '✓' : '✗'} ${label.padEnd(16)} ${hex} on ${base}  ${r.toFixed(2)}:1  (下限 ${min})`,
  );
}

// 语法高亮 token 全量体检：代码块是长注视区，这里不放宽标准，
// 一律要求 4.5:1。底色取代码块与卡片的合成近似值（偏保守）。
const SHIKI_DARK_BG = '#18141C';
const SHIKI_LIGHT_BG = '#F4E8D6';
const SHIKI_TOKENS = [
  '--shiki-foreground',
  '--shiki-token-constant',
  '--shiki-token-string',
  '--shiki-token-string-expression',
  '--shiki-token-comment',
  '--shiki-token-keyword',
  '--shiki-token-parameter',
  '--shiki-token-function',
  '--shiki-token-punctuation',
  '--shiki-token-link',
];
console.log('');
console.log('语法高亮对比度');
console.log('─'.repeat(58));
for (const tok of SHIKI_TOKENS) {
  const dark = tokens[tok]?.dark;
  const light = tokens[tok]?.light;
  if (typeof dark !== 'string' || typeof light !== 'string') {
    fail(`缺少语法高亮 token ${tok}`);
    continue;
  }
  const rd = ratio(dark, SHIKI_DARK_BG);
  const rl = ratio(light, SHIKI_LIGHT_BG);
  if (rd < 4.5) fail(`${tok}.dark 对代码底仅 ${rd.toFixed(2)}:1`);
  if (rl < 4.5) fail(`${tok}.light 对代码底仅 ${rl.toFixed(2)}:1`);
  console.log(
    `${rd >= 4.5 && rl >= 4.5 ? '✓' : '✗'} ${tok.replace('--shiki-', '').padEnd(20)} 暗 ${rd.toFixed(2)}:1  亮 ${rl.toFixed(2)}:1`,
  );
}

// 停用层：WCAG 允许豁免，仅记录不判定
{
  const d = tokens['--dsw-alias-label-dimmed'];
  if (d) {
    notes.push(
      `停用层 label-dimmed 亮档 ${ratio(d.light, LIGHT_BASE).toFixed(2)}:1 / 暗档 ${ratio(d.dark, DARK_BASE).toFixed(2)}:1（按 WCAG 停用文本豁免，仅记录）`,
    );
  }
}

// ── 4 · 不出现纯黑与纯白 ───────────────────────────────────────
// 用十六进制色的完整边界匹配，而不是子串包含——否则 #FFFBF3 会被
// 误判成纯白 #FFF。
const PURE = new Set(['000', '000000', 'fff', 'ffffff']);
// mask-image 里出现的黑/白只是遮罩 alpha 的表达（遮罩只读 alpha 通道），
// 不参与任何渲染颜色，因此先剥离再扫描。
const stripMasks = (text) => text.replace(/(-webkit-)?mask-image\s*:[^;}]*/g, '');
const scanPure = (text, where) => {
  const body = stripMasks(text);
  for (const m of body.matchAll(/#([0-9a-fA-F]{3,8})/g)) {
    if (PURE.has(m[1].toLowerCase())) fail(`${where} 出现纯黑/纯白：#${m[1]}`);
  }
  // rgba 形式的纯黑纯白（排除全透明，那是渐变收尾的常用写法）
  const t = body.replace(/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/g, '');
  if (/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,)]/.test(t)) fail(`${where} 出现纯黑 rgba(0,0,0,…)`);
  if (/rgba?\(\s*255\s*,\s*255\s*,\s*255\s*[,)]/.test(t)) {
    fail(`${where} 出现纯白 rgba(255,255,255,…)`);
  }
};
scanPure(JSON.stringify(tokens), 'token 层');
scanPure(capturedCss ?? '', '样式表');

// ── 5 · 样式表结构 ─────────────────────────────────────────────
const css = capturedCss ?? '';
if (!css) fail('未捕获到生成的样式表');
const open = (css.match(/\{/g) ?? []).length;
const close = (css.match(/\}/g) ?? []).length;
if (open !== close) fail(`样式表括号不配平：{ × ${open}，} × ${close}`);

const REQUIRED_SELECTORS = [
  ['暗档 body 天空', 'body[data-ds-dark-theme]'],
  ['亮档 body 天空', 'body:not([data-ds-dark-theme])'],
  ['立绘层', 'body::before'],
  ['阅读遮罩层', 'body::after'],
  ['hero 阶段', '[data-phase="hero"]'],
  ['active 阶段', '[data-phase="active"]'],
  ['settling 阶段', '[data-phase="settling"]'],
  ['会话流阅读卡', '[data-chat-flow]'],
  ['输入卡', '[data-composer-card]'],
  ['占位文案', '[data-composer-placeholder]'],
  ['侧边栏根', '[data-dsh-sidebar-root]'],
  ['品牌标识容器', '[data-dsh-sidebar-brand-identity]'],
  ['品牌 mark 局部名', '[class*="_brandMark"]'],
  ['折叠态 mark 局部名', '[class*="_railMark"]'],
  ['会话行局部名', '[class*="_sessionRow"]'],
  ['激活态局部名', '[class*="_selected"]'],
];
for (const [label, sel] of REQUIRED_SELECTORS) {
  if (!css.includes(sel)) fail(`样式表缺少必需选择器（${label}）：${sel}`);
}
if (/IrIWsq_|DZ80Kq_|_1tdjgG_|Md3f7G_|uV2eYG_|_8JRpoa_/.test(css)) {
  fail('样式表硬编码了构建哈希类名——DSH 升级后会失效');
}
// 图层顺序：遮罩必须晚于立绘出现在样式表里，否则遮罩会被立绘盖住
const iBefore = css.indexOf('body::before');
const iAfter = css.indexOf('body::after');
if (iBefore < 0 || iAfter < 0) fail('未找到立绘层或遮罩层');
else if (iAfter < iBefore) fail('body::after 出现在 body::before 之前——遮罩会被立绘盖住');

// 全屏级 backdrop-filter：只数不带 -webkit- 前缀的声明，避免重复计数
const blurLayers = (css.match(/(?<!-webkit-)backdrop-filter:\s*blur/g) ?? []).length;
console.log('');
console.log(`backdrop-filter 表面数：${blurLayers}（设计约束：每个表面只叠一层，不做多层嵌套）`);

// ── 6 · 两半边资源路径一致性 ────────────────────────────────────
const hostSrc = readFileSync(join(root, 'bundle', 'host.js'), 'utf8');
const routes = new Set(
  [...hostSrc.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]),
);
const referenced = new Set(
  [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]).map((u) => u.replace(/^\$\{BG\}/, '/yoimiya-bg')),
);
console.log(`Host 注册路由：${[...routes].join(', ')}`);
console.log(`浏览器半边引用：${[...referenced].join(', ')}`);
for (const u of referenced) {
  if (!routes.has(u)) fail(`浏览器半边引用了 Host 未注册的路径：${u}`);
}
for (const r of routes) {
  if (!referenced.has(r)) notes.push(`Host 注册了但浏览器半边未引用：${r}`);
}

// 资源文件确实存在
const assetByRoute = {
  '/yoimiya-bg/yoimiya-wide.jpg': 'assets/yoimiya-wide.jpg',
  '/yoimiya-bg/yoimiya.jpg': 'assets/yoimiya.jpg',
  '/yoimiya-bg/bg-night.svg': 'assets/bg-night.svg',
  '/yoimiya-bg/bg-day.svg': 'assets/bg-day.svg',
  '/yoimiya-bg/mark.svg': 'assets/mark.svg',
  '/yoimiya-bg/mark-day.svg': 'assets/mark-day.svg',
};
for (const [route, rel] of Object.entries(assetByRoute)) {
  if (!existsSync(join(root, rel))) fail(`路由 ${route} 指向的资源不存在：${rel}`);
}

report();

function report() {
  console.log('');
  console.log('═'.repeat(58));
  if (notes.length > 0) {
    console.log('提示：');
    for (const n of notes) console.log(`  · ${n}`);
  }
  if (failures.length === 0) {
    console.log(`✓ 全部通过（token ${tokenNames.length} 个，对比度 ${CONTRAST.length} 项）`);
    process.exit(0);
  }
  console.log(`✗ ${failures.length} 项不达标：`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
