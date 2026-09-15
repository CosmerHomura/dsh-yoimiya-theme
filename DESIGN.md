# 宵宫主题 · 设计方案

> DSH Web GUI 主题插件（`dsh-yoimiya-theme`）——以《原神》宵宫 / 长野原烟花店为母题，
> 面向**长时间盯屏**的护眼配色与背景。

---

## 1. 意象提取

| 来源 | 元素 | 主题用法 |
| --- | --- | --- |
| 角色配色 | 金橙发色、绯红上衣、靛蓝和服内衬、米白与金饰 | 品牌色 / 强调色 / 文本色 / 描边色 |
| 身份 | 长野原烟花店店主、烟火师 | 烟花放射线、引线、光晕 |
| 场景 | 夏日祭、夜晚、纸灯笼、金鱼、和纸 | 背景三层结构、纹理、标识 |
| 文化 | 稻妻（和风）、麻叶纹 / 斜纹 | 极淡纹理，防大片死平 |

**核心设计主张：边缘有戏，中间安静。**
烟花、灯笼、暖光全部安排在视口四角与边缘；屏幕中央留出一条低对比、
亮度稳定的「阅读通道」。这是本主题护眼的第一性手法——眼睛不需要在
读字时反复适应背景亮度变化。

---

## 2. 色板

### 2.1 色相策略

暗档与亮档**不是同一组颜色的明暗翻转**，而是两组独立取值：

- **暗档**：底色取「暖靛黑 / 墨紫」而非冷蓝黑。冷蓝底会把蓝通道推高，
  长时间阅读易疲劳，且与焰橙并置会产生视觉振动。
- 橙金在暗底上**提亮**才可读；在纸底上必须**压深**才可读。
  因此 `brand-primary` 是两档不同的值。

### 2.2 暗档「夏祭夜」（默认）

| 语义 | 值 | 说明 |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `rgba(14,12,20,0.10)` | **必须接近全透明**：`ui-layout` 的 `.frame` 消费此 token 且铺满全屏，一旦不透明就会把 body 上的背景场景整个盖住 |
| `--dsw-alias-bg-layer-1` | `rgba(26,22,34,0.72)` | 主抬升表面 |
| `--dsw-alias-bg-layer-2` | `rgba(34,28,43,0.78)` | 次级嵌套表面 |
| `--dsw-alias-bg-overlay` | `rgba(30,26,41,0.96)` | 浮层，近实色保证可读 |
| `--dsw-alias-border-l1` | `rgba(240,200,140,0.14)` | 暖金极淡描边 |
| `--dsw-alias-border-l2` | `rgba(240,200,140,0.24)` | |
| `--dsw-alias-brand-primary` | `#E08A3C` | 提亮焰橙，对 `#1A1622` ≈ 6.7:1 |
| `--dsw-alias-label-primary` | `#EDE3D3` | **暖米白，不用纯白**，≈ 13.9:1 |
| `--dsw-alias-label-secondary` | `#B9AC9C` | ≈ 8.0:1 |
| `--dsw-alias-state-error-primary` | `#E0685E` | 柔化绯红，非高饱和正红 |
| `--dsw-alias-state-success-primary` | `#86C08A` | 抹茶绿，降饱和 |
| `--dsw-alias-state-warn-primary` | `#E9B44C` | 金鱼黄 |
| `--dsw-specific-sidebar-fill` | `rgba(18,15,24,0.55)` | 比会话区更透，露出背景 |

扩展 token（非契约，但要一起覆盖）：

| 语义 | 值 |
| --- | --- |
| `--dsw-alias-label-tertiary` / caption | `#8A7F72`（≈ 4.5:1，占位符下限） |
| `--dsw-specific-bubble` | `rgba(224,138,60,0.10)` 暖淡底 |
| `--dsw-specific-input-major` | `rgba(28,22,34,0.78)` |
| `--dsw-specific-menu` | `rgba(26,22,34,0.96)` |
| `--dsw-alias-interactive-bg-hover` | `rgba(240,200,140,0.08)` |
| `--dsw-alias-interactive-bg-active` | `rgba(224,138,60,0.16)` |
| `--dsw-alias-markdown-code-block` | `rgba(24,20,28,0.72)` 暖调代码底，**不是蓝黑** |
| `--dsw-alias-markdown-inline-code` | `rgba(224,138,60,0.10)` |
| `--dsw-alias-scrollbar-bg-l2` | `rgba(240,200,140,0.28)` |

