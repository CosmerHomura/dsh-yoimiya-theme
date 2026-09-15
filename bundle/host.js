// 宵宫主题 · Host 半边（dsh-yoimiya-theme）
//
// 三件事：
//   1. 把浏览器半边 CSS 引用的资源挂成 HTTP 路由
//      /yoimiya-bg/yoimiya-wide.jpg  宽幅立绘（主题实际使用的壁纸，16:9）
//      /yoimiya-bg/yoimiya.jpg       原始方图（保留作源文件；CSS 已不引用）
//      /yoimiya-bg/bg-night.svg      夏祭夜空（暗色档程序化天空）
//      /yoimiya-bg/bg-day.svg        和纸昼  （亮色档程序化天空）
//      /yoimiya-bg/mark.svg          金鱼标识（暗色档 #E08A3C）
//      /yoimiya-bg/mark-day.svg      金鱼标识（亮色档 #B5502A）
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
  { path: '/yoimiya-bg/yoimiya.jpg', file: join(assets, 'yoimiya.jpg'), type: 'image/jpeg' },
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

/** 扫目录得出曲库。封面按同名同目录匹配，没有就是没有。 */
async function listSongs() {
  await mkdir(MUSIC_DIR, { recursive: true });
  const entries = await readdir(MUSIC_DIR, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const songs = [];
  for (const name of files) {
    if (!AUDIO_EXT.has(extname(name).toLowerCase())) continue;
    const stem = stemOf(name);
    const cover = files.find(
      (f) => IMAGE_EXT.has(extname(f).toLowerCase()) && stemOf(f) === stem,
    );
    let size = 0;
    try {
      size = (await stat(join(MUSIC_DIR, name))).size;
    } catch {
      /* 列举途中被删掉就按 0 记，不用为此中断整次列举 */
    }
    songs.push({ id: name, title: stem, audio: name, image: cover ?? null, size });
  }
  songs.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  return songs;
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

  if (action.startsWith('file/')) {
    return serveMusicFile(req, res, decodeURIComponent(action.slice('file/'.length)));
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

    for (const action of ['list', 'upload', 'delete']) {
      const path = `${MUSIC_ROOT}/${action}`;
      try {
        const disposeAction = ctx.webServer.register({ kind: 'exact', path, handler: musicHandler });
        ctx.effect(() => disposeAction);
        registered += 1;
      } catch (e) {
        console.warn(`[yoimiya-theme] 路由 ${path} 已被其他实例占用，跳过:`, e?.message ?? e);
      }
    }

    try {
      const disposeFiles = ctx.webServer.register({
        kind: 'prefix',
        path: `${MUSIC_ROOT}/file`,
        handler: musicHandler,
      });
      ctx.effect(() => disposeFiles);
      registered += 1;
    } catch (e) {
      console.warn(`[yoimiya-theme] 路由 ${MUSIC_ROOT}/file 已被其他实例占用，跳过:`, e?.message ?? e);
    }

    console.log(`[yoimiya-theme] Host 半边就绪（${registered}/${ROUTES.length + 4} 条路由），曲库目录 ${MUSIC_DIR}`);
  },
};
