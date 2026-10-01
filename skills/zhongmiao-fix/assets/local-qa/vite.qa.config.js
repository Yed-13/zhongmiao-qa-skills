// 本地 QA 专用 Vite 配置（放在 frontend/local-qa/，不提交进仓库）。
// 启动：npx vite --config local-qa/vite.qa.config.js --host 127.0.0.1 --port <端口> --strictPort
//
// - hmr:false：新 worktree 刚检出几千个文件时，系统文件事件会触发无谓的热更新，把课件刷回开场。
//   仍保留文件监听：改完代码手动刷新页面就能拿到新代码，不用重启服务。
// - cacheDir：多个 worktree 软链同一个 node_modules 时，默认的 node_modules/.vite 预构建缓存是共用的，
//   两个 Vite 同时启动会互相卡住。每个 worktree 用自己的缓存目录。
import base from '../vite.config.js';

export default async (env) => {
  const c = typeof base === 'function' ? await base(env) : base;
  return {
    ...c,
    cacheDir: 'local-qa/.vite-cache',
    server: { ...c.server, hmr: false },
  };
};
