# 众妙 QA 技能：修复与审核

给参与 courseware-pro-mvp（/tutor 初中数学 3D 课件）QA 的同学用。**Claude Code 和 Codex 都能用。**

> **全程不用打开终端。** 你只需要在 Claude Code 或 Codex 的对话框里复制粘贴、输入斜杠命令。
> agent 要在你电脑上运行命令时会先问你，点「允许」就行。

---

## 第 1 步：安装（只做一次）

打开 Claude Code 或 Codex，新建一个对话，**复制下面整段**发送：

```text
请帮我安装「众妙 QA 技能」。所有命令都由你来运行，我不会自己操作终端：
1. 如果 ~/zhongmiao-qa-skills 不存在，运行 git clone https://github.com/Yed-13/zhongmiao-qa-skills.git ~/zhongmiao-qa-skills；如果已经存在，进去运行 git pull --ff-only。
2. 运行 bash ~/zhongmiao-qa-skills/install.sh，把技能同时装到 Claude Code 和 Codex。
3. 用一两句话告诉我装好了没有、装了哪几个技能，并提醒我接下来要新开一个对话。
```

看到「装好了」之后，**关掉这个对话，新开一个**。技能只在新开的对话里生效。

---

## 第 2 步：新开一个对话，输入 `/zhongmiao-setup`（第一次用之前做一次）

1. 新开一个对话。
2. 在输入框里打 `/zhongmiao`，会弹出五个命令。选 **`/zhongmiao-setup`**（或者直接打完整命令）。
   - 用 Codex 的同学：把斜杠 `/` 换成 `$`，输入 **`$zhongmiao-setup`**。下面所有命令都一样换。
3. 在命令后面空一格，写上你的 GitHub 用户名，然后发送。例如：

```text
/zhongmiao-setup 我的 GitHub 用户名是 <你的 GitHub 用户名>，帮我把环境准备好
```

接下来它会：

1. 检查你电脑上的东西，用大白话告诉你哪些已经好了、哪些要处理；
2. 把要做的事列成一个清单，**等你回复「可以」再动手**；
3. 帮你下载 courseware-pro-mvp（你自己 fork 的那一份）、连上教授的仓库、安装依赖、检查会让程序卡住的 iCloud 问题；
4. 问你以后提交代码用哪个名字和邮箱。

如果弹出 GitHub 登录窗口，用你自己的账号登录。看到它说「环境好了」，就可以开始用了。

---

## 第 3 步：以后每次怎么用

**每做一件新的事，都新开一个对话**，输入对应的斜杠命令，命令后面写上编号或 PR 号。

### 先选命令：我该用哪个？

| 你要做的事 | 输入的命令 |
|---|---|
| 修一个问题，学生在页面上能看到（画面、布局、遮挡、按钮、文字） | **`/zhongmiao-fix`** |
| 修一个问题，只改脚本、测试、文档，页面不会变 | **`/zhongmiao-fix-no-browser`** |
| 同学让你审 PR，他修的是页面上能看到的问题 | **`/zhongmiao-review`** |
| 同学让你审 PR，只改了脚本、测试、文档；或者你只想快速过一遍 | **`/zhongmiao-review-no-browser`** |
| 第一次用 / 更新技能 / 程序卡住或报环境错误 | **`/zhongmiao-setup`** |

拿不准就用不带 `-no-browser` 的版本，它会多做一步浏览器检查，更稳。也可以直接用中文说要做什么（例如「帮我修 B07」），agent 会自己选。

### 修一个问题：`/zhongmiao-fix`

**你输入：**

```text
/zhongmiao-fix 修复 <编号>，任务表在 <任务表文件的位置>
```

任务表可以直接把 Excel 文件拖进对话框。只改脚本、测试或文档的问题，把命令换成 `/zhongmiao-fix-no-browser`。

**它会做：**