### 2.3 亮档「和纸昼」

| 语义 | 值 | 说明 |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#FAF3E8` | 和纸米色，非纯白 |
| `--dsw-alias-bg-layer-1` | `rgba(255,251,243,0.86)` | |
| `--dsw-alias-bg-layer-2` | `rgba(245,235,218,0.88)` | |
| `--dsw-alias-bg-overlay` | `#FFFDF8` | |
| `--dsw-alias-border-l1` | `rgba(120,80,40,0.14)` | 暖褐描边 |
| `--dsw-alias-border-l2` | `rgba(120,80,40,0.26)` | |
| `--dsw-alias-brand-primary` | `#B5502A` | **压深**的焰红，对纸底 ≈ 4.6:1 |
| `--dsw-alias-label-primary` | `#33261C` | **墨棕，不用纯黑**，≈ 13.3:1 |
| `--dsw-alias-label-secondary` | `#6B5A4A` | ≈ 6.0:1 |
| `--dsw-alias-label-tertiary` / caption | `#7C6A56` | ≈ 4.7:1（占位符下限） |
| `--dsw-alias-state-error-primary` | `#B33A2E` | |
| `--dsw-alias-state-success-primary` | `#4A734D` | ≈ 5.0:1 |
| `--dsw-alias-state-warn-primary` | `#96631A` | |
| `--dsw-specific-sidebar-fill` | `rgba(250,243,232,0.72)` | |
| `--dsw-alias-bg-base` | `rgba(250,243,232,0.12)` | 同暗档：接近全透明 |

---

## 3. 背景

四层 + 一道遮罩。除宵宫立绘外全部由 CSS 渐变与手写 SVG 生成。

### 3.0 分层与顺序

| 层 | 载体 | 内容 |
| --- | --- | --- |
| 4（最前） | `[data-chat-flow]` | 会话阅读卡，正文最后一道稳定底 |
| 3 | `body::after` | **阅读遮罩**，压住立绘与天空的亮度方差 |
| 2 | `body::before` | **宵宫立绘**，按对话阶段自动退让 |
| 1（最后） | `body` | 程序化天空：多层渐变 + 烟花场景 SVG |

两个关键实现约束：

**遮罩必须单独占一层。** `background-image` 只作用于 body 自己的盒子，盖不住
`body::before` 画出来的立绘。只有把它放到伪元素上，才能同时做到「立绘存在」
与「正文字后低方差」。两者同为 `z-index: -1`，靠盒子树顺序（`::before` 先、
`::after` 后）保证遮罩在上——`tools/verify.mjs` 会检查这个顺序。

**`html` 必须保持 `transparent`。** 按 CSS 规范，根元素背景为 transparent 时
body 的背景会**传播到画布**，从而无条件铺满整个视口。给 html 一个不透明背景
会切断传播，body 盒子高度一旦不足就露底。这是有意利用的规范行为。

### 3.1 程序化天空（暗档「夏祭夜」，从后到前）

1. **基底渐变** — `linear-gradient(165deg, #191428, #14111C 45%, #1C1520)`
   暖靛 → 墨 → 微暖褐，避免大面积冷蓝。
2. **烟花场景 SVG** — `bg-night.svg`，含六组烟花（右上主爆 20 线、左下副爆
   12 线、右缘冷紫 12 线、左上中景 8 线、右下与顶部远景小爆）、五道竖向
   **光柱**（呼应立绘里的竖直光带）、五处灯笼暖斑、四条**火花拖尾**、
   三条游动**金鱼剪影**、地平线**冷蓝辉光**（接住立绘底边的浅蓝）、
   斜纹肌理与十四点星芒。全部安排在外围，中心留空。
3. **边缘暖光**（CSS `radial-gradient`）— 右下灯笼 `rgba(224,138,60,0.12)`、
   左上余灯 `rgba(196,74,60,0.10)`、顶部夜空余辉 `rgba(120,90,160,0.12)`（冷调反衬）
   与底部冷蓝地平线 `rgba(78,104,148,0.14)`。

