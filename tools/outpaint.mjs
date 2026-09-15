// 宵宫立绘背景外扩（outpainting）
//
//   node tools/outpaint.mjs
//
// 把 864×864 的方图扩成 1920×1080 的宽幅图。
//
// ── 为什么只向右扩 ──────────────────────────────────────────────
// tools/analyze-edges.mjs 逐条量过四条边被人物占据的比例：
//   右边   0%   逐行标准差 ≤1.4，纯天空            → 可无痕外扩
//   左边  15%   y540–810 是红绳与手
//   上边  31%   x109–250 是亮光柱（该续），x314–413 是头发
//   下边  69%   红绳、腰带、暗色衣料
//
// 左边与上下两条边都是**被原图画框切断的人物**。向外扩这些方向，
// 等于把原本落在画面边界的切断搬到画面中间，会露馅。
// 只向右扩则两处切断原封不动留在画布左边界与上下边界上——
// 在外扩后的构图里它们不再是「切断」，而是画面的自然边缘。
//
// 于是：人物保持满高贴左（1.25 倍放大，幅度小、画质损失可接受），
// 右侧补 840px 夜空。16:9 画布在 16:9 视口下 1:1 映射。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { default: sharp } = await import(
  'file:///E:/life/DSH Desktop/resources/app/node_modules/sharp/dist/index.mjs'
);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'yoimiya.jpg');
const OUT = join(root, 'assets', 'yoimiya-wide.jpg');

// ── 画布 ────────────────────────────────────────────────────────
const OUT_W = 1920;
const OUT_H = 1080;
const SRC_W = 864;
const SCALE = OUT_H / SRC_W; // 1.25 —— 人物满高，贴左贴顶贴底
const IW = OUT_W > 0 ? Math.round(SRC_W * SCALE) : 0;
const IH = OUT_H;
const PLACE_X = 0;
const PLACE_Y = 0;
const EXT_W = OUT_W - IW; // 840

const EDGE = 8; // 取边缘色的带宽
const FEATHER = 12; // 接缝羽化（原图内侧；右边缘是纯天空，可以放心羽化）
const FAR_DARKEN = 0.86; // 外缘压暗，克制即可，只为避免画布边界硬边

// ── 1 · 载入并放大原图 ──────────────────────────────────────────
const { data: P } = await sharp(SRC)
  .resize(IW, IH, { kernel: 'lanczos3' })
  .sharpen({ sigma: 0.7, m1: 0.3, m2: 0.5 }) // 轻微锐化，补偿 1.25 倍放大的软化
  .raw()
  .toBuffer({ resolveWithObject: true });
const at = (x, y, c) => P[(y * IW + x) * 3 + c];

// ── 2 · 右边缘剖面 ──────────────────────────────────────────────
const nearR = [];
const skyR = [];
{
  for (let y = 0; y < IH; y++) {
    const samples = [];
    for (let k = 0; k < EDGE; k++) {
      const i = (y * IW + (IW - 1 - k)) * 3;
      samples.push([P[i], P[i + 1], P[i + 2]]);
    }
    const mean = [0, 1, 2].map((c) => samples.reduce((s, v) => s + v[c], 0) / samples.length);
    let sd = 0;
    for (const v of samples) sd += (v[0] - mean[0]) ** 2 + (v[1] - mean[1]) ** 2 + (v[2] - mean[2]) ** 2;
    sd = Math.sqrt(sd / (samples.length * 3));
    nearR.push(mean);
    skyR.push({ c: mean, sd });
  }
}
// 右边缘若有结构（不该有）就用邻近行插值补掉，避免把内容拖出去
{
  const R = 6;
  const cleaned = skyR.map((p, i) => {
    if (p.sd <= 6) return p.c.slice();
    let a = i - 1;
    while (a >= 0 && skyR[a].sd > 6) a--;
    let b = i + 1;
    while (b < IH && skyR[b].sd > 6) b++;
    if (a < 0) return skyR[Math.min(b, IH - 1)].c.slice();
    if (b >= IH) return skyR[Math.max(a, 0)].c.slice();
    const t = (i - a) / (b - a);
    return [0, 1, 2].map((c) => skyR[a].c[c] * (1 - t) + skyR[b].c[c] * t);
  });
  for (let i = 0; i < IH; i++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let k = -R; k <= R; k++) {
      const j = Math.min(IH - 1, Math.max(0, i + k));
      r += cleaned[j][0]; g += cleaned[j][1]; b += cleaned[j][2]; n++;
    }
    skyR[i] = [r / n, g / n, b / n];
  }
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smooth = (t) => t * t * (3 - 2 * t);

