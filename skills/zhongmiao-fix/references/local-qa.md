# 本地浏览器验证：在真实课件组件上挂本地单元

## 目录
1. 什么时候用哪种入口
2. 搭本地 QA 页（模板在 assets/local-qa/）
3. 准备单元数据
4. 起服务
5. 开发钩子：让脚本能「做题」和「量」
6. 需要后端状态时：模拟后端
7. 无头截图与修前修后对比
8. 给 reviewer 的本地测试包
9. 常见坑

---

## 1. 什么时候用哪种入口

- 仓库自带预览路由 `/tutor/worldN-preview`：只带组件内置的示范单元，适合「组件本身」的问题。仓库的遮挡门禁也优先用它。
- 本地 QA 页（本文）：要用**特定知识点/档位/题目**的数据（仓库快照、修复候选）在真组件上复现时用。它证明的是「组件 + 这份数据」的表现，不能代替登录、权限、接口、缓存、学习进度和部署链路。
- 真实应用路由 + 模拟后端（第 6 节）：问题只在某种账号状态下出现时用。

## 2. 搭本地 QA 页

```bash
cd <工作目录>/frontend
mkdir -p local-qa
cp <本技能目录>/assets/local-qa/{vite.qa.config.js,index.html,style.css} local-qa/
cp <本技能目录>/assets/local-qa/main.template.jsx local-qa/main.jsx
```

- `local-qa/` **不要提交**。在主仓库 `.git/info/exclude` 里加一行 `/frontend/local-qa/`（所有 worktree 共用这个文件），之后 `git status` 就看不到它。
- 改 `main.jsx` 顶部三处配置：要挂的世界组件、单元数据文件、世界需要的额外 props。
- `main.jsx` 必须引入 `../src/index.css` 和 `../src/mobile-overrides.css`：舞台尺寸和相机取景依赖全局样式，缺了截图和测量都是错的（仓库遮挡门禁的说明里记过这次事故）。
- URL：首页列出每个单元每道题；`?u=<单元序号>&q=<题号>` 从某题开始（只是轮转题目顺序，不改内容）；加 `&single` 只留一题；`&render=2d` 强制走无 WebGL 的 2D 降级；默认每次清掉本机存档，避免续玩状态带进上次的相位，`&keep` 保留。

## 3. 准备单元数据

`units.json` 是数组，每项 `{ kp, tier, source, unit }`。**一定写 `source`**（数据从哪来、哪个版本），截图和 PR 里要说明用的是什么数据。

```bash
# 从仓库快照目录取（在工作目录根执行）
node -e '
const fs=require("fs"), dir="server/scripts/<快照目录>";
const pick=f=>/<知识点ID>\.(basic|standard|challenge)\.json$/.test(f);
const cases=fs.readdirSync(dir).filter(pick).map(f=>{const unit=JSON.parse(fs.readFileSync(dir+"/"+f));
  return {kp:unit.k12?.knowledgePointId, tier:unit.k12?.difficultyTier, source:dir+"/"+f, unit};});
fs.writeFileSync("frontend/local-qa/units.json", JSON.stringify(cases)); console.log(cases.length);'

# 修前版本：从合并基点取同一个文件
git show <基点SHA>:server/scripts/<快照目录>/<文件>.json > /tmp/old.json
```

常见数据来源：`server/scripts/` 下的单元快照目录（`ans/`、`beta_*_units/`、各修复脚本旁的候选目录）、`docs/qa/fixtures/`、`docs/qa/rollback/` 里的只读生产备份。仓库快照 ≠ 当前生产库。

## 4. 起服务

```bash
cd <工作目录>/frontend
npx vite --config local-qa/vite.qa.config.js --host 127.0.0.1 --port <没人用的端口> --strictPort
```

- 模板配置关掉了热更新推送（新 worktree 里系统文件事件会无故触发热更新，把课件刷回开场），并给每个 worktree 单独的依赖缓存目录（共享缓存会让两个 Vite 互相卡住）。改了代码手动刷新页面即可。
- 第一次在新 worktree 起服务要先预构建依赖，可能要等一会儿；之后就快了。
- 用 Claude Code 内置浏览器时，`preview_start` 读的是会话根目录的 `.claude/launch.json`，别的会话也可能在用：只增删你自己的条目，端口别和别人撞。