### 3.2 宵宫立绘与分阶段退让

这是本主题回答「太素」的核心机制。阶段直接读 DSH 自己发布的
`data-phase`——它挂在会话根节点上：

```js
const phase = settling ? "settling" : hero ? "hero" : "active";
```

于是用 `body:has([data-phase="hero"])` 就能让背景换一副面孔：

| 阶段 | 立绘 | 遮罩 |
| --- | --- | --- |
| `hero`（首页，无会话） | 全幅 `cover`、全亮 | 左轻右重横向渐变，保住人物、压暗标题区 |
| `active` / `settling`（对话中） | 降到 34% | 中心椭圆，压住正文背后 |

因为首页没有正文要读，立绘可以全亮绽放；一旦开始对话，它自动退成氛围，
中心让给阅读通道。**氛围和可读性不必互相让步。**

#### 壁纸的构图与接入依据

壁纸是 16:9 宽幅 1672×941，由原始方图经 AI 扩图（outpainting）得到。
原方图的**头发被上边缘切断、红绳与腰带被下/左边缘切断**——这正是需要
AI 扩图而非程序化合成的原因：程序化合成只能把切断藏在画布边界上，
AI 能把它们补全。

接入前实测了这张图，用数据定遮罩而不是试错：

| 测量项 | 结果 |
| --- | --- |
| 人物横向范围 | x 0–50%（内容密度峰值在 25–33%，即脸部） |
| 人物落区平均亮度 | 113.9 |
| 标题落区（视口宽 41–73%） | 均值亮度仅 45–61，但有 252 的细光柱亮点 |

结论：**hero 遮罩必须左轻右重**——左侧 ≤0.13 保住人物，38% 起快速加深，
52% 达到 0.74，把标题区压到能安全承载 `#EDE3D3` 正文。
（横向渐变若反向，就会把人物压暗而标题仍落在亮区，两头不讨好。）

四处细节：

- **`background-position: left 38%`**。横向取 `left`：窄高视口 `cover` 裁切时
  永远从右侧切，保住人物。纵向取 38% 而非 `center`：带鱼屏上 `cover` 会
  纵向裁切，`center` 会把她的头发切掉一截，38% 让裁切偏向上方、优先保住头部。
- **退让只降不透明度、不做 `transform`**。宽幅 `cover` 已铺满，缩放会在
  边缘露出下层程序化天空，看着像 bug。
- **一律按值匹配阶段**。输入框上也有 `data-phase`，但取值是
  `plain` / `claimed` / `submitting` / `inert`，与 `hero` / `active` / `settling`
  不相交，所以不会误命中。
- **`settling` 与 `active` 同处理**。避免发出首条消息时立绘回弹一下。

亮档下立绘是 dusk 色调，加一层 `sepia(.22) saturate(.84) brightness(1.07)`
的和纸洗色，让它像印在纸上而不是贴在屏幕上。

### 3.3 亮档 · 和纸昼

基底 `#FAF3E8`；`bg-day.svg` 提供暖光、青海波弧与三条金鱼剪影；
边缘暖橙 / 朱红辉光 `opacity 0.10`；中心遮罩改白
`radial-gradient(ellipse 74% 62% at 50% 46%, rgba(255,252,246,0.94) → transparent)`。

### 3.4 背景强度三档

`bundle/client.js` 顶部一个常量：

```js
const INTENSITY = 'standard'; // 'standard' | 'calm' | 'plain'
```

| 档 | 效果 | 场景 |
| --- | --- | --- |
| `standard` | 完整背景 | 默认，氛围优先 |
| `calm` | 全部背景层透明度 ×0.5 | 长时间阅读 |
| `plain` | 背景层压到 6%，且不加载烟花场景 | 完全无干扰 |

`INTENSITY` 同时缩放遮罩与天空层，因此三档的对比度都保持在达标区间内。

---

## 4. 组件级处理