// ── 3 · 低频噪声，打散大面积渐变的死平感 ────────────────────────
function hash2(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function valueNoise(x, y, cell) {
  const fx = x / cell, fy = y / cell;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = smooth(fx - ix), ty = smooth(fy - iy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
const skyNoise = (x, y) =>
  (valueNoise(x, y, 300) - 0.5) * 2 * 6 + (valueNoise(x + 800, y + 300, 105) - 0.5) * 2 * 3;

// ── 4 · 光柱：紧芯 + 宽晕两层高斯，自上而下衰减 ─────────────────
// 原图顶部有两道亮白偏暖的竖直光柱，这里是同风格、落在新增天空里的几道。
const STREAKS = [
  // x, 芯宽, 晕宽, 强度, 暖度, 衰减终点 y
  { x: 1226, w: 3.0, hw: 24, amp: 0.15, warm: 0.50, yEnd: 560 },
  { x: 1432, w: 2.0, hw: 16, amp: 0.10, warm: 0.30, yEnd: 360 },
  { x: 1614, w: 4.0, hw: 32, amp: 0.16, warm: 0.20, yEnd: 780 },
  { x: 1806, w: 2.4, hw: 19, amp: 0.11, warm: 0.45, yEnd: 470 },
  { x: 1884, w: 4.6, hw: 38, amp: 0.09, warm: 0.62, yEnd: 900 },
  { x: 1132, w: 1.8, hw: 13, amp: 0.09, warm: 0.28, yEnd: 300 },
];

// 远处的极淡烟花辉光：把新增天空与主题其余部分的母题接上
const GLOWS = [
  { x: 1640, y: 214, r: 268, amp: 0.22, hue: [255, 190, 126] },
  { x: 1852, y: 880, r: 240, amp: 0.15, hue: [255, 168, 118] },
  { x: 1290, y: 952, r: 210, amp: 0.10, hue: [168, 196, 255] },
  { x: 1168, y: 138, r: 180, amp: 0.13, hue: [214, 206, 255] },
  { x: 1520, y: 620, r: 300, amp: 0.07, hue: [255, 205, 150] },
];

// 远处的烟花爆发。放射瓣用 cos(Nθ) 合成，比逐条画线便宜得多——
// 原图天空只有光柱与星轨，加几朵远处的烟花既呼应宵宫的母题，也让新天空不至于空。
// 形态由三层叠成：细瓣 + 瓣端亮珠 + 整体柔光晕，否则会像线稿雪花而不像烟花。
const BURSTS = [
  { x: 1524, y: 226, r: 180, n: 16, amp: 0.30, hue: [255, 188, 122], ph: 0.30 },
  { x: 1812, y: 560, r: 132, n: 13, amp: 0.20, hue: [255, 148, 128], ph: 1.10 },
  { x: 1348, y: 892, r: 106, n: 12, amp: 0.15, hue: [176, 198, 255], ph: 0.70 },
  { x: 1882, y: 156, r: 76, n: 11, amp: 0.13, hue: [255, 208, 152], ph: 2.00 },
  { x: 1206, y: 556, r: 90, n: 14, amp: 0.08, hue: [255, 196, 140], ph: 1.55 },
];

const sstep = (a, b, t) => {
  const u = clamp((t - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

/** 累加所有爆发的贡献；不落在任何爆发内时返回 null。 */
function burstAt(x, y) {
  let acc = null;
  for (const b of BURSTS) {
    const dx = x - b.x, dy = y - b.y;
    const rr = Math.sqrt(dx * dx + dy * dy) / b.r;
    if (rr > 1.16) continue;
    const ang = Math.atan2(dy, dx);
    // cos(Nθ+φ) 取正部再取幂 → N 条放射瓣
    const spoke = Math.pow(Math.max(0, Math.cos(b.n * ang + b.ph)), 5);
    // 细瓣本体：中心附近弱、向外增强，到 r≈0.9 处收掉
    const trail = sstep(0.08, 0.45, rr) * (1 - sstep(0.88, 1.12, rr));
    // 瓣端亮珠：烟花真正的「星点」在瓣尖
    const tip = Math.exp(-(((rr - 0.94) / 0.075) ** 2)) * spoke;
    // 整体柔光晕：让爆发有体积感，而不是贴上去的线条
    const halo = Math.exp(-rr * rr * 1.7) * 0.30;
    const k = (spoke * trail * 0.72 + tip * 0.95 + halo) * b.amp;
    if (k <= 0) continue;
    if (acc === null) acc = [0, 0, 0];
    acc[0] += k * b.hue[0];
    acc[1] += k * b.hue[1];
    acc[2] += k * b.hue[2];
  }
  return acc;
}

/** @returns [亮白增量 0..1, 暖度 0..1] */
function streakLight(x, y) {
  let amp = 0;
  let warm = 0;
  for (const s of STREAKS) {
    if (y > s.yEnd) continue;
    const dxc = (x - s.x) / s.w;
    const dxh = (x - s.x) / s.hw;
    const g =
      (Math.exp(-dxc * dxc * 0.5) + Math.exp(-dxh * dxh * 0.5) * 0.30) *
      Math.pow(clamp((s.yEnd - y) / s.yEnd, 0, 1), 1.4) *
      s.amp;
    amp += g;
    warm += g * s.warm;
  }
  return [amp, amp > 0 ? warm / amp : 0];
}

// ── 5 · 星点（只落在新增区域）────────────────────────────────────
const SPARKS = [];
{
  let s = 20240917;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 130; i++) {
    SPARKS.push({
      x: IW + rnd() * EXT_W,
      y: rnd() * OUT_H,
      amp: 0.10 + rnd() * 0.26,
    });
  }
}

// ── 6 · 合成 ────────────────────────────────────────────────────
const buf = Buffer.alloc(OUT_W * OUT_H * 3);
let seed = 981231;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const X1 = IW - 1;

for (let y = 0; y < OUT_H; y++) {
  for (let x = 0; x < OUT_W; x++) {
    const o = (y * OUT_W + x) * 3;
    let r, g, b;

    if (x <= X1) {
      const i = (y * IW + x) * 3;
      r = P[i]; g = P[i + 1]; b = P[i + 2];
      buf[o] = r; buf[o + 1] = g; buf[o + 2] = b;
      continue;
    }

    // 新增区：右边缘剖面按行取样，并加一点纵向漂移，
    // 否则 840px 全是纯水平条带，会显出不自然的平整。
    const t = (x - X1 - 1) / (OUT_W - 1 - X1); // 0 紧邻原图，1 到画布右缘
    const drift = Math.round((x - X1) * 0.030);
    const cy = clamp(y + drift, 0, IH - 1);
    const near = nearR[cy];
    const sky = skyR[cy];

    const w = smooth(Math.pow(t, 0.30));
    r = near[0] * (1 - w) + sky[0] * w;
    g = near[1] * (1 - w) + sky[1] * w;
    b = near[2] * (1 - w) + sky[2] * w;

    const fade = smooth(Math.pow(clamp(t, 0, 1), 0.70));
    const d = 1 - FAR_DARKEN;
    r *= 1 - d * fade; g *= 1 - d * fade; b *= 1 - d * fade;

    // 噪声与颗粒必须在接缝处归零：原图侧没有这层噪声，
    // 若在边界就满幅加入，两侧噪声底不同，会显出一条亮度台阶。
    const noiseGain = smooth(clamp((x - X1) / 90, 0, 1));

    // 低频起伏
    const nz = skyNoise(x, y) * noiseGain;
    r += nz; g += nz; b += nz;

    // 竖直光柱：暖度高时偏红少蓝
    const [amp, warm] = streakLight(x, y);
    if (amp > 0) {
      r += amp * 255 * (0.84 + 0.16 * warm);
      g += amp * 255 * (0.88 - 0.04 * warm);
      b += amp * 255 * (1.0 - 0.40 * warm);
    }

    // 彩色辉光（淡烟花）
    for (const gl of GLOWS) {
      const dx = (x - gl.x) / gl.r;
      const dy = (y - gl.y) / gl.r;
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (dd >= 1) continue;
      const k = (1 - dd) ** 2.4 * gl.amp;
      r += k * gl.hue[0]; g += k * gl.hue[1]; b += k * gl.hue[2];
    }

    // 烟花爆发（放射瓣）
    const bu = burstAt(x, y);
    if (bu !== null) { r += bu[0]; g += bu[1]; b += bu[2]; }

    // 星点
    for (const sp of SPARKS) {
      const dx = x - sp.x, dy = y - sp.y;
      const q = dx * dx + dy * dy;
      if (q < 9) {
        const k = sp.amp * (1 - Math.sqrt(q) / 3) * 255;
        if (k > 0) { r += k * 0.92; g += k * 0.90; b += k * 0.98; }
      }
    }

    // 胶片颗粒
    const n = (rnd() - 0.5) * 4.4 * noiseGain;
    r += n; g += n; b += n;

    buf[o] = clamp(r, 0, 255);
    buf[o + 1] = clamp(g, 0, 255);
    buf[o + 2] = clamp(b, 0, 255);
  }
}

// ── 7 · 接缝羽化（只在右边界一段窄带内交叉淡化）────────────────
for (let y = 0; y < OUT_H; y++) {
  for (let k = 0; k < FEATHER; k++) {
    const x = X1 - k;
    const w = smooth(clamp(k / FEATHER, 0, 1)); // 边界处 0（用合成值），内侧 1（用原图）
    const o = (y * OUT_W + x) * 3;
    const i = (y * IW + x) * 3;
    for (let c = 0; c < 3; c++) buf[o + c] = buf[o + c] * (1 - w) + P[i + c] * w;
  }
}

await sharp(buf, { raw: { width: OUT_W, height: OUT_H, channels: 3 } })
  .jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true })
  .toFile(OUT);

const kb = (readFileSync(OUT).length / 1024).toFixed(0);
console.log(`已生成 yoimiya-wide.jpg  ${OUT_W}x${OUT_H}  ${kb} KB`);
console.log(`  人物 ${IW}x${IH}（${SCALE} 倍），贴左贴顶贴底`);
console.log(`  新扩天空：右侧 ${EXT_W}px（占画布宽 ${((EXT_W / OUT_W) * 100).toFixed(0)}%）`);
console.log(`  人物占画布宽 ${((IW / OUT_W) * 100).toFixed(1)}%，脸部约在画布 x=${Math.round(IW * 0.5)}`);
console.log(`  光柱 ${STREAKS.length} 道 · 辉光 ${GLOWS.length} 处 · 星点 ${SPARKS.length} 个`);
writeFileSync(
  join(root, 'tools', '_wide-meta.json'),
  JSON.stringify({ OUT_W, OUT_H, IW, IH, PLACE_X, PLACE_Y, EXT_W }, null, 2),
);
