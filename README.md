# dsh-yoimiya-theme · 宵宫主题

以《原神》宵宫 / 长野原烟花店为母题的 **DeepSeek Harness Web GUI 主题**，
面向长时间盯屏设计。

- **边缘有戏，中间安静**：烟花、灯笼、暖光全部安排在视口四角；屏幕中央留一条
  亮度稳定的「阅读通道」，正文背后的亮度方差趋近于 0——眼睛不必在读字时反复调节。
- **立绘分阶段呈现**：首页全幅绽放，一旦开始对话就自动缩向右缘当氛围，
  中心让给阅读通道。氛围和可读性不必互相让步。
- **两档独立配色**：暗档「夏祭夜」与亮档「和纸昼」不是同一组颜色的明暗翻转，
  而是各自取值（橙金在暗底上要提亮、在纸底上要压深）。
- **不用纯黑与纯白**：底色取暖靛黑，正文用暖米白，阴影用暖紫黑。
- **画面主体程序化生成**：烟花、光柱、灯笼、金鱼、纹理全部是 CSS 渐变 + 手写 SVG，
  约 15 KB，不依赖任何外部素材。

想先看效果再决定装不装，直接双击 `preview.html`——免安装的静态预览，
右下角可以切明暗档与对话阶段，观察立绘的退让行为。

配色、背景与护眼取舍的完整推导见 [`DESIGN.md`](./DESIGN.md)。

## 效果一览

| | 暗档「夏祭夜」 | 亮档「和纸昼」 |
| --- | --- | --- |
| 底色 | `#14111C` 暖靛黑 | `#FAF3E8` 和纸米 |
| 正文 | `#EDE3D3` 暖米白 · 13.99:1 | `#33261C` 墨棕 · 13.28:1 |
| 品牌橙 | `#E08A3C` · 6.66:1 | `#B5502A` · 4.60:1 |
| 背景 | 16:9 宽幅立绘（含烟花与光柱） | 同左，加和纸洗色 |
| 立绘 | 全幅 `cover`、全亮 | `opacity .52` + sepia 洗色 |

立绘（16:9 宽幅，人物占 x 0–50%）随对话阶段自动退让：

| 阶段 | 立绘 | 遮罩 |
| --- | --- | --- |
| 首页（无会话） | `opacity 1` | 左轻右重横向渐变——保住人物、压暗居中标题区 |
| 对话中 | `opacity .34` | 中心椭圆，压住正文背后 |

阶段读的是 DSH 自己发布的 `data-phase`（会话根节点，取值 `hero` / `active` /
`settling`），所以不需要任何额外状态管理，也不受主题自身控制。

除配色外还包含：

- 暖色系**代码语法高亮**（改写 shiki 的 `--shiki-token-*`，去掉默认的高饱和蓝与紫）
- 自绘**金鱼标识**替换侧边栏品牌 mark（含折叠态）
- 会话激活项的橙色**「引线」竖条**
- 输入框**占位文案换成宵宫台词**（中英双语，自动保留「/ 调用指令 @ 文件或对话」提示）

## 安装

本主题是一个标准 dsh bundle（Host + 浏览器双半边）。

### 方式一 · 官方 CLI（推荐）

```bash
dsh plugin --profile web add <本目录绝对路径>
```

### 方式二 · DSH Market

先把本目录推到一个 Git 仓库，再从已安装的 `dshmarket` 界面按 Git 源安装。

### 方式三 · 手动

1. 把本目录放进 `%APPDATA%\dsh-desktop\harness\profiles\web\node_modules\dsh-yoimiya-theme`
2. 在 `profiles/web/package.json` 的 `dependencies` 加 `"dsh-yoimiya-theme": "file:./node_modules/dsh-yoimiya-theme"`（或按你实际的链接方式）
3. 在同一文件的 `dsh.profile.bundles` 数组里追加 `"dsh-yoimiya-theme"`
4. 在 `profiles/web` 下执行 `pnpm install`

装好后刷新页面（或重启应用）。Host 半边会打印
`[yoimiya-theme] Host 半边就绪（4/4 条资源路由）`。

## 回滚

从 `dsh.profile.bundles` 移除 `dsh-yoimiya-theme` 即可完全恢复原样。
若只想临时停用，在 profile 的 `cordis.patch.yml` 里把该行 disable 掉也行。

`overrideTokens` 是叠加层而非主题注册，插件一卸载 token 与样式表立即撤销，
**不留任何残留**。

## 调参

### 背景强度

编辑 `bundle/client.js` 顶部的常量：

```js
const INTENSITY = 'standard'; // 'standard' | 'calm' | 'plain'
```

| 档 | 效果 | 场景 |
| --- | --- | --- |
| `standard` | 完整背景 | 默认，氛围优先 |
| `calm` | 背景层透明度 ×0.5 | 长时间阅读 |
| `plain` | 背景层压到 6%，且不加载烟花场景 | 完全无干扰 |

改完刷新页面即可。

### 改颜色

`bundle/client.js` 里的 `TOKENS` 表就是全部配色，每项是
`p(亮档值, 暗档值)`。改任何一个值后在 `tools/verify.mjs` 里跑一遍，
对比度不达标会直接报错。

