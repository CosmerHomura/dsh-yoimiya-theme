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
    // 正文对比度（已核算）：暗 #EDE3D3/#1A1622 ≈ 13.9:1，亮 #33261C/#FAF3E8 ≈ 13.3:1
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
      '--dsw-alias-brand-primary-invert': p('#FAF3E8', '#14111C'),
      '--dsw-alias-brand-text': p('#9E4523', '#EDBE86'),

      // ── 文字 ──────────────────────────────────────────────────
      '--dsw-alias-label-primary': p('#33261C', '#EDE3D3'),
      '--dsw-alias-label-primary-bluish': p('#3A2C20', '#EFE6D6'),
      '--dsw-alias-label-primary-dimmed': p('#6B5A4A', '#B9AC9C'),
      '--dsw-alias-label-primary-foreground': p('#FAF3E8', '#14111C'),
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
    // 加毛玻璃提供，不需要在整张画面上再盖一层。此前用过一整层 body::after
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
    if (SCENE) darkBg.push(`url('${BG}/bg-night.svg')`);
    darkBg.push('linear-gradient(165deg, #191428 0%, #14111C 45%, #1C1520 100%)');

    const lightBg = [
      `radial-gradient(circle at 92% 18%, rgba(232,160,74,${a(0.12)}) 0%, rgba(232,160,74,0) 24%)`,
      `radial-gradient(circle at 8% 84%, rgba(196,96,74,${a(0.10)}) 0%, rgba(196,96,74,0) 22%)`,
    ];
    if (SCENE) lightBg.push(`url('${BG}/bg-day.svg')`);
    lightBg.push('linear-gradient(165deg, #FDF8F0 0%, #FAF3E8 50%, #F7EFE1 100%)');
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
  background-color: #FAF3E8 !important;
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
  background-image: url('${BG}/yoimiya-wide.jpg');
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

/* 亮档：立绘是dusk 色调，加一层和纸洗色，让它像印在纸上而不是贴在屏幕上 */
body:not([data-ds-dark-theme])::before {
  opacity: ${WALL_OPACITY * 0.85};
  filter: sepia(.10) saturate(.94) brightness(1.18) contrast(.94);
}


/* ── 2 · 会话流：抬到稳定亮度的阅读卡上 ──────────────────────────
   [data-chat-flow] 是 ChatView 的消息列容器（整段对话，非单条）。
   只叠一层 backdrop-filter，不做多层，避免视觉噪声与合成开销。 */
[data-chat-flow] {
  background: rgba(20,17,28,0.30);
  backdrop-filter: blur(10px) saturate(1.15);
  -webkit-backdrop-filter: blur(10px) saturate(1.15);
  border: 1px solid rgba(240,200,140,0.10);
  border-radius: 18px;
  padding: 14px 16px 22px;
}
body:not([data-ds-dark-theme]) [data-chat-flow] {
  background: rgba(255,252,246,0.58);
  border-color: rgba(120,80,40,0.12);
}

/* ── 3 · 输入卡 ──────────────────────────────────────────────────── */
[data-composer-card] {
  background: rgba(28,22,34,0.72) !important;
  backdrop-filter: blur(16px) saturate(1.15);
  -webkit-backdrop-filter: blur(16px) saturate(1.15);
  border: 1px solid rgba(240,200,140,0.20) !important;
  border-radius: 18px !important;
}
body:not([data-ds-dark-theme]) [data-composer-card] {
  background: rgba(255,252,246,0.88) !important;
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
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
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
  background-image: url('${BG}/mark.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center center;
}
body:not([data-ds-dark-theme]) [data-dsh-sidebar-brand-identity] [class*="_brandMark"]::before,
body:not([data-ds-dark-theme]) [class*="_railMark"]::before {
  background-image: url('${BG}/mark-day.svg');
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
      const walk = () => {
        document.querySelectorAll('[data-composer-placeholder]').forEach((el) => {
          const current = el.textContent;
          if (!current) return;
          const next = rewritePlaceholder(current);
          if (next !== null) el.textContent = next;
        });
      };
      let observer = null;
      const start = () => {
        if (observer !== null) return;
        walk();
        if (!document.body) return;
        observer = new MutationObserver(walk);
        observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      };
      start();
      if (observer === null && typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      }
      return () => {
        observer?.disconnect();
        observer = null;
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

      // 供使用者写自己的叠加 CSS：html[data-dsh-yoimiya="on"] { ... }
      document.documentElement.setAttribute('data-dsh-yoimiya', 'on');
      ctx.effect(() => () => document.documentElement.removeAttribute('data-dsh-yoimiya'));
    };

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
