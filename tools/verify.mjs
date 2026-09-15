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
// 桩元素要尽量贴近真实 DOM：主题会写 className/dataset/style、挂子节点、
// 注册监听、取 2D 上下文。缺任何一个字段都会让 apply() 在桩里抛错，把真实
// 可用的代码误判为不合格。
//
// 两套桩，用途不同：
//   canvas2d: false（第 1 节用）getContext 返回 null。粒子层在这里走
//     「环境不支持」分支，于是画布逻辑不必被模拟，同时又验证那条降级路径不抛错。
//   canvas2d: true（第 8 节用）提供可用的 2D 上下文，用来验证粒子层【真的启用】。
//     只有 null 桩的话，createParticles 里任何真实错误都会被它的 try/catch 吞掉
//     只留一条 console.warn，整套检查照样全绿——这个坑真踩过。
function makeEnv({ canvas2d = false } = {}) {
  const mounted = [];
  const warnings = [];
  const fake2d = () => ({
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {},
    moveTo() {}, arc() {}, fill() {}, drawImage() {},
    fillStyle: '', globalCompositeOperation: '', globalAlpha: 1,
  });
  const fakeEl = () => ({
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    setAttribute() {},
    removeAttribute() {},
    remove() {},
    append() {},
    appendChild() {},
    addEventListener() {},
    removeEventListener() {},
    getContext: canvas2d ? fake2d : () => null,
  });

  let captured = null;
  const window = {
    __ModuleLoader__: {
      load(spec) {
        captured = spec;
      },
    },
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    setInterval() {
      return 1;
    },
    clearInterval() {},
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: false }),
    localStorage: {
      getItem: () => null,
      setItem() {},
    },
  };
  const document = {
    getElementById: () => null,
    createElement: fakeEl,
    head: { append() {} },
    body: {
      append(...nodes) {
        mounted.push(...nodes);
      },
      appendChild(node) {
        mounted.push(node);
      },
    },
    documentElement: { setAttribute() {}, removeAttribute() {} },
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    hidden: false,
  };
  return {
    window,
    document,
    mounted,
    warnings,
    get captured() {
      return captured;
    },
  };
}
class MutationObserver {
  observe() {}
  disconnect() {}
}

const src = readFileSync(join(root, 'bundle', 'client.js'), 'utf8');
const env = makeEnv();
new Function('window', 'document', 'MutationObserver', src)(env.window, env.document, MutationObserver);

const window = env.window;
const document = env.document;
// 必须先把原始 createElement 抓在手里：下面为了拦截样式表会把
// document.createElement 换成一个调用 fakeEl() 的包装，而 fakeEl 如果还去解析
// document.createElement，就会变成自我递归（栈溢出）。
const rawCreateElement = env.document.createElement;
const fakeEl = () => rawCreateElement('div');
const captured = env.captured;

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
  if (tag !== 'style') return el;
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

