// 校验投稿条目能正确解析。这条 YAML 是要直接提 PR 的，而它自己就写着
// 「描述里含 ": " 时必须加引号，否则会被当成嵌套键」——那就得实测，不能靠看。
import { readFileSync } from 'node:fs';
import { parse } from 'file:///E:/life/DSH Desktop/resources/app/node_modules/yaml/dist/index.js';

const text = readFileSync('tools/awesome-entry.yml', 'utf8');

let doc;
try {
  doc = parse(text);
} catch (error) {
  // YAML 解析失败时不要直接抛栈：这个文件最常见的错法就是描述里含 ": " 而没加
  // 引号（会被当成嵌套键），报错信息必须直接点出来，否则提 PR 的人只会看到
  // 一串 composeNode 的堆栈。
  console.error('✗ awesome-entry.yml 解析失败：' + error.message);
  console.error('');
  console.error('最常见的原因是描述里出现了 ": "（冒号加空格）而没有加引号——');
  console.error('YAML 会把它当成嵌套键。整条描述用单引号包起来即可：');
  console.error("  en: 'Foo theme: bar baz.'");
  process.exit(1);
}

const failures = [];
const check = (label, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : '  ' + extra}`);
  if (!ok) failures.push(label);
};

check('能解析', doc !== null && typeof doc === 'object', String(doc));
check('url 是仓库地址', /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(doc.url ?? ''), String(doc.url));
check('name 与 url 的 owner/repo 一致', doc.url === 'https://github.com/' + doc.name, `${doc.name} vs ${doc.url}`);
check('category 是 theme', doc.category === 'theme', String(doc.category));

const en = doc.description?.en ?? '';
const zh = doc.description?.zh ?? '';
check('en 是非空字符串', typeof en === 'string' && en.length > 20);
check('zh 是非空字符串', typeof zh === 'string' && zh.length > 10);
// 最容易出错的一点：没加引号时 "theme: two ..." 会被解析成嵌套对象，这里就会露馅
check('en 没有被误解析成嵌套键', typeof doc.description.en === 'string', JSON.stringify(doc.description));
check('en 提到了播放器与不上传', /music player/i.test(en) && /never uploaded|not uploaded/i.test(en));
check('zh 提到了播放器与不上传', /播放器/.test(zh) && /不上传/.test(zh));
check('两档描述都提到了烟花', /fireworks/i.test(en) && /烟花/.test(zh));

// 目录 CI 会按这个文件名找条目，必须与 owner/repo 完全对应
const expectedFile = doc.name.replace('/', '__') + '.yml';
check('应提交的文件名', expectedFile === 'CosmerHomura__dsh-yoimiya-theme.yml', expectedFile);

console.log('');
console.log(`条目文件名应为：data/plugins/${expectedFile}`);
if (failures.length === 0) console.log('✓ awesome-entry.yml 全部通过');
else {
  console.log(`✗ ${failures.length} 项不达标`);
  process.exit(1);
}
