# 众妙 QA 技能：修复与审核

给参与 courseware-pro-mvp（/tutor 初中数学 3D 课件）QA 的同学用的 agent 技能，**Claude Code 和 Codex 都能用**。装好之后，你直接用中文说「把这个问题修了」「审核一下这个 PR」，agent 就会按团队约定的流程一步步做，最后给你可以直接粘贴、转发的文字。

---

## 一、安装

### 安装前先确认

- 本机有 courseware-pro-mvp 的克隆，并且能 `git fetch upstream`：`origin` 指向你自己的 fork，`upstream` 指向教授仓库。没有 upstream 就先加：
  ```bash
  git remote add upstream <教授仓库的地址>
  ```
- 装了 `git`、Node 18 以上（建议和 CI 一致）、Python 3（只用来读任务表 Excel，只用标准库）。
- 不需要 `gh` 命令行，也不需要在浏览器里登录 GitHub。

### 方式 A：Claude Code 插件安装（推荐，之后可以一键更新）

在 Claude Code 里依次输入：

```text
/plugin marketplace add Yed-13/zhongmiao-qa-skills
/plugin install zhongmiao-qa@zhongmiao-qa-skills
```

- 第一行把这个仓库登记为插件来源，第二行安装其中的 `zhongmiao-qa` 插件（四个技能都在里面）。
- 装好后**新开一个会话**。在输入框里打 `/zhongmiao`，能看到 `/zhongmiao-qa:zhongmiao-fix` 等四个命令，就说明装好了。
- 更新：`/plugin marketplace update zhongmiao-qa-skills`，或在 `/plugin` → Marketplaces 里打开自动更新。
- 卸载：`/plugin uninstall zhongmiao-qa@zhongmiao-qa-skills`。

### 方式 B：脚本安装（Claude Code 和 Codex 都适用）

```bash
git clone https://github.com/Yed-13/zhongmiao-qa-skills.git
cd zhongmiao-qa-skills
bash install.sh          # 同时装到 Claude Code（~/.claude/skills）和 Codex（~/.codex/skills）
```

- 只装一边：`bash install.sh claude` 或 `bash install.sh codex`（设置了 `CODEX_HOME` 时装到 `$CODEX_HOME/skills`）。
- 更新：在这个目录里 `git pull`，再执行一次 `bash install.sh`（会覆盖旧版本）。
- 卸载：`bash install.sh uninstall`。
- 装好后**新开一个会话**：
  - Claude Code 里输入 `/zhongmiao`，能看到 `/zhongmiao-fix` 等四个命令；
  - Codex 里可以直接说「用 $zhongmiao-review 审核 PR 1234」。

### 方式 C：手动复制

把 `skills/` 下的**四个** `zhongmiao-*` 目录一起复制到：
- Claude Code：`~/.claude/skills/`
- Codex：`~/.codex/skills/`

不要只复制其中一个：两个「不做浏览器复测」的版本会用到完整版目录里的参考文件和脚本。

> 也可以复制到某个项目里的 `.claude/skills/`（Claude Code）或 `.agents/skills/`（Codex），只在那个项目里生效。不要把它们提交进教授的仓库，除非团队同意。

---

## 二、四个技能分别做什么

「修」和「审」各有两个版本，区别只在**是否在浏览器里复测**。不确定用哪个时直接说需求，agent 会按改动类型选；也可以点名。

| 技能 | 适用场景 | 最后给你什么 |
|---|---|---|
| **zhongmiao-fix**<br>修 · 含浏览器复测 | 学生能看到的问题：画面、布局、遮挡、交互、可见文案 | PR 标题和正文、发给 reviewer 的一段话、交接状态（含修前修后截图的位置），然后问你要不要 commit / 开 PR |
| **zhongmiao-fix-no-browser**<br>修 · 不做浏览器复测 | 服务端脚本、内容更新脚本、校验器、提示词、测试、文档；或你说「先不测页面」 | 同上，文字里写明「未做浏览器复测」 |
| **zhongmiao-review**<br>审 · 含浏览器复现 | 审核修了学生可见问题的 PR | 可直接转发的审核文案（通过 / 需修改 / 复审），然后告诉你在 GitHub 上该点什么 |
| **zhongmiao-review-no-browser**<br>审 · 不做浏览器复测 | 「快速审一下」「只看代码」；或 PR 只涉及脚本、校验器、测试、文档 | 同上，结论写明「未做浏览器复测」；画面类修复只下到「代码与测试层面」 |

### 修复（zhongmiao-fix）具体会做

1. **领题和查重**：连底色一起读任务表（例如蓝底排除行）；用 git 查 main 上和最近 300 个 PR 里是否已经有人修过同一个编号。已经修好就停下来告诉你。
2. **建独立工作目录**：从最新 upstream/main 建 worktree，一个问题一个分支。
3. **复现和定位**：记下课、档、题、操作、实际和预期，找到出错的是哪一层（数据、接口、渲染、判分）。内测报告先判断是不是真 bug。
4. **最小修复**：只改和这个问题有关的地方；中英文同步；遮挡问题让相机让位，不把 3D 场景缩小。
5. **分层验证**：
   - 测试先红后绿：改前失败，改后通过；
   - 跑相关回归、构建和 Guardian；
   - 完整版还会在本地真实组件上用 1280 / 390 / 320 三种宽度复测并截图。
