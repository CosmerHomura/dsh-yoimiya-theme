// 精确测出原图四条边各自被「人物内容」占据的比例，决定哪些方向可外扩。
const { default: sharp } = await import(
  'file:///E:/life/DSH Desktop/resources/app/node_modules/sharp/dist/index.mjs'
);
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { data, info } = await sharp(join(root, 'assets', 'yoimiya.jpg'))
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const px = (x, y) => {
  const i = (y * W + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** 沿一条边的每一列/行，判断它是否「像天空」：与整条边的中位色差得不多。 */
function edgeReport(name, sample, len) {
  const cols = [];
  for (let i = 0; i < len; i++) cols.push(sample(i));
  const lums = cols.map(lum).sort((a, b) => a - b);
  const med = lums[Math.floor(lums.length / 2)];
  // 天空在该方向上是连续渐变的，中位色附近 ±26 视为天空
  const sky = cols.map((c, i) => Math.abs(lum(c) - med) < 26);
  const bad = [];
  let run = null;
  for (let i = 0; i < len; i++) {
    if (!sky[i]) {
      if (run === null) run = [i, i];
      else run[1] = i;
    } else if (run !== null) {
      bad.push(run);
      run = null;
    }
  }
  if (run !== null) bad.push(run);
  const badCount = sky.filter((v) => !v).length;
  console.log(`\n【${name}】中位亮度 ${med.toFixed(0)}，非天空 ${badCount}/${len} px（${((badCount / len) * 100).toFixed(0)}%）`);
  if (bad.length === 0) console.log('  整条边都是天空 ✓ 可安全外扩');
  else {
    console.log('  非天空区段（原图坐标）：');
    for (const [a, b] of bad) {
      const mid = Math.floor((a + b) / 2);
      console.log(`    ${String(a).padStart(4)} .. ${String(b).padStart(4)}  （长 ${b - a + 1}px，中点色 ${hex(cols[mid])}）`);
    }
  }
}

// 每条边取最外侧 3 个像素的平均，减少 JPEG 噪声干扰
const sideAvg = (x, y, dx, dy) => {
  const acc = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const c = px(x + dx * k, y + dy * k);
    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
  }
  return acc.map((v) => v / 3);
};

edgeReport('上边 y=0..2（向下）', (x) => sideAvg(x, 0, 0, 1), W);
edgeReport('下边 y=863..861（向上）', (x) => sideAvg(x, H - 1, 0, -1), W);
edgeReport('左边 x=0..2（向右）', (y) => sideAvg(0, y, 1, 0), H);
edgeReport('右边 x=863..861（向左）', (y) => sideAvg(W - 1, y, -1, 0), H);

console.log('\n各边可外扩结论汇总');
console.log('  → 只有「非天空 0%」的方向才可无痕外扩；其余方向的外扩会把人物切断处暴露出来。');
