// 宵宫主题 · Host 半边（dsh-yoimiya-theme）
//
// 三件事：
//   1. 把浏览器半边 CSS 引用的资源挂成 HTTP 路由
//      /yoimiya-bg/yoimiya-wide.jpg  宽幅立绘（主题实际使用的壁纸，16:9）
//      /yoimiya-bg/bg-night.svg      夏祭夜空（暗色档程序化天空）
//      /yoimiya-bg/bg-day.svg        和纸昼  （亮色档程序化天空）
//      /yoimiya-bg/mark.svg          金鱼标识（暗色档 #E08A3C）
//      /yoimiya-bg/mark-day.svg      金鱼标识（亮色档 #B5502A）
//      注：assets/yoimiya.jpg（宽幅立绘的原始方图）留在仓库里当源文件，但
//      【不随包发布】，因此这里也不给它挂路由——挂一条指向未发布文件的路由
//      只会让装好的人请求到 404。
//   2. /yoimiya-music/*  本地曲库：列举 / 上传 / 删除 / 流式播放
//   3. 曲库目录是「文件夹即曲库」——没有清单文件需要维护：
//         <DSH_HOME>/yoimiya-music/song.mp3       一首歌
//         <DSH_HOME>/yoimiya-music/song.jpg       它的封面（可选，同名即可）
//      面板里添加和直接往文件夹里丢，效果完全一致。
//
// 资源路径从本文件位置解析，因此包放在任何目录都能工作，无需改常量。
// 路由注册失败（例如同一 profile 里已有另一份实例在服务同名路由）只跳过、
// 不抛错，避免整个 profile 加载失败。
import { readFile, mkdir, readdir, stat, writeFile, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'assets');

const ROUTES = [
  { path: '/yoimiya-bg/yoimiya-wide.jpg', file: join(assets, 'yoimiya-wide.jpg'), type: 'image/jpeg' },
  { path: '/yoimiya-bg/bg-night.svg', file: join(assets, 'bg-night.svg'), type: 'image/svg+xml' },
  { path: '/yoimiya-bg/bg-day.svg', file: join(assets, 'bg-day.svg'), type: 'image/svg+xml' },
  { path: '/yoimiya-bg/mark.svg', file: join(assets, 'mark.svg'), type: 'image/svg+xml' },
  { path: '/yoimiya-bg/mark-day.svg', file: join(assets, 'mark-day.svg'), type: 'image/svg+xml' },
];

// ── 本地曲库 ──────────────────────────────────────────────────────────────

const MUSIC_ROOT = '/yoimiya-music';
const MUSIC_DIR = join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'yoimiya-music');
const MAX_UPLOAD = 40 * 1024 * 1024;

const AUDIO_EXT = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.wav', '.flac', '.webm']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

const MIME = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac',
  '.webm': 'audio/webm',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif',
};

/**
 * 只接受纯文件名：剥掉目录部分后必须与原串一致，并落在扩展名白名单里。
 * 这是唯一一道防目录穿越的闸门，所以宁可严格——不在白名单就拒绝，不做兜底。
 */
function safeName(raw) {
  const name = String(raw ?? '').trim();
  if (name.length === 0 || name.length > 200) return null;
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) return null;
  if (name !== basename(name) || name === '.' || name === '..') return null;
  const ext = extname(name).toLowerCase();
  if (!AUDIO_EXT.has(ext) && !IMAGE_EXT.has(ext)) return null;
  return name;
}

const stemOf = (name) => name.slice(0, name.length - extname(name).length);

/**
 * 扫目录得出曲库。封面按同名同目录匹配，没有就是没有。
 * @param scanDir - 要扫的目录，默认曲库目录。可传参是为了能被测试直接调用，
 *   不必去动用户的真实曲库。
 */
async function listSongs(scanDir = MUSIC_DIR) {
  await mkdir(scanDir, { recursive: true });
  const entries = await readdir(scanDir, { withFileTypes: true });

  // 先把封面收成 stem → 文件名 的表。原先是每首歌都 files.find 扫一遍整个
  // 目录、每个组合都要算两次 extname/stemOf（各自分配字符串），300 首歌配
  // 300 张封面就是约 9 万次配对比较。表化后是一次遍历。
  // 同名多扩展名时取 readdir 顺序里的第一个，与原 find 的取法一致。
  const covers = new Map();
  const audio = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    const ext = extname(name).toLowerCase();
    if (AUDIO_EXT.has(ext)) audio.push(name);
    else if (IMAGE_EXT.has(ext)) {
      const stem = stemOf(name);
      if (!covers.has(stem)) covers.set(stem, name);
    }
  }

  // stat 并发取。原来是 await 在循环里，一首歌一个 libuv 往返，延迟随曲库
  // 线性增长；这些 stat 互不依赖，没有理由排队。
  const songs = await Promise.all(audio.map(async (name) => {
    let size = 0;
    try {
      size = (await stat(join(scanDir, name))).size;
    } catch {
      /* 列举途中被删掉就按 0 记，不用为此中断整次列举 */
    }
    const stem = stemOf(name);
    return { id: name, title: stem, audio: name, image: covers.get(stem) ?? null, size };
  }));

  songs.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  return songs;
}

