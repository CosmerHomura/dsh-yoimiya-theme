// 宵宫主题 · Host 半边（dsh-yoimiya-theme）
//
// 两件事：
//   1. 把浏览器半边 CSS 引用的资源挂成 HTTP 路由
//      /yoimiya-bg/yoimiya-wide.jpg  宽幅立绘（主题实际使用的壁纸，16:9）
//      /yoimiya-bg/yoimiya.jpg       原始方图（保留作源文件；CSS 已不引用）
//      /yoimiya-bg/bg-night.svg      夏祭夜空（暗色档程序化天空）
//      /yoimiya-bg/bg-day.svg        和纸昼  （亮色档程序化天空）
//      /yoimiya-bg/mark.svg          金鱼标识（暗色档 #E08A3C）
//      /yoimiya-bg/mark-day.svg      金鱼标识（亮色档 #B5502A）
//   2. /yoimiya-bg/media  读取/控制系统媒体会话（GSMTC）
//      浏览器半边碰不到 WinRT，所以这一层必须放在 Host。它调用
//      tools/media.ps1，不依赖任何播放器的私有接口或第三方服务——
//      网易云、Spotify、浏览器标签页都一样对待，播放器升级也不会失效。
//
// 资源路径从本文件位置解析，因此包放在任何目录都能工作，无需改常量。
// 路由注册失败（例如同一 profile 里已有另一份实例在服务同名路由）只跳过、
// 不抛错，避免整个 profile 加载失败。
import { readFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'assets');
const mediaScript = join(here, '..', 'tools', 'media.ps1');
const playersScript = join(here, '..', 'tools', 'players.ps1');

const ROUTES = [
  { path: '/yoimiya-bg/yoimiya-wide.jpg', file: join(assets, 'yoimiya-wide.jpg'), type: 'image/jpeg' },
  { path: '/yoimiya-bg/yoimiya.jpg', file: join(assets, 'yoimiya.jpg'), type: 'image/jpeg' },
  { path: '/yoimiya-bg/bg-night.svg', file: join(assets, 'bg-night.svg'), type: 'image/svg+xml' },
  { path: '/yoimiya-bg/bg-day.svg', file: join(assets, 'bg-day.svg'), type: 'image/svg+xml' },
  { path: '/yoimiya-bg/mark.svg', file: join(assets, 'mark.svg'), type: 'image/svg+xml' },
  { path: '/yoimiya-bg/mark-day.svg', file: join(assets, 'mark-day.svg'), type: 'image/svg+xml' },
];

const MEDIA_PATH = '/yoimiya-bg/media';
const MEDIA_ACTIONS = new Set(['status', 'toggle', 'next', 'prev']);

/**
 * 跑一次媒体脚本。任何失败都归一成 { ok:false, reason }，让前端安静地隐藏
 * 控件（而不是弹一个用户看不懂的错误）——没有播放器、没装 PowerShell、
 * 非 Windows，都属于正常情况而非故障。
 */
function runMedia(action) {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
       '-File', mediaScript, '-Action', action],
      { timeout: 8000, windowsHide: true, maxBuffer: 64 * 1024, encoding: 'utf8' },
      (err, stdout) => {
        if (err) {
          console.warn('[yoimiya-theme] 媒体脚本未执行成功：', err.message);
          resolve({ ok: false, reason: 'spawn-failed' });
          return;
        }
        // 脚本末尾还会打印一行 JSON；取最后一行，前面对话框噪声不影响解析
        const line = String(stdout).trim().split(/\r?\n/).filter(Boolean).pop();
        try {
          resolve(JSON.parse(line));
        } catch {
          console.warn('[yoimiya-theme] 媒体脚本输出无法解析：', line);
          resolve({ ok: false, reason: 'bad-output' });
        }
      },
    );
  });
}