1. 读任务表，查这个问题是不是已经有人修过或正在修。有的话会停下来告诉你，请你换一个。
2. 单独建一个工作目录，不碰你原来的代码。
3. 找到问题出在哪，修好，跑测试证明改之前会失败、改之后能通过。
4. `/zhongmiao-fix` 还会在三种屏幕宽度下打开页面检查，并截好修前修后的图。

**最后你会拿到三段文字，然后它会问你：**

```text
1. 先 commit
2. commit 并推送，然后你自己开 Draft PR
3. 暂不提交
```

回复数字就行。选 2 之后：

1. 打开它给你的链接；
2. 把「PR 标题和正文」粘贴进去，把截图拖进去；
3. 点 **Create draft pull request**；
4. 把「发给 reviewer 的话」发给审核你的同学。**不要自己点 Ready for review**，那个按钮要由审核的人点。

### 审核同学的 PR：`/zhongmiao-review`

**你输入**（先在 GitHub 上打开这个 PR，把描述整段复制下来）：

```text
/zhongmiao-review 审核 PR <PR 号>。PR 描述如下：
<把 PR 描述整段粘贴到这里>
```

只想快速看代码和测试时，把命令换成 `/zhongmiao-review-no-browser`。如果作者在 PR 下面有 CI 结果或别人的评论，也可以一起贴进来。

**它会做：**

1. 把这个 PR 的代码下载到单独的目录。
2. 列出 PR 说自己修了什么，逐项核对：代码改得对不对，题目答案独立重算，讲解和第 1 题是不是同一个知识点，有没有重复题。
3. 自己重新跑一遍测试。`/zhongmiao-review` 还会打开页面亲自操作一遍。

**最后你会拿到一段可以直接转发的审核文字，然后：**

- **通过**：把文字发给作者或贴到 PR 评论里，再在 PR 页面点 **Ready for review**。这一下就是你的互审签名，不用另外点 Approve。
- **需修改**：把文字发给作者，**不要点** Ready for review。作者改完后，新开一个对话：

```text
/zhongmiao-review 复审 PR <PR 号>，作者更新后的说明如下：
<粘贴新的说明>
```

### 更新技能、检查、卸载：`/zhongmiao-setup`

```text
/zhongmiao-setup 把众妙 QA 技能更新到最新版
```

```text
/zhongmiao-setup 检查一下技能装好了没有
```

```text
/zhongmiao-setup 卸载众妙 QA 技能
```

更新之后同样要**新开一个对话**才会用上新版本。

### 一张图记住整个流程

```text
第一次：  粘贴安装那段话 → 新开对话 → /zhongmiao-setup 我的 GitHub 用户名是 …
修问题：  新开对话 → /zhongmiao-fix 修复 <编号> → 拿到三段文字 → 回复 2 → 打开链接开 Draft PR → 把话发给 reviewer
审 PR：   新开对话 → /zhongmiao-review 审核 PR <号> + 粘贴描述 → 拿到审核文字 → 通过就点 Ready for review
更新：    新开对话 → /zhongmiao-setup 把众妙 QA 技能更新到最新版
```

---

## 遇到问题

| 情况 | 怎么办 |
|---|---|
| 打 `/zhongmiao` 没有弹出命令 | 确认是**新开**的对话；还不行就把第 1 步那段话再发一次 |
| 用 Codex，斜杠命令没反应 | Codex 里用 `$` 开头：`$zhongmiao-setup`、`$zhongmiao-fix` |
| 用的是 Claude Code 插件方式安装的 | 命令前面多一个前缀：`/zhongmiao-qa:zhongmiao-fix` |
| agent 问「能不能运行这个命令」 | 点「允许」。这些命令只在你自己电脑上运行，改动之前它会先告诉你要做什么 |
| 弹出 GitHub 登录窗口 | 用你自己的 GitHub 账号登录 |
| 一直卡着不动 | 新开对话，输入 `/zhongmiao-setup 检查一下环境，看看为什么卡住` |
| 提示没有权限访问教授的仓库 | 确认你已经在 GitHub 上接受了协作者邀请，再输入 `/zhongmiao-setup 重新检查环境` |
| 用 Codex 跑含浏览器的版本 | Codex 没有内置浏览器面板，它会自动用无头浏览器截图，或者给你一个本地地址让你自己打开 |