## 5. 开发钩子：让脚本能「做题」和「量」

这些只在开发模式下注册（生产构建里没有）：

- `window.__tutorOcclusionProbe`（`frontend/src/components/tutor/worlds/runtime/occlusionDevice.js`）：`canvases()`、`freeze()/unfreeze()` 停/走 3D 时钟、`converge()` 推进到场景不再变化、`settle()` 渲染几帧、`setDeviceHidden(bool)` 隐藏登记为教学装置的物体、`movers()` 列出还在动的东西。装置在世界源码里用 `userData={{ occDevice: '<名字>' }}` 登记。
- 做题钩子（`runtime/useWorldGame.js` 的 `devPrefix`）：`window.__<前缀>State`（qIndex、phase、answer、trueX/trueY/trueDeg 等）、`__<前缀>Pick(选项下标, {correct, value})`、`__<前缀>NextDemo()`、`__<前缀>Next()`。连续作答题用 `__<前缀>Pick(null, {correct:true, value: state.trueX})`。前缀在各世界组件里找 `devPrefix`；天平工坊是手写的同形钩子 `__balance*`。
- 页面上可用来取矩形的标记：`[data-tutor-world-shell]`、`[data-tutor-question-region]`、`[data-tutor-answer-region]`、`[data-tutor-feedback-dock]`、`[data-tutor-protected-scene-region]`、`[data-tutor-intro-card]` 等，以当前源码为准。
- 你的修复如果加了相机或画框缓动，给它暴露一个开发模式下的 `settled` 标志：`converge()` 只看物体矩阵，不看相机投影，缓动没结束也会报「已收敛」。

## 6. 需要后端状态时：模拟后端

`assets/local-qa/mock-api.template.mjs` 是零依赖的模拟后端：开发模式下前端默认请求 `http://localhost:3001`。只回答页面实际发出的请求，其余打印 `[unhandled]`；照日志一条条补。返回的数据尽量从仓库真实配置读。不放任何真实账号、手机号、姓名。用环境变量切换不同的账号状态。

## 7. 无头截图与修前修后对比

- 修前版本用一个 detached worktree 放在同一个基点：`git worktree add --detach ../<任务名>-base <基点SHA>`，两个目录各起一个服务，同一题同一尺寸各拍一张。
- 仓库的 `frontend/node_modules/playwright` 可以无头渲染 3D：启动参数加 `--use-angle=swiftshader --enable-unsafe-swiftshader`。把 `**/api/**` 拦成 503、静音媒体、需要时固定 `Math.random`（庆祝语长度随机会改变布局）。
- 拼对比图：`node <本技能目录>/scripts/compose_grid.mjs out.png "标题" 640 "before.png|修前：…" "after.png|修后：…"`。
- 截图放哪、怎么链接见 `pr-and-handoff.md`。

## 8. 给 reviewer 的本地测试包

视觉/交互类修复可以附一个让 reviewer 自己试的包：`local-qa/`（不含生产数据文件）+ 一页使用说明：
1. `git fetch upstream pull/<号>/head:pr-<号>` 并检出到独立目录；
2. 把 `local-qa/` 复制到 `frontend/local-qa/`，按说明从仓库已有文件生成 `units.json`；
3. 用无热更新配置起服务；
4. 打开哪些地址、看什么现象（列出最容易出问题的几个用例）。

## 9. 常见坑

- **仓库放在 iCloud 同步的「桌面/文稿」里**，并开了「优化 Mac 储存空间」时，`node_modules` 和 `.git` 里的文件会被移出本机，读取时要先下载：`git status`、Vite 依赖预构建会长时间卡在 0% CPU。用 `find frontend/node_modules -flags +dataless | head` 检查；解决办法是把仓库放到不同步的目录（例如 `~/work/`），或在 Finder 里对该文件夹选「始终保留在此 Mac 上」。
- 页面空白：先看浏览器控制台和 Vite 输出；常见原因是 `units.json` 结构不对（必须是数组，每项有 `unit.questions`）或世界组件需要的 props 没给。
- 量到的数字每次不一样：首题刚加载时、多个页面并发时都有噪声；先单独重测再下结论。
