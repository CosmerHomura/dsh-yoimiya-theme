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

三层，没有遮罩。除宵宫立绘外全部由 CSS 渐变与手写 SVG 生成。

### 3.0 分层与顺序

| 层 | 载体 | 内容 |
| --- | --- | --- |
| 3（最前） | `[data-chat-flow]` | 会话阅读卡，正文最后一道稳定底 |
| 2 | `body::before` | **宵宫立绘**，首页与对话中完全一致 |
| 1（最后） | `body` | 程序化天空：多层渐变 + 烟花场景 SVG（仅在壁纸缺失时可见） |

**没有阅读遮罩，这是刻意的。** 早期版本有一层 `body::after` 中心遮罩，想把
正文背后的亮度方差压到接近 0。实测证明这个做法是错的：它把壁纸和人物一起
压闷，观感是「整片蒙了一层灰」；而正文真正的可读性来自会话卡自身的半透明
底面加毛玻璃——**遮罩是在拿主题本身去换一份本来就有的可读性**。整体删除后，
会话卡 0.30 压在最亮壁纸上仍有 5.3:1。

**也没有分阶段退让。** 立绘在首页与对话中保持同一亮度。原先的设计意图是
「首页看画面、对话读文字」，但实测观感是「一开口背景就变淡」的断裂，而
可读性并不依赖它。要安静靠卡片，不靠牺牲画面。

**`html` 必须保持 `transparent`。** 按 CSS 规范，根元素背景为 transparent 时
body 的背景会**传播到画布**，从而无条件铺满整个视口。给 html 一个不透明背景
会切断传播，body 盒子高度一旦不足就露底。这是有意利用的规范行为。

### 3.1 程序化天空（暗档「夏祭夜」，从后到前）

壁纸存在时它被完全盖住，只作兜底。

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

### 3.2 宵宫立绘与壁纸的接入依据

壁纸是 16:9 宽幅 1672×941，由原始方图经 AI 扩图（outpainting）得到。
原方图的**头发被上边缘切断、红绳与腰带被下/左边缘切断**——这正是需要
AI 扩图而非程序化合成的原因：程序化合成只能把切断藏在画布边界上，
AI 能把它们补全。

接入前实测了这张图，数据用来定**裁切与构图**（不是用来定遮罩——遮罩已废弃）：

| 测量项 | 结果 |
| --- | --- |
| 人物横向范围（暖色列区间） | x 9.8–42.4%，暖度峰值在 34.6% |
| 最亮暖区（脸与高光） | x 15.4–36.2%，y 24.1–62.0% |
| 标题落区（视口宽 41–73%） | 均值亮度 45–61，含亮度 255 的细光柱 |

**人物的可见性是已知取舍，不是参数没调好。** DSH 的聊天卡从视口宽约 25% 处
开始，而人物占图像 x 9.8–42.4%——她的右半身必然压在卡片之下，左侧落在侧边栏
（半透明玻璃）与卡片之间那条窄带里。这是 DSH 固定布局与 16:9 宽幅图共同决定
的，要让她更完整只能换更窄的画幅，或把她移到画面最左侧。

另有一个几何事实值得记下：**16:9 的图配 16:9 的屏幕，`cover` 是精确铺满，
`background-position` 在横向上完全不生效**。所以横向定位只能靠缩放
（`background-size` 放大后位置参数才起作用），纵向定位则是正常生效的。

四处细节：

- **`background-position: left 38%`**。横向取 `left`：窄高视口 `cover` 裁切时
  永远从右侧切，保住人物。纵向取 38% 而非 `center`：带鱼屏上 `cover` 会纵向
  裁切，`center` 会把她的头发切掉一截，38% 让裁切偏向上方、优先保住头部。
- **暗档 `filter: brightness(1.14) saturate(1.06)`**。原图是夜景，整片提亮一档
  才是「明亮的夜」；不提亮时对话区整体发闷，观感上会被误认为「有一层遮罩」。
- **亮档 `opacity: .85` + `sepia(.10) saturate(.94) brightness(1.18) contrast(.94)`**。
  轻度和纸洗色让它像印在纸上；早先为治「整页花白」一路压到 `opacity: .45`，
  那是把图洗没了，已修正。
- **不再有阶段相关的立绘规则**。样式表里甚至不出现 `data-phase`：首页与对话
  中同一张、同一亮度。
### 3.3 亮档 · 和纸昼

基底 `#FAF3E8`；`bg-day.svg` 提供暖光、青海波弧与三条金鱼剪影；
边缘暖橙 / 朱红辉光 `opacity 0.10`；壁纸轻度洗色后印在纸色底上。

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