/** 只读路由表的处理器，与静态资源共用同一套错误处理方式。 */
function mediaHandler(req, res) {
  let action = 'status';
  try {
    const asked = new URL(req.url ?? '/', 'http://localhost').searchParams.get('action');
    if (asked !== null && MEDIA_ACTIONS.has(asked)) action = asked;
  } catch {
    /* URL 畸形时按 status 处理 */
  }
  return runMedia(action).then((result) => {
    const body = JSON.stringify(result);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      // 状态每次都可能变，且带着曲名——绝不能进任何缓存
      'Cache-Control': 'no-store',
    });
    res.end(body);
  });
}

const PLAYERS_PATH = '/yoimiya-bg/players';
const PLAYER_IDS = new Set(['netease', 'qqmusic']);

/** 跑一次播放器探测脚本。任何失败都回成空列表——没装就是没装，不是故障。 */
function detectPlayers() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', playersScript],
      { timeout: 10000, windowsHide: true, maxBuffer: 64 * 1024, encoding: 'utf8' },
      (err, stdout) => {
        if (err) {
          console.warn('[yoimiya-theme] 播放器探测未执行成功：', err.message);
          resolve([]);
          return;
        }
        const line = String(stdout).trim().split(/\r?\n/).filter(Boolean).pop();
        try {
          const parsed = JSON.parse(line);
          resolve(Array.isArray(parsed?.players) ? parsed.players : []);
        } catch {
          console.warn('[yoimiya-theme] 播放器探测输出无法解析：', line);
          resolve([]);
        }
      },
    );
  });
}

/**
 * 启动指定播放器。
 *
 * 可执行文件路径由服务端自己探测得出，**不接受客户端传来的路径**——否则这个
 * 路由就等于一个任意程序启动器。客户端只能传 id，且 id 必须落在白名单里。
 *
 * detached + unref：播放器不能挂在 DSH 进程下，否则 DSH 一退出就被带走。
 */
function launchPlayer(id, players) {
  const found = players.find((p) => p.id === id);
  if (found === undefined) return { ok: false, reason: 'not-installed' };
  if (found.running === true) return { ok: true, launched: false, reason: 'already-running' };
  try {
    const child = spawn(found.exe, [], { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true, launched: true };
  } catch (err) {
    console.warn('[yoimiya-theme] 启动播放器失败：', err?.message ?? err);
    return { ok: false, reason: 'spawn-failed' };
  }
}

/** 纯探测返回列表；带 launch 时先启动再返回最新状态（running 会变成 true）。 */
function playersHandler(req, res, launchId) {
  return detectPlayers().then((players) => {
    const result = launchId === null
      ? { ok: true, players }
      : { ok: true, players, ...launchPlayer(launchId, players) };
    const body = JSON.stringify(result);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
    });
    res.end(body);
  });
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

    try {
      const disposeMedia = ctx.webServer.register({
        kind: 'exact',
        path: MEDIA_PATH,
        handler: mediaHandler,
      });
      ctx.effect(() => disposeMedia);
      registered += 1;
    } catch (e) {
      console.warn(`[yoimiya-theme] 路由 ${MEDIA_PATH} 已被其他实例占用，跳过:`, e?.message ?? e);
    }

    try {
      const disposePlayers = ctx.webServer.register({
        kind: 'exact',
        path: PLAYERS_PATH,
        handler: (req, res) => {
          let launchId = null;
          try {
            const asked = new URL(req.url ?? '/', 'http://localhost').searchParams.get('launch');
            if (asked !== null && PLAYER_IDS.has(asked)) launchId = asked;
          } catch {
            /* URL 畸形时按纯探测处理 */
          }
          return playersHandler(req, res, launchId);
        },
      });
      ctx.effect(() => disposePlayers);
      registered += 1;
    } catch (e) {
      console.warn(`[yoimiya-theme] 路由 ${PLAYERS_PATH} 已被其他实例占用，跳过:`, e?.message ?? e);
    }

    console.log(`[yoimiya-theme] Host 半边就绪（${registered}/${ROUTES.length + 2} 条路由）`);
  },
};