> 注意：每个 token 必须写成 `p(light, dark)` 两档形式。写成裸字符串会让
> `validateOverrides` 抛 `TypeError`——DSH 有意这样设计，因为单一取值在
> 用户切换明暗后必然变得不可读。

### 换标识 / 背景图 / 立绘

替换 `assets/` 下的文件即可，**文件名与路由都不用动**：

| 文件 | 用途 | 换的时候注意 |
| --- | --- | --- |
| `mark.svg` / `mark-day.svg` | 侧边栏品牌标识 | 建议 24×24 的方形 viewBox；两档各一份是因为橙金在暗底上要提亮、在纸底上要压深 |
| `bg-night.svg` / `bg-day.svg` | 程序化天空场景 | 保持中间区域为空——阅读通道就靠它让出来 |
| `yoimiya-wide.jpg` | 壁纸（主题实际使用，16:9） | 见下 |
| `yoimiya.jpg` | 原始方图 | 保留作源文件，CSS 已不引用；`tools/outpaint.mjs` 以它为输入 |

**换成你自己的壁纸**时，有一件事必须先做——**量出人物落在画面哪个位置**，
因为遮罩方向取决于它：

```bash
node tools/analyze-edges.mjs    # 看四条边各被人物占据多少
```

- 主题按 `background-size: cover` + `background-position: left 38%` 摆放。
  横向 `left` 保证窄高视口裁切时从右侧切、保住人物；纵向 `38%` 让带鱼屏上的
  纵向裁切偏向上方，优先保住头部。人物若在画面右侧，把 `left` 改成 `right`。
- **hero 遮罩是左轻右重的横向渐变**（`linear-gradient(96deg, …)`），
  0% 处 ≤0.13、52% 处 0.74。人物在左、DSH 标题居中，所以必须这样；
  若人物在右，整条渐变要反过来，否则会同时压暗人物又让标题落在亮区。
- 亮档的和纸洗色在 `body:not([data-ds-dark-theme])::before` 的 `filter` 里，
  换图后按需要调 `sepia` / `brightness`。
- 若壁纸下半部很亮（比如带明亮云层），把 `INTENSITY` 调到 `'calm'` 会更护眼——
  遮罩同步变淡，两档对比度都不会失守。

`tools/outpaint.mjs` 是我写的程序化扩图脚本（只向右扩、接缝中位台阶 1.0 亮度级、
原图零改动），在拿到 AI 扩图之前用过。**它补不了被画框切断的头发和衣料**——
那正是需要 AI 扩图的地方。留作参考与兜底。

## 自检

```bash
node tools/verify.mjs
```

不安装到 DSH 也能跑。它把设计文档里的硬性指标变成断言：

- token 覆盖层符合 `{ light, dark }` 形状要求，且 13 个官方契约 token 齐全
- 14 项界面对比度 + 10 项语法高亮对比度（WCAG 相对亮度公式，实测值全部打印）
- 扫描纯黑 / 纯白（会先剥离 `mask-image`，因为遮罩的黑只表达 alpha）
- 样式表括号配平、必需选择器存在（含 `hero` / `active` / `settling` 三个阶段）
- **检查图层顺序**：遮罩必须晚于立绘，否则遮罩会被立绘盖住
- **扫描硬编码的构建哈希类名**（DSH 升级后失效的根因）
- Host 与浏览器两半边的资源路径一致性，以及资源文件确实存在

退出码非 0 表示有硬性项不达标。

## 静态预览

双击 `preview.html`。它是免安装的近似重建，右下角可切换：

- **明暗档**——「夏祭夜」/「和纸昼」
- **对话阶段**——「首页 hero」/「对话 active」，用来直观确认立绘的自动退让

注意它是重建而非真实 app 的截图，观感接近但不会完全相同（尤其是
`backdrop-filter` 毛玻璃与真实消息排版）。

## 维护须知

DSH 组件样式表用 CSS Modules，类名形如 `<构建哈希>_<局部名>`，
**哈希随构建变化**（本机实测侧边栏为 `IrIWsq_brandMark`，而同版本第三方主题里
硬编码的是 `hHd-Xa_brandMark`）。因此本主题的 CSS 遵循：

1. 优先用稳定 `data-*` 属性（`[data-composer-card]`、`[data-chat-flow]`、
   `[data-dsh-sidebar-brand-identity]`…）
2. 其次用局部名子串匹配（`[class*="_sessionRow"]`）
3. 绝不硬编码具体哈希——`tools/verify.mjs` 会扫描并判失败

DSH 大版本升级后，若某个选择器失配，最可能失效的是两处局部名匹配
（`_brandMark` / `_railMark` / `_sessionRow` / `_selected`）。
用开发者工具确认新的局部名后改一下子串即可。

另有两处刻意取舍已记录在 `DESIGN.md` §6.2：品牌标识走 CSS 而非插槽
（该插槽是 `kind: "single"`，已被官方品牌插件认领，第三方注册会抛错）；
不做滚动器重构（维护风险高且非必要）。

## 授权

MIT（见 `LICENSE`）。代码、程序化美术与立绘均可自由使用、修改、分发。

角色「宵宫」为米哈游《原神》角色，本主题为非商业同人作品。