---

## 这些技能不会做的事

- 不打开 GitHub 网页：开 PR、点按钮都由你自己来做；需要 CI 结果时它会请你贴给它。
- 不合并、不部署、不改正式题库，不替别人签审核。
- 不经你同意不 commit、不推送，也不改你电脑上的其他东西。

---

## 给维护者（普通使用不用看）

<details>
<summary>目录结构、脚本、其他安装方式</summary>

### 目录结构

```text
install.sh                       安装 / 更新 / 卸载（bash install.sh [claude|codex|both|uninstall]）
.claude-plugin/                  Claude Code 插件与插件来源清单
skills/
  zhongmiao-setup/               环境准备、更新、卸载；scripts/setup_check.sh（只读检查）
  zhongmiao-fix/                 修 · 含浏览器复测（参考文件、脚本、本地测试页模板都在这里）
  zhongmiao-fix-no-browser/      修 · 不做浏览器复测（引用 zhongmiao-fix/ 里的参考文件和脚本）
  zhongmiao-review/              审 · 含浏览器复现（检查清单、文案模板、审核脚本）
  zhongmiao-review-no-browser/   审 · 不做浏览器复测（引用 zhongmiao-review/ 里的参考文件和脚本）
  */agents/openai.yaml           Codex 里显示的名称和简介
```

五个目录要一起安装：不做浏览器复测的两个版本和 setup 会用到同级目录里的文件。

### 另一种安装方式：Claude Code 插件

在 Claude Code 的对话框里输入（不是终端）：

```text
/plugin marketplace add Yed-13/zhongmiao-qa-skills
/plugin install zhongmiao-qa@zhongmiao-qa-skills
```

插件方式装的命令带前缀，例如 `/zhongmiao-qa:zhongmiao-fix`。更新：`/plugin marketplace update zhongmiao-qa-skills`；卸载：`/plugin uninstall zhongmiao-qa@zhongmiao-qa-skills`。

### 技能里用到的脚本（agent 自己会运行）

| 脚本 | 作用 |
|---|---|
| `zhongmiao-setup/scripts/setup_check.sh [仓库]` | 只读检查环境，每项输出 OK / FIX / WARN |
| `zhongmiao-fix/scripts/read_issue_sheet.py 表.xlsx --code <编号>` | 连底色一起读任务表 |
| `zhongmiao-fix/scripts/check_issue_status.sh <仓库> <编号>` | 用 git 查 main 和最近 300 个 PR 里是否已有人修 |
| `zhongmiao-fix/scripts/new_task_worktree.sh <仓库> <任务名>` | 为一个问题建独立 worktree |
| `zhongmiao-fix/scripts/compose_grid.mjs out.png "标题" 640 "a.png\|图注" …` | 拼修前修后对比图 |
| `zhongmiao-review/scripts/fetch_pr.sh <仓库> <PR号>` | 把 PR 拉到只读审核目录，打印版本和试合并结果 |
| `zhongmiao-review/scripts/unit_review.mjs dump\|scan …` | 打印题目单元 / 扫描讲解与第 1 题概念不一致、示范等于原题、重复题、答案不一致 |

### 维护规则

- 技能里的流程以仓库当前的 `CLAUDE.md`、`docs/IRON_LAWS.md`、`docs/QA_PEER_REVIEW_GUIDE.md` 为准。
- 技能内容里不放个人信息、账号和具体任务记录，示例里的编号和数字只用来说明格式。
- 改完先在本地用 `bash install.sh` 装一次，新开对话试一遍再提交。

</details>
