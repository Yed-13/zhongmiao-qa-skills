# 验证：分层、命令、失败处理、截图

## 测试分层（按实际改动挑）

| 层次 | 检查什么 | 例子 |
|---|---|---|
| 独立数学核对 | 用独立计算核对答案、等价性和唯一性 | 逐题手算 / 写小脚本枚举 |
| 修复函数 | 匹配、不匹配、边界、幂等、不修改输入 | 未知题不覆盖；重复执行无额外变化 |
| 生成与校验 | 新内容契约、坏数据被拒、相邻课不受影响 | 旧坏数据上校验先红 |
| 接口与写回链 | 真实路由接上了；其他课行为不变 | 实际 Express 路由 + 模拟数据库 |
| 数据更新 | 冲突拒写、备份、读回、部分失败、版本关系 | 模拟数据库 + 离线预览 |
| 本地浏览器 | 修前修后、答错改正、换题、完成、窄屏、2D 降级 | 真实课件组件挂本地单元 |
| 完整回归与构建 | 共用组件、打包、夹具泄漏、仓库审计 | 前端 test、服务端 test:pipeline、Guardian |
| 发布后验证 | 部署版本、实际数据、真实入口 | 通常不在修复阶段做，写「未测」 |

## 命令（以仓库 package.json 和 CI 为准）

```bash
# 专项：仓库根目录跑，不连生产库
node --test path/to/new.test.mjs path/to/related.test.mjs
# 需要模块 mock 的测试
node --experimental-test-module-mocks --test path/to/x.test.mjs

# 前端（frontend/）
VITE_APP_LOCALE= npm test     # 空值只作用于这条命令，不改 .env.local
npm run build

# 服务端（server/）
npm run test:pipeline

# 仓库根目录
bash scripts/guardian/guardian_v5_audit.sh
node scripts/guardian/platform_sync_audit.mjs
node scripts/guardian/diff_guardian_gate.mjs --staged   # 只检查已暂存内容
git diff --check
```

- Guardian 含合并数据和自动修复步骤：跑前跑后看 `git status`，不要把审计生成的改动混进任务。
- `--staged` 类门禁只检查暂存区；没暂存的改动不能借它说「已检查」。

## 常见环境坑

- **仓库放在 iCloud 同步的「桌面/文稿」**并开了「优化 Mac 储存空间」：`node_modules`、`.git` 里的文件会被移出本机，`git status`、Vite 预构建、测试会卡在 0% CPU 不动。`find frontend/node_modules -flags +dataless | head` 有输出就是这个原因。把仓库放到不同步的目录，或在 Finder 里设「始终保留在此 Mac 上」。
- **共享 node_modules 的 Vite 缓存**：多个 worktree 软链同一个 `node_modules` 时，同时起的多个 Vite（包括前端测试里自己起 Vite 的浏览器测试）共享 `.vite` 预构建缓存，会卡死几分钟没有输出。浏览器测试单独跑；本地 QA 的 Vite 配置给自己的 `cacheDir`。
- **新 worktree 里 Vite 无故热更新**：刚检出几千个文件时，系统索引会触发 `hmr update / page reload`，把课件重置回开场。本地 QA 用 `server.hmr=false` 的配置（见 `local-qa.md`）。
- **本地强制中文**：`.env.local` 设了中文时英文断言会超时；命令前加 `VITE_APP_LOCALE=`，不要改断言。
- **缺 Playwright Chromium**：在 `frontend` 执行 `npx playwright install chromium --only-shell`；先确认报错确实是这个，不要每次无条件下载。
- **大翻译文件让 ESLint 卡住**：`translations.js` 很大，pre-commit 的 ESLint 门禁在它上面可能长时间 0% CPU 不动。先逐个 lint 其他改动文件确认无错，再按仓库允许的方式跳过该步，并在提交说明里写明原因（例如设置了 `SKIP_LINT=1` 及理由）。
- **pre-commit 门禁比对的基准**：有的门禁拿 `origin/main`（你的 fork 的 main，常常很旧）求合并基点，会去 lint 几十个无关文件。必要时先同步 fork 的 main，或手动对改动文件跑检查并说明。
- **端口占用**：测试服务起不来时先看是谁占了端口，记为环境问题；换端口或等占用结束后重跑那一项。

## 失败时

先分类再处理：断言失败、缺运行时、端口权限、配置冲突、网络依赖、超时。保留失败日志；修好后重跑对应项，必要时在未改动的基线上跑同一项对照（证明不是你的改动造成的）。真实失败要定位，不为通过而放宽断言。

## 截图与浏览器证据

- 先固定数据和代码版本再截图。修前修后尽量同一道题、同一档位、同一尺寸；题目本身变了（换题）要明确标注。
- 覆盖问题最容易发生的状态。遮挡类要包括竖屏矮机。
- 代表尺寸：1280×720、390×844、320×568（或 375×667）。窄屏遗留问题要单独说明，不归因于本次修复，也不能说「窄屏全部通过」。
- 截图文件名/图注写清：问题号、修前/修后、档位题号、尺寸、日期、版本。不裁掉影响判断的关键状态。
- 截图只证明画面，不证明按钮能用、学生学会、正式数据已更新。操作类结论要写实际操作了什么（例如「三档 15/15 题通关，答错后可继续」）。
- PR 里的图片链接要求见 `pr-and-handoff.md`。

## 记录格式

每个结果至少带：日期、代码版本（SHA，是否有未提交改动）、命令、退出码、环境条件、数据来源、日志位置、未测范围。标明是自己重跑的、作者提供的、用户提供的还是历史记录。