| 组件 | 处理 |
| --- | --- |
| 会话卡片 `[data-chat-flow]` | 暗 `rgba(20,17,28,0.62)` + `blur(10px)` + `1px rgba(240,200,140,0.10)` + `radius 18px`；亮 `rgba(255,252,246,0.72)` |
| 输入卡 `[data-composer-card]` | 暗 `rgba(28,22,34,0.78)` + `blur(16px)`，边框 `rgba(240,200,140,0.22)`，聚焦时 brand `0.45` |
| 侧边栏 | 比会话区更透（0.55），露出背景 |
| 会话激活项 | 左侧 2px 橙色「引线」竖条 + `rgba(232,138,60,0.10)` 底 |
| 菜单 / 浮层 | `rgba(26,22,34,0.96)`，**不叠多层 blur**（性能 + 视觉噪声） |
| 滚动条 | thumb `rgba(240,200,140,0.28)` → hover `0.45`，track 透明 |
| 代码块 | 暖调底；**语法色改写 shiki 的 10 个 `--shiki-token-*` 变量**（橙 / 金 / 米 / 青灰，去掉默认的高饱和蓝 `#4dabf7` 与紫 `#b197fc`），无需碰 shiki 内部标记 |
| 用户气泡 | `rgba(224,138,60,0.10)` + `1px rgba(224,138,60,0.20)` 边 |
| 助手消息 | 无底色，直接坐在阅读遮罩上 |
| 焦点环 | 只在原生 outline 生效的输入区补 `2px rgba(224,138,60,0.50)`；组件自绘焦点环处一律不动，避免出现双环 |

### 4.1 两条实现结论（已从本机 DSH 0.8.1 校验）

**语法高亮不必覆盖 shiki 的 DOM 结构。** `ui-theme` 的 `shiki.css` 把颜色全部收敛成
`--shiki-token-*` 一组 CSS 变量，所以暖色改写只是覆盖变量取值。而且主题呈现器把 token 作为
**body 内联样式**下发（`body.style.setProperty`），内联样式压过样式表，因此
`overrideTokens` 能直接盖掉 `shiki.css` 写在 `body[data-ds-dark-theme]` 上的同名声明。
这一条把原本最重的工作量降成了一组取值。

**背景能不能透出来，取决于 `--dsw-alias-bg-base`。** `ui-layout` 的 `AppFrame.module.css`
里 `._1tdjgG_frame { background: var(--dsw-alias-bg-base) }` 是一个铺满全屏的节点；该 token
一旦不透明，body 上的整个背景场景就被盖住。所以它必须接近全透明（0.10–0.12），
可读性由会话阅读卡与遮罩承担，而不是由底色承担。

---

## 5. 护眼验收清单

前三条已做成可执行断言，跑 `node tools/verify.mjs` 即验证（当前 104 个 token、
14 项界面对比度 + 10 项语法高亮对比度全部通过）：

1. **正文对比度**：暗档 13.99:1，亮档 13.28:1；次要文本 8.0 / 6.0:1；
   占位符 4.53 / 4.70:1；语法高亮 10 项均 ≥ 4.6:1。✅ 实测通过
2. **不出现纯黑与纯白**（底色、文字色、阴影一律避开；暗档投影用暖紫黑
   `rgba(8,5,12,…)` 而非 `rgba(0,0,0,…)`）。✅ 自动扫描通过
3. **不硬编码构建哈希类名**（否则 DSH 升级即失效）。✅ 自动扫描通过
4. 高饱和橙（饱和度 > 60%）在视口中的面积占比 **< 5%**。
5. `backdrop-filter` 每个表面只叠 **一层**，不做多层嵌套（当前 2 个表面）。
6. 会话正文区背后亮度标准差 **< 3**（由中心遮罩保证）。
7. 暗档下**禁用文字发光**（`text-shadow` glow 会糊字）。
8. **无自动播放动画**；烟花完全静态，未引入任何极慢呼吸之类的动效。
9. 焦点环、选中态、禁用态对比度不降级（不为好看牺牲状态可见性）。
10. `plain` 素色模式可一键降噪（改 `INTENSITY` 常量）。
11. 正文 `font-size` / 行高 / 字体族**不动**（不改默认 14px，不擅自换字体——换字体反而伤眼）。

---

## 6. 工程结构

