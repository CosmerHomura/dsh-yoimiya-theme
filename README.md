# 宵宫主题 · dsh-yoimiya-theme

为 DeepSeek Harness Web GUI 制作的《原神》宵宫主题。

暗档「夏祭夜」是夏夜烟花下的暖靛黑，亮档「和纸昼」转为和纸米色。
壁纸在首页全亮，一旦开始对话就自动退成氛围层，把屏幕中心让给正文。

## 效果

| | 暗档「夏祭夜」 | 亮档「和纸昼」 |
| --- | --- | --- |
| 底色 | `#14111C` 暖靛黑 | `#FAF3E8` 和纸米 |
| 正文 | `#EDE3D3` 暖米白 | `#33261C` 墨棕 |
| 品牌橙 | `#E08A3C` | `#B5502A` |

配色跟随 DSH 的明暗偏好自动切换，不需要额外设置。

主题还包含：

- 暖色系代码语法高亮（替换默认的高饱和蓝与紫）
- 侧边栏金鱼标识（含折叠态）
- 会话激活项的橙色「引线」竖条
- 输入框占位文案换成宵宫台词（中英双语）

想先看效果再决定装不装：双击 `preview.html`，右下角可以切换明暗档与对话阶段。

## 安装

### 应用内插件市场

设置 → 插件 → 搜索 `yoimiya` → 安装。

> 收录申请尚在审核，合并前请用下面两种方式之一。

### 命令行

```bash
dsh plugin --profile web add github:CosmerHomura/dsh-yoimiya-theme
```

### DSH Desktop 手动安装

桌面端不带 `dsh` 命令，用仓库内的脚本：

1. **完全退出 DSH Desktop**
2. 右键 `tools\install-local.ps1` →「使用 PowerShell 运行」
3. 启动 DSH，刷新页面

脚本会先确认 DSH 已退出、备份 profile 配置，再执行安装并逐项校验：依赖是否
登记、包能否解析、是否声明了 `dsh.bundle`、双半边文件是否齐全。任一步失败都会
停下并打印回滚命令。

安装完成后，Host 日志里会出现：

```
[yoimiya-theme] Host 半边就绪（4/4 条资源路由）
```

## 卸载

**应用内**：设置 → 插件 → 找到 `dsh-yoimiya-theme` → 移除。

**命令行**：

```bash
dsh plugin --profile web remove dsh-yoimiya-theme
```

**Desktop 手动安装的**：

```powershell
& "$env:APPDATA\dsh-desktop\harness\.desktop-bin\pnpm.cmd" `
  --dir "$env:APPDATA\dsh-desktop\harness\profiles\web" `
  remove dsh-yoimiya-theme
```

主题用的是叠加层（`overrideTokens`）而不是主题注册，所以卸载后配色与样式一并
撤销，不留残留。

## 兼容性

- DSH 0.8.1 及以上
- 桌面端与 Web 端均可使用
- 明暗两档跟随 DSH 的 `light` / `dark` / `system` 偏好

## 授权

MIT，见 [`LICENSE`](./LICENSE)。

角色「宵宫」为米哈游《原神》角色，本主题为非商业同人作品。

## 开发

配色推导、遮罩设计、选择器策略，以及改配色 / 换图的操作步骤，见
[`DESIGN.md`](./DESIGN.md)。

`tools/verify.mjs` 是自检脚本，把设计里的硬性指标变成断言（对比度、token 形状、
图层顺序等），不装 DSH 也能跑：

```bash
node tools/verify.mjs
```
