// 宵宫主题 · 浏览器半边（dsh-yoimiya-theme）
//
// 由包的 ./client 导出注册进 Web 模块加载器；cordis 加载器采纳
// exports 上的 apply/inject 作为插件对象。
//
// 交付内容：
//   1. 暗色「夏祭夜」/ 亮色「和纸昼」两档完整调色板（token 叠加层）
//   2. 边缘有戏 / 中间安静的三层背景 + 中心阅读遮罩
//   3. 暖色系代码语法高亮（改写 shiki 变量，避开高饱和蓝紫）
//   4. 自绘金鱼标识替换侧边栏品牌 mark（含折叠态）
//   5. 会话激活项的橙色「引线」竖条
//   6. 占位文案换成宵宫台词
//
// 所有副作用都登记在 ctx.effect 上，禁用/移除插件时页面可完全复原。
//
// ── 选择器策略（重要，维护须知）────────────────────────────────
// DSH 组件样式表用 CSS Modules，类名形如 `<构建哈希>_<局部名>`（例如
// IrIWsq_sessionRow）。哈希随构建变化，局部名稳定。因此本文件：
//   · 优先用稳定 data-* 属性（data-composer-card、data-dsh-sidebar-brand-identity…）
//   · 其次用 [class*="_局部名"] 子串匹配，不硬编码哈希
// 绝不硬编码具体哈希前缀——那正是同类主题在 DSH 升级后失效的原因。
window.__ModuleLoader__.load({
  id: 'dsh-yoimiya-theme',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const inject = ['theme'];

    // ══════════════════════════════════════════════════════════════
    //  调参区
    // ══════════════════════════════════════════════════════════════

    /** 背景强度：'standard' 完整氛围 | 'calm' 半透明减噪 | 'plain' 近纯色 */
    const INTENSITY = 'standard';

    /** 资源路由前缀（与 bundle/host.js 的注册路径一致）。 */
    const BG = '/yoimiya-bg';

    // 资源版本号。【改过 assets/ 里的任何文件就要把它 +1】。
    // 主题资源由 Host 以 max-age=3600 提供，URL 不变就一直是旧的——改了标识
    // 却看不到新图，很容易误判成"没生效"。加一个查询串即可换 URL，从而绕过
    // 缓存；路由只按 pathname 匹配，查询串不影响命中。
    const ASSET_V = 'v4';
    const asset = (file) => `${BG}/${file}?v=${ASSET_V}`;

    /** 背景层透明度缩放。 */
    const SCALE = INTENSITY === 'calm' ? 0.5 : INTENSITY === 'plain' ? 0.06 : 1;

    /** plain 档不加载烟花场景，只留极淡底色。 */
    const SCENE = INTENSITY === 'plain' ? false : true;

    /** 透明度书写助手：按 SCALE 缩放并裁剪浮点噪声。 */
    const a = (v) => String(Math.round(v * SCALE * 1000) / 1000);

// 背景强度档位作用在【壁纸】上。壁纸是背景的主体，而环境光渐变被它完全盖住，
// 缩放那些渐变等于什么都没做——曾经就是这样，三档在视觉上完全相同。
//   standard  全幅全亮（brightness 1.14，把夜景提成"明亮的夜"）
//   calm      略微退后一档，长时间阅读更安静
//   plain     壁纸不透明度归零，只留程序化天空
const WALL_OPACITY = INTENSITY === 'plain' ? 0 : INTENSITY === 'calm' ? 0.86 : 1;
const WALL_BRIGHT = INTENSITY === 'calm' ? 1.06 : 1.14;

    // ── 占位文案：宵宫台词 ────────────────────────────────────────
    // 用「前缀匹配 + 保留尾串」而不是整串替换，这样「… / 调用指令 @ 文件或对话」
    // 这类功能提示会原样保留，语言与文案微调都不会让它失效。
    const PLACEHOLDER_REWRITE = [
      ['发消息或做任务', '想放什么样的烟花'],
      ['描述你想要构建的内容', '想看烟花吗？描述你想要构建的内容'],
      ['Message the agent', 'What kind of fireworks tonight?'],
      ['Describe what you want to build', 'Want to see some fireworks? Describe what you want to build'],
    ];

    function rewritePlaceholder(text) {
      for (const [from, to] of PLACEHOLDER_REWRITE) {
        if (text.startsWith(from)) return to + text.slice(from.length);
      }
      return null;
    }

    // ══════════════════════════════════════════════════════════════
    //  调色板
    // ══════════════════════════════════════════════════════════════
    //
    // 两档不是同一组颜色的明暗翻转，而是独立取值：
    //   暗档底色取暖靛黑（非冷蓝黑，冷蓝会推高蓝通道且与焰橙视觉振动）
    //   橙金在暗底上提亮才可读、在纸底上压深才可读 → brand 是两个值
    // 正文对比度（已核算）：暗 #EDE3D3/#1A1622 ≈ 13.9:1，亮 #33261C/#F3EADA ≈ 13.3:1
    // 次要文本 6–8:1，占位符 ≥ 4.5:1。详见 DESIGN.md 验收清单。

    /** light / dark 值对。validateOverrides 要求每个 token 都是这对形状。 */
    const p = (light, dark) => ({ light, dark });

    const TOKENS = {
      // ── 底色 ──────────────────────────────────────────────────
      // bg-base 必须【完全透明】：DSH 会在三个嵌套容器上各画一次它
      //   ._1tdjgG_frame / ._8JRpoa_root / .jhU3aG_root
      // 哪怕单层只有 0.10，三层叠加也有 27%，会把壁纸压平、让
      // backdrop-filter 失去可模糊的结构（毛玻璃因此看不出来）。
      // 设为 0 之后这三层等于不存在，body 上的壁纸与遮罩直接透上来——
      // 所以不需要去改 DSH 本体，那样做还无法随主题分发。
      // 必须接近全透明：ui-layout 的 .frame 消费该 token 且铺满全屏，
      // 不透明会把 body 上的背景场景整个盖住。
      '--dsw-alias-bg-base': p('rgba(250,243,232,0)', 'rgba(14,12,20,0)'),
      '--dsw-alias-bg-layer-1': p('rgba(255,251,243,0.86)', 'rgba(26,22,34,0.72)'),
      '--dsw-alias-bg-layer-2': p('rgba(245,235,218,0.88)', 'rgba(34,28,43,0.78)'),
      '--dsw-alias-bg-layer-3': p('rgba(240,228,208,0.90)', 'rgba(40,33,50,0.82)'),
      '--dsw-alias-bg-overlay': p('rgba(255,253,248,0.97)', 'rgba(30,26,41,0.96)'),
      '--dsw-alias-bg-module-platform': p('rgba(120,80,40,0.06)', 'rgba(240,200,140,0.06)'),
      '--dsw-alias-bg-multi-select': p('rgba(181,80,42,0.12)', 'rgba(224,138,60,0.14)'),
      '--dsw-alias-bg-skeleton': p('rgba(120,80,40,0.07)', 'rgba(240,200,140,0.07)'),
      '--dsw-alias-bg-mask-1': p('rgba(60,40,25,0.10)', 'rgba(8,6,14,0.30)'),
      '--dsw-alias-bg-mask-2': p('rgba(60,40,25,0.18)', 'rgba(8,6,14,0.45)'),
      '--dsw-alias-bg-mask-3': p('rgba(60,40,25,0.28)', 'rgba(8,6,14,0.60)'),
      '--dsw-alias-bg-mask-drop': p('rgba(60,40,25,0.14)', 'rgba(8,6,14,0.38)'),
      '--dsw-alias-bg-mask-photo': p('rgba(60,40,25,0.45)', 'rgba(8,6,14,0.62)'),

      // ── 描边（暖金 / 暖褐，不用冷灰）──────────────────────────
      '--dsw-alias-border-l1': p('rgba(120,80,40,0.14)', 'rgba(240,200,140,0.14)'),
      '--dsw-alias-border-l2': p('rgba(120,80,40,0.26)', 'rgba(240,200,140,0.24)'),
      '--dsw-alias-border-l3': p('rgba(120,80,40,0.34)', 'rgba(240,200,140,0.32)'),
      '--dsw-alias-border-l4': p('rgba(120,80,40,0.42)', 'rgba(240,200,140,0.40)'),
      '--dsw-alias-border-l2-darkmode-thin': p('rgba(120,80,40,0.18)', 'rgba(240,200,140,0.16)'),
      '--dsw-alias-border-inverted': p('rgba(20,17,28,0.85)', 'rgba(237,227,211,0.85)'),
      '--dsw-alias-border-inverted2': p('rgba(20,17,28,0.55)', 'rgba(237,227,211,0.55)'),

      // ── 品牌 ──────────────────────────────────────────────────
      '--dsw-alias-brand-primary': p('#B5502A', '#E08A3C'),
      '--dsw-alias-brand-primary-invert': p('#F3EADA', '#14111C'),
      '--dsw-alias-brand-text': p('#9E4523', '#EDBE86'),

      // ── 文字 ──────────────────────────────────────────────────
      '--dsw-alias-label-primary': p('#33261C', '#EDE3D3'),
      '--dsw-alias-label-primary-bluish': p('#3A2C20', '#EFE6D6'),
      '--dsw-alias-label-primary-dimmed': p('#6B5A4A', '#B9AC9C'),
      '--dsw-alias-label-primary-foreground': p('#F3EADA', '#14111C'),
      '--dsw-alias-label-primary-inverted': p('#FFFBF3', '#1A1622'),
      '--dsw-alias-label-secondary': p('#6B5A4A', '#B9AC9C'),
      // tertiary/caption 就是占位符与辅助文字那一层，必须守住 4.5:1（亮档实测 4.70）。
      '--dsw-alias-label-tertiary': p('#7C6A56', '#8A7F72'),
      '--dsw-alias-label-caption': p('#7C6A56', '#8A7F72'),
      // dimmed 是停用/极弱化层，按 WCAG 属豁免档，故浅于 tertiary。
      '--dsw-alias-label-dimmed': p('#847058', '#77695F'),

      // ── 状态（一律柔化，不用高饱和正色）──────────────────────
      '--dsw-alias-state-error-primary': p('#B33A2E', '#E0685E'),
      '--dsw-alias-state-error-secondary': p('#8E2C22', '#B8524A'),
      '--dsw-alias-state-error-tertiary': p('rgba(179,58,46,0.13)', 'rgba(224,104,94,0.14)'),
      '--dsw-alias-state-success-primary': p('#4A734D', '#86C08A'),
      '--dsw-alias-state-success-secondary': p('#3C6040', '#6BA36F'),
      '--dsw-alias-state-success-tertiary': p('rgba(79,122,82,0.14)', 'rgba(134,192,138,0.14)'),
      '--dsw-alias-state-warn-primary': p('#96631A', '#E9B44C'),
      '--dsw-alias-state-warn-secondary': p('#7A5014', '#C99A3E'),
      '--dsw-alias-state-warn-tertiary': p('rgba(150,99,26,0.14)', 'rgba(233,180,76,0.14)'),
      '--dsw-alias-state-warn-label': p('#6B4610', '#F0C878'),
      '--dsw-alias-state-business-primary': p('#A8492A', '#D98A4A'),
      '--dsw-alias-state-business-tertiary': p('rgba(168,73,42,0.13)', 'rgba(217,138,74,0.14)'),

      // ── 交互 ──────────────────────────────────────────────────
      '--dsw-alias-interactive-bg-hover': p('rgba(120,80,40,0.07)', 'rgba(240,200,140,0.07)'),
      '--dsw-alias-interactive-bg-hover-solid': p('rgba(120,80,40,0.10)', 'rgba(240,200,140,0.10)'),
      '--dsw-alias-interactive-bg-active': p('rgba(181,80,42,0.14)', 'rgba(224,138,60,0.16)'),
      '--dsw-alias-interactive-bg-hover-accent': p('rgba(181,80,42,0.16)', 'rgba(224,138,60,0.18)'),
      '--dsw-alias-interactive-bg-hover-danger': p('rgba(179,58,46,0.12)', 'rgba(224,104,94,0.12)'),

      // ── 按钮 ──────────────────────────────────────────────────
      '--dsw-alias-button-primary-fill': p('#B5502A', '#E08A3C'),
      '--dsw-alias-button-primary-hover': p('#9E4523', '#EFA05A'),
      '--dsw-alias-button-primary-dimmed': p('rgba(181,80,42,0.16)', 'rgba(224,138,60,0.18)'),
      '--dsw-alias-button-elevated-fill': p('rgba(255,251,243,0.86)', 'rgba(240,200,140,0.08)'),
      '--dsw-alias-button-floating-fill': p('rgba(255,250,242,0.72)', 'rgba(240,200,140,0.10)'),
      '--dsw-alias-button-floating-hover': p('rgba(255,250,242,0.88)', 'rgba(240,200,140,0.16)'),
      '--dsw-alias-button-ghost-active-fill': p('rgba(181,80,42,0.12)', 'rgba(224,138,60,0.14)'),
      '--dsw-alias-button-ghost-active-hover': p('rgba(181,80,42,0.18)', 'rgba(224,138,60,0.20)'),
      '--dsw-alias-button-ghost-active-border': p('rgba(181,80,42,0.42)', 'rgba(224,138,60,0.42)'),
      '--dsw-alias-button-tool-bar-fill': p('rgba(120,80,40,0.06)', 'rgba(240,200,140,0.08)'),
      '--dsw-alias-button-tool-bar-hover': p('rgba(120,80,40,0.12)', 'rgba(240,200,140,0.14)'),
      '--dsw-alias-button-tool-bar-fill-invisible': p('rgba(120,80,40,0.06)', 'rgba(240,200,140,0.08)'),
      '--dsw-alias-button-info-fill': p('#A8492A', '#D98A4A'),
      '--dsw-alias-button-info-hover': p('#94401F', '#E39A5C'),
      '--dsw-alias-button-contrast-fill': p('rgba(51,38,28,0.88)', 'rgba(237,227,211,0.90)'),

      // ── Markdown / 代码 ───────────────────────────────────────
      '--dsw-alias-markdown-code-block': p('rgba(244,232,214,0.72)', 'rgba(24,20,28,0.72)'),
      '--dsw-alias-markdown-code-block-banner': p('rgba(181,80,42,0.07)', 'rgba(224,138,60,0.08)'),
      '--dsw-alias-markdown-inline-code': p('rgba(181,80,42,0.10)', 'rgba(224,138,60,0.10)'),
      '--dsw-alias-markdown-tag': p('rgba(181,80,42,0.10)', 'rgba(224,138,60,0.10)'),
      '--dsw-alias-markdown-citation': p('rgba(181,80,42,0.10)', 'rgba(224,138,60,0.10)'),
      '--dsw-alias-markdown-placeholder': p('rgba(120,80,40,0.06)', 'rgba(240,200,140,0.06)'),
      '--dsw-alias-markdown-code-segment-unselected': p('rgba(120,80,40,0.05)', 'rgba(240,200,140,0.06)'),
      '--dsw-alias-markdown-code-segment-selected': p('rgba(181,80,42,0.16)', 'rgba(224,138,60,0.18)'),

      // ── 滚动条（scrollbar.css 唯一消费这组 token，换它们即可，
      //      不必去覆盖 ::-webkit-scrollbar-*，以免破坏侧边栏的
      //      transparent 重绑定）────────────────────────────────
      '--dsw-alias-scrollbar-bg-l1': p('rgba(120,80,40,0.20)', 'rgba(240,200,140,0.22)'),
      '--dsw-alias-scrollbar-bg-l2': p('rgba(120,80,40,0.26)', 'rgba(240,200,140,0.26)'),
      '--dsw-alias-scrollbar-hover-l1': p('rgba(120,80,40,0.36)', 'rgba(240,200,140,0.42)'),
      '--dsw-alias-scrollbar-hover-l2': p('rgba(120,80,40,0.42)', 'rgba(240,200,140,0.46)'),

      // ── 浮层 ──────────────────────────────────────────────────
      '--dsw-alias-toast-bg': p('rgba(255,253,248,0.97)', 'rgba(30,26,41,0.97)'),
      '--dsw-alias-tooltip-bg': p('rgba(51,38,28,0.94)', 'rgba(237,227,211,0.94)'),

      // ── 组件专属 ──────────────────────────────────────────────
      '--dsw-specific-sidebar-fill': p('rgba(250,243,232,0.52)', 'rgba(18,15,24,0.45)'),
      '--dsw-specific-sidebar-nav-item-hover': p('rgba(120,80,40,0.08)', 'rgba(240,200,140,0.08)'),
      '--dsw-specific-sidebar-nav-item-active': p('rgba(181,80,42,0.14)', 'rgba(224,138,60,0.15)'),
      '--dsw-specific-sidebar-nav-item-active-accent': p('rgba(181,80,42,0.85)', 'rgba(224,138,60,0.85)'),
      '--dsw-specific-input-major': p('rgba(255,251,243,0.88)', 'rgba(28,22,34,0.78)'),
      '--dsw-specific-bubble': p('rgba(181,80,42,0.09)', 'rgba(224,138,60,0.10)'),
      '--dsw-specific-bubble-highlight': p('rgba(181,80,42,0.14)', 'rgba(224,138,60,0.16)'),
      '--dsw-specific-tip': p('rgba(255,251,243,0.92)', 'rgba(24,20,30,0.86)'),
      '--dsw-specific-menu': p('rgba(255,253,248,0.97)', 'rgba(26,22,34,0.96)'),
      '--dsw-specific-selector': p('rgba(120,80,40,0.07)', 'rgba(240,200,140,0.08)'),
      '--dsw-specific-login-input': p('rgba(255,251,243,0.88)', 'rgba(28,22,34,0.78)'),

      // ── 阴影（暖调，不用纯黑投影）────────────────────────────
      // 暗档投影用暖紫黑 rgba(8,5,12) 而非纯黑 rgba(0,0,0)：纯黑投影落在暖底上
      // 会显出发灰的脏边。
      '--dsw-shadow-lv1': p('0 1px 2px rgba(60,40,25,0.08)', '0 1px 2px rgba(8,5,12,0.34)'),
      '--dsw-shadow-lv1-blur': p('0 4px 12px rgba(60,40,25,0.06)', '0 4px 12px rgba(8,5,12,0.28)'),
      '--dsw-shadow-lv2': p('0 6px 18px rgba(60,40,25,0.12)', '0 6px 18px rgba(8,5,12,0.38)'),
      '--dsw-shadow-lv3': p('0 14px 34px rgba(60,40,25,0.16)', '0 14px 34px rgba(8,5,12,0.46)'),

      // ── 代码语法高亮：改写 shiki 变量 ────────────────────────
      // 默认色板含高饱和蓝(#4dabf7)/紫(#b197fc)/粉(#faa2c1)，长时间看代码
      // 与暖色界面相互打架。这里整体改写到暖色系，只保留一个青灰冷调
      // 作为色相锚点，方便快速区分「链接/类型」类 token。
      '--shiki-foreground': p('#33261C', '#EDE3D3'),
      '--shiki-background': p('rgba(244,232,214,0.72)', 'rgba(24,20,28,0.72)'),
      '--shiki-token-constant': p('#8A5A1E', '#E8B872'),
      '--shiki-token-string': p('#6E5A2A', '#C9C070'),
      '--shiki-token-string-expression': p('#7A6318', '#BDB474'),
      '--shiki-token-comment': p('#75614C', '#8A7F72'),
      '--shiki-token-keyword': p('#9E4523', '#E08A3C'),
      '--shiki-token-parameter': p('#8E5C18', '#D9A05C'),
      '--shiki-token-function': p('#A03A54', '#E0909E'),
      '--shiki-token-punctuation': p('#6B5A4A', '#9C8F80'),
      '--shiki-token-link': p('#2E6A6A', '#7FC0BC'),
    };

    // ══════════════════════════════════════════════════════════════
    //  样式表
    // ══════════════════════════════════════════════════════════════
    //
    // 背景分三层，从后到前：
    //   body              程序化天空（多层渐变 + 烟花场景 SVG），壁纸缺失时的兜底
    //   body::before      宵宫立绘
    //   [data-chat-flow]  会话阅读卡（正文最后一道稳定底）
    //
    // 【刻意不设阅读遮罩】。正文背后需要的低方差，由会话卡自己的半透明底面
    // 加毛玻璃提供，不需要在整张画面上再盖一层。此前用过一整层 .dsh-yoimiya-scrim
    // 中心遮罩去压平背景，实测代价是把画面压闷——壁纸与人物都看不清，等于
    // 拿主题本身去换可读性，已整体删除。
    //
    // 已知风险：首页 hero 的标题直接压在立绘上，没有遮罩兜底；壁纸里那几道
    // 高亮光柱（峰值亮度 255）可能让标题对比度不足。这是"不要遮罩"的直接
    // 后果，若实际不可读，应只给 hero 补一条窄遮罩，不要恢复全屏遮罩。

    const darkBg = [
      `radial-gradient(circle at 92% 78%, rgba(224,138,60,${a(0.12)}) 0%, rgba(224,138,60,0) 22%)`,
      `radial-gradient(circle at 6% 22%, rgba(196,74,60,${a(0.10)}) 0%, rgba(196,74,60,0) 20%)`,
      `radial-gradient(ellipse at 50% 0%, rgba(120,90,160,${a(0.12)}) 0%, rgba(120,90,160,0) 55%)`,
      `linear-gradient(0deg, rgba(78,104,148,${a(0.14)}) 0%, rgba(78,104,148,0) 32%)`,
    ];
    if (SCENE) darkBg.push(`url('${asset('bg-night.svg')}')`);
    darkBg.push('linear-gradient(165deg, #191428 0%, #14111C 45%, #1C1520 100%)');

    const lightBg = [
      `radial-gradient(circle at 92% 18%, rgba(232,160,74,${a(0.12)}) 0%, rgba(232,160,74,0) 24%)`,
      `radial-gradient(circle at 8% 84%, rgba(196,96,74,${a(0.10)}) 0%, rgba(196,96,74,0) 22%)`,
    ];
    if (SCENE) lightBg.push(`url('${asset('bg-day.svg')}')`);
    lightBg.push('linear-gradient(165deg, #F8F1E4 0%, #F3EADA 50%, #EFE4D2 100%)');
    const layerList = (arr) => arr.join(',\n    ');

    const css = `
/* ═══════════════════════════════════════════════════════════════════
   宵宫主题 · dsh-yoimiya-theme
   背景强度档位：${INTENSITY}（SCALE=${SCALE}）
   ═══════════════════════════════════════════════════════════════════ */

html { background-color: transparent !important; }

/* ── 1 · 程序化天空（body）─────────────────────────────────────────
   这里有意利用一条 CSS 规范：根元素背景为 transparent 时，body 的背景
   会【传播到画布】，从而无条件铺满整个视口。若给 html 一个不透明背景，
   传播被切断，body 盒子高度一旦不足就会露底。 */
body[data-ds-dark-theme] {
  background-color: #14111C !important;
  background-image:
    ${layerList(darkBg)} !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
}

body:not([data-ds-dark-theme]) {
  background-color: #F3EADA !important;
  background-image:
    ${layerList(lightBg)} !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
}

/* ── 2 · 宵宫立绘（body::before）──────────────────────────────────
   分阶段背景的核心：
     首页 hero         全幅 cover、全亮
     对话 active/settling  降到 34%，只留一层氛围，把中心让给阅读卡
   阶段读 DSH 自己的 data-phase（会话根节点，取值 hero/active/settling）。
   输入框上也有 data-phase，但取值是 plain/claimed/submitting 之类，所以
   这里一律【按值匹配】，不会误命中。:has() 在本版 DSH 自己的样式表里
   已经在用，可以安全依赖。

   壁纸是 16:9 宽幅（1672×941），人物占 x 0–50%。用 cover + 左对齐：
   16:9 视口下 1:1 映射；窄高视口横向裁切时永远从左侧切，保住人物。
   纵向定位取 38% 而非 center——带鱼屏上 cover 会纵向裁切，
   center 会把她的头发切掉一截，38% 让裁切偏向上方、优先保住头部。 */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: url('${asset('yoimiya-wide.jpg')}');
  background-repeat: no-repeat;
  background-size: cover;
  background-position: left 38%;
  opacity: ${WALL_OPACITY};
  /* 夜景原图本身偏暗，整片提亮一档：让它是明亮的夜，而不是压黑的黑。
     这一行曾经没能插进样式表——插入时用了半角双引号，被 PowerShell 当成
     字符串结束符截断，结果注释未闭合、filter 整行丢失，而且当时所有检查
     都没察觉（花括号计数仍然平衡）。校验器现已加入注释配平检查。 */
  filter: brightness(${WALL_BRIGHT}) saturate(1.06);
}

/* 进入对话后退让（settling 与 active 同处理，避免首条消息时回弹）。
   只降不透明度、不做 transform：宽幅图 cover 已铺满，缩放会在边缘露出
   下层程序化天空，看着像 bug。这是第一版的行为，实测长对话下观感更稳。 */
body[data-ds-dark-theme]:has([data-phase="active"])::before,
body[data-ds-dark-theme]:has([data-phase="settling"])::before {
  opacity: .62;
}
body:not([data-ds-dark-theme]):has([data-phase="active"])::before,
body:not([data-ds-dark-theme]):has([data-phase="settling"])::before {
  opacity: .52;
}

/* 亮档：立绘是dusk 色调，加一层和纸洗色，让它像印在纸上而不是贴在屏幕上 */
body:not([data-ds-dark-theme])::before {
  opacity: ${WALL_OPACITY * 0.52};
  filter: sepia(.22) saturate(.84) brightness(1.07) contrast(.96);
}


/* ── 2 · 会话流：抬到稳定亮度的阅读卡上 ──────────────────────────
   [data-chat-flow] 是 ChatView 的消息列容器（整段对话，非单条）。
   用半透明底面 + 描边做出玻璃质感。这里【刻意不用 backdrop-filter】：
   它会为元素创建固定定位后代的包含块，DSH 的设置面板等浮层一旦挂在这棵
   子树里就会以本元素为参照定位（实测：设置面板跑到侧边栏里展开）。
   半透明底面本身已足够，模糊只是锦上添花，不值得用定位正确性去换。 */
[data-chat-flow] {
  background: rgba(20,17,28,0.52);
  border: 1px solid rgba(240,200,140,0.10);
  border-radius: 18px;
  padding: 14px 16px 22px;
}
body:not([data-ds-dark-theme]) [data-chat-flow] {
  background: rgba(248,241,229,0.74);
  border-color: rgba(120,80,40,0.12);
}

/* ── 3 · 输入卡 ──────────────────────────────────────────────────── */
[data-composer-card] {
  background: rgba(28,22,34,0.72) !important;
  border: 1px solid rgba(240,200,140,0.20) !important;
  border-radius: 18px !important;
}
body:not([data-ds-dark-theme]) [data-composer-card] {
  background: rgba(248,241,229,0.88) !important;
  border-color: rgba(120,80,40,0.22) !important;
}

/* 聚焦环：只在原生 outline 生效的输入区上补一笔暖色，保证键盘可达性。
   组件自绘焦点环的地方不动，避免出现双环。 */
[data-composer-card] :focus-visible,
[data-input-scroll]:focus-visible {
  outline: 2px solid rgba(224,138,60,0.50) !important;
  outline-offset: 2px !important;
}

/* 占位文案配色：硬编码值，verify.mjs 会按卡片底面核算，须 >=4.5:1。 */
[data-composer-placeholder] { color: #9C9184 !important; }
body:not([data-ds-dark-theme]) [data-composer-placeholder] { color: #7C6A56 !important; }
/* ── 3 · 阅读遮罩（.dsh-yoimiya-scrim）───────────────────────────────────
   两副面孔，按 DSH 自己发布的 data-phase 切换（取值 hero / active /
   settling；输入框上也有 data-phase 但取值不相交，所以按值匹配不会误命中）：
     首页 hero          左轻右重的横向渐变——人物在左几乎不压，
                        38% 起快速加深，给居中标题让出暗底
     对话 active/settling 中心椭圆——压住正文背后的亮度方差
   这是第一版的构图，也是本主题可读性的第一道保障：不要为了「更透」把它
   删掉，正文背后一旦出现亮度 255 的光柱，浅色正文就会读不出来。 */
.dsh-yoimiya-scrim {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center center;
}
body[data-ds-dark-theme] .dsh-yoimiya-scrim {
  background-image: radial-gradient(ellipse 72% 60% at 50% 46%, rgba(12,10,18,${a(0.62)}) 0%, rgba(12,10,18,${a(0.42)}) 55%, rgba(12,10,18,0) 100%);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-scrim {
  background-image: radial-gradient(ellipse 74% 62% at 50% 46%, rgba(248,241,229,${a(0.82)}) 0%, rgba(248,241,229,${a(0.52)}) 58%, rgba(248,241,229,0) 100%);
}
body[data-ds-dark-theme]:has([data-phase="hero"]) .dsh-yoimiya-scrim {
  background-image: linear-gradient(96deg, rgba(12,10,18,${a(0.06)}) 0%, rgba(12,10,18,${a(0.12)}) 24%, rgba(12,10,18,${a(0.46)}) 34%, rgba(12,10,18,${a(0.75)}) 40%, rgba(12,10,18,${a(0.87)}) 52%, rgba(12,10,18,${a(0.89)}) 100%);
}
body:not([data-ds-dark-theme]):has([data-phase="hero"]) .dsh-yoimiya-scrim {
  background-image: linear-gradient(96deg, rgba(248,241,229,${a(0.22)}) 0%, rgba(248,241,229,${a(0.30)}) 24%, rgba(248,241,229,${a(0.60)}) 34%, rgba(248,241,229,${a(0.85)}) 40%, rgba(248,241,229,${a(0.92)}) 52%, rgba(248,241,229,${a(0.94)}) 100%);
}
/* 会话卡底面降到 0.30 之后，正文可能压在壁纸的高亮光柱上。给卡片内的文字
   加一层极轻的投影，让它在亮底上依然清晰——这样才敢把卡片继续做透。
   投影只针对 [data-chat-flow] 内部，不影响 UI 其余部分。 */
[data-chat-flow] { text-shadow: 0 1px 3px rgba(6, 4, 12, 0.6); }
body:not([data-ds-dark-theme]) [data-chat-flow] { text-shadow: 0 1px 2px rgba(255, 252, 246, 0.72); }

/* ── 4 · 侧边栏：比会话区更透，露出背景 ──────────────────────────── */
[data-dsh-sidebar-root] {
  background: transparent !important;
  /* 侧边栏底色被 ._1tdjgG_sidebarCol 与 .IrIWsq_root 各画一次，叠加后
     比主区域实得多；这里给侧边栏加一层毛玻璃，既统一质感，也让压在
     人物上的文字背景更均匀。 */
}

/* ── 5 · 品牌标识：自绘金鱼替换默认 mark ──────────────────────────
   官方 mark 由 dsh-client-ui-brand-official 注册进 sidebar.brand.mark，
   而该 slot 是 kind:"single"（唯一认领），第三方再注册会抛错，
   所以这里走 CSS 替换而不是插槽。用 [class*="_局部名"] 匹配，
   哈希前缀变化不影响。 */
[data-dsh-sidebar-brand-identity] [class*="_brandMark"] svg,
[class*="_railMark"] svg {
  display: none !important;
}
[data-dsh-sidebar-brand-identity] [class*="_brandMark"]::before,
[class*="_railMark"]::before {
  content: '';
  display: block;
  flex: none;
  width: 24px;
  height: 24px;
  background-image: url('${asset('mark.svg')}');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center center;
}
body:not([data-ds-dark-theme]) [data-dsh-sidebar-brand-identity] [class*="_brandMark"]::before,
body:not([data-ds-dark-theme]) [class*="_railMark"]::before {
  background-image: url('${asset('mark-day.svg')}');
}

/* ── 6 · 会话激活项：橙色「引线」竖条 ─────────────────────────────
   用 inset box-shadow 而不是伪元素：行组件可能已占用 ::before/::after，
   内阴影不会撞车，且自动跟随行的圆角。
   会话行类名局部名 sessionRow / selected，哈希前缀无关。 */
[class*="_sessionRow"][class*="_selected"] {
  background: rgba(224,138,60,0.10) !important;
  box-shadow:
    inset 2px 0 0 0 rgba(224,138,60,0.90),
    inset 16px 0 14px -14px rgba(224,138,60,0.55) !important;
}
body:not([data-ds-dark-theme]) [class*="_sessionRow"][class*="_selected"] {
  background: rgba(181,80,42,0.10) !important;
  box-shadow:
    inset 2px 0 0 0 rgba(181,80,42,0.90),
    inset 16px 0 14px -14px rgba(181,80,42,0.45) !important;
}

/* ── 7 · 浮层 / 菜单：近实色保证可读，不叠多层 blur ───────────────── */
[data-radix-popper-content-wrapper] > div,
div[role="menu"],
div[role="dialog"][class*="popover"],
div[class*="popover"],
div[class*="dropdown-menu"] {
  background: rgba(26,22,34,0.96) !important;
  border: 1px solid rgba(240,200,140,0.22) !important;
  border-radius: 12px !important;
}
body:not([data-ds-dark-theme]) [data-radix-popper-content-wrapper] > div,
body:not([data-ds-dark-theme]) div[role="menu"],
body:not([data-ds-dark-theme]) div[role="dialog"][class*="popover"],
body:not([data-ds-dark-theme]) div[class*="popover"],
body:not([data-ds-dark-theme]) div[class*="dropdown-menu"] {
  background: rgba(255,253,248,0.97) !important;
  border-color: rgba(120,80,40,0.20) !important;
}

/* ── 8 · 代码块：暖调底 + 代码字体保真 ────────────────────────────
   语法高亮的颜色由 --shiki-token-* 提供（见 TOKENS），此处只管底色
   与排版。不放大行高、不加发光，避免糊字。 */
[data-ds-markdown] pre,
pre[class*="shiki"],
div[class*="codeBlock"] pre {
  border-radius: 12px;
  border: 1px solid rgba(240,200,140,0.10);
}
body:not([data-ds-dark-theme]) [data-ds-markdown] pre,
body:not([data-ds-dark-theme]) pre[class*="shiki"],
body:not([data-ds-dark-theme]) div[class*="codeBlock"] pre {
  border-color: rgba(120,80,40,0.12);
}

/* ── 烟花粒子层 ────────────────────────────────────────────────────
   挂在阅读遮罩之后，所以叠在遮罩之上、内容之下。pointer-events 关掉，
   绝不拦截任何交互。 */
.dsh-yoimiya-particles {
  position: fixed;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ── 右下角烟花控制 ────────────────────────────────────────────────
   刻意【不用 backdrop-filter】：它会创建固定定位后代的包含块，破坏浮层
   定位（设置面板就是这么坏的），所以这里用不透明暖色底。
   位置抬到 bottom 52px，避开 DSH 自己右下角的状态栏。 */
.dsh-yoimiya-dock {
  position: fixed;
  right: 16px;
  bottom: 52px;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  font: 12px/1.45 ui-sans-serif, system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.dsh-yoimiya-dock-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgba(224, 138, 60, 0.46);
  background: rgba(26, 20, 32, 0.94);
  color: #F0B068;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(10, 6, 16, 0.38);
  transition: transform .18s ease, border-color .18s ease, color .18s ease;
}
.dsh-yoimiya-dock-btn:hover { transform: translateY(-1px); border-color: rgba(224, 138, 60, 0.85); color: #F6C489; }
.dsh-yoimiya-dock-btn[aria-expanded="true"] { border-color: rgba(224, 138, 60, 0.95); color: #F6C489; }

.dsh-yoimiya-dock-panel {
  display: none;
  min-width: 176px;
  padding: 11px 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(224, 138, 60, 0.34);
  background: rgba(24, 18, 30, 0.97);
  color: #EDE3D3;
  box-shadow: 0 14px 34px rgba(10, 6, 16, 0.5);
}
.dsh-yoimiya-dock-panel[data-open="true"] { display: block; }

.dsh-yoimiya-dock-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 9px;
}
.dsh-yoimiya-dock-row:first-child { margin-top: 0; }
.dsh-yoimiya-dock-label { color: #B9AC9C; font-size: 11px; letter-spacing: .05em; }
/* 开销读数：沿用 label 的次要文本色（已过对比度校验），等宽数字免得跳动时宽度抖 */
.dsh-yoimiya-dock-stat {
  color: #B9AC9C;
  font-size: 10px;
  letter-spacing: .02em;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
}

.dsh-yoimiya-seg {
  display: inline-flex;
  border: 1px solid rgba(224, 138, 60, 0.30);
  border-radius: 8px;
  overflow: hidden;
}
.dsh-yoimiya-seg button,
.dsh-yoimiya-dock-toggle {
  border: 0;
  background: transparent;
  color: #B9AC9C;
  font: inherit;
  cursor: pointer;
  padding: 3px 10px;
  transition: background .15s ease, color .15s ease;
}
.dsh-yoimiya-dock-toggle {
  border: 1px solid rgba(224, 138, 60, 0.30);
  border-radius: 8px;
  min-width: 44px;
}
.dsh-yoimiya-seg button[aria-pressed="true"],
.dsh-yoimiya-dock-toggle[aria-pressed="true"] {
  background: rgba(224, 138, 60, 0.22);
  color: #F0B068;
}
.dsh-yoimiya-seg button:hover,
.dsh-yoimiya-dock-toggle:hover { color: #F0B068; }
.dsh-yoimiya-seg button:focus-visible,
.dsh-yoimiya-dock-toggle:focus-visible,
.dsh-yoimiya-dock-btn:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.60);
  outline-offset: 2px;
}

/* 亮档：翻成暖米纸面，与「和纸昼」同一套色 */
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-btn {
  background: rgba(248, 241, 229, 0.96);
  border-color: rgba(181, 80, 42, 0.44);
  color: #B5502A;
  box-shadow: 0 4px 14px rgba(90, 60, 30, 0.18);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-btn:hover,
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-btn[aria-expanded="true"] { color: #8E3A1E; border-color: rgba(181, 80, 42, 0.8); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-panel {
  background: rgba(250, 244, 234, 0.98);
  border-color: rgba(181, 80, 42, 0.30);
  color: #33261C;
  box-shadow: 0 14px 34px rgba(90, 60, 30, 0.22);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-label { color: #6B5A4A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-stat { color: #6B5A4A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-seg { border-color: rgba(181, 80, 42, 0.28); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-seg button,
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-toggle { color: #6B5A4A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-toggle { border-color: rgba(181, 80, 42, 0.28); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-seg button[aria-pressed="true"],
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-toggle[aria-pressed="true"] {
  background: rgba(181, 80, 42, 0.16);
  color: #B5502A;
}

/* ── 音乐控制（系统媒体会话）────────────────────────────────────── */
.dsh-yoimiya-dock-divider {
  height: 1px;
  margin: 10px 0 9px;
  background: rgba(224, 138, 60, 0.22);
}
.dsh-yoimiya-music-now {
  max-width: 208px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: #B9AC9C;
}
.dsh-yoimiya-music-now[data-state="playing"] { color: #F0B068; }
.dsh-yoimiya-music-now[data-state="idle"] { color: #8A7F72; }
.dsh-yoimiya-music-bar {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.dsh-yoimiya-music-btn {
  flex: 1;
  border: 1px solid rgba(224, 138, 60, 0.28);
  border-radius: 8px;
  background: transparent;
  color: #B9AC9C;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  padding: 5px 0;
  cursor: pointer;
  transition: background .15s ease, color .15s ease, border-color .15s ease;
}
.dsh-yoimiya-music-btn:hover {
  color: #F0B068;
  border-color: rgba(224, 138, 60, 0.60);
  background: rgba(224, 138, 60, 0.12);
}
.dsh-yoimiya-music-btn:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.60);
  outline-offset: 2px;
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-dock-divider { background: rgba(181, 80, 42, 0.20); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-now { color: #6B5A4A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-now[data-state="playing"] { color: #B5502A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-now[data-state="idle"] { color: #7C6A56; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-btn { border-color: rgba(181, 80, 42, 0.26); color: #6B5A4A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-btn:hover {
  color: #B5502A;
  border-color: rgba(181, 80, 42, 0.60);
  background: rgba(181, 80, 42, 0.10);
}

/* ── 控件坞：两个并列按钮 ─────────────────────────────────────────── */
.dsh-yoimiya-dock-btns {
  display: flex;
  gap: 8px;
}
.dsh-yoimiya-dock-note {
  max-width: 208px;
  font-size: 11px;
  line-height: 1.5;
  color: #8A7F72;
}


/* ── 本地曲库播放器 ───────────────────────────────────────────────── */
.dsh-yoimiya-music { width: 232px; }
.dsh-yoimiya-music-prog {
  height: 3px;
  margin-top: 7px;
  border-radius: 999px;
  background: rgba(224, 138, 60, 0.20);
  cursor: pointer;
  overflow: hidden;
}
.dsh-yoimiya-music-fill {
  height: 100%;
  width: 0;
  border-radius: 999px;
  background: rgba(224, 138, 60, 0.85);
  transition: width .15s linear;
}
.dsh-yoimiya-music-add:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.60);
  outline-offset: 2px;
}
.dsh-yoimiya-music-picker { display: none; }

.dsh-yoimiya-music-list {
  max-height: 184px;
  overflow-y: auto;
  margin-top: 9px;
  font-size: 11px;
  color: #8A7F72;
}
.dsh-yoimiya-music-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 5px;
  border-radius: 7px;
}
.dsh-yoimiya-music-row:hover { background: rgba(224, 138, 60, 0.09); }
.dsh-yoimiya-music-row[data-current="true"] { background: rgba(224, 138, 60, 0.16); }
.dsh-yoimiya-music-thumb {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background-color: rgba(224, 138, 60, 0.16);
  background-size: cover;
  background-position: center;
}
.dsh-yoimiya-music-title {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-yoimiya-music-title:hover { color: #F0B068; }
.dsh-yoimiya-music-title:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.60);
  outline-offset: 2px;
  border-radius: 4px;
}
.dsh-yoimiya-music-row[data-current="true"] .dsh-yoimiya-music-title { color: #F0B068; }
.dsh-yoimiya-music-del {
  flex: none;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #8A7F72;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}
.dsh-yoimiya-music-del:hover { background: rgba(196, 74, 60, 0.22); color: #E0909E; }
.dsh-yoimiya-music-del:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.60);
  outline-offset: 2px;
}
.dsh-yoimiya-music-empty { line-height: 1.55; }
.dsh-yoimiya-music-dir {
  display: block;
  margin-top: 5px;
  padding: 4px 5px;
  border-radius: 5px;
  background: rgba(224, 138, 60, 0.10);
  color: #B9AC9C;
  font-size: 10px;
  word-break: break-all;
}

body:not([data-ds-dark-theme]) .dsh-yoimiya-music-prog { background: rgba(181, 80, 42, 0.18); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-fill { background: rgba(181, 80, 42, 0.80); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-add { border-color: rgba(181, 80, 42, 0.36); color: #B5502A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-add:hover {
  background: rgba(181, 80, 42, 0.10);
  border-color: rgba(181, 80, 42, 0.70);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-list { color: #7C6A56; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-row:hover { background: rgba(181, 80, 42, 0.08); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-row[data-current="true"] { background: rgba(181, 80, 42, 0.14); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-thumb { background-color: rgba(181, 80, 42, 0.14); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-title:hover,
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-row[data-current="true"] .dsh-yoimiya-music-title { color: #B5502A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-del { color: #7C6A56; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-del:hover { background: rgba(181, 80, 42, 0.16); color: #8E3A1E; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-dir { background: rgba(181, 80, 42, 0.09); color: #6B5A4A; }

/* ── 添加歌曲弹窗 ─────────────────────────────────────────────────── */
.dsh-yoimiya-modal-back {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  align-items: center;
  justify-content: center;
  background: rgba(10, 6, 16, 0.62);
}
.dsh-yoimiya-modal-back[data-open="true"] { display: flex; }
.dsh-yoimiya-modal {
  width: 320px;
  max-width: calc(100vw - 32px);
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(224, 138, 60, 0.34);
  background: rgba(24, 18, 30, 0.99);
  color: #EDE3D3;
  box-shadow: 0 22px 60px rgba(10, 6, 16, 0.6);
  font: 12px/1.5 ui-sans-serif, system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.dsh-yoimiya-modal-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .04em;
  margin-bottom: 12px;
}

.dsh-yoimiya-drop {
  display: block;
  margin-top: 9px;
  padding: 11px 12px;
  border: 1px dashed rgba(224, 138, 60, 0.42);
  border-radius: 10px;
  background: rgba(224, 138, 60, 0.05);
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
}
.dsh-yoimiya-drop:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.6);
  outline-offset: 2px;
}
/* dragover 必须有明确反馈，否则用户不知道松手会不会生效 */
.dsh-yoimiya-drop[data-over="true"] {
  border-color: rgba(224, 138, 60, 0.95);
  background: rgba(224, 138, 60, 0.16);
}
.dsh-yoimiya-drop[data-filled="true"] {
  border-style: solid;
  border-color: rgba(224, 138, 60, 0.60);
  background: rgba(224, 138, 60, 0.10);
}
.dsh-yoimiya-drop-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-yoimiya-drop-label { color: #EDE3D3; font-size: 12px; }
.dsh-yoimiya-drop-badge {
  font-size: 10px;
  letter-spacing: .06em;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid rgba(224, 138, 60, 0.45);
  color: #F0B068;
}
.dsh-yoimiya-drop-badge[data-required="false"] {
  border-color: rgba(185, 172, 156, 0.35);
  color: #B9AC9C;
}
.dsh-yoimiya-drop-hint {
  margin-top: 5px;
  font-size: 11px;
  color: #8A7F72;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-yoimiya-drop[data-filled="true"] .dsh-yoimiya-drop-hint { color: #F0B068; }

.dsh-yoimiya-modal-error {
  margin-top: 9px;
  font-size: 11px;
  color: #E0909E;
}
.dsh-yoimiya-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
.dsh-yoimiya-modal-btn {
  border: 1px solid rgba(224, 138, 60, 0.32);
  border-radius: 8px;
  background: transparent;
  color: #B9AC9C;
  font: inherit;
  padding: 5px 16px;
  cursor: pointer;
  transition: background .15s ease, color .15s ease, border-color .15s ease;
}
.dsh-yoimiya-modal-btn:hover:not(:disabled) {
  color: #F0B068;
  border-color: rgba(224, 138, 60, 0.7);
  background: rgba(224, 138, 60, 0.12);
}
.dsh-yoimiya-modal-btn:disabled { opacity: .45; cursor: default; }
.dsh-yoimiya-modal-primary {
  border-color: rgba(224, 138, 60, 0.75);
  color: #F0B068;
  background: rgba(224, 138, 60, 0.16);
}
.dsh-yoimiya-modal-btn:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.6);
  outline-offset: 2px;
}

body:not([data-ds-dark-theme]) .dsh-yoimiya-modal-back { background: rgba(60, 44, 30, 0.42); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-modal {
  background: rgba(250, 244, 234, 0.99);
  border-color: rgba(181, 80, 42, 0.30);
  color: #33261C;
  box-shadow: 0 22px 60px rgba(90, 60, 30, 0.28);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-drop {
  border-color: rgba(181, 80, 42, 0.38);
  background: rgba(181, 80, 42, 0.04);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-drop[data-over="true"] {
  border-color: rgba(181, 80, 42, 0.9);
  background: rgba(181, 80, 42, 0.14);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-drop[data-filled="true"] {
  border-color: rgba(181, 80, 42, 0.55);
  background: rgba(181, 80, 42, 0.09);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-drop-label { color: #33261C; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-drop-badge {
  border-color: rgba(181, 80, 42, 0.4);
  color: #B5502A;
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-drop-badge[data-required="false"] {
  border-color: rgba(107, 90, 74, 0.32);
  color: #6B5A4A;
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-drop-hint { color: #7C6A56; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-drop[data-filled="true"] .dsh-yoimiya-drop-hint { color: #B5502A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-modal-error { color: #8E3A1E; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-modal-btn { border-color: rgba(181, 80, 42, 0.3); color: #6B5A4A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-modal-btn:hover:not(:disabled) {
  color: #B5502A;
  border-color: rgba(181, 80, 42, 0.7);
  background: rgba(181, 80, 42, 0.1);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-modal-primary {
  border-color: rgba(181, 80, 42, 0.7);
  color: #B5502A;
  background: rgba(181, 80, 42, 0.14);
}

/* ── 封面裁切弹窗 ─────────────────────────────────────────────────── */
.dsh-yoimiya-crop-back { z-index: 2147483002; }
.dsh-yoimiya-crop-stage {
  display: flex;
  justify-content: center;
  margin-bottom: 11px;
}
.dsh-yoimiya-crop-canvas {
  width: 224px;
  height: 224px;
  border-radius: 12px;
  border: 1px solid rgba(224, 138, 60, 0.45);
  background: rgba(10, 6, 16, 0.5);
  /* 取景框本身就是这块画布，所见即所得：画布外的东西一律不在封面里 */
  cursor: grab;
  /* 触摸设备上必须关掉默认手势，否则拖动会被当成滚动 */
  touch-action: none;
  display: block;
}
.dsh-yoimiya-crop-canvas[data-dragging="true"] { cursor: grabbing; }
.dsh-yoimiya-crop-canvas:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.6);
  outline-offset: 3px;
}
.dsh-yoimiya-crop-zoom {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dsh-yoimiya-crop-range {
  flex: 1;
  min-width: 0;
  accent-color: #E08A3C;
  cursor: pointer;
}
.dsh-yoimiya-crop-hint {
  margin-top: 7px;
  font-size: 11px;
  color: #8A7F72;
}

body:not([data-ds-dark-theme]) .dsh-yoimiya-crop-canvas {
  border-color: rgba(181, 80, 42, 0.40);
  background: rgba(90, 60, 30, 0.12);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-crop-range { accent-color: #B5502A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-crop-hint { color: #7C6A56; }

/* ── 音乐面板：音量行 / 列表折叠 ───────────────────────────────────── */
.dsh-yoimiya-music-vol {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.dsh-yoimiya-music-volbtn {
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #B9AC9C;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.dsh-yoimiya-music-volbtn:hover { background: rgba(224, 138, 60, 0.12); }
.dsh-yoimiya-music-volbtn:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.6);
  outline-offset: 2px;
}
.dsh-yoimiya-music-volrange {
  flex: 1;
  min-width: 0;
  accent-color: #E08A3C;
  cursor: pointer;
}
/* 列表默认收起：面板上只留图标，点一下才展开 */
.dsh-yoimiya-music-list[data-open="false"] { display: none; }
.dsh-yoimiya-music-listbtn[aria-expanded="true"],
.dsh-yoimiya-music-addbtn { color: #F0B068; }

body:not([data-ds-dark-theme]) .dsh-yoimiya-music-volbtn { color: #6B5A4A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-volbtn:hover { background: rgba(181, 80, 42, 0.10); }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-volrange { accent-color: #B5502A; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-listbtn[aria-expanded="true"],
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-addbtn { color: #B5502A; }

/* 播放器本体不进布局，只作为播放通道 */
.dsh-yoimiya-music-audio { display: none; }

/* 缩略图是按钮：加 / 换封面 */
.dsh-yoimiya-music-thumb {
  padding: 0;
  border: 0;
  position: relative;
  cursor: pointer;
}
.dsh-yoimiya-music-thumb[data-empty="true"] {
  border: 1px dashed rgba(224, 138, 60, 0.45);
}
.dsh-yoimiya-music-thumb[data-empty="true"]::after {
  content: '＋';
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(224, 138, 60, 0.75);
  font-size: 12px;
  line-height: 1;
}
.dsh-yoimiya-music-thumb:hover { box-shadow: 0 0 0 1px rgba(224, 138, 60, 0.75); }
.dsh-yoimiya-music-thumb:focus-visible {
  outline: 2px solid rgba(224, 138, 60, 0.6);
  outline-offset: 2px;
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-thumb[data-empty="true"] {
  border-color: rgba(181, 80, 42, 0.40);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-thumb[data-empty="true"]::after {
  color: rgba(181, 80, 42, 0.7);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-thumb:hover {
  box-shadow: 0 0 0 1px rgba(181, 80, 42, 0.7);
}

/* 版本标记：低对比，只为排查用 */
.dsh-yoimiya-build {
  margin-top: 8px;
  font-size: 10px;
  letter-spacing: .06em;
  color: rgba(138, 127, 114, 0.7);
  text-align: right;
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-build { color: rgba(124, 106, 86, 0.65); }
/* 列表在播放控件上方，分隔线放底部；数量多时滚动而不是无限长高 */
.dsh-yoimiya-music-list {
  margin-top: 0;
  margin-bottom: 9px;
  padding-bottom: 9px;
  border-bottom: 1px solid rgba(224, 138, 60, 0.18);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-list { border-bottom-color: rgba(181, 80, 42, 0.16); }

/* 曲目列表【从侧方展开】：面板锚在右下角，向左侧展开比上下生长更稳——
   不挤压播放控件，也不受面板高度限制。超长时在自身内部滚动。 */
.dsh-yoimiya-music { position: relative; }
.dsh-yoimiya-music-list {
  position: absolute;
  right: calc(100% + 10px);
  bottom: 0;
  width: 212px;
  max-height: min(300px, 60vh);
  overflow-y: auto;
  margin: 0;
  padding: 8px;
  border: 1px solid rgba(224, 138, 60, 0.30);
  border-radius: 12px;
  background: rgba(24, 18, 30, 0.97);
  box-shadow: 0 14px 34px rgba(10, 6, 16, 0.5);
}
/* 侧栏里的行不再需要分隔线 */
.dsh-yoimiya-music-list .dsh-yoimiya-music-row { border-bottom: 0; }
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-list {
  border-color: rgba(181, 80, 42, 0.28);
  background: rgba(250, 244, 234, 0.99);
  box-shadow: 0 14px 34px rgba(90, 60, 30, 0.24);
}

/* ── 播放条上方的封面区 ────────────────────────────────────────────
   基础规则【不写 background-image】：封面由 JS 设成内联值，默认金鱼写在
   [data-cover="false"] 里。若基础规则也写了图，会盖过内联封面。 */
.dsh-yoimiya-music-art {
  /* 与裁切输出同形：封面是 512 方图，播放区也做成正方形，
     这样看到的就是裁切时的构图，不会被横幅的比例裁掉上下。 */
  width: 100%;
  aspect-ratio: 1 / 1;
  height: auto;
  margin-bottom: 9px;
  border-radius: 10px;
  background-color: rgba(224, 138, 60, 0.08);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
}
.dsh-yoimiya-music-art[data-cover="false"] {
  background-image: url('${asset('mark.svg')}');
  background-size: 42% 42%;
  opacity: .9;
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-art {
  background-color: rgba(181, 80, 42, 0.07);
}
body:not([data-ds-dark-theme]) .dsh-yoimiya-music-art[data-cover="false"] {
  background-image: url('${asset('mark-day.svg')}');
}
`;

    // ══════════════════════════════════════════════════════════════
    //  安装
    // ══════════════════════════════════════════════════════════════

    const STYLE_ID = 'dsh-yoimiya-theme';

    /** 挂载样式表；重复激活时先撤掉旧节点，避免叠加。 */
    function installStyles() {
      document.getElementById(STYLE_ID)?.remove();
      const el = document.createElement('style');
      el.id = STYLE_ID;
      el.setAttribute('data-plugin', 'dsh-yoimiya-theme');
      el.textContent = css;
      document.head.append(el);
      return () => el.remove();
    }

    /**
     * 占位文案改写成宵宫台词。
     * 观察 [data-composer-placeholder]（本版输入框是 Lexical 富文本，
     * 旧的去改 textarea.placeholder 的做法已失效）。改写后前缀不再匹配
     * 任何规则，因此观察器不会自激。
     *
     * 本插件声明了 immediately，理论上可能在 document.body 就绪前激活，
     * 所以对 body 缺失做防御：先补一次，等 DOMContentLoaded 再接观察器。
     */
    function patchPlaceholders() {
      /** 上一次改写命中的元素。绝大多数变更都发生在同一个输入框里。 */
      let cached = null;

      const rewrite = (el) => {
        const current = el.textContent;
        if (!current) return;
        const next = rewritePlaceholder(current);
        if (next !== null) el.textContent = next;
      };

      const walk = () => {
        // 快路径：目标还在原地就直接改写，省掉一次全文档查询。
        // 这个观察器挂在 document.body 上、characterData 也开着，所以它会被
        // 【每一次输入、每一个流式 token、以及本插件自己的每次 DOM 写入】触发。
        // 每次都跑一遍全文档 querySelectorAll（该选择器没有 id/class，用不上
        // Blink 的快路径，代价随会话变长而增长）是不必要的——热路径下目标就是
        // 同一个元素。切换会话时输入框被重建，isConnected 变 false，自然回落
        // 到全量查询。
        // isConnected 用 === true 判断：桩对象没有这个属性，届时走全量查询。
        if (cached !== null && cached.isConnected === true) {
          rewrite(cached);
          return;
        }
        cached = null;
        let found = null;
        let count = 0;
        document.querySelectorAll('[data-composer-placeholder]').forEach((el) => {
          count += 1;
          found = el;
          rewrite(el);
        });
        // 只在确实只有一个时才缓存，否则会漏掉其余的
        if (count === 1) cached = found;
      };

      // 变更常常成串到达（一次输入、一段流式输出），合并到下一帧只扫一次。
      // rAF 在绘制前执行，所以文案不会晚于本帧出现，观感无差别。
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(() => {
          queued = false;
          walk();
        });
      };

      let observer = null;
      const start = () => {
        if (observer !== null) return;
        walk();
        if (!document.body) return;
        observer = new MutationObserver(schedule);
        observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      };
      start();
      if (observer === null && typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      }
      return () => {
        observer?.disconnect();
        observer = null;
        cached = null;
      };
    }

    // ══════════════════════════════════════════════════════════════
    //  UI 工厂层
    //
    //  粒子层、三个弹窗、播放器、控件坞都放在这里，而不是塞进 apply()。
    //  它们只依赖 document / window 与本文件的常量，不碰 ctx——既然不依赖
    //  apply 的闭包，就没有理由待在 apply 里面。apply() 因此只剩装配逻辑，
    //  「哪些是每次装配新建的状态」一眼可辨。
    // ══════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════
    //  烟花粒子 + 右下角控制面板
    // ══════════════════════════════════════════════════════════════
    //
    // 层级：body::before（立绘）→ .dsh-yoimiya-scrim（阅读遮罩）→ canvas（粒子）
    //      → 内容。三者都带 z-index:-1，同级之间按 DOM 顺序绘制，所以遮罩必须
    // 先挂、粒子后挂；顺序颠倒的话粒子会被遮罩压暗九成，等于没有。
    // 这也是把遮罩从 body::after 改成真实元素的原因——伪元素永远是最后一个
    // 子节点，任何真实元素都会被它盖住。
    //
    // 粒子是纯装饰：任何一步失败都只是「没有粒子」，绝不影响主题本身，所以
    // 整个挂载过程包在 try 里，失败只留一条 warn。
    //
    // 默认尊重系统的「减少动态效果」：系统要求减少动效且用户没有表过态时，
    // 默认关闭。

    // 构建立即版本标记：面板上显示出来，这样"跑的是哪一版"一眼可判。
    // 起因是反复出现"改了但界面没变"——而客户端与 Host 半边的生效代价不同
    // （前者刷新、后者必须完全重启），没有标记就只能靠猜。
    const BUILD_TAG = 'v30';

    const PARTICLE_KEY = 'dsh-yoimiya-particles-v1';
    const PARTICLE_DEFAULT = { on: true, speed: 1, density: 1, burst: 1 };
    const SPEED_STEPS = [
      { label: '慢', value: 0.6 },
      { label: '中', value: 1 },
      { label: '快', value: 1.7 },
    ];
    const DENSITY_STEPS = [
      { label: '疏', value: 0.5 },
      { label: '中', value: 1 },
      { label: '密', value: 1.9 },
    ];
    // 爆炸档同时放大「扩散半径」与「火星存活时长」——两者一起变才是"炸得大"，
    // 只放大其中一个会显得不自然（大而短、或小而久）。
    const BURST_STEPS = [
      { label: '小', value: 0.7 },
      { label: '中', value: 1 },
      { label: '大', value: 1.5 },
    ];

    /** 读取偏好。存储被禁用或值损坏时静默回落到默认值。 */
    function readParticlePrefs() {
      let saved = null;
      try {
        saved = JSON.parse(window.localStorage?.getItem(PARTICLE_KEY) ?? 'null');
      } catch {
        saved = null;
      }
      const prefs = { ...PARTICLE_DEFAULT, ...(typeof saved === 'object' && saved !== null ? saved : {}) };
      if (saved === null && typeof window.matchMedia === 'function'
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        prefs.on = false;
      }
      return prefs;
    }

    function saveParticlePrefs(prefs) {
      try {
        window.localStorage?.setItem(PARTICLE_KEY, JSON.stringify(prefs));
      } catch {
        /* 无痕模式等场景存不了，本次会话内仍然生效 */
      }
    }

    /**
     * 阅读遮罩：从 CSS 伪元素改为真实元素，好让粒子层能叠在它之上。
     *
     * 必须是幂等的。伪元素天然只有一层，真实元素不是——apply() 可能被重复
     * 执行（重载或热更新时旧实例若没被干净卸载），残留的旧节点会叠加，
     * 两层 0.62 的遮罩叠起来就是 0.86 的暗，观感是"背景忽然黑了好多"。
     */
    function dropStale(selector) {
      const stale = document.querySelectorAll(selector);
      for (let i = 0; i < stale.length; i++) stale[i].remove();
    }

    function mountScrim() {
      dropStale('.dsh-yoimiya-scrim');
      const el = document.createElement('div');
      el.className = 'dsh-yoimiya-scrim';
      el.setAttribute('aria-hidden', 'true');
      document.body.append(el);
      return el;
    }

    /**
     * 粒子模拟。返回 { canvas, setPrefs, start, stop }，或 null（环境不支持）。
     */
    function createParticles() {
      try {
        const canvas = document.createElement('canvas');
        canvas.className = 'dsh-yoimiya-particles';
        canvas.setAttribute('aria-hidden', 'true');
        const g = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
        if (g === null) return null; // 桩环境或没有 2D 上下文

        // 后备存储按设备像素比放大，但给总像素数封顶。
        // 粒子层每帧都要用 destination-out 铺满一次整块画布，像素数直接决定
        // 这步的成本：4K 屏按 1.5 倍是 8.3M 像素/帧。粒子是纯装饰，退一点
        // 分辨率看不出来，却能挡住"别人机器上白烧电"。窗口尺寸变了要重算。
        const MAX_CANVAS_PIXELS = 2.2e6;
        const ratioFor = (w, h) => {
          const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          const px = w * h * dpr * dpr;
          return px > MAX_CANVAS_PIXELS ? dpr * Math.sqrt(MAX_CANVAS_PIXELS / px) : dpr;
        };
        let W = 0;
        let H = 0;
        /** 当前后备存储倍率，随窗口尺寸封顶重算。必须在 resize() 之前声明——
            它下面紧接着就被调用，声明晚了会撞 TDZ。 */
        let ratio = 1;

        // 只在像素尺寸真的变了时才重设 canvas.width/height：赋值会重建整个
        // 后备存储，拖窗口时每个 resize 事件都做一次代价很高。
        const resize = () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          ratio = ratioFor(w, h);
          const pw = Math.max(1, Math.round(w * ratio));
          const ph = Math.max(1, Math.round(h * ratio));
          W = w;
          H = h;
          if (pw === canvas.width && ph === canvas.height) return;
          canvas.width = pw;
          canvas.height = ph;
          // 赋值 width/height 会重置全部上下文状态（含 transform），故在其后设置
          g.setTransform(ratio, 0, 0, ratio, 0, 0);
        };
        resize();

        // 调色板与主题 token 同源，避免出现「外部插件感」的荧光色
        const HUES = [
          [224, 138, 60],  // 引线橙
          [240, 176, 104], // 暖金
          [196, 74, 60],   // 朱红
          [246, 214, 160], // 淡金
        ];

        const TAU = 6.2832;

        // 亮度档数。火星的【透明度与半径都由同一个参数 (1-t) 决定】，所以只
        // 需要给这一个参数分档，两者就自动一致，不会出现"变亮了但没变大"。
        // 24 档时透明度步进 0.0375、半径步进 0.054px，肉眼不可分辨。
        const ALPHA_STEPS = 24;

        // 颜色字符串预生成成表。
        // 原来是在绘制的内层循环里拼 'rgba(...)' + toFixed(3)，上限 900 个
        // 粒子就是每帧 900 次字符串分配——纯粹喂给 GC。查表后每帧零分配。
        const COLORS = HUES.map((h) => {
          const row = [];
          for (let i = 0; i <= ALPHA_STEPS; i++) {
            row.push('rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + ((i / ALPHA_STEPS) * 0.9).toFixed(3) + ')');
          }
          return row;
        });
        const ROCKET_COLORS = HUES.map((h) => 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',0.950)');

        // 按 (颜色, 亮度档) 分组用的桶。每帧只清 length，不重新分配。
        const buckets = HUES.map(() => Array.from({ length: ALPHA_STEPS + 1 }, () => []));

        const rockets = [];
        const sparks = [];
        const MAX_SPARKS = 900;
        let speed = 1;
        let density = 1;
        let burstScale = 1;   // 与爆炸函数 burst() 区分开，避免重名
        let spawnAcc = 0;
        let raf = 0;
        let last = 0;
        // 帧率统计。要的是"这一层到底有多贵"，所以：
        //   · 用【未裁剪】的真实间隔算帧率——dt 有 0.05 上限，拿它算会把卡顿
        //     算成"还行"，正好掩盖要测的东西；
        //   · 只统计 step 真正在跑的帧，停掉时读数归零，不会留一个好看的假数。
        let frames = 0;
        let fpsSince = 0;
        let fps = 0;

        // 速度档作用于【升起】：先随机一个目标高度，再由「升多久」反推上升
        // 速度。早先的写法把速度档乘在 dur 上、vy 却是独立随机的，结果是
        // 调快档只让它提前炸开（炸得更低），升起速度纹丝不动。
        const spawnRocket = () => {
          const k = (Math.random() * HUES.length) | 0;
          // 炸点：升至视口高度的 66%–92%，即炸在屏幕上方 8%–34% 处。
          // 早先是 42%–68%（炸在 32%–58%），观感偏低、像在半空闷掉。
          const riseH = H * (0.66 + Math.random() * 0.26);
          const dur = (1.6 + Math.random() * 1.0) / speed;
          rockets.push({
            x: W * (0.06 + Math.random() * 0.88),
            y: H + 8,
            vx: (Math.random() - 0.5) * 26,
            vy: -riseH / dur,
            life: 0,
            dur,
            hue: k,   // 存下标而不是颜色数组本身，绘制时直接查表
          });
        };

        const burst = (r) => {
          const n = Math.round((16 + Math.random() * 22) * density);
          const power = H * (0.055 + Math.random() * 0.05) * burstScale;
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + Math.random() * 0.25;
            const sp = power * (0.55 + Math.random() * 0.7);
            sparks.push({
              x: r.x, y: r.y,
              vx: Math.cos(ang) * sp,
              vy: Math.sin(ang) * sp,
              life: 0,
              // 火星寿命不含速度档（速度档只管升起），由爆炸档缩放
              dur: (1.0 + Math.random() * 0.8) * burstScale,
              hue: r.hue,
              rad: 1.3,
            });
          }
          if (sparks.length > MAX_SPARKS) sparks.splice(0, sparks.length - MAX_SPARKS);
        };

        // 引线同时只有个位数，逐个画就够；颜色查表，不拼字符串。
        const paintRocket = (r) => {
          g.fillStyle = ROCKET_COLORS[r.hue];
          g.beginPath();
          g.arc(r.x, r.y, 1.7, 0, TAU);
          g.fill();
        };

        const step = (now) => {
          const raw = now - last;
          const dt = Math.min(raw / 1000, 0.05);
          last = now;

          frames++;
          if (now - fpsSince >= 500) {
            fps = Math.round((frames * 1000) / (now - fpsSince));
            frames = 0;
            fpsSince = now;
          }

          // 用 destination-out 淡出上一帧，得到自然拖尾；画布其余部分保持透明
          g.globalCompositeOperation = 'destination-out';
          g.fillStyle = 'rgba(0,0,0,0.20)';
          g.fillRect(0, 0, W, H);
          g.globalCompositeOperation = 'lighter';

          spawnAcc += dt * (0.45 + density * 1.05);
          while (spawnAcc >= 1) {
            spawnAcc -= 1;
            if (rockets.length < 3 + density * 3) spawnRocket();
          }

          for (let i = rockets.length - 1; i >= 0; i--) {
            const r = rockets[i];
            r.life += dt;
            r.x += r.vx * dt;
            r.y += r.vy * dt;
            if (r.life >= r.dur) {
              burst(r);
              // 交换删除而不是 splice：splice 要搬动后面所有元素，是 O(n)。
              // 倒序遍历时，被换到 i 上的那个末尾元素本帧已经处理过，跳过它安全。
              rockets[i] = rockets[rockets.length - 1];
              rockets.pop();
              continue;
            }
            paintRocket(r);
          }

          // 先按 (颜色, 亮度档) 归桶，再逐桶一次性 fill。
          // 原先是每个火星各自赋 fillStyle + beginPath/arc/fill，900 个粒子就是
          // 每帧 900 次独立绘制与 900 次字符串拼接。归桶后绘制次数降到
          // 「颜色数 × 档数」这个量级，像素结果不变。
          // 绘制顺序变了（原来是数组序）不影响观感：合成模式是 lighter，
          // 加法可交换。
          for (let i = sparks.length - 1; i >= 0; i--) {
            const p = sparks[i];
            p.life += dt;
            if (p.life >= p.dur) {
              sparks[i] = sparks[sparks.length - 1];
              sparks.pop();
              continue;
            }
            p.vy += H * 0.15 * dt;          // 重力
            p.vx *= 1 - 1.5 * dt;           // 空气阻力
            p.vy *= 1 - 1.5 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // 越接近熄灭档位越低；k 同时决定透明度与半径，见 ALPHA_STEPS 注释
            const k = ALPHA_STEPS - Math.round((p.life / p.dur) * ALPHA_STEPS);
            buckets[p.hue][k].push(p);
          }

          // k=0 对应透明度 0，不必绘制，但【必须照样清空】——否则这一桶会跨帧
          // 越积越多，是内存与耗时的双重泄漏。
          for (let k = ALPHA_STEPS; k >= 0; k--) {
            const scale = 0.55 + k / ALPHA_STEPS;
            for (let h = 0; h < HUES.length; h++) {
              const group = buckets[h][k];
              const n = group.length;
              if (n > 0) {
                if (k > 0) {
                  g.fillStyle = COLORS[h][k];
                  g.beginPath();
                  for (let j = 0; j < n; j++) {
                    const p = group[j];
                    const r = p.rad * scale;
                    // arc 在已有子路径时会先补一条直线连过去，必须先 moveTo 断开
                    g.moveTo(p.x + r, p.y);
                    g.arc(p.x, p.y, r, 0, TAU);
                  }
                  g.fill();
                }
                group.length = 0;
              }
            }
          }

          raf = window.requestAnimationFrame(step);
        };

        const start = () => {
          if (raf !== 0) return;
          // 画布已被移出文档就绝不能再起循环。这是防御性的第二道闸：只要漏掉
          // 一次监听器摘除，这里能保证不会留下"没有人能停"的僵尸 rAF。
          // 用 === false 而不是取反：桩对象没有 isConnected（undefined），
          // 取反会把桩环境一并挡掉。
          if (canvas.isConnected === false) return;
          last = window.performance.now();
          fpsSince = last;
          frames = 0;
          raf = window.requestAnimationFrame(step);
        };
        const stop = () => {
          if (raf === 0) return;
          window.cancelAnimationFrame(raf);
          raf = 0;
          rockets.length = 0;
          sparks.length = 0;
          fps = 0;
          g.clearRect(0, 0, W, H);
        };

        return {
          canvas,
          start,
          stop,
          resize,
          /** 面板上的开销读数：粒子数、实测帧率、画布像素数。 */
          stats: () => ({
            sparks: sparks.length,
            rockets: rockets.length,
            fps,
            pixels: canvas.width * canvas.height,
            ratio,
          }),
          setPrefs: (prefs) => {
            speed = prefs.speed;
            density = prefs.density;
            burstScale = prefs.burst;
          },
        };
      } catch (err) {
        console.warn('[yoimiya-theme] 烟花粒子启用失败，已跳过：', err);
        return null;
      }
    }

                /**
     * 本地曲库播放器。
     *
     * 曲库就是 Host 侧的一个目录（文件夹即曲库）：一首歌是一个音频文件，
     * 封面是同名的图片文件。所以面板里添加和直接往文件夹里丢，效果一样。
     *
     * 这里【不再控制系统里的播放器】——那只能控制"正在放什么"，而需求是
     * 播放自己放进去的歌。GSMTC 那套已整体移除。
     */
    /**
     * 添加歌曲弹窗：歌曲（必须）+ 封面（非必须）。
     * 两个框都支持「拖入文件」与「点击选择」两条路径——拖入是主路径，
     * 点击只是它的兜底，所以拖拽的视觉反馈必须明确（dragover 高亮）。
     */
    /**
     * 封面裁切弹窗。
     *
     * 载入图片后【必须】经过它：所有封面统一输出为 SIZE × SIZE 的方图，
     * 否则列表缩略图会大小不一、取景位置各异。
     *
     * 用 canvas 当取景框而不是 CSS 变换：预览与输出走同一套变换参数
     * （平移量、基准缩放、用户缩放三者完全相同），所见即所得；输出到
     * 离屏 canvas 时只把整体乘上 SIZE/FRAME 的比例。
     *
     * open(file) 返回 Promise<Blob|null>：确认得到裁好的图，取消得到 null。
     */
    const COVER_SIZE = 512;
    const CROP_FRAME = 224;

    // ── 裁切几何与绘制：两个裁切界面共用这一份 ──────────────────────
    // 添加歌曲的裁切步骤与封面弹窗的裁切视图原本各写了一遍实现，逐字重复到
    // 连局部变量名都一样，于是同一个 bug 要修两遍。
    // 这里修掉的正是其中一个：两份 draw() 都在【每次调用】时重设
    // canvas.width/height，而 draw() 由 pointermove / wheel / 缩放滑块驱动
    // ——等于拖动时每帧重建一次整块位图并重置上下文。
    //
    // 三个函数都按当前状态取参、自身不持有状态，所以两边的状态管理不用改动。

    /** 图片在取景框坐标下的显示尺寸。 */
    const cropMetrics = (img, base, zoom) => ({
      w: img.width * base * zoom,
      h: img.height * base * zoom,
    });

    /** 把平移量夹回图片边界内，返回夹好的 { ox, oy }。 */
    const clampCropPan = (img, base, zoom, ox, oy) => {
      const { w, h } = cropMetrics(img, base, zoom);
      const maxX = Math.max(0, (w - CROP_FRAME) / 2);
      const maxY = Math.max(0, (h - CROP_FRAME) / 2);
      return {
        ox: Math.min(maxX, Math.max(-maxX, ox)),
        oy: Math.min(maxY, Math.max(-maxY, oy)),
      };
    };

    /** 把取景框内容画到预览画布上。画布尺寸只在真的需要时才重设。 */
    const paintCropView = (canvas, img, base, zoom, ox, oy) => {
      const g = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
      if (g === null) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const px = Math.round(CROP_FRAME * dpr);
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
        // 重设尺寸会重置全部上下文状态（含 transform），必须放在其后
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      g.clearRect(0, 0, CROP_FRAME, CROP_FRAME);
      const { w, h } = cropMetrics(img, base, zoom);
      g.drawImage(img, CROP_FRAME / 2 - w / 2 + ox, CROP_FRAME / 2 - h / 2 + oy, w, h);
    };

    /** 按同一套变换渲染出 COVER_SIZE 的输出方图。WebP 体积远小于同质量 JPEG。 */
    const renderCoverBlob = (img, base, zoom, ox, oy) => new Promise((resolve) => {
      const out = document.createElement('canvas');
      out.width = COVER_SIZE;
      out.height = COVER_SIZE;
      const g = typeof out.getContext === 'function' ? out.getContext('2d') : null;
      if (g === null || typeof out.toBlob !== 'function') {
        resolve(null);
        return;
      }
      const k = COVER_SIZE / CROP_FRAME;
      const { w, h } = cropMetrics(img, base, zoom);
      g.drawImage(
        img,
        COVER_SIZE / 2 - (w * k) / 2 + ox * k,
        COVER_SIZE / 2 - (h * k) / 2 + oy * k,
        w * k,
        h * k,
      );
      out.toBlob((blob) => resolve(blob), 'image/webp', 0.9);
    });

    function createCropDialog() {
      const back = document.createElement('div');
      back.className = 'dsh-yoimiya-modal-back dsh-yoimiya-crop-back';
      back.dataset.open = 'false';

      const box = document.createElement('div');
      box.className = 'dsh-yoimiya-modal';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', '裁切封面');

      const title = document.createElement('div');
      title.className = 'dsh-yoimiya-modal-title';
      title.textContent = '裁切封面';

      const stage = document.createElement('div');
      stage.className = 'dsh-yoimiya-crop-stage';
      const canvas = document.createElement('canvas');
      canvas.className = 'dsh-yoimiya-crop-canvas';
      canvas.width = CROP_FRAME;
      canvas.height = CROP_FRAME;
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', '裁切取景框');
      stage.append(canvas);

      const zoomRow = document.createElement('div');
      zoomRow.className = 'dsh-yoimiya-crop-zoom';
      const zoomLabel = document.createElement('span');
      zoomLabel.className = 'dsh-yoimiya-dock-label';
      zoomLabel.textContent = '缩放';
      const zoom = document.createElement('input');
      zoom.type = 'range';
      zoom.min = '100';
      zoom.max = '400';
      zoom.value = '100';
      zoom.className = 'dsh-yoimiya-crop-range';
      zoom.setAttribute('aria-label', '缩放');
      zoomRow.append(zoomLabel, zoom);

      const hint = document.createElement('div');
      hint.className = 'dsh-yoimiya-crop-hint';
      hint.textContent = '拖动调整位置 · 滚轮或滑块缩放 · 输出 ' + COVER_SIZE + '×' + COVER_SIZE;

      const actions = document.createElement('div');
      actions.className = 'dsh-yoimiya-modal-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'dsh-yoimiya-modal-btn';
      cancel.textContent = '不用封面';
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'dsh-yoimiya-modal-btn dsh-yoimiya-modal-primary';
      confirm.textContent = '使用这张';
      actions.append(cancel, confirm);

      box.append(title, stage, zoomRow, hint, actions);
      back.append(box);

      let img = null;
      let base = 1;
      let zoomV = 1;
      let ox = 0;
      let oy = 0;
      let url = null;
      let resolver = null;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;

      const draw = () => {
        if (img === null) return;
        const panned = clampCropPan(img, base, zoomV, ox, oy);
        ox = panned.ox;
        oy = panned.oy;
        paintCropView(canvas, img, base, zoomV, ox, oy);
      };

      // 输出与预览共用同一套变换，只把整体乘上 SIZE/FRAME——那份换算在
      // renderCoverBlob 里，与 paintCropView 共用 cropMetrics。
      const render = () => (img === null
        ? Promise.resolve(null)
        : renderCoverBlob(img, base, zoomV, ox, oy));

      const finish = (blob) => {
        back.dataset.open = 'false';
        dragging = false;
        img = null;
        if (url !== null && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
        url = null;
        const resolve = resolver;
        resolver = null;
        if (resolve !== null) resolve(blob);
      };

      const open = (file) => new Promise((resolve) => {
        resolver = resolve;
        // 【注意 typeof URL 是 'function'，不是 'object'】——URL 是一个类。
        // 早先写成 typeof URL === 'object'，判断恒为 false，open() 永远立刻
        // resolve(null)，于是裁切弹窗在真实浏览器里从未打开过，「加封面」
        // 一直表现为没反应。这个 bug 还被测试桩掩盖了：桩里的 URL 传的是
        // 普通对象，恰好满足那个错误写法（见 DESIGN.md §10.3）。
        const canImage = typeof Image === 'function';
        const canUrl = typeof URL !== 'undefined' && URL !== null
          && typeof URL.createObjectURL === 'function';
        if (!canImage || !canUrl) {
          // 环境不支持就直接放行原文件，由调用方决定怎么办
          resolve(null);
          return;
        }
        url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          img = image;
          // 基准缩放取「铺满」：两个方向取较大者，保证不留空
          base = Math.max(CROP_FRAME / image.width, CROP_FRAME / image.height);
          zoomV = 1;
          ox = 0;
          oy = 0;
          zoom.value = '100';
          draw();
          back.dataset.open = 'true';
        };
        image.onerror = () => finish(null);
        image.src = url;
      });

      const onDown = (e) => {
        if (img === null) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.dataset.dragging = 'true';
        if (typeof canvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
          canvas.setPointerCapture(e.pointerId);
        }
      };
      const onMove = (e) => {
        if (!dragging || img === null) return;
        ox += e.clientX - lastX;
        oy += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        draw();
      };
      const onUp = () => {
        dragging = false;
        canvas.dataset.dragging = 'false';
      };

      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('wheel', (e) => {
        if (img === null) return;
        e.preventDefault();
        const next = Math.min(400, Math.max(100, Number(zoom.value) + (e.deltaY < 0 ? 10 : -10)));
        zoom.value = String(next);
        zoomV = next / 100;
        draw();
      }, { passive: false });

      zoom.addEventListener('input', () => {
        zoomV = Number(zoom.value) / 100;
        draw();
      });

      // 键盘也能平移，避免只能靠鼠标
      canvas.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 16 : 4;
        if (e.key === 'ArrowLeft') ox -= step;
        else if (e.key === 'ArrowRight') ox += step;
        else if (e.key === 'ArrowUp') oy -= step;
        else if (e.key === 'ArrowDown') oy += step;
        else return;
        e.preventDefault();
        draw();
      });

      cancel.addEventListener('click', () => finish(null));
      confirm.addEventListener('click', () => {
        if (img === null) {
          finish(null);
          return;
        }
        confirm.disabled = true;
        void render().then((blob) => {
          confirm.disabled = false;
          finish(blob);
        });
      });

      return {
        node: back,
        open,
        close: () => finish(null),
        isOpen: () => back.dataset.open === 'true',
        // 环境是否具备裁切能力。缺 Image / createObjectURL / 2D 上下文时
        // open() 会立刻 resolve(null)，那与"用户点了不用封面"是两件事，
        // 必须能分辨，否则"点了没反应"会被误当成用户自己取消。
        isUsable: () => typeof Image === 'function'
          && typeof URL !== 'undefined' && URL !== null
          && typeof URL.createObjectURL === 'function'
          && typeof document.createElement('canvas').getContext === 'function',
      };
    }
          /**
     * 设置封面：拖放区与裁切在【同一个弹窗内】切换视图。
     *
     * 原先做成两层弹窗（封面弹窗里再开裁切弹窗），结果两者各持一份状态与
     * 一个 Promise：裁切结束后封面弹窗的提示会重新出现，且两个模态的行为
     * 叠在一起难以推理。合并成一个之后：
     *   · 只有一份状态、一次 Promise，没有跨组件的 resolver
     *   · 用户看到的是一个连续的流程：拖入 → 裁切 → 使用这张 → 完成
     *   · 任何一步都不需要"关闭一个弹窗再回到另一个"
     */
    function createCoverDialog(onSubmit) {
      const back = document.createElement('div');
      back.className = 'dsh-yoimiya-modal-back';
      back.dataset.open = 'false';

      const box = document.createElement('div');
      box.className = 'dsh-yoimiya-modal';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', '设置封面');

      const title = document.createElement('div');
      title.className = 'dsh-yoimiya-modal-title';
      title.textContent = '设置封面';

      const target = document.createElement('div');
      target.className = 'dsh-yoimiya-cover-for';

      // ── 视图一：选择图片 ──
      const pickView = document.createElement('div');
      const zone = document.createElement('div');
      zone.className = 'dsh-yoimiya-drop';
      zone.dataset.zone = 'cover';
      zone.tabIndex = 0;
      zone.setAttribute('role', 'button');
      zone.setAttribute('aria-label', '封面图片（必须）');

      const head = document.createElement('div');
      head.className = 'dsh-yoimiya-drop-head';
      const nameEl = document.createElement('span');
      nameEl.className = 'dsh-yoimiya-drop-label';
      nameEl.textContent = '封面图片';
      const badge = document.createElement('span');
      badge.className = 'dsh-yoimiya-drop-badge';
      badge.dataset.required = 'true';
      badge.textContent = '必须';
      head.append(nameEl, badge);

      const hint = document.createElement('div');
      hint.className = 'dsh-yoimiya-drop-hint';
      hint.textContent = '拖入图片，或点击选择';

      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.className = 'dsh-yoimiya-music-picker';

      zone.append(head, hint, picker);
      pickView.append(zone);

      // ── 视图二：裁切 ──
      const cropView = document.createElement('div');
      cropView.hidden = true;
      const stage = document.createElement('div');
      stage.className = 'dsh-yoimiya-crop-stage';
      const view = document.createElement('canvas');
      view.className = 'dsh-yoimiya-crop-canvas';
      view.width = CROP_FRAME;
      view.height = CROP_FRAME;
      view.tabIndex = 0;
      view.setAttribute('role', 'img');
      view.setAttribute('aria-label', '裁切取景框');
      stage.append(view);

      const zoomRow = document.createElement('div');
      zoomRow.className = 'dsh-yoimiya-crop-zoom';
      const zoomLabel = document.createElement('span');
      zoomLabel.className = 'dsh-yoimiya-dock-label';
      zoomLabel.textContent = '缩放';
      const zoom = document.createElement('input');
      zoom.type = 'range';
      zoom.min = '100';
      zoom.max = '400';
      zoom.value = '100';
      zoom.className = 'dsh-yoimiya-crop-range';
      zoom.setAttribute('aria-label', '缩放');
      zoomRow.append(zoomLabel, zoom);

      const cropHint = document.createElement('div');
      cropHint.className = 'dsh-yoimiya-crop-hint';
      cropHint.textContent = '拖动调整位置 · 滚轮或滑块缩放 · 输出 ' + COVER_SIZE + '×' + COVER_SIZE;

      cropView.append(stage, zoomRow, cropHint);

      const error = document.createElement('div');
      error.className = 'dsh-yoimiya-modal-error';
      error.hidden = true;

      const actions = document.createElement('div');
      actions.className = 'dsh-yoimiya-modal-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'dsh-yoimiya-modal-btn';
      cancel.textContent = '取消';
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'dsh-yoimiya-modal-btn dsh-yoimiya-modal-primary';
      confirm.textContent = '使用这张';
      confirm.hidden = true;
      actions.append(cancel, confirm);

      box.append(title, target, pickView, cropView, error, actions);
      back.append(box);

      // 裁切的全部状态都在这里，没有第二份
      let song = null;
      let img = null;
      let base = 1;
      let zoomV = 1;
      let ox = 0;
      let oy = 0;
      let url = null;
      let busy = false;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;

      const draw = () => {
        if (img === null) return;
        const panned = clampCropPan(img, base, zoomV, ox, oy);
        ox = panned.ox;
        oy = panned.oy;
        paintCropView(view, img, base, zoomV, ox, oy);
      };

      const renderBlob = () => (img === null
        ? Promise.resolve(null)
        : renderCoverBlob(img, base, zoomV, ox, oy));

      const releaseUrl = () => {
        if (url !== null && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
        url = null;
      };

      const showPick = () => {
        pickView.hidden = false;
        cropView.hidden = true;
        confirm.hidden = true;
        hint.textContent = '拖入图片，或点击选择';
        zone.dataset.filled = 'false';
        zone.dataset.over = 'false';
        img = null;
        releaseUrl();
      };

      const showCrop = (image, fileName) => {
        img = image;
        base = Math.max(CROP_FRAME / image.width, CROP_FRAME / image.height);
        zoomV = 1;
        ox = 0;
        oy = 0;
        zoom.value = '100';
        pickView.hidden = true;
        cropView.hidden = false;
        confirm.hidden = false;
        title.textContent = '裁切封面';
        draw();
        void fileName;
      };

      const choose = (file) => {
        if (file === undefined || file === null || song === null || busy) return;
        error.hidden = true;
        if (typeof Image !== 'function' || typeof URL === 'undefined' || URL === null
            || typeof URL.createObjectURL !== 'function') {
          error.hidden = false;
          error.textContent = '当前环境不支持裁切，无法统一封面尺寸';
          return;
        }
        hint.textContent = '正在载入 ' + file.name + '…';
        zone.dataset.filled = 'true';
        releaseUrl();
        url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => showCrop(image, file.name);
        image.onerror = () => {
          error.hidden = false;
          error.textContent = '这张图片读不出来（格式不支持？）';
          showPick();
        };
        image.src = url;
      };

      picker.addEventListener('change', () => {
        const list = picker.files;
        const file = list !== undefined && list !== null && list.length > 0 ? list[0] : null;
        picker.value = '';
        choose(file);
      });
      zone.addEventListener('click', () => {
        if (typeof picker.click === 'function') picker.click();
      });
      zone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (typeof picker.click === 'function') picker.click();
        }
      });
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.dataset.over = 'true';
      });
      zone.addEventListener('dragleave', () => { zone.dataset.over = 'false'; });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.dataset.over = 'false';
        const dt = e.dataTransfer;
        choose(dt === undefined || dt === null || dt.files === undefined || dt.files === null ? null : dt.files[0]);
      });

      const onDown = (e) => {
        if (img === null) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        view.dataset.dragging = 'true';
      };
      const onMove = (e) => {
        if (!dragging || img === null) return;
        ox += e.clientX - lastX;
        oy += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        draw();
      };
      const onUp = () => {
        dragging = false;
        view.dataset.dragging = 'false';
      };
      view.addEventListener('pointerdown', onDown);
      view.addEventListener('pointermove', onMove);
      view.addEventListener('pointerup', onUp);
      view.addEventListener('pointercancel', onUp);
      view.addEventListener('wheel', (e) => {
        if (img === null) return;
        e.preventDefault();
        const next = Math.min(400, Math.max(100, Number(zoom.value) + (e.deltaY < 0 ? 10 : -10)));
        zoom.value = String(next);
        zoomV = next / 100;
        draw();
      }, { passive: false });
      zoom.addEventListener('input', () => {
        zoomV = Number(zoom.value) / 100;
        draw();
      });
      view.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 16 : 4;
        if (e.key === 'ArrowLeft') ox -= step;
        else if (e.key === 'ArrowRight') ox += step;
        else if (e.key === 'ArrowUp') oy -= step;
        else if (e.key === 'ArrowDown') oy += step;
        else return;
        e.preventDefault();
        draw();
      });

      const close = () => {
        back.dataset.open = 'false';
        error.hidden = true;
        box.removeEventListener('click', stopClick);
        window.removeEventListener('dragover', guard, true);
        window.removeEventListener('drop', guard, true);
      };
      const stopClick = (e) => e.stopPropagation();
      // 弹窗打开期间拦住页面其它地方的拖放：DSH 的输入框自己接收拖入的文件
      // （会变成附件），拖到页面上任何非拖放区的位置都可能被它接走。
      const guard = (e) => {
        const t = e.target;
        if (t !== null && t !== undefined && typeof box.contains === 'function' && box.contains(t)) return;
        e.preventDefault();
        e.stopPropagation();
      };

      const open = (forSong) => {
        song = forSong;
        busy = false;
        error.hidden = true;
        target.textContent = forSong.title;
        title.textContent = '设置封面';
        showPick();
        back.dataset.open = 'true';
        box.addEventListener('click', stopClick);
        window.addEventListener('dragover', guard, true);
        window.addEventListener('drop', guard, true);
      };

      cancel.addEventListener('click', close);

      confirm.addEventListener('click', () => {
        if (img === null || song === null || busy) return;
        busy = true;
        confirm.disabled = true;
        confirm.textContent = '上传中…';
        void renderBlob().then(async (blob) => {
          if (blob === null) {
            busy = false;
            confirm.disabled = false;
            confirm.textContent = '使用这张';
            error.hidden = false;
            error.textContent = '裁切结果生成失败，请重试';
            return;
          }
          try {
            await onSubmit(song, blob);
          } catch (err) {
            busy = false;
            confirm.disabled = false;
            confirm.textContent = '使用这张';
            error.hidden = false;
            error.textContent = '上传失败：' + (err?.message ?? '未知原因');
            return;
          }
          busy = false;
          confirm.disabled = false;
          confirm.textContent = '使用这张';
          close();
        });
      });

      return { node: back, open, close, isOpen: () => back.dataset.open === 'true' };
    }

    function createAddDialog(crop, onSubmit) {
      const back = document.createElement('div');
      back.className = 'dsh-yoimiya-modal-back';
      back.dataset.open = 'false';

      const box = document.createElement('div');
      box.className = 'dsh-yoimiya-modal';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', '添加歌曲');

      const title = document.createElement('div');
      title.className = 'dsh-yoimiya-modal-title';
      title.textContent = '添加歌曲';

      const state = { audio: null, image: null };

      const mkZone = (kind, label, required, accept) => {
        const zone = document.createElement('div');
        zone.className = 'dsh-yoimiya-drop';
        zone.dataset.zone = kind;
        zone.tabIndex = 0;
        zone.setAttribute('role', 'button');
        zone.setAttribute('aria-label', label + (required ? '（必须）' : '（非必须）'));

        const head = document.createElement('div');
        head.className = 'dsh-yoimiya-drop-head';
        const name = document.createElement('span');
        name.className = 'dsh-yoimiya-drop-label';
        name.textContent = label;
        const badge = document.createElement('span');
        badge.className = 'dsh-yoimiya-drop-badge';
        badge.dataset.required = String(required);
        badge.textContent = required ? '必须' : '非必须';
        head.append(name, badge);

        const hint = document.createElement('div');
        hint.className = 'dsh-yoimiya-drop-hint';
        hint.textContent = '拖入文件，或点击选择';

        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = accept;
        picker.className = 'dsh-yoimiya-music-picker';

        zone.append(head, hint, picker);

        const clear = () => {
          state[kind] = null;
          hint.textContent = '拖入文件，或点击选择';
          zone.dataset.filled = 'false';
          sync();
        };

        const accept0 = async (file) => {
          if (file === undefined || file === null) return;
          if (kind !== 'image') {
            state[kind] = file;
            hint.textContent = file.name;
            zone.dataset.filled = 'true';
            sync();
            return;
          }
          // 封面必须经过裁切：所有封面输出统一的 COVER_SIZE 方图，否则列表
          // 缩略图会大小不一、取景各异。裁切结果是一张 WebP Blob，没有文件名。
          const cropped = await crop.open(file);
          if (cropped === null) {
            clear();
            return;
          }
          state.image = cropped;
          hint.textContent = file.name + ' · 已裁 ' + COVER_SIZE + '×' + COVER_SIZE;
          zone.dataset.filled = 'true';
          sync();
        };

        const take = (list) => {
          if (list === undefined || list === null || list.length === 0) return;
          accept0(list[0]);
        };

        picker.addEventListener('change', () => {
          take(picker.files);
          picker.value = '';
        });

        zone.addEventListener('click', () => {
          if (typeof picker.click === 'function') picker.click();
        });
        zone.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (typeof picker.click === 'function') picker.click();
          }
        });
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.dataset.over = 'true';
        });
        zone.addEventListener('dragleave', () => {
          zone.dataset.over = 'false';
        });
        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.dataset.over = 'false';
          take(e.dataTransfer === null || e.dataTransfer === undefined ? null : e.dataTransfer.files);
        });

        return { zone, reset: () => {
          state[kind] = null;
          hint.textContent = '拖入文件，或点击选择';
          zone.dataset.filled = 'false';
        } };
      };

      const audioZone = mkZone('audio', '歌曲', true, 'audio/*');
      const imageZone = mkZone('image', '封面', false, 'image/*');

      const actions = document.createElement('div');
      actions.className = 'dsh-yoimiya-modal-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'dsh-yoimiya-modal-btn';
      cancel.textContent = '取消';
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'dsh-yoimiya-modal-btn dsh-yoimiya-modal-primary';
      confirm.textContent = '添加';
      actions.append(cancel, confirm);

      const error = document.createElement('div');
      error.className = 'dsh-yoimiya-modal-error';
      error.hidden = true;

      box.append(title, audioZone.zone, imageZone.zone, error, actions);

      let busy = false;
      const sync = () => {
        confirm.disabled = state.audio === null || busy;
        confirm.setAttribute('aria-disabled', String(confirm.disabled));
      };

      // 弹窗打开期间，页面上其它地方必须拒绝拖放。DSH 的输入框自己接收拖入
      // 的文件（会变成附件）——把音频拖进对话区就变成附件，完全不合理。
      // 用【捕获阶段】拦在 document 上：落在弹窗之外的一律 preventDefault
      // 加 stopPropagation，DSH 的处理器根本收不到；落在拖放区里的放行，
      // 交给区域自己的处理器。
      const guardDrag = (e) => {
        const target = e.target;
        if (target !== null && target !== undefined
            && typeof box.contains === 'function' && box.contains(target)) return;
        e.preventDefault();
        e.stopPropagation();
      };

      const close = () => {
        back.dataset.open = 'false';
        error.hidden = true;
        error.textContent = '';
        window.removeEventListener('dragover', guardDrag, true);
        window.removeEventListener('drop', guardDrag, true);
      };
      const open = () => {
        audioZone.reset();
        imageZone.reset();
        busy = false;
        confirm.textContent = '添加';
        sync();
        back.dataset.open = 'true';
        window.addEventListener('dragover', guardDrag, true);
        window.addEventListener('drop', guardDrag, true);
      };

      cancel.addEventListener('click', close);
      // 【刻意不做点击遮罩关闭】：用户常常要切到别的窗口找文件，切回来时
      // 第一次点击会落在遮罩上，那样弹窗就在"去找文件"的过程中自己关了。
      // 只留「取消」和 Esc 两个明确的关闭路径。
      box.addEventListener('click', (e) => e.stopPropagation());

      confirm.addEventListener('click', () => {
        if (state.audio === null || busy) return;
        busy = true;
        confirm.textContent = '上传中…';
        sync();
        Promise.resolve(onSubmit(state.audio, state.image)).then(
          () => close(),
          (err) => {
            busy = false;
            confirm.textContent = '添加';
            sync();
            error.hidden = false;
            error.textContent = '添加失败：' + (err?.message ?? '未知原因');
          },
        );
      });

      back.append(box);
      return {
        node: back,
        open,
        close,
        isOpen: () => back.dataset.open === 'true',
      };
    }
    function createMusicControls() {
      const wrap = document.createElement('div');
      wrap.className = 'dsh-yoimiya-music';

      // 播放器本体。桩环境没有这些方法，整个面板降级成"只列举、不播放"，
      // 不会因此抛错。
      // 音量与静音要存下来：每次重启都回到最大音量是很烦的事，
      // 尤其在夜里。存储不可用时只影响持久化，不影响本次会话。
      const VOLUME_KEY = 'dsh-yoimiya-volume-v1';
      const readVolumeState = () => {
        try {
          const raw = JSON.parse(window.localStorage?.getItem(VOLUME_KEY) ?? 'null');
          if (raw === null || typeof raw !== 'object') return { volume: 1, muted: false };
          const v = typeof raw.volume === 'number' && raw.volume >= 0 && raw.volume <= 1 ? raw.volume : 1;
          return { volume: v, muted: raw.muted === true };
        } catch {
          return { volume: 1, muted: false };
        }
      };
      const volState = readVolumeState();
      const saveVolumeState = () => {
        try {
          window.localStorage?.setItem(VOLUME_KEY, JSON.stringify(volState));
        } catch {
          /* 无痕模式等场景存不了，本次会话内仍然生效 */
        }
      };

      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      const canPlay = typeof audio.play === 'function' && typeof audio.pause === 'function';

      // 播放条上方的封面区：有封面显示封面，没有就显示主题自绘的大金鱼。
      // 封面已由裁切统一成 512 方图，用 cover 不会变形；金鱼是矢量，放大不糊。
      const art = document.createElement('div');
      art.className = 'dsh-yoimiya-music-art';
      art.dataset.cover = 'false';

      const line = document.createElement('div');
      line.className = 'dsh-yoimiya-music-now';
      line.textContent = '未选择曲目';

      const prog = document.createElement('div');
      prog.className = 'dsh-yoimiya-music-prog';
      const fill = document.createElement('div');
      fill.className = 'dsh-yoimiya-music-fill';
      prog.append(fill);

      const bar = document.createElement('div');
      bar.className = 'dsh-yoimiya-music-bar';

      // 音量行常显。放不出声时第一个要排除的就是"被静音或音量为 0"，
      // 把它藏在二级菜单里等于给自己添堵。
      const volRow = document.createElement('div');
      volRow.className = 'dsh-yoimiya-music-vol';
      const volBtn = document.createElement('button');
      volBtn.type = 'button';
      volBtn.className = 'dsh-yoimiya-music-volbtn';
      volBtn.textContent = '🔊';
      volBtn.title = '静音 / 取消静音';
      volBtn.setAttribute('aria-label', '静音');
      const vol = document.createElement('input');
      vol.type = 'range';
      vol.min = '0';
      vol.max = '100';
      vol.value = '100';
      vol.className = 'dsh-yoimiya-music-volrange';
      vol.setAttribute('aria-label', '音量');
      volRow.append(volBtn, vol);

      // 曲目列表收进一个图标：面板默认只有播放控件，点它才展开列表
      const listBtn = document.createElement('button');
      listBtn.type = 'button';
      listBtn.className = 'dsh-yoimiya-music-btn dsh-yoimiya-music-listbtn';
      listBtn.textContent = '☰';
      listBtn.title = '曲目列表';
      listBtn.setAttribute('aria-label', '曲目列表');
      listBtn.setAttribute('aria-expanded', 'false');
      bar.append(listBtn);

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'dsh-yoimiya-music-btn dsh-yoimiya-music-addbtn';
      addBtn.textContent = '＋';
      addBtn.title = '添加歌曲（歌曲必须，封面非必须）';
      addBtn.setAttribute('aria-label', '添加歌曲');
      bar.append(addBtn);

      const buildTag = document.createElement('div');
      buildTag.className = 'dsh-yoimiya-build';
      buildTag.textContent = '曲库 ' + BUILD_TAG;
      buildTag.title = '当前运行的浏览器半边版本；Host 半边改动需完全重启 DSH';

      const listEl = document.createElement('div');
      listEl.className = 'dsh-yoimiya-music-list';
      listEl.dataset.open = 'false';
      listEl.textContent = '读取中…';

      let songs = [];
      let currentId = null;
      let dir = '';
      let uploading = false;

      const indexOfCurrent = () => songs.findIndex((s) => s.id === currentId);

      const setArt = (song) => {
        if (art.style === undefined) return;
        if (song !== null && typeof song.image === 'string' && song.image.length > 0) {
          // 置成内联值；此时 CSS 里 [data-cover="false"] 那条不再匹配
          art.style.backgroundImage = 'url("/yoimiya-music/audio?name=' + encodeURIComponent(song.image) + '")';
          art.dataset.cover = 'true';
          return;
        }
        // 清掉内联值，让 CSS 的默认金鱼接上——注意不能在 CSS 基础规则里写
        // background-image，否则会盖过封面
        art.style.backgroundImage = '';
        art.dataset.cover = 'false';
      };

      const setCurrent = (song) => {
        currentId = song === null ? null : song.id;
        line.textContent = song === null ? '未选择曲目' : song.title;
        line.dataset.state = song === null ? 'idle' : 'playing';
        setArt(song);
      };

      const play = async (song) => {
        setCurrent(song);
        // 只改行标记，不重建列表——见 markCurrent 的注释
        markCurrent();
        if (!canPlay || song === null) return;
        const src = '/yoimiya-music/audio?name=' + encodeURIComponent(song.audio);

        // 先探一次取流地址。媒体元素给的错误信息太笼统（只有 code 3/4），
        // 而一次 Range 请求能直接问出 HTTP 状态，把三种故障精确分开：
        //   404/405 → 路由没注册（Host 半边改动后需要完全重启 DSH）
        //   400     → 文件名被服务端拒了（不在白名单 / 含路径分隔符）
        //   200/206 → 取流正常，问题在解码或自动播放策略
        try {
          const probe = await fetch(src, { headers: { Range: 'bytes=0-1' }, cache: 'no-store' });
          if (probe.ok !== true) {
            line.textContent = song.title + ' · 取流失败：HTTP ' + probe.status
              + (probe.status === 404 || probe.status === 405 ? '（曲库接口未注册或音频路由未重启）' : '');
            return;
          }
        } catch (err) {
          line.textContent = song.title + ' · 取流请求失败：' + (err?.message ?? '未知');
          return;
        }

        if (audio.src !== undefined) audio.src = src;
        try {
          await audio.play();
        } catch (err) {
          line.textContent = song.title + ' · 播放被拒：' + (err?.name ?? 'error')
            + (err?.name === 'NotAllowedError' ? '（浏览器要求先有一次点击）' : '');
        }
      };

      const step = (delta) => {
        if (songs.length === 0) return;
        const at = indexOfCurrent();
        const next = at < 0 ? 0 : (at + delta + songs.length) % songs.length;
        void play(songs[next]);
      };

      const mk = (glyph, label, onClick) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dsh-yoimiya-music-btn';
        b.textContent = glyph;
        b.title = label;
        b.setAttribute('aria-label', label);
        b.addEventListener('click', onClick);
        bar.append(b);
        return b;
      };
      mk('⏮', '上一首', () => step(-1));
      mk('⏯', '播放 / 暂停', () => {
        if (!canPlay) return;
        if (audio.paused === true) {
          if (currentId === null && songs.length > 0) void play(songs[0]);
          else void audio.play();
        } else {
          audio.pause();
        }
      });
      mk('⏭', '下一首', () => step(1));

      const remove = async (song) => {
        try {
          const res = await fetch('/yoimiya-music/delete?name=' + encodeURIComponent(song.id), { method: 'POST' });
          const r = await res.json();
          if (r.ok !== true) {
            line.textContent = '删除失败：' + (r.reason ?? '未知');
            return;
          }
          if (currentId === song.id) {
            if (canPlay) audio.pause();
            setCurrent(null);
          }
          await refresh();
        } catch {
          line.textContent = '删除请求失败';
        }
      };

      /**
       * 只更新「当前播放」的行标记，不重建列表。
       *
       * 切歌走这个，不要走 render()：render 会先清空整个列表再逐行重建，N 首歌
       * 就是每次切歌 O(N) 的 createElement + addEventListener + backgroundImage
       * 写入——而自动续播（ended → 下一首）也会触发它。
       * 行序与 songs 一一对应，因为 render 就是按 songs 顺序 append 的。
       */
      const markCurrent = () => {
        const rows = listEl.children;
        for (let i = 0; i < songs.length; i++) {
          const row = rows[i];
          if (row === undefined) break;
          if (songs[i].id === currentId) row.dataset.current = 'true';
          else row.removeAttribute('data-current');
        }
      };

      /** 重建整个列表。只在曲库内容变化时用（刷新、增删）。 */
      const render = () => {
        // 每次列表刷新也重算封面区：给当前这首换完封面后，refresh 会走到这里，
        // 只靠 setCurrent 更新的话要等用户重新点一次歌才看得到。
        setArt(songs.find((s) => s.id === currentId) || null);
        listEl.textContent = '';
        if (songs.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'dsh-yoimiya-music-empty';
          empty.textContent = '曲库是空的。点上面添加，或直接把文件放进这个目录：';
          const where = document.createElement('code');
          where.className = 'dsh-yoimiya-music-dir';
          where.textContent = dir.length > 0 ? dir : '（未知）';
          listEl.append(empty, where);
          return;
        }
        songs.forEach((s) => {
          const row = document.createElement('div');
          row.className = 'dsh-yoimiya-music-row';
          if (s.id === currentId) row.dataset.current = 'true';

          // 缩略图本身就是「加 / 换封面」按钮：已有封面的点它替换，
          // 没有封面的点它添加。走的是同一套裁切流程与同一个上传名，
          // 所以同名封面会被覆盖，不需要"先删再传"。
          const thumb = document.createElement('button');
          thumb.type = 'button';
          thumb.className = 'dsh-yoimiya-music-thumb';
          thumb.title = typeof s.image === 'string' ? '替换封面' : '添加封面';
          thumb.setAttribute('aria-label', (typeof s.image === 'string' ? '替换 ' : '添加 ') + s.title + ' 的封面');
          if (typeof s.image === 'string' && s.image.length > 0 && thumb.style !== undefined) {
            thumb.style.backgroundImage = 'url("/yoimiya-music/audio?name=' + encodeURIComponent(s.image) + '")';
          } else {
            thumb.dataset.empty = 'true';
          }
          thumb.addEventListener('click', () => { void pickCover(s); });

          const title = document.createElement('button');
          title.type = 'button';
          title.className = 'dsh-yoimiya-music-title';
          title.textContent = s.title;
          title.title = s.title;
          title.addEventListener('click', () => { void play(s); });

          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'dsh-yoimiya-music-del';
          del.textContent = '×';
          del.title = '删除这首（连同封面）';
          del.setAttribute('aria-label', '删除 ' + s.title);
          del.addEventListener('click', (e) => {
            e.stopPropagation();
            void remove(s);
          });

          row.append(thumb, title, del);
          listEl.append(row);
        });
      };

      // 曲库接口在 Host 半边，而 Host 半边的模块被 Node 按 URL 缓存——
      // 改过 host.js 之后，重组和刷新都不会重新读它，只有完全重启 DSH 才会。
      // 所以这里必须把「需要重启」直接说出来：404/405 都是这个原因，
      // DSH 的 frontend-static 兜底对 GET 回 404、对非 GET 回 405。
      const NEEDS_RESTART = '曲库接口未注册 —— 改动过 Host 半边后需要完全重启 DSH 才会生效';

      const refresh = async () => {
        let res;
        try {
          res = await fetch('/yoimiya-music/list', { cache: 'no-store' });
        } catch {
          songs = [];
          listEl.textContent = '曲库接口不可达（请求发不出去）';
          return;
        }
        const text = await res.text().catch(() => '');
        let r = null;
        try {
          r = JSON.parse(text);
        } catch {
          r = null;
        }
        if (r === null) {
          songs = [];
          listEl.textContent = (res.status === 404 || res.status === 405)
            ? NEEDS_RESTART
            : ('曲库接口异常：HTTP ' + res.status);
          return;
        }
        songs = Array.isArray(r.songs) ? r.songs : [];
        if (typeof r.dir === 'string') dir = r.dir;
        render();
      };

      // 失败必须说清是哪一种：路由未注册时请求会落到 DSH 的 404，而它的
      // 响应体是空的——以前在这里会被 JSON.parse 吃掉，界面上只剩一句
      // 「上传失败」，把「路由没注册」伪装成「上传失败」，根本查不下去。
      const upload = async (file, name) => {
        const url = '/yoimiya-music/upload?name=' + encodeURIComponent(name);
        let res;
        try {
          res = await fetch(url, { method: 'POST', body: file });
        } catch (err) {
          return { ok: false, detail: '请求发不出去：' + (err?.message ?? '未知') };
        }
        const text = await res.text().catch(() => '');
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        if (parsed === null) {
          const why = res.status === 404 || res.status === 405
            ? '（空响应＝路由没注册；改动过 Host 半边后需要完全重启 DSH）'
            : '（响应不是 JSON）';
          return { ok: false, detail: 'HTTP ' + res.status + ' ' + why };
        }
        if (res.ok !== true || parsed.ok !== true) {
          return { ok: false, detail: 'HTTP ' + res.status + ' · ' + (parsed.reason ?? '未知原因') };
        }
        return { ok: true, detail: '' };
      };

      // 添加走弹窗：歌曲（必须）+ 封面（非必须），两个框都支持拖入文件
      const crop = createCropDialog();
      const coverDialog = createCoverDialog(async (song, blob) => {
        const stem = String(song.audio).replace(/\.[^.]+$/, '');
        const sent = await upload(blob, stem + '.webp');
        if (sent.ok !== true) throw new Error(sent.detail);
        await refresh();
      });

      // 缩略图点击 → 打开封面弹窗。走拖放区模式而不是直接触发文件选择器：
      // 后者依赖 change 事件，实测在真实环境里选择文件后没有回调到处理函数。
      const pickCover = (song) => {
        line.textContent = song.title + ' · 设置封面…';
        coverDialog.open(song);
      };
      const dialog = createAddDialog(crop, async (audioFile, imageFile) => {
        const stem = String(audioFile.name).replace(/\.[^.]+$/, '');
        const sent = await upload(audioFile, audioFile.name);
        if (sent.ok !== true) throw new Error('歌曲上传失败 · ' + sent.detail);
        if (imageFile !== null) {
          // 封面改名与歌曲同名——服务端按 basename 配对，名字不同就配不上。
          // 扩展名固定 .webp：裁切器输出的就是 WebP，写成别的格式服务端会
          // 按错误的 MIME 提供，缩略图可能显示不出来。
          const coverSent = await upload(imageFile, stem + '.webp');
          if (coverSent.ok !== true) throw new Error('封面上传失败 · ' + coverSent.detail);
        }
        await refresh();
      });

      addBtn.addEventListener('click', () => dialog.open());
      if (canPlay) {
        audio.addEventListener('ended', () => step(1));
        // 载入失败必须报出错误码：MediaError.code 直接区分「取不到文件」
        // （4，多半是路由没注册或文件名不对）与「格式不支持」（3），
        // 光说一句"载入失败"两者分不开。
        audio.addEventListener('error', () => {
          const err = audio.error;
          const detail = err === null || err === undefined
            ? '未知'
            : (err.message || ('code ' + err.code + (err.code === 4 ? '（取不到文件或格式不支持）' : '')));
          line.textContent = '音频载入失败：' + detail;
        });
        // 元数据到手说明取流成功，这时才敢说"就绪"
        audio.addEventListener('loadedmetadata', () => {
          const at = indexOfCurrent();
          if (at >= 0) line.textContent = songs[at].title + ' · 就绪 ' + Math.round(audio.duration) + 's';
        });
        audio.addEventListener('timeupdate', () => {
          const d = audio.duration;
          if (Number.isFinite(d) && d > 0) {
            fill.style.width = Math.round((audio.currentTime / d) * 100) + '%';
          }
        });
      }

      prog.addEventListener('click', (e) => {
        if (!canPlay || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        if (typeof prog.getBoundingClientRect !== 'function') return;
        const rect = prog.getBoundingClientRect();
        if (!(rect.width > 0)) return;
        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
      });

      let listOpen = false;
      listBtn.addEventListener('click', () => {
        listOpen = !listOpen;
        listEl.dataset.open = String(listOpen);
        listBtn.setAttribute('aria-expanded', String(listOpen));
      });

      let lastVol = volState.volume > 0 ? volState.volume : 1;

      // 控件、播放器、存储三者始终一致：改一处就重算一次，不存在"界面显示
      // 有声音但其实静音"这类不一致。
      const applyVolume = () => {
        const effective = volState.muted ? 0 : volState.volume;
        if (canPlay) audio.volume = effective;
        vol.value = String(Math.round(effective * 100));
        volBtn.textContent = effective === 0 ? '🔇' : (effective < 0.5 ? '🔉' : '🔊');
        volBtn.setAttribute('aria-pressed', String(volState.muted));
        volBtn.title = volState.muted ? '取消静音' : '静音';
      };

      vol.addEventListener('input', () => {
        const v = Number(vol.value) / 100;
        volState.volume = v;
        volState.muted = v === 0;
        if (v > 0) lastVol = v;
        saveVolumeState();
        applyVolume();
      });
      volBtn.addEventListener('click', () => {
        volState.muted = !volState.muted;
        if (!volState.muted && volState.volume === 0) volState.volume = lastVol;
        saveVolumeState();
        applyVolume();
      });
      applyVolume();

      // 播放器本体也挂进 DOM：脱离文档的 <audio> 多数情况下能放，
      // 但挂进去能排掉一整类"能播却不发声"的疑难杂症，代价为零。
      audio.className = 'dsh-yoimiya-music-audio';
      // 列表放在播放控件【上方】：面板锚在右下角，往上长比往下长更符合预期，
      // 也不会把控件挤出视口。数量多时靠 max-height + overflow 滚动。
      wrap.append(art, line, listEl, prog, bar, volRow, buildTag, audio);

      return {
        node: wrap,
        dialogNode: dialog.node,
        cropNode: crop.node,
        coverNode: coverDialog.node,
        closeDialog: () => { dialog.close(); crop.close(); coverDialog.close(); },
        isDialogOpen: () => dialog.isOpen(),
        // 曲库只在打开面板时读一次；【不轮询】——列表是用户在面板里改的，
        // 没有理由每几秒去扫一遍磁盘。这两个钩子因此不叫 start/stopPolling：
        // 以前叫那个名字，读代码的人会以为这里有个定时器要管。
        onOpen: () => { void refresh(); },
        // 【关面板不停音乐】。此前这里调了 audio.pause()，于是"收起面板"
        // 等于"停止播放"——而面板会因为点界面外而自动收起，等于随便点一下
        // 歌就断了。面板是控件，不是播放器的电源开关。所以这里是空的。
        onClose: () => {},
      };
    }
    const ICON_FIREWORK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" '
      + 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round">'
      + '<path d="M12 3.5v4"/><path d="M12 20.5v-3"/>'
      + '<path d="M4.5 12h3"/><path d="M16.5 12h3"/>'
      + '<path d="M7 7l2 2"/><path d="M17 7l-2 2"/>'
      + '<circle cx="12" cy="12" r="4"/>'
      + '<circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>';

    const ICON_MUSIC = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" '
      + 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M9 18V6.5l10-2V16"/>'
      + '<circle cx="6.6" cy="18" r="2.6"/>'
      + '<circle cx="16.6" cy="16" r="2.6"/></svg>';

    /**
     * 右下角控件坞：两个独立按钮，各自一个面板，同时只开一个。
     * 音乐是独立按钮而不是塞进烟花面板——两件事没有关系，塞在一起只会让人
     * 找不到。
     */
    function createDock(prefs, onChange, getStats) {
      const dock = document.createElement('div');
      dock.className = 'dsh-yoimiya-dock';

      const mkPanel = (label) => {
        const p = document.createElement('div');
        p.className = 'dsh-yoimiya-dock-panel';
        p.dataset.open = 'false';
        p.setAttribute('role', 'group');
        p.setAttribute('aria-label', label);
        return p;
      };

      const mkRow = (label) => {
        const r = document.createElement('div');
        r.className = 'dsh-yoimiya-dock-row';
        const l = document.createElement('span');
        l.className = 'dsh-yoimiya-dock-label';
        l.textContent = label;
        r.append(l);
        return r;
      };

      const mkGroup = (steps, current, pick) => {
        const seg = document.createElement('span');
        seg.className = 'dsh-yoimiya-seg';
        const buttons = steps.map((s) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = s.label;
          b.setAttribute('aria-pressed', String(s.value === current()));
          b.addEventListener('click', () => {
            pick(s.value);
            buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          });
          seg.append(b);
          return b;
        });
        return seg;
      };

      // ── 烟花面板 ──
      const fxPanel = mkPanel('烟花效果');
      /** 面板收起时不做任何事；打开时才被换成真正的读取函数。 */
      let showStats = () => {};
      if (getStats) {
        const onRow = mkRow('烟花');
        const onBtn = document.createElement('button');
        onBtn.type = 'button';
        onBtn.className = 'dsh-yoimiya-dock-toggle';
        onBtn.textContent = prefs.on ? '开' : '关';
        onBtn.setAttribute('aria-pressed', String(prefs.on));
        onBtn.addEventListener('click', () => {
          prefs.on = !prefs.on;
          onBtn.textContent = prefs.on ? '开' : '关';
          onBtn.setAttribute('aria-pressed', String(prefs.on));
          onChange(prefs);
        });
        onRow.append(onBtn);

        const speedRow = mkRow('升起速度');
        speedRow.append(mkGroup(SPEED_STEPS, () => prefs.speed, (v) => {
          prefs.speed = v;
          onChange(prefs);
        }));

        const densityRow = mkRow('密度');
        densityRow.append(mkGroup(DENSITY_STEPS, () => prefs.density, (v) => {
          prefs.density = v;
          onChange(prefs);
        }));

        const burstRow = mkRow('爆炸');
        burstRow.append(mkGroup(BURST_STEPS, () => prefs.burst, (v) => {
          prefs.burst = v;
          onChange(prefs);
        }));

        // 开销读数。存在的意义是让"粒子层到底有多贵"有数可依而不是靠猜：
        // 帧率、火星数、画布像素数都摆出来，调档位时能直接看到代价。
        // 注意帧率是【未裁剪的真实间隔】算出来的，卡顿不会被 dt 上限掩盖。
        const statRow = mkRow('开销');
        const statText = document.createElement('span');
        statText.className = 'dsh-yoimiya-dock-stat';
        statRow.append(statText);
        showStats = () => {
          const s = getStats();
          const megapixels = (s.pixels / 1e6).toFixed(1) + 'M';
          statText.textContent = s.fps > 0
            ? s.fps + ' fps · ' + s.sparks + ' 火星 · 画布 ' + megapixels
            : '已暂停 · 画布 ' + megapixels;
        };

        fxPanel.append(onRow, speedRow, densityRow, burstRow, statRow);
      } else {
        const note = document.createElement('div');
        note.className = 'dsh-yoimiya-dock-note';
        note.textContent = '当前环境不支持画布，粒子层已跳过';
        fxPanel.append(note);
      }

      // ── 音乐面板 ──
      const musicPanel = mkPanel('音乐');
      const music = createMusicControls();
      musicPanel.append(music.node);

      // ── 按钮 ──
      const btns = document.createElement('div');
      btns.className = 'dsh-yoimiya-dock-btns';

      const mkBtn = (key, svg, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dsh-yoimiya-dock-btn';
        b.title = label;
        b.setAttribute('aria-label', label);
        b.setAttribute('aria-expanded', 'false');
        b.innerHTML = svg;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          setOpen(key, panelOf(key).dataset.open !== 'true');
        });
        btns.append(b);
        return b;
      };

      const panels = { fx: fxPanel, music: musicPanel };
      const panelOf = (key) => panels[key];
      const buttons = {
        fx: mkBtn('fx', ICON_FIREWORK, '烟花效果设置'),
        music: mkBtn('music', ICON_MUSIC, '音乐'),
      };

      // 开销读数只在面板打开时刷新：收起时没必要每隔半秒去动一次 DOM。
      let statTimer = 0;
      const stopStats = () => {
        if (statTimer === 0) return;
        window.clearInterval(statTimer);
        statTimer = 0;
      };

      const setOpen = (key, open) => {
        Object.keys(panels).forEach((k) => {
          const on = k === key && open;
          panels[k].dataset.open = String(on);
          buttons[k].setAttribute('aria-expanded', String(on));
        });
        if (open && key === 'music') music.onOpen();
        else { music.onClose(); music.closeDialog(); }

        stopStats();
        if (open && key === 'fx') {
          showStats();
          statTimer = window.setInterval(showStats, 500);
        }
      };

      dock.append(fxPanel, musicPanel, btns, music.dialogNode, music.cropNode, music.coverNode);
      dropStale('.dsh-yoimiya-dock');
      document.body.append(dock);

      // 【不做"点界面外自动收起"】。这是个播放器：用户会一边听歌一边用 DSH，
      // 随手点一下就把面板收掉、还（曾经）连带停掉音乐，纯属帮倒忙。
      // 收起只由两个明确动作触发：再点一次图标、或按 Esc。
      const onEsc = (e) => {
        if (e.key === 'Escape') setOpen(null, false);
      };
      document.addEventListener('keydown', onEsc);

      return () => {
        stopStats();
        music.onClose();
        document.removeEventListener('keydown', onEsc);
        dock.remove();
      };
    }

    const apply = (ctx) => {
      const theme = ctx.get('theme');
      if (theme === undefined) return;

      // token 叠加层：不碰主题注册表，内置 light/dark/system 偏好照常可切。
      // 主题呈现器把这些值作为 body 内联样式下发，因此能压过组件样式表里
      // 的同类声明（含 shiki.css 在 body 上的 --shiki-token-* 定义）。
      const disposeTokens = theme.overrideTokens('yoimiya', TOKENS);
      ctx.effect(() => disposeTokens, 'yoimiya-theme: token layer');

      const disposeStyles = installStyles();
      ctx.effect(() => disposeStyles, 'yoimiya-theme: stylesheet');

      const disposePlaceholders = patchPlaceholders();
      ctx.effect(() => disposePlaceholders, 'yoimiya-theme: placeholder copy');

      const particlePrefs = readParticlePrefs();
      const scrimEl = mountScrim();
      const particles = createParticles();
      let disposeParticles = null;

      if (particles !== null) {
        dropStale('.dsh-yoimiya-particles');
        document.body.append(particles.canvas);
        particles.setPrefs(particlePrefs);
        if (particlePrefs.on) particles.start();

        // resize 在拖动窗口时按刷新率触发（一帧里可能来好几个），而 resize()
        // 要重建整块后备存储。合并到下一帧，一次拖动只做一次。
        let resizeQueued = false;
        const onResize = () => {
          if (resizeQueued) return;
          resizeQueued = true;
          window.requestAnimationFrame(() => {
            resizeQueued = false;
            particles.resize();
            if (particlePrefs.on) particles.start();
          });
        };
        window.addEventListener('resize', onResize);

        // 页面不可见时停掉，别在后台空转烧电
        const onVisibility = () => {
          if (document.hidden) particles.stop();
          else if (particlePrefs.on) particles.start();
        };
        document.addEventListener('visibilitychange', onVisibility);

        // 这两个监听器都必须拆掉。漏掉 visibilitychange 的后果不是"少停一次"：
        // 那个闭包还攥着旧实例的 start()，下次切回前台会重新点亮一条画向
        // 【已被移除的画布】的 rAF 循环，而再没有任何句柄能停它——重载一次多
        // 一条，直到重启应用。现在有 start() 里的 isConnected 闸兜底，但监听器
        // 本身也该摘干净。
        disposeParticles = () => {
          window.removeEventListener('resize', onResize);
          document.removeEventListener('visibilitychange', onVisibility);
          particles.stop();
          particles.canvas.remove();
        };
      }

      // 控件坞始终挂载：音乐控制不依赖粒子层，粒子不可用时只是少一个面板
      const disposeDock = createDock(particlePrefs, (next) => {
        saveParticlePrefs(next);
        if (particles === null) return;
        particles.setPrefs(next);
        if (next.on) particles.start();
        else particles.stop();
      }, particles === null ? null : () => particles.stats());

      ctx.effect(() => () => {
        if (typeof disposeDock === 'function') disposeDock();
        if (disposeParticles !== null) disposeParticles();
        scrimEl.remove();
      }, 'yoimiya-theme: dock');

      // 供使用者写自己的叠加 CSS：html[data-dsh-yoimiya="on"] { ... }
      document.documentElement.setAttribute('data-dsh-yoimiya', 'on');
      ctx.effect(() => () => document.documentElement.removeAttribute('data-dsh-yoimiya'));
    };

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