// 插件自己把曲库目录建出来，并放一份说明——用户不需要先去找路径、猜命名规则。
// 这就是「内置并初始化」：装上就有，打开音乐面板就能看到它在哪。
const MUSIC_README = `
宵宫主题 · 本地曲库
====================

这个文件夹本身就是曲库，没有清单文件需要维护。

一首歌 = 一个音频文件，例如：
    宵宫的小曲.mp3

封面可选，做成同名图片即可，例如：
    宵宫的小曲.jpg

文件名（去掉扩展名）就是显示的曲名，所以起个好名字就是好曲名。

支持的音频：mp3 m4a aac ogg opus wav flac webm
支持的图片：jpg jpeg png webp gif avif

也可以完全不用手放：点主题右下角的音乐按钮 → 添加歌曲，
在弹窗里拖入歌曲与封面。封面会先经过裁切，统一输出 512×512 的方图，
这样列表里的缩略图尺寸一致。

两种方式效果完全一样。
`;

async function initMusicDir() {
  try {
    await mkdir(MUSIC_DIR, { recursive: true });
    const readme = join(MUSIC_DIR, 'README.txt');
    // 只在缺失时写：用户可能自己改过这份说明，不该覆盖
    try {
      await stat(readme);
    } catch {
      await writeFile(readme, MUSIC_README, 'utf8');
    }
    return true;
  } catch (err) {
    console.warn('[yoimiya-theme] 曲库目录初始化失败：', err?.message ?? err);
    return false;
  }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        req.destroy();
        reject(new Error('too-large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, payload, status = 200) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    // 曲库随时会变，绝不能进缓存
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

/** 流式播放。必须支持 Range——<audio> 拖动进度条靠它，否则只能从头播。 */
async function serveMusicFile(req, res, rawName) {
  const name = safeName(rawName);
  if (name === null) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('bad name');
    return;
  }
  const file = join(MUSIC_DIR, name);
  let info;
  try {
    info = await stat(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }
  const type = MIME[extname(name).toLowerCase()] ?? 'application/octet-stream';
  const range = typeof req.headers.range === 'string' ? req.headers.range : '';
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (match !== null) {
    const startRaw = match[1];
    const endRaw = match[2];
    let start = startRaw === '' ? info.size - Number(endRaw) : Number(startRaw);
    let end = endRaw === '' || startRaw === '' ? info.size - 1 : Number(endRaw);
    if (!Number.isFinite(start) || start < 0) start = 0;
    if (!Number.isFinite(end) || end >= info.size) end = info.size - 1;
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${info.size}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': info.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
  });
  createReadStream(file).pipe(res);
}

/** 删除一首歌：音频 + 同名的各种封面扩展名一并清掉。 */
async function deleteSong(rawName) {
  const name = safeName(rawName);
  if (name === null || !AUDIO_EXT.has(extname(name).toLowerCase())) return false;
  const stem = stemOf(name);
  await rm(join(MUSIC_DIR, name), { force: true });
  for (const ext of IMAGE_EXT) {
    await rm(join(MUSIC_DIR, stem + ext), { force: true });
  }
  return true;
}

function handleMusic(req, res, url) {
  const action = url.pathname.slice(MUSIC_ROOT.length + 1);

  if (action === 'list') {
    return listSongs().then(
      (songs) => sendJson(res, { ok: true, dir: MUSIC_DIR, songs }),
      (err) => {
        console.warn('[yoimiya-theme] 曲库列举失败：', err?.message ?? err);
        sendJson(res, { ok: false, reason: 'list-failed', dir: MUSIC_DIR, songs: [] });
      },
    );
  }

  if (action === 'upload') {
    const name = safeName(url.searchParams.get('name'));
    if (name === null) return sendJson(res, { ok: false, reason: 'bad-name' }, 400);
    return readBody(req, MAX_UPLOAD).then(
      async (body) => {
        if (body.length === 0) return sendJson(res, { ok: false, reason: 'empty' }, 400);
        await mkdir(MUSIC_DIR, { recursive: true });
        // 上传的是封面且已存在同名歌曲时，先清掉同名的其它图片扩展名：
        // 否则 song.jpg 与 song.webp 会同时存在，配对取哪个就成了偶然，
        // 表现为「换了封面但显示的还是旧的那张」。
        if (IMAGE_EXT.has(extname(name).toLowerCase())) {
          const stem = stemOf(name);
          const siblings = await readdir(MUSIC_DIR);
          for (const f of siblings) {
            if (f === name) continue;
            if (IMAGE_EXT.has(extname(f).toLowerCase()) && stemOf(f) === stem) {
              await rm(join(MUSIC_DIR, f), { force: true });
            }
          }
        }
        await writeFile(join(MUSIC_DIR, name), body);
        return sendJson(res, { ok: true, name });
      },
      (err) => sendJson(res, { ok: false, reason: err?.message ?? 'upload-failed' }, 400),
    );
  }

  if (action === 'delete') {
    const name = url.searchParams.get('name');
    return deleteSong(name).then(
      (removed) => sendJson(res, removed ? { ok: true } : { ok: false, reason: 'bad-name' }, removed ? 200 : 400),
      (err) => {
        console.warn('[yoimiya-theme] 删除失败：', err?.message ?? err);
        sendJson(res, { ok: false, reason: 'delete-failed' }, 500);
      },
    );
  }

  // 音频也走 exact：文件名放查询串而不是路径段。
  // 起因是 prefix 路由只有从 DSH 源码读出来的依据、没有实证，实测 405——
  // 一旦它不可用，音频流就整个放不出来。exact 是已经在用的、有实证的方式。
  if (action === 'audio') {
    return serveMusicFile(req, res, url.searchParams.get('name'));
  }

  return sendJson(res, { ok: false, reason: 'unknown-action' }, 404);
}

export default {
  inject: ['webServer'],
  apply(ctx) {
    let registered = 0;
    for (const route of ROUTES) {
      let dispose;
      try {
        dispose = ctx.webServer.register({
          kind: 'exact',
          path: route.path,
          handler: async (req, res) => {
            try {
              const bytes = await readFile(route.file);
              res.writeHead(200, {
                'Content-Type': route.type,
                'Content-Length': bytes.length,
                'Cache-Control': 'public, max-age=3600',
              });
              res.end(bytes);
            } catch (err) {
              console.error(`[yoimiya-theme] 资源读取失败: ${route.path}`, err);
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('yoimiya asset not found');
            }
          },
        });
      } catch (e) {
        console.warn(
          `[yoimiya-theme] 路由 ${route.path} 已被其他实例占用，跳过:`,
          e?.message ?? e,
        );
        continue;
      }
      ctx.effect(() => dispose);
      registered += 1;
    }

    // 动作路由一律用 exact：exact 是本主题已经在用的、有实证的注册方式
    // （资源路由就靠它工作）；prefix 只是从 DSH 源码读出来的能力，没有实测。
    // 把「列举 / 上传 / 删除」压在 exact 上，只有必须按文件名访问的音频流
    // 才依赖 prefix——这样即使 prefix 有问题，也只是放不了歌，而不是加不进歌。
    const musicHandler = (req, res) => {
      let url;
      try {
        url = new URL(req.url ?? '/', 'http://localhost');
      } catch {
        sendJson(res, { ok: false, reason: 'bad-url' }, 400);
        return Promise.resolve();
      }
      return handleMusic(req, res, url);
    };

    for (const action of ['list', 'upload', 'delete', 'audio']) {
      const path = `${MUSIC_ROOT}/${action}`;
      try {
        const disposeAction = ctx.webServer.register({ kind: 'exact', path, handler: musicHandler });
        ctx.effect(() => disposeAction);
        registered += 1;
      } catch (e) {
        console.warn(`[yoimiya-theme] 路由 ${path} 已被其他实例占用，跳过:`, e?.message ?? e);
      }
    }


    // 初始化在注册之后做，且不 await：目录建不出来也不该拖住插件加载
    void initMusicDir().then((ready) => {
      console.log(
        `[yoimiya-theme] Host 半边就绪（${registered}/${ROUTES.length + 4} 条路由）`
        + `，曲库目录 ${MUSIC_DIR}${ready ? '（已就绪）' : '（初始化失败，见上方告警）'}`,
      );
    });
  },
};

// 只为测试导出：tools/test-list-songs.mjs 在临时目录上直接调用它，验证封面配对
// 与排序，不必去动用户的真实曲库。cordis 只读 default 上的 apply/inject，
// 这个具名导出不影响加载。
export { listSongs };