```
F:\dsh插件\宵宫主题\
├── package.json          # main=bundle/host.js · exports ./client · dsh.bundle.patch · dsh.client
├── cordis.patch.yml      # - insert: [{ id: yoimiya-theme, name: dsh-yoimiya-theme }]
├── bundle/                           36 KB
│   ├── host.js           # ESM: export default { inject:['webServer'], apply(ctx) }
│   │                     #      注册 /yoimiya-bg/* 五条资源路由
│   └── client.js         # window.__ModuleLoader__.load({ id, factory })
│                         #      inject:['theme'] → overrideTokens() + 注入样式表
├── assets/
│   ├── yoimiya-wide.jpg  # 壁纸（用户提供，经 AI 扩图），16:9，342 KB —— 唯一外部位图
│   ├── yoimiya.jpg       # 原始方图（源文件，CSS 已不引用）
│   ├── bg-night.svg      # 夏祭夜空：六组烟花 + 光柱 + 灯笼 + 金鱼 + 火花拖尾，11 KB
│   ├── bg-day.svg        # 和纸昼：暖光 + 青海波弧 + 金鱼剪影，2.5 KB
│   ├── mark.svg          # 金鱼标识 · 暗档 #E08A3C
│   └── mark-day.svg      # 金鱼标识 · 亮档 #B5502A
├── tools/
│   └── verify.mjs        # 自检：node tools/verify.mjs
├── preview.html          # 免安装静态预览（可切明暗档与对话阶段）
├── DESIGN.md             # 本文件
└── README.md             # 安装 / 回滚 / 调参
```

画面主体（烟花、光柱、灯笼、金鱼、纹理、波纹）全部由 CSS 渐变与手写 SVG 生成，
合计约 15 KB。唯一的外部位图是 `yoimiya-wide.jpg` 壁纸，由使用者提供、
不随代码以 MIT 授权分发（见 README 的授权一节）。

### 6.1 两半的真实契约（已从本机 DSH 0.8.1 校验）

**Host 半边**（`bundle/host.js`）：

```js
export default {
  inject: ['webServer'],
  apply(ctx) {
    const dispose = ctx.webServer.register({
      kind: 'exact', path: '/yoimiya-bg/bg-night.svg',
      handler: async (req, res) => { /* readFile → res.writeHead(200) → res.end(bytes) */ },
    });
    ctx.effect(() => dispose);   // 卸载即撤路由
  },
};
```

**Client 半边**（`bundle/client.js`）：

```js
window.__ModuleLoader__.load({
  id: 'dsh-yoimiya-theme',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const inject = ['theme'];
    const apply = (ctx) => {
      const theme = ctx.get('theme');
      const p = (light, dark) => ({ light, dark });   // 必须显式给两档，裸字符串会抛 TypeError
      const dispose = theme.overrideTokens('yoimiya', { /* ...token 覆盖... */ });
      ctx.effect(() => dispose);
      const styleEl = document.createElement('style');   // 静态 bundle 里没有 styles 闭包符号
      ctx.effect(() => () => styleEl.remove());
    };
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
```

要点：

- `overrideTokens(source, tokens)` 是**叠加层**：不碰主题注册表，卸载即还原；
  每个值必须是 `{ light, dark }` 对。`validateOverrides` 只校验这对形状，
  **不限制 token 名、不校验颜色格式**，因此 `--shiki-*`、`--dsw-specific-*`、
  阴影值都能自由覆盖。
- 主题呈现器把 token 写成 **body 内联样式**，所以叠加层的优先级高于任何
  组件样式表（含 `shiki.css` 在 `body[data-ds-dark-theme]` 上的声明）。
- 第三方主题无法写进内置 settings schema（`preference` 只有
  `light | dark | system`），所以本主题采用「常驻叠加层」路线，
  内置明暗偏好仍然正常切换。
- 所有副作用必须走 `ctx.effect`，禁用 / 移除插件时页面完全复原。

### 6.2 选择器策略（本主题最重要的维护约定）

DSH 组件样式表用 CSS Modules，类名形如 `<构建哈希>_<局部名>`——本机实测
侧边栏是 `IrIWsq_brandMark`，而同类第三方主题里硬编码的是 `hHd-Xa_brandMark`，
说明**哈希会随 DSH 构建变化**。因此本主题：

