/*
 * 本地模拟后端模板（零依赖）。用于必须走真实页面路由、又不能连正式后端的场景
 * （例如只有在某个学习天数、未付费等账号状态下才会出现的页面）。
 *
 * 为什么可行：开发模式下前端 apiClient 默认请求 http://localhost:3001，vite 也把 /api 代理到那里。
 * 启动：PORT=3001 node frontend/local-qa/mock-api.mjs   （再起前端 dev server，打开真实 /tutor 路由）
 *
 * 做法：只回答页面实际发出的请求；没处理的一律打印 [unhandled] 并返回 404。
 * 照着日志一条条补，直到不再出现 [unhandled]。返回的数据尽量从仓库真实配置读，不要手写一份会过期的副本。
 * 不要在这里放任何真实账号、手机号、姓名。
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 3001);
/* 场景开关：用环境变量切换不同账号状态，例如 SCENARIO=a / b */
const SCENARIO = process.env.SCENARIO || 'default';

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

/* 路由表：[方法, 正则, (match, url) => 返回对象]。按需增删；路径以去掉 /api/tutor 前缀后为准。 */
const ROUTES = [
  ['GET', /^\/settings$/, () => ({ ok: true })],
  ['GET', /^\/me$/, () => ({ id: 'local-test-user', nickname: '本地测试' })],
  // ['GET', /^\/progress\/([^/]+)$/, ([, studentId]) => ({ studentId, items: [] })],
];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname.replace(/^\/api\/tutor/, '').replace(/^\/api/, '') || '/';
  for (const [method, re, handler] of ROUTES) {
    const m = p.match(re);
    if (m && method === req.method) return json(res, 200, handler(m, url, SCENARIO));
  }
  console.log(`[unhandled] ${req.method} ${url.pathname}`);
  return json(res, 404, { error: 'not mocked', path: url.pathname });
});

server.listen(PORT, '127.0.0.1', () => console.log(`mock api on http://127.0.0.1:${PORT} (scenario=${SCENARIO})`));
