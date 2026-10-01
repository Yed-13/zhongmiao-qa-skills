#!/usr/bin/env node
/**
 * compose_grid.mjs — 把修前/修后截图拼成一张带标题和图注的对比图（每行两张），给 PR 正文用。
 *
 * 用法（在仓库根目录或 frontend 目录跑，需要仓库里已装的 Playwright）：
 *   node compose_grid.mjs out.png "标题" 640 "before.png|修前：1280×720 第 2 题" "after.png|修后：同一题"
 *   参数：输出文件、标题、每张图显示宽度(px)、之后每个「图片路径|图注」
 *   环境变量 FE=<frontend 目录> 可指定从哪里找 Playwright（默认依次找 ./frontend、.、上一级）。
 */
import fs from 'node:fs';
import path from 'node:path';

const [out, title, w, ...cells] = process.argv.slice(2);
if (!out || !w || !cells.length) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(2);
}
const candidates = [process.env.FE, 'frontend', '.', '..'].filter(Boolean)
  .map((d) => path.resolve(d, 'node_modules/playwright/index.mjs'));
const pw = candidates.find((p) => fs.existsSync(p));
if (!pw) { console.error('找不到 Playwright：在仓库根目录跑，或设置 FE=<frontend 目录>'); process.exit(1); }
const { chromium } = await import(pw);

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const img = (f) => `data:image/${path.extname(f).slice(1).replace('jpg', 'jpeg') || 'png'};base64,${fs.readFileSync(f).toString('base64')}`;
const cell = (s) => {
  const [f, cap = ''] = s.split('|');
  return `<figure><img style="width:${Number(w)}px" src="${img(f)}"><figcaption style="max-width:${Number(w)}px">${esc(cap)}</figcaption></figure>`;
};
const rows = [];
for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2).map(cell).join(''));
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:18px 20px;background:#fff;font-family:-apple-system,'PingFang SC',sans-serif;color:#1f2328;display:inline-block}
h1{font-size:17px;margin:0 0 12px}.row{display:flex;gap:14px;margin-bottom:12px;align-items:flex-start}
figure{margin:0}img{display:block;border:1px solid #d0d7de;border-radius:6px}
figcaption{font-size:13px;margin-top:5px;color:#57606a}</style></head>
<body><h1>${esc(title || '')}</h1>${rows.map((r) => `<div class="row">${r}</div>`).join('')}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1.5 });
await page.setContent(html);
await page.waitForTimeout(300);
const box = await page.evaluate(() => {
  const r = document.body.getBoundingClientRect();
  return { width: Math.ceil(r.width), height: Math.ceil(r.height) };
});
await page.setViewportSize(box);
await page.screenshot({ path: out, clip: { x: 0, y: 0, ...box } });
await browser.close();
console.log(path.resolve(out));