6. **输出文字**：PR 标题和正文（按仓库 PR 模板）、发给 reviewer 的话、交接状态。
7. **问你下一步**：先 commit / commit 并推送后你自己开 Draft PR / 暂不提交。你确认了才执行；不加 AI 署名；提醒你不要自己点 Ready for review。

### 审核（zhongmiao-review）具体会做

1. **拉取 PR 代码**：只用 git 拉到独立的只读目录，记下审的是哪个版本，以及和最新 main 合并有没有冲突。
2. **列出 PR 承诺修了什么**：用你贴来的 PR 正文和 CI 结果，和任务表原文对照，并检查同一编号有没有重复的 PR。
3. **审实际内容**：
   - 代码：改动和根因对不对得上、调用方是否都覆盖。
   - 题目：逐题独立重算答案；查讲解和第 1 题是否同一概念（铁律 17）、示范是不是某道原题、有没有重复题、前提是否齐全。
   - 校验器、写库脚本：校验器查的是内容还是标签；写库脚本是否默认只预览、有备份和读回。
4. **自己复跑测试**，并把旧代码放回去，看测试会不会变红。
5. **浏览器复现**（完整版）：按原来的复现步骤，再试答错重试、换题、窄屏。
6. **输出审核文案**：只写这次提交里的问题，不写 main 上原有的问题，也不写自己延伸的建议。
7. **告诉你在 GitHub 上下一步做什么**：通过就由你点 Ready for review（这就是互审签名）；需修改就保持 Draft，把文案发给作者。

### 这些技能不会做的事

- **不打开 GitHub 网页**：不开 PR、不点按钮、不看 CI。PR 正文和 CI 结果需要时请你贴给它。
- 不合并、不部署、不写生产数据库，不替别人签审核。
- 不在没问你的情况下 commit 或 push。

---

## 三、怎么用（示例）

```text
根据任务表修复 B07（表在 ~/work/共同问题汇总.xlsx），修完把 PR 文字准备好
这个改动只动了服务端脚本，用不做浏览器复测的版本修一下 <编号>
审核一下 PR 1234，正文我贴在下面：……
快速审一下 PR 1234，只看代码
```

---

## 四、可以单独用的脚本

```bash
# 连底色一起读任务表里的某几个编号
python3 skills/zhongmiao-fix/scripts/read_issue_sheet.py 共同问题汇总.xlsx --code <编号> <编号>

# 这几个编号在 main 上和最近的 PR 里是不是已经有人修了（只用 git）
bash skills/zhongmiao-fix/scripts/check_issue_status.sh ~/work/courseware-pro-mvp <编号> <编号>

# 为一个问题建独立 worktree（依赖一致时自动软链 node_modules）
bash skills/zhongmiao-fix/scripts/new_task_worktree.sh ~/work/courseware-pro-mvp <任务名>

# 把修前 / 修后截图拼成一张带图注的对比图
node skills/zhongmiao-fix/scripts/compose_grid.mjs out.png "标题" 640 "before.png|修前" "after.png|修后"

# 把 PR 拉到独立审核目录，打印版本、合并基点、试合并结果
bash skills/zhongmiao-review/scripts/fetch_pr.sh ~/work/courseware-pro-mvp 1234

# 对比 PR 版和合并基点版的题目单元：讲解与第 1 题概念不一致、示范等于原题、重复题、答案不一致
node skills/zhongmiao-review/scripts/unit_review.mjs scan server/scripts/<单元目录> \
  --ref pr/1234 --repo ~/work/courseware-pro-mvp --base-ref <合并基点SHA>
```

---

## 五、目录结构

```text
install.sh               一键安装 / 更新 / 卸载（Claude Code、Codex）
.claude-plugin/          Claude Code 插件与插件来源清单
skills/
  zhongmiao-fix/                 修 · 含浏览器复测（参考文件、脚本、本地测试页模板都在这里）
  zhongmiao-fix-no-browser/      修 · 不做浏览器复测（引用 zhongmiao-fix/ 里的参考文件和脚本）
  zhongmiao-review/              审 · 含浏览器复现（检查清单、文案模板、审核脚本）
  zhongmiao-review-no-browser/   审 · 不做浏览器复测（引用 zhongmiao-review/ 里的参考文件和脚本）
  */agents/openai.yaml           Codex 里显示的名称和简介
```

---

## 六、常见问题

- **git status、Vite 或测试一直卡着不动（0% CPU）**：仓库放在 iCloud 同步的「桌面 / 文稿」里，并开了「优化 Mac 储存空间」时，文件会被移出本机。用 `find frontend/node_modules -flags +dataless | head` 检查；把仓库放到不同步的目录（例如 `~/work`），或在 Finder 里把该文件夹设为「始终保留在此 Mac 上」。
- **新工作目录第一次起本地页面很慢**：Vite 第一次要预构建依赖，之后就快了。
- **Codex 里的浏览器复测**：Codex 没有 Claude 桌面版那样的内置浏览器面板。含浏览器的版本会用仓库自带的 Playwright 做无头截图，或者起好本地页面后把地址给你自己打开。
- **规则以仓库为准**：技能里的流程依据仓库当前的 `CLAUDE.md`、`docs/IRON_LAWS.md`、`docs/QA_PEER_REVIEW_GUIDE.md`；仓库规则更新后，以仓库为准。

---

## 七、维护

发现流程变了、或者某一步总出错，直接改对应的 `skills/*/SKILL.md` 或 `references/*.md` 并提 PR。技能内容里不放个人信息、账号和具体任务记录，示例里的编号和数字只用来说明格式。
