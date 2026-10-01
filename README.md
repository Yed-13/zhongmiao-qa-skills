# 众妙 QA 技能：修复与审核

给参与 courseware-pro-mvp（/tutor 初中数学 3D 课件）QA 的同学用的 agent 技能。把团队这段时间修问题、开 PR、互相审核的做法整理成了 Claude Code / Codex 能直接照着做的流程。

四个技能，「修」和「审」各有两个版本，区别只在是否做浏览器复测：

| 技能 | 什么时候用 | 做完给你什么 |
|---|---|---|
| **zhongmiao-fix**（修 · 含浏览器复测） | 「把 Bxx 修了」「这个 bug 帮我修」「做下一个问题」「内测报告里这几条看看」；学生能看到的画面、布局、遮挡、交互、文案改动 | 修好并验证过的分支（含修前修后截图）；可直接粘贴的 PR 标题和正文；发给 reviewer 的一段话；交接状态 |
| **zhongmiao-fix-no-browser**（修 · 不做浏览器复测） | 服务端脚本、内容更新脚本、校验器、提示词、测试、文档；或你说「先不测页面」 | 同上，但不截图，并在 PR 和 reviewer 话术里写明未做浏览器复测 |
| **zhongmiao-review**（审 · 含浏览器复现） | 「审核一下这个 PR」「看看他修好了没」「复核一下」；PR 修的是学生能看到的问题 | 审核结论和可直接转发的文案（通过 / 需修改 / 复审），每条问题都带具体位置 |
| **zhongmiao-review-no-browser**（审 · 不做浏览器复测） | 「快速审一下」「只看代码」；PR 只涉及脚本、校验器、测试、文档 | 同上，结论里写明未做浏览器复测；画面类修复只能下到「代码与测试层面」 |

不确定用哪个时，直接说需求，agent 会按改动类型选；也可以用斜杠命令点名（插件安装时是 `/zhongmiao-qa:zhongmiao-review-no-browser` 这种形式）。两个不做浏览器复测的版本共用同级完整版目录里的参考文件和脚本，**四个目录要一起安装**。

这些技能都只在你授权的范围内动手：不合并、不部署、不写生产数据库；推送、开 PR、点 Ready for review 这类 GitHub 动作要你明确说了才做。

## 安装

### Claude Code（推荐：插件方式，能更新）

在 Claude Code 里：

```text
/plugin marketplace add <GitHub用户名>/zhongmiao-qa-skills
/plugin install zhongmiao-qa@zhongmiao-qa-skills
```

以后更新：`/plugin marketplace update zhongmiao-qa-skills`，或在 `/plugin` → Marketplaces 里打开自动更新。仓库是私有的话，用你本机已经能 `git clone` 这个仓库的 GitHub 登录即可。

### Claude Code（手动复制）

```bash
git clone https://github.com/<GitHub用户名>/zhongmiao-qa-skills.git
mkdir -p ~/.claude/skills
cp -R zhongmiao-qa-skills/skills/zhongmiao-* ~/.claude/skills/
```

只想在 courseware-pro-mvp 仓库里用，也可以复制到该仓库的 `.claude/skills/`（不要提交进教授仓库，除非团队同意）。

### Codex

```bash
mkdir -p ~/.codex/skills
cp -R zhongmiao-qa-skills/skills/zhongmiao-* ~/.codex/skills/
```

每个技能都带 `agents/openai.yaml`（Codex 显示名）。

装好后新开一个会话，直接说需求即可，例如：

```text
根据任务表修复 <编号>（任务表在 ~/work/共同问题汇总.xlsx），修完准备好 Draft PR
审核一下 https://github.com/anncaihusky/courseware-pro-mvp/pull/1234
```

## 使用前提

- 本机有 courseware-pro-mvp 的克隆，`origin` 指向你自己的 fork，`upstream` 指向教授仓库。
- Node 18+（推荐和 CI 一致的版本），`git`；Python 3 只用于读任务表（只用标准库）。
- 仓库是私有的：读 PR、开 PR 需要在浏览器里登录你自己的 GitHub。技能不会代你输入密码。
- `gh` 命令行不是必需的。

## 目录结构

```text
.claude-plugin/          插件和 marketplace 清单
skills/
  zhongmiao-fix/
    SKILL.md             修复流程（领题 → 查重 → 复现 → 修 → 验证 → Draft PR → 交付物）
    references/          领题与开工、修法、验证、本地浏览器测试、3D 遮挡、内测报告核实、PR 与交付模板
    scripts/             read_issue_sheet.py（连底色读任务表）、check_issue_status.sh（查重）、new_task_worktree.sh
    assets/local-qa/     本地挂载课件组件的模板（不提交进教授仓库）
  zhongmiao-fix-no-browser/
    SKILL.md             同一修复流程，跳过浏览器和截图（引用 zhongmiao-fix/ 里的参考和脚本）
  zhongmiao-review/
    SKILL.md             审核流程（拉 PR → 承诺清单 → 审内容 → 复跑 → 浏览器复现 → 文案）
    references/          检查清单、文案模板、本地复现
    scripts/             fetch_pr.sh（拉 PR 到只读目录）、unit_review.mjs（题目单元打印与结构扫描）
  zhongmiao-review-no-browser/
    SKILL.md             同一审核口径，只审代码、内容和测试（引用 zhongmiao-review/ 里的参考和脚本）
```

## 几个脚本可以单独用

```bash
# 任务表：连底色一起看某几个编号
python3 skills/zhongmiao-fix/scripts/read_issue_sheet.py 共同问题汇总.xlsx --code <编号> <编号>

# 这几个编号 main 上是不是已经有人修了
bash skills/zhongmiao-fix/scripts/check_issue_status.sh ~/work/courseware-pro-mvp <编号> <编号>

# 把 PR 拉到独立审核目录，打印 head / 合并基点 / 试合并结果
bash skills/zhongmiao-review/scripts/fetch_pr.sh ~/work/courseware-pro-mvp 1234

# 对比 PR 版和合并基点版的题目单元：示范=原题、讲解与第1题概念不一致、重复题、答案不一致
node skills/zhongmiao-review/scripts/unit_review.mjs scan server/scripts/<单元目录> \
  --ref pr/1234 --repo ~/work/courseware-pro-mvp --base-ref <合并基点SHA>
```

## 说明

- 技能里的规则以仓库当前的 `CLAUDE.md`、`docs/IRON_LAWS.md`、`docs/QA_PEER_REVIEW_GUIDE.md` 为准；仓库规则更新后，以仓库为准。
- 技能内容不含任何个人信息、账号或具体任务记录；示例里的编号和数字只用于说明格式。
- 欢迎改进：发现流程有变化或某一步总出错，直接改对应的 `references/*.md` 并提 PR。
