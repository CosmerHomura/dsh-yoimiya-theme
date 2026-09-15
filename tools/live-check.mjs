// 确认运行中的 DSH 到底在发哪一版 bundle/client.js。
//
// 为什么需要它：改完主题刷新页面却"没变化"时，有两种完全不同的原因——
// 服务端还没拿到新字节，或者只是浏览器缓存。这两者要做的事完全不同，不先
// 分清就会瞎改代码。
//
// 原理（读 @deepseek-ai/dsh-client-hmr 与 dsh-client-modules 得到）：
//   · client-hmr 每 500ms 对每个插件包 stat 一次 mtimeMs 与 size，一变就调
//     clientModules.rebuilt(id)，重新按内容算 rev
//   · 插件包 URL 是 /plugins/??<id>/client.js&rev=<rev>，rev = 包内容的
//     sha1 前 12 位；URL 变了自然绕过 max-age=31536000 的不可变缓存
//   · /plugins/events 是 SSE，首帧 data: 就是全量 entry 列表（含 id 与 rev）
//
// 所以：本地复算 rev == 服务端报的 rev，就说明改动已经生效，剩下的纯粹是
// 浏览器缓存，按 Ctrl+R 即可。
//
// 用法：node tools/live-check.mjs [端口]     默认 43129

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const HASH_REVISION_LENGTH = 12;
const ENTRY_ID = 'dsh-yoimiya-theme';
const BUNDLE = 'bundle/client.js';
const port = Number(process.argv[2] ?? 43129);
const origin = `http://127.0.0.1:${port}`;

/** 浏览器半边引用到的资源。改动 assets/ 后靠 ?v=<ASSET_V> 换 URL 穿透缓存。 */
const ASSETS = [
  'yoimiya-wide.jpg',
  'yoimiya.jpg',
  'bg-night.svg',
  'bg-day.svg',
  'mark.svg',
  'mark-day.svg',
];

/** 复刻 dsh-client-modules 的 artifactRevision：域分隔 + 长度前缀，避免字节跨字段搬家。 */
function framedHash(domain, parts) {
  const h = createHash('sha1').update(domain).update('\0');
  for (const part of parts) h.update(`${String(part.byteLength)}:`).update(part);
  return h.digest('hex').slice(0, HASH_REVISION_LENGTH);
}

const bundle = readFileSync(BUNDLE);
const localRev = framedHash('plugin-artifact', [bundle]);
const tag = (re, fallback) => re.exec(bundle.toString('utf8'))?.[1] ?? fallback;

console.log(`本地 ${BUNDLE}`);
console.log(`  字节数      ${bundle.byteLength}`);
console.log(`  BUILD_TAG   ${tag(/BUILD_TAG = '(v\d+)'/, '(未找到)')}`);
console.log(`  ASSET_V     ${tag(/ASSET_V = '(v\d+)'/, '(未找到)')}`);
console.log(`  复算 rev    ${localRev}`);

let remoteRev;
try {
  const res = await fetch(`${origin}/plugins/events`, { headers: { accept: 'text/event-stream' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let frame;
  // 必须等一整帧读完再解析：SSE 的一帧以空行结束（sseData 拼的是 data: …\n\n）。
  // 曾经按 '"type":"graph"' 提前跳出，结果 JSON 常被切在半截——能不能解析
  // 全看本次 read() 恰好读到多少字节，纯属运气。
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const m = /(?:^|\n)data: ([^\n]*)\n\n/.exec(buf);
    if (m !== null) {
      frame = JSON.parse(m[1]);
      break;
    }
  }
  reader.cancel().catch(() => {});
  if (frame === undefined) throw new Error('SSE 里没读到完整的一帧');

  const entries = frame.graph?.entries ?? [];
  const ours = entries.find((e) => e.id === ENTRY_ID);
  if (ours === undefined) throw new Error(`graph 里没有 ${ENTRY_ID}（共 ${entries.length} 条）`);
  remoteRev = ours.rev;
  console.log(`\n服务端 ${origin}`);
  console.log(`  图节点数    ${entries.length}`);
  console.log(`  rev         ${remoteRev}`);
} catch (error) {
  console.log(`\n无法连上 ${origin}：${error.message}`);
  console.log('（DSH 没在跑，或者端口不对——把端口作为参数传进来）');
  process.exit(2);
}

console.log('');
if (localRev === remoteRev) {
  console.log('✓ 服务端已在发新字节：改动已生效，只需在浏览器里刷新页面。');
  console.log(`  实际请求地址 ${origin}/plugins/??${ENTRY_ID}/client.js&rev=${remoteRev}`);
} else {
  console.log('✗ 服务端仍是旧字节：这不是浏览器缓存问题，要看 DSH 是否真的加载了这个插件。');
  process.exit(1);
}

// ── 资源 ────────────────────────────────────────────────────────
// Host 半边用 createReadStream 逐次请求读盘，不缓存内容，所以换图也不需要
// 重启；真正会挡住新图的是浏览器那条 max-age=3600，靠 ?v=<ASSET_V> 换 URL。
const assetV = tag(/ASSET_V = '(v\d+)'/, '');
if (assetV === '') {
  console.log('\n（client.js 里没找到 ASSET_V，跳过资源检查）');
} else {
  console.log(`\n资源（?v=${assetV}）`);
  const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
  let stale = 0;
  for (const name of ASSETS) {
    const localPath = `assets/${name}`;
    let local;
    try {
      local = readFileSync(localPath);
    } catch {
      console.log(`  ?  ${name}  本地读不到 ${localPath}`);
      continue;
    }
    try {
      const res = await fetch(`${origin}/yoimiya-bg/${name}?v=${assetV}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const remote = Buffer.from(await res.arrayBuffer());
      const same = sha(remote) === sha(local);
      console.log(`  ${same ? '✓' : '✗'}  ${name}  ${remote.byteLength} 字节`);
      if (!same) {
        stale += 1;
        console.log(`      本地 ${sha(local)} / 服务端 ${sha(remote)} —— 服务端不是这份文件`);
      }
    } catch (error) {
      console.log(`  ✗  ${name}  ${error.message}`);
      stale += 1;
    }
  }
  if (stale > 0) {
    console.log(`\n✗ 有 ${stale} 个资源对不上：要查的是 Host 半边，不是 CSS 或浏览器缓存。`);
    process.exit(1);
  }
  console.log('✓ 资源与本地一致。');
}
