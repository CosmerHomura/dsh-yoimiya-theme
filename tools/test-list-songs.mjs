// 直接测 bundle/host.js 里的真实 listSongs，用临时目录，不碰用户曲库。
//
// 为什么用真实实现而不是桩：这个项目里已经出过两次「桩和实现不一致」的事故
// ——桩让错误的写法蒙混过关，测试全绿而真实环境里功能是坏的。所以这里 import
// 真模块、在真文件系统上跑。
//
// 重写 listSongs 时（把 O(文件数 × 歌曲数) 的封面匹配改成表，把串行 stat 改成
// 并发）行为必须完全不变，尤其是封面配对取的是哪个文件。

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSongs } from '../bundle/host.js';

const failures = [];
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(
    `${ok ? '✓' : '✗'} ${label}${ok ? '' : `  期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`}`,
  );
  if (!ok) failures.push(label);
};

const dir = await mkdtemp(join(tmpdir(), 'yoimiya-list-'));

try {
  // 覆盖三种情况：有同名封面、没有封面、同名封面有多个扩展名。
  await writeFile(join(dir, 'b.mp3'), Buffer.alloc(11));
  await writeFile(join(dir, 'a.flac'), Buffer.alloc(7));
  await writeFile(join(dir, 'a.jpg'), Buffer.alloc(3));
  await writeFile(join(dir, 'a.png'), Buffer.alloc(5));
  await writeFile(join(dir, 'c.m4a'), Buffer.alloc(2));
  await writeFile(join(dir, 'notes.txt'), '既不是音频也不是图片');

  const songs = await listSongs(dir);

  check('只收音频、按标题排序', songs.map((s) => s.title), ['a', 'b', 'c']);
  check('b 没有封面', songs[1].image, null);
  check('c 没有封面', songs[2].image, null);
  check('txt 被忽略', songs.some((s) => s.title === 'notes'), false);
  check('id 与 audio 都是文件名', [songs[1].id, songs[1].audio], ['b.mp3', 'b.mp3']);
  check('size 是真实字节数', [songs[0].size, songs[1].size], [7, 11]);

  // 同名多扩展名时取 readdir 顺序里的第一个，与原 find 的取法一致。
  // 顺序本身不保证，所以只断言「确实配上了其中一个」——这正是新旧实现必须
  // 保持等价的那一点。
  check('a 配到了同名封面', ['a.jpg', 'a.png'].includes(songs[0].image), true);

  // 面板第一次打开时目录还不存在，listSongs 要自己把它建出来而不是抛错
  check('目录不存在时返回空列表', await listSongs(join(dir, 'fresh')), []);
} finally {
  await rm(dir, { recursive: true, force: true });
}

console.log('');
if (failures.length === 0) {
  console.log('✓ listSongs 全部通过');
} else {
  console.log(`✗ ${failures.length} 项不达标`);
  process.exit(1);
}