// ── 3b · 样式表里硬编码的颜色也要达标 ───────────────────────────
// token 表之外，样式表里还有几处硬编码颜色。早先只检查 token 表，漏掉了占位色，
// 结果亮档实测只有 4.03:1 —— 修 token 时改了 label-tertiary，却忘了这一处。
// 卡片底面取近似值：暗档是 rgba(28,22,34,.78) 叠在暗遮罩上，亮档是
// rgba(255,252,246,.94) 叠在纸底上。
const DARK_CARD = '#282231';
const LIGHT_CARD = '#FCF8F0';
const HARDCODED_COLORS = [
  ['占位文案 · 暗档', /\[data-composer-placeholder\]\s*\{\s*color:\s*(#[0-9A-Fa-f]{6})/, DARK_CARD],
  ['占位文案 · 亮档', /body:not\(\[data-ds-dark-theme\]\)\s*\[data-composer-placeholder\]\s*\{\s*color:\s*(#[0-9A-Fa-f]{6})/, LIGHT_CARD],
];
console.log('');
console.log('样式表硬编码颜色');
console.log('─'.repeat(58));
for (const [label, re, card] of HARDCODED_COLORS) {
  const m = re.exec(css);
  if (m === null) { fail(`样式表里找不到「${label}」的颜色（选择器被改过了？）`); continue; }
  const r = ratio(m[1], card);
  if (r < 4.5) fail(`${label} ${m[1]} 对卡片 ${card} 仅 ${r.toFixed(2)}:1，低于 4.5:1`);
  console.log(`${r >= 4.5 ? '✓' : '✗'} ${label.padEnd(16)} ${m[1]} on ${card}  ${r.toFixed(2)}:1`);
}
if (!css) fail('未捕获到生成的样式表');
const open = (css.match(/\{/g) ?? []).length;
const close = (css.match(/\}/g) ?? []).length;
if (open !== close) fail(`样式表括号不配平：{ × ${open}，} × ${close}`);

const REQUIRED_SELECTORS = [
  ['暗档 body 天空', 'body[data-ds-dark-theme]'],
  ['亮档 body 天空', 'body:not([data-ds-dark-theme])'],
  ['立绘层', 'body::before'],
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
// 先剥掉 CSS 注释再扫：注释里为了说明问题会写出哈希类名，
// 但规则针对的是【选择器】——注释不参与渲染，不该判失败。
// backdrop-filter 会为元素创建【固定定位后代的包含块】。DSH 的设置面板等
// 浮层是 position: fixed，一旦挂在带 backdrop-filter 的子树里，就会以该
// 元素为参照定位——实测表现为「设置面板跑到侧边栏里展开」。这个破坏是静默
// 的：样式本身生效、控制台无报错、只有交互时才暴露。故整体禁用。
{
  const n = (css.match(/backdrop-filter:/g) ?? []).length;
  if (n > 0) fail(`样式表出现了 ${n} 处 backdrop-filter：会破坏固定定位浮层的位置，禁止使用`);
}// 模板变量拼错或未定义时，CSS 里会留下字面量 undefined，那条声明整条失效
// 且没有任何报错——必须拦下。
if (/\bundefined\b/.test(css)) fail('样式表里出现 undefined —— 模板变量未定义或拼错');// 注释配平：未闭合的 /* 会把它之后的所有规则一起吞掉，而花括号计数仍然"平衡"，
// 现有检查全部察觉不到。本主题的注释里会写上选择器片段，容易踩这个坑。
{
  const opens = (css.match(/\/\*/g) ?? []).length;
  const closes = (css.match(/\*\//g) ?? []).length;
  if (opens !== closes) fail(`样式表注释未配平：/* ×${opens}，*/ ×${closes}`);
}const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
if (/IrIWsq_|DZ80Kq_|_1tdjgG_|Md3f7G_|uV2eYG_|_8JRpoa_/.test(cssNoComments)) {
  fail('样式表硬编码了构建哈希类名——DSH 升级后会失效');
}
// 图层顺序：遮罩必须晚于立绘出现在样式表里，否则遮罩会被立绘盖住
// 本主题刻意不设阅读遮罩：壁纸直接呈现在 body 背景上，可读性由会话卡
// 自身的半透明底面与毛玻璃提供。曾用中心遮罩压平背景，会把画面压闷，已废弃。

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
  [...css.matchAll(/url\('([^']+)'\)/g)]
    .map((m) => m[1])
    .map((u) => u.replace(/^\$\{BG\}/, '/yoimiya-bg'))
    // 剥掉查询串再比对：资源 URL 会带 ?v=<ASSET_V> 做缓存失效，
    // 而 Host 路由只按 pathname 匹配，带查询串并不影响命中。
    .map((u) => u.split('?')[0]),
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

// ── 7 · 两档标识必须是同一条鱼 ──────────────────────────────────
// 暗档与亮档只允许换颜色，几何必须逐字一致。曾经出现过只改了一份、另一份
// 留在旧体型的情况，后果是明暗切换时像换了个 logo。
// 做法：抹掉所有颜色相关属性与标题，剩下的"骨架"必须完全相同——这样今后
// 任何新增的几何元素也一并受约束，不用逐个列举。
const markSkeleton = (rel) =>
  readFileSync(join(root, rel), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/\s(?:fill|stroke|stop-color|stop-opacity|opacity|aria-label|role)="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const skelDark = markSkeleton('assets/mark.svg');
const skelLight = markSkeleton('assets/mark-day.svg');
console.log('');
console.log(`标识骨架：mark.svg ${skelDark.length} 字符 / mark-day.svg ${skelLight.length} 字符`);
if (skelDark !== skelLight) {
  const at = [...skelDark].findIndex((c, i) => c !== skelLight[i]);
  fail(`两档标识的几何不一致（自第 ${at} 个字符起）：mark.svg 与 mark-day.svg 必须只差颜色`);
}

// ── 8 · 粒子层必须真的启用，不能静默降级 ────────────────────────
// createParticles() 整个包在 try/catch 里，失败只留一条 console.warn，主题照常
// 工作。这是有意的——粒子是纯装饰，不该拖垮主题——但代价是【那里面的任何真实
// 错误都不会让检查变红】。
//
// 真踩过：`let ratio` 被写在了 resize() 之下，而 resize() 在定义处就立即调用，
// 一撞 TDZ 整个粒子层失效。当时 verify 与封面回归测试都是绿的，因为第 1 节那个
// 桩的 getContext 返回 null，createParticles 在那里就提前 return 了。
//
// 所以这里用一个具备 2D 上下文的桩再跑一遍 apply()，要求两件事同时成立：
//   · 全程没有任何 console.warn / console.error
//   · 粒子画布确实被挂到了 body 上
{
  const probe = makeEnv({ canvas2d: true });
  const realWarn = console.warn;
  const realError = console.error;
  console.warn = (...args) => probe.warnings.push(`warn: ${args.join(' ')}`);
  console.error = (...args) => probe.warnings.push(`error: ${args.join(' ')}`);
  try {
    new Function('window', 'document', 'MutationObserver', src)(
      probe.window,
      probe.document,
      MutationObserver,
    );
    probe.captured.factory(() => {}).apply({
      get: (name) => (name === 'theme' ? { overrideTokens: () => () => {} } : undefined),
      effect: (fn) => fn,
    });
  } catch (error) {
    probe.warnings.push(`apply() 抛错：${error.message}`);
  } finally {
    console.warn = realWarn;
    console.error = realError;
  }

  const particleCanvas = probe.mounted.some(
    (node) => node !== null && typeof node === 'object' && node.className === 'dsh-yoimiya-particles',
  );
  console.log('');
  console.log(
    `粒子层实测：画布已挂载 ${particleCanvas ? '是' : '否'}，告警 ${probe.warnings.length} 条`,
  );
  for (const w of probe.warnings) {
    fail(`粒子层启用时有告警（说明它被静默跳过了）：${w}`);
  }
  if (!particleCanvas) {
    fail('粒子层没有挂载画布：在具备 2D 上下文的环境里 createParticles() 也应成功');
  }
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
