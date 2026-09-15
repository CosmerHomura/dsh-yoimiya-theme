// 全图水平梯度扫描：找出任何隐藏的接缝（合成区与原图之间不该有亮度台阶）。
const { default: sharp } = await import(
  'file:///E:/life/DSH Desktop/resources/app/node_modules/sharp/dist/index.mjs'
);
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { data, info } = await sharp(join(root, 'assets', 'yoimiya-wide.jpg'))
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const lum = (x, y) => {
  const i = (y * W + x) * 3;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};

console.log(`输出 ${W}x${H}`);
const SEAM = 1080; // 原图右边界 = 1080，合成区从 1080 开始

console.log('\n① 逐行比较接缝两侧 |Δ|（x=1078 与 x=1082），只统计接缝附近本身平滑的行');
let maxD = 0;
let maxY = -1;
const deltas = [];
for (let y = 0; y < H; y++) {
  // 两侧各取 4px 均值，降低单像素噪声
  let a = 0, b = 0;
  for (let k = 0; k < 4; k++) { a += lum(SEAM - 1 - k, y); b += lum(SEAM + 1 + k, y); }
  a /= 4; b /= 4;
  const d = Math.abs(a - b);
  deltas.push(d);
  if (d > maxD) { maxD = d; maxY = y; }
}
deltas.sort((p, q) => p - q);
const med = deltas[Math.floor(deltas.length / 2)];
const p95 = deltas[Math.floor(deltas.length * 0.95)];
console.log(`   中位 |Δ| = ${med.toFixed(2)}   95 分位 = ${p95.toFixed(2)}   最大 = ${maxD.toFixed(2)} @ y=${maxY}`);
console.log(`   ${p95 < 3 ? '接缝在噪声量级内 ✓' : p95 < 6 ? '接缝轻微，基本不可见' : '接缝偏大，需要处理 ✗'}`);

console.log('\n② 全图最大水平梯度（应只出现在人物轮廓处，不该出现在天空里）');
const SKY_X0 = SEAM; // 只看合成区
let top = [];
for (let y = 0; y < H; y += 1) {
  for (let x = SKY_X0; x < W - 1; x++) {
    const d = Math.abs(lum(x, y) - lum(x + 1, y));
    top.push({ d, x, y });
  }
}
top.sort((p, q) => q.d - p.d);
console.log('   合成区内最大的 8 个相邻列亮度差：');
for (const t of top.slice(0, 8)) {
  console.log(`     Δ=${t.d.toFixed(1)}  @ (${t.x}, ${t.y})`);
}
console.log('   （若这些点都落在光柱上，说明是刻意的光束边缘；若孤立出现则可能是接缝）');

console.log('\n③ 合成区亮度横向一致性（每一行的左右两端差异，检查有无矩形台阶）');
for (const y of [60, 300, 560, 820, 1010]) {
  const l = lum(SEAM + 30, y);
  const m = lum(Math.round((SEAM + W) / 2), y);
  const r = lum(W - 30, y);
  console.log(`   y=${String(y).padStart(4)}  x1110=${l.toFixed(1)}  中央=${m.toFixed(1)}  右缘=${r.toFixed(1)}`);
}

console.log('\n④ 原图区域是否被动过：先做一次「仅 JPEG 往返」的对照实验');
// 把放大后的原图单独用同样的 JPEG 参数编码再解码，得到「压缩本身造成的偏差」。
// 宽幅图在该区域的偏差若与它同量级，说明原图只是被压缩，没有被合成改动。
const { data: O, info: OI } = await sharp(join(root, 'assets', 'yoimiya.jpg'))
  .resize(1080, 1080, { kernel: 'lanczos3' })
  .sharpen({ sigma: 0.7, m1: 0.3, m2: 0.5 })
  .raw()
  .toBuffer({ resolveWithObject: true });
const roundTripFile = join(root, 'tools', '_roundtrip.jpg');
await sharp(O, { raw: { width: 1080, height: 1080, channels: OI.channels } })
  .jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true })
  .toFile(roundTripFile); // 必须落盘，否则拿不到真正的编解码往返结果
const { data: roundTrip } = await sharp(roundTripFile)
  .raw()
  .toBuffer({ resolveWithObject: true });

const sample = (arr, w, x, y, c) => arr[(y * w + x) * 3 + c];
let worstWide = 0, atWide = null;
let worstRT = 0, atRT = null;
for (let y = 0; y < 1080; y++) {
  for (let x = 0; x < 1079; x++) { // 排除右边界 12px 羽化带之外的最后 1px
    const i = (y * 1080 + x) * 3;
    const j = (y * W + x) * 3;
    const a = Math.abs(data[j] - O[i]) + Math.abs(data[j + 1] - O[i + 1]) + Math.abs(data[j + 2] - O[i + 2]);
    const b = Math.abs(roundTrip[i] - O[i]) + Math.abs(roundTrip[i + 1] - O[i + 1]) + Math.abs(roundTrip[i + 2] - O[i + 2]);
    if (a > worstWide) { worstWide = a; atWide = [x, y]; }
    if (b > worstRT) { worstRT = b; atRT = [x, y]; }
  }
}
void sample;
console.log(`   宽幅图  vs 放大原图   最大偏差 ${worstWide} @ ${atWide}`);
console.log(`   仅JPEG往返 vs 放大原图 最大偏差 ${worstRT} @ ${atRT}`);
console.log(
  `   ${worstWide <= worstRT + 6 ? '两者同量级 → 原图只是被压缩，未被合成改动 ✓' : '宽幅图偏差明显更大 → 原图被动过 ✗'}`,
);
