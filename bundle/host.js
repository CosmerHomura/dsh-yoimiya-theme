// 宵宫主题 · Host 半边（dsh-yoimiya-theme）
//
// 只做一件事：把浏览器半边 CSS 引用的资源挂成 HTTP 路由。
//   /yoimiya-bg/yoimiya-wide.jpg  宽幅立绘（主题实际使用的壁纸，16:9）
//   /yoimiya-bg/yoimiya.jpg       原始方图（保留作源文件；CSS 已不引用）
//   /yoimiya-bg/bg-night.svg      夏祭夜空（暗色档程序化天空）
//   /yoimiya-bg/bg-day.svg        和纸昼  （亮色档程序化天空）
//   /yoimiya-bg/mark.svg          金鱼标识（暗色档 #E08A3C）
//   /yoimiya-bg/mark-day.svg      金鱼标识（亮色档 #B5502A）
//
// 资源路径从本文件位置解析，因此包放在任何目录都能工作，无需改常量。
// 路由注册失败（例如同一 profile 里已有另一份实例在服务同名路由）只跳过、
// 不抛错，避免整个 profile 加载失败。
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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
    console.log(`[yoimiya-theme] Host 半边就绪（${registered}/${ROUTES.length} 条资源路由）`);
  },
};
