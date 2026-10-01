# 在本地真实组件上复现（审核用）

目标：按任务表的复现步骤，在 PR 版本的真实组件上走一遍，确认原问题消失、相邻的正常操作没坏。必要时在合并基点版本上走同一路径做对照。

## 最快的路径

1. `fetch_pr.sh` 已经建好 PR 版本的审核目录（node_modules 已软链）。需要修前对照时，再建一个基点目录：
   ```bash
   git -C <主仓库> worktree add --detach ../pr<号>-base <合并基点SHA>
   ```
2. 先看 PR 有没有附「给 reviewer 的本地测试页」或 evidence README 里的入口——有就照它做。
3. 组件自身的问题：直接用仓库的预览路由 `/tutor/worldN-preview`（只带内置示范单元）。
4. 需要特定知识点/题目数据：在审核目录里搭本地 QA 页（不要提交）：
   - `frontend/local-qa/` 下放：无热更新的 Vite 配置、`index.html`、挂载入口 `main.jsx`、`units.json`。如果装了 zhongmiao-fix 技能，模板在它的 `assets/local-qa/`，说明在它的 `references/local-qa.md`。
   - 最小挂载入口：引入真世界组件和 `../src/index.css`、`../src/mobile-overrides.css`（缺了取景会错），对单元 `structuredClone` 后加 `unit._k12Meta = { knowledgePointId, tier, grade, subject: 'math', onReturnToTierSelect }`，渲染 `<BrowserRouter><World unit={unit}/></BrowserRouter>`。
   - 数据用 PR 里改后的单元文件（`git show pr/<号>:<路径>`），对照用基点版本的同一文件。
5. 起服务：`npx vite --config local-qa/vite.qa.config.js --host 127.0.0.1 --port <端口> --strictPort`（配置里 `server.hmr=false`，并给自己的 `cacheDir`）。

## 走哪些路径

- 原复现步骤（同课、同档、同题、同尺寸）。
- 照讲解示范做第 1 题、答错一次再改对、换题、最后一题、重看讲解再回来。
- 窄屏（390×844 或 375×667、320×568）和宽屏（1280×720）各一次；视觉类加 2D 降级（`?render=2d` 开关让 WebGL 拿不到上下文）。
- 做题可以用开发钩子提速：`window.__<前缀>State` 看当前题和真值，`__<前缀>Pick(null, {correct:true, value})` 直接作答，`__<前缀>Next()` 下一题。

## 记录

- 写清：版本（head SHA）、入口、尺寸、数据来源、走了哪些步骤、看到了什么。
- 截图证明画面，不证明学生学会；没走过的路径不写结论。
- 审完删掉本地 QA 文件和审核目录（先删软链的 node_modules）。

## 常见坑

- 仓库在 iCloud 同步目录且开了「优化储存空间」时，文件被移出本机，`git status` 和 Vite 预构建会卡死不动（`find frontend/node_modules -flags +dataless | head` 能看到）。换到不同步的目录，或把该文件夹设为「始终保留在此 Mac 上」。
- 新 worktree 第一次起 Vite 要预构建依赖，会慢一阵。
- 多个 Vite 共用同一个 `node_modules/.vite` 缓存会互相卡住：每个目录用自己的 `cacheDir`。