`INTENSITY` 作用在**壁纸**上：`standard` 全幅全亮 / `calm` 退后一档（不透明度
0.86、提亮降到 1.06）/ `plain` 不透明度归零、只留程序化天空。三档的对比度都保持在达标区间内。

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
| 助手消息 | 无底色，直接坐在会话阅读卡上 |
| 焦点环 | 只在原生 outline 生效的输入区补 `2px rgba(224,138,60,0.50)`；组件自绘焦点环处一律不动，避免出现双环 |

### 4.1 两条实现结论（已从本机 DSH 0.8.1 校验）

**语法高亮不必覆盖 shiki 的 DOM 结构。** `ui-theme` 的 `shiki.css` 把颜色全部收敛成
`--shiki-token-*` 一组 CSS 变量，所以暖色改写只是覆盖变量取值。而且主题呈现器把 token 作为
**body 内联样式**下发（`body.style.setProperty`），内联样式压过样式表，因此
`overrideTokens` 能直接盖掉 `shiki.css` 写在 `body[data-ds-dark-theme]` 上的同名声明。
这一条把原本最重的工作量降成了一组取值。

**背景能不能透出来，取决于 `--dsw-alias-bg-base`。** `ui-layout` 的 `AppFrame.module.css`
里 `._1tdjgG_frame { background: var(--dsw-alias-bg-base) }` 是一个铺满全屏的节点；该 token
一旦不透明，body 上的整个背景场景就被盖住。所以它的不透明度必须是 0，
可读性由会话阅读卡承担，而不是由底色承担。

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
6. **不再要求**正文背后低方差。正文坐在会话卡上，卡片自身提供了稳定底面
   （0.30 压在最亮壁纸上仍有 5.3:1）。追求方差 < 3 需要整片遮罩，代价是壁纸
   与人物一起被压闷——收益重复、损失主题，已放弃。
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
│   ├── verify.mjs        # 自检：node tools/verify.mjs
│   ├── install-local.ps1 # DSH Desktop 本地安装脚本（README 引用）
│   └── awesome-entry.yml # 投稿到 awesome-dsh-plugin 目录的条目
├── DESIGN.md             # 本文件
└── README.md             # 面向使用者的安装说明
```

画面主体（烟花、光柱、灯笼、金鱼、纹理、波纹）全部由 CSS 渐变与手写 SVG 生成，
合计约 15 KB；壁纸 `yoimiya-wide.jpg` 是本仓库唯一的位图资源。

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

面向使用者的安装、卸载步骤见 [`README.md`](./README.md)。本节只记录两条对本
主题成立的机制性事实：

- **本地安装不必手改 bundles 列表。** 桌面端的投影里有
  `const dependencies = { ...currentDeps }`（真实 profile 依赖原样保留），并且会
  把「声明了 `dsh.bundle.patch` 的依赖」自动纳入 `dsh.profile.bundles`。所以本地
  安装只需一条 `pnpm add file:<目录>`；卸载同理只需要 `pnpm remove`。
- **卸载不留残留。** `overrideTokens` 是叠加层而非主题注册，插件卸载时 token
  与样式表一并撤销。

---

## 8. 已确定的决策

| 项 | 结论 |
| --- | --- |
| 氛围取向 | **深夜夏祭**（暗档克制、最护眼），亮档以「和纸昼」作为对偶，token 契约要求两档齐备 |
| 明暗归属 | 不改内置 `light/dark/system` 偏好，两档随偏好自动切换 |
| 背景主体 | 程序化生成：CSS 渐变 + 手写 SVG（烟花、光柱、灯笼、金鱼、火花拖尾、纹理），约 15 KB |
| 壁纸 | **用户提供的方图经 AI 扩图（outpainting）得到的 16:9 宽幅图**，程序化合成补不了被画框切断的头发与衣料 |
| 分阶段依据 | 读 DSH 自己发布的 `data-phase`（`hero` / `active` / `settling`），用 `:has()` 侦测 |
| 护眼底线 | 不用全屏遮罩；正文可读性由会话卡自身提供，两档界面对比度都保持达标 |
| 彩蛋 | 占位文案换宵宫台词 · 侧边栏品牌换自绘金鱼 · 代码块暖色语法高亮 · 会话激活项橙色引线条 |
| 未采纳 | 素色模式小开关（改为 `INTENSITY` 代码常量，不引入额外 DOM 与 localStorage） |
| 未采纳 | 生成中转圈换烟花、滚动器重构（前者属别的插件职责，后者维护风险高） |
| 已废弃 | 中心阅读遮罩与分阶段退让（把壁纸和人物一起压闷，见 §3.0） |

**验证方式**：`node tools/verify.mjs`。它把第 5 节的硬性指标变成断言，
覆盖 token 形状、24 项对比度、纯黑纯白扫描（剥离 `mask-image`）、
样式表结构与图层顺序、哈希硬编码扫描、必需选择器（含三个阶段）、
以及 Host / 浏览器两半边的资源路径一致性。不安装到 DSH 也能跑。

**可看的效果**：以安装后的实际界面为准。这里曾有一个 `preview.html` 静态预览，
但它是按取值手工重建的近似页面，实测与真实界面（侧边栏宽度、会话卡尺寸、
壁纸裁切）差异明显，反而误导判断，已删除。

---

## 9. 附录 · 改配色与换图

面向要改动本主题的人。README 只讲安装，操作细节放在这里。

### 9.1 背景强度

`bundle/client.js` 顶部一个常量：

```js
const INTENSITY = 'standard'; // 'standard' | 'calm' | 'plain'
```

| 档 | 效果 | 场景 |
| --- | --- | --- |
| `standard` | 完整背景 | 默认 |
| `calm` | 背景层透明度 ×0.5 | 长时间阅读 |
| `plain` | 压到 6%，且不加载烟花场景 | 完全无干扰 |

`INTENSITY` 作用在**壁纸**上：`standard` 全幅全亮 / `calm` 退后一档（不透明度
0.86、提亮降到 1.06）/ `plain` 不透明度归零、只留程序化天空。三档的对比度都保持在达标区间内。

### 9.2 改配色

`bundle/client.js` 里的 `TOKENS` 表就是全部配色，每项写成 `p(亮档值, 暗档值)`。
改完跑一遍自检，对比度不达标会直接失败。

> 每个 token 必须是 `p(light, dark)` 两档形式。写成裸字符串会让 DSH 的
> `validateOverrides` 抛 `TypeError`——这是有意设计，因为单一取值在用户切换
> 明暗后必然变得不可读。

### 9.3 换壁纸

壁纸是 16:9 宽幅图，人物在画面左侧。换图前先目视确认人物落在画面哪个位置，
再核对三处：

- `body::before` 的 `background-size: cover` + `background-position: left 38%`。
  横向 `left` 保证窄高视口裁切时从右侧切、保住人物；纵向 `38%` 让带鱼屏上的
  纵向裁切偏向上方，优先保住头部。人物若在画面右侧，`left` 要改成 `right`。
- **注意 16:9 的图配 16:9 的屏时 `cover` 是精确铺满，横向位置参数完全不生效。**
  想让构图横向移动，只能先放大（`background-size`），位置参数在缩放之后才起作用。
- 亮档的和纸洗色在 `body:not([data-ds-dark-theme])::before` 的 `filter` 里，
  换图后按需要调 `sepia` / `brightness`。

壁纸很亮时（例如带明亮云层），把 `INTENSITY` 调到 `'calm'` 会更护眼；
若想完全不用壁纸、只留程序化天空，用 `'plain'`。

当前壁纸由原始方图经 AI 扩图（outpainting）得到。原图的头发被上边缘切断、红绳
与衣料被下／左边缘切断，程序化合成只能把这类切断藏在画布边界上，AI 扩图才能补全
——这也是当初放弃程序化扩图的原因。
---

## 10. 开发时的三个陷阱（都会伪装成「代码没生效」）

这三条都实际踩过，而且现象一模一样：改了代码、刷新页面、毫无变化。

### 10.1 两半边的重载代价不同：浏览器半边存盘即可，Host 半边必须【完全重启】

| 半边 | 怎么被加载 | 什么时候重新读 |
| --- | --- | --- |
| 浏览器半边 `bundle/client.js` | 浏览器通过 HTTP 拉取 | `client-hmr` 每 500ms 轮询自动重新哈希，**存盘就够了，刷新页面生效** |
| Host 半边 `bundle/host.js` | DSH 进程 `import()` | **Node 的 ESM 模块缓存按 URL 缓存**：同一路径永远返回首次加载的那一份。只有**完全重启 DSH** 才会重读 |

浏览器半边为什么不需要任何额外动作——读 `@deepseek-ai/dsh-client-hmr/lib/index.js` 与 `dsh-client-modules/lib/index.js` 得到，并已实测：

- `client-hmr` 每 500ms 对**每个**插件包 `stat` 一次 `mtimeMs` 与 `size`；
- 一变就调 `clientModules.rebuilt(id)`：`readFileSync` 新字节、算出新 `rev`、重组 graph，并通过 `/plugins/events` 的 SSE 推 `rebuilt` 帧给浏览器；
- 插件包的 URL 形如 `/plugins/??<id>/client.js&rev=<rev>`，而 `rev` 是**包内容的 sha1 前 12 位**，URL 一变自然绕过 `max-age=31536000` 的不可变缓存。

所以**「改 client.js 得先触发一次插件重组」是错的**，不必再去改 `cordis.patch.yml` 做关机开机。真正需要的只有页面的刷新（SSE 通着的时候连刷新都会自动发生）。

顺带纠正一个假线索：裸的 `/plugins/<id>/client.js` **不是路由**，只会 404。真身只有 combo 形式 `/plugins/??<id>/client.js&rev=<rev>`。

**不打开浏览器也能确认服务端手里是哪一版**：按同一套算法复算当前文件的 `rev`，再和运行中 graph 的 `rev` 比。取 graph 用 `/plugins/events`（响应的首个 `data:` 帧就是全量 entry 列表，拿到即断开）：

```js
const HASH_REVISION_LENGTH = 12;
const framedHash = (domain, parts) => {
  const h = createHash('sha1').update(domain).update('\0');
  for (const part of parts) h.update(`${part.byteLength}:`).update(part);
  return h.digest('hex').slice(0, HASH_REVISION_LENGTH);
};
const rev = framedHash('plugin-artifact', [readFileSync('bundle/client.js')]);
```

两个 `rev` 相等 ⇒ 服务端已经是新字节，剩下的纯粹是浏览器缓存问题；不等才是真的没生效。

推论：**Host 半边的新路由、新脚本调用，在没有重启之前一律不存在。** 表现是请求落到 DSH 的 `frontend-static` 兜底：

- `GET` 未知路径 → **404**（空响应体）
- 非 `GET`/`HEAD` → **405**（空响应体）

`404` 与 `405` 都只说明「路由没注册」，不代表「路由拒绝了请求」。看到它们先怀疑这一条，不要去改业务逻辑。

### 10.2 客户端不要吞掉失败原因

同一个错误犯过两次——播放器探测与文件上传。两处的原始实现都是「失败就回一个空结果」，于是：

| 真实故障 | 界面显示 |
| --- | --- |
| 这台机器确实没装 | 未检测到 |
| 路由没注册（405） | 未检测到 |
| 请求被拒（400） | 未检测到 |
| 请求根本没发出去 | 未检测到 |

四种完全不同的故障折叠成同一句话，等于无法排查。现在的做法是**一路把原因带到界面上**：

- `fetch` 抛错 → 请求发不出去
- 响应不是 JSON → `HTTP <status> 且响应不是 JSON（空响应＝路由没注册）`
- 响应 JSON 但 `ok:false` → `HTTP <status> · <reason>`

一个后台静默失败的功能，比一个明确报错的功能难修十倍。

### 10.3 桩环境本身也是假警报源

`tools/verify.mjs` 用桩 DOM 跑 `apply()`，桩太简陋会把**真实可用**的代码判成不合格。已经补过三轮：元素缺 `style`、`document.body` 缺 `append`、`window` 缺 `addEventListener`／尺寸／`devicePixelRatio`／`requestAnimationFrame`。

新增桩时的判断标准：**主题会用到什么，桩就得有什么**；而 `getContext()` 故意返回 `null`，因为粒子层本来就有一条「环境不支持」的降级分支，让桩走那条路既省事、又顺带把降级路径覆盖了。

---

## 11. 画标识这类图形资产时，先给自己一双眼睛

手绘 SVG 路径有个陷阱：**写代码的时候看不到结果**。曲线的控制点往左还是往右、
鳍是"贴着背长"还是"戳在背上"，读代码都读不出来——只能靠渲染出来看。

这轮重画金鱼标识踩到的具体问题，几乎全是"看不见"造成的：

| 写法 | 渲染出来是什么 |
| --- | --- |
| 背鳍前缘的第一个控制点往左 | 鳍向前倾，成了戳在背上的**角** |
| 背鳍做得细长 | 无论怎么摆都读成**尖刺** |
| 尾两叶对称回弯 | 交叉成**蝴蝶结** |
| 尾做成一片大三角 | 读成**鲨鱼鳍** |
| 身体画成正圆 | 读成**普通鱼**，不是金鱼（金鱼是竖高身） |
| 鳍用不同 opacity 叠色 | 叠加处变暗块，整条鱼读成**几个脏色块** |

有效的方法是：**用 sharp 把 SVG 光栅化成 PNG，再看图**（sharp 走 librsvg，
能渲染 SVG）。渲染时刻意用高 density、并分别铺上暗档底与亮档底，才能判断
两种档位下的观感。一轮一轮改，每一轮都先看再改。

这条同样适用于其它图形资产（背景天空 SVG）。**能看图就一定要看图**——否则
就是在盲写几何，改十轮也未必收敛。