1. **优先用稳定 `data-*` 属性**：`[data-composer-card]`、`[data-chat-flow]`、
   `[data-composer-placeholder]`、`[data-dsh-sidebar-brand-identity]`、
   `[data-dsh-sidebar-root]` 等——这些是 DSH 有意暴露的语义锚点。
2. **其次用局部名子串匹配** `[class*="_sessionRow"]`、`[class*="_brandMark"]`：
   哈希前缀会变，下划线后的局部名不会。
3. **绝不硬编码具体哈希**——`tools/verify.mjs` 会扫描并直接判失败。

另外两处刻意的取舍：

- **品牌标识走 CSS 而非插槽。** `ui-sidebar` 声明 `sidebar.brand.mark` 时用的是
  `kind: "single"`（唯一认领），官方品牌插件 `dsh-client-ui-brand-official` 已占据该键；
  第三方再注册同一个键会在加载时抛错，连带整个主题失效。所以改为隐藏官方 mark 的
  `<svg>` 并用 `::before` 画自绘金鱼。若将来该插槽放开为可叠加，可平滑升级到插槽方案。
- **不做滚动器重构。** 同类主题为了给消息列加底部渐变蒙版，对
  `.wSkVaW_scrollBody` / `.Md3f7G_scroll` 做了一套哈希类名 + JS 补丁的重构。
  那部分是最容易随升级崩坏的地方，且不属于本主题的必要能力，故不引入。

---

## 7. 安装与回滚

当前沙箱只能写 `F:\dsh插件\宵宫主题`，安装到
`%APPDATA%\dsh-desktop\harness\profiles\web` 需要额外授权或由你手动执行。

| 方式 | 命令 / 操作 |
| --- | --- |
| 官方 CLI（推荐） | `dsh plugin --profile web add <本目录路径>` |
| DSH Market | 已安装 `dshmarket`，可从 GitHub 源安装（需先把本目录推到仓库） |
| 手动 | 包放入 `profiles/web/node_modules/`，并在 `package.json` 的 `dependencies` 与 `dsh.profile.bundles` 中登记，再 `pnpm install` |

**回滚**：从 `dsh.profile.bundles` 移除 `dsh-yoimiya-theme` 即恢复原样；
`overrideTokens` 层随插件卸载自动撤销，不留残留。

---

## 8. 已确定的决策

| 项 | 结论 |
| --- | --- |
| 氛围取向 | **深夜夏祭**（暗档克制、最护眼），亮档以「和纸昼」作为对偶，token 契约要求两档齐备 |
| 明暗归属 | 不改内置 `light/dark/system` 偏好，两档随偏好自动切换 |
| 背景主体 | 程序化生成：CSS 渐变 + 手写 SVG（烟花、光柱、灯笼、金鱼、火花拖尾、纹理），约 15 KB |
| 壁纸 | **用户提供的方图经 AI 扩图（outpainting）得到的 16:9 宽幅图**，程序化合成补不了被画框切断的头发与衣料 |
| 分阶段依据 | 读 DSH 自己发布的 `data-phase`（`hero` / `active` / `settling`），用 `:has()` 侦测 |
| 护眼底线 | 遮罩独立成层并压在立绘之上；两阶段的界面对比度都保持达标 |
| 彩蛋 | 占位文案换宵宫台词 · 侧边栏品牌换自绘金鱼 · 代码块暖色语法高亮 · 会话激活项橙色引线条 |
| 未采纳 | 素色模式小开关（改为 `INTENSITY` 代码常量，不引入额外 DOM 与 localStorage） |
| 未采纳 | 生成中转圈换烟花、滚动器重构（前者属别的插件职责，后者维护风险高） |
| 未采纳 | 立绘全幅铺满 + 重遮罩（会让正文可读性取决于图片内容，正是本项目要避免的） |

**验证方式**：`node tools/verify.mjs`。它把第 5 节的硬性指标变成断言，
覆盖 token 形状、24 项对比度、纯黑纯白扫描（剥离 `mask-image`）、
样式表结构与图层顺序、哈希硬编码扫描、必需选择器（含三个阶段）、
以及 Host / 浏览器两半边的资源路径一致性。不安装到 DSH 也能跑。

**可看的效果**：`preview.html`——免安装的静态预览，右下角可切明暗档与
对话阶段，用来直观确认立绘的退让行为与两档配色。
