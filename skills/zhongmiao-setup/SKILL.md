---
name: zhongmiao-setup
description: 替用户完成众妙 courseware-pro-mvp QA 的所有终端操作，让用户不用自己碰终端：第一次使用前检查和准备环境（git、Node、Python、克隆自己的 fork、设置教授仓库 upstream、安装依赖、iCloud 卡住检查、提交身份），以及更新、检查或卸载众妙 QA 技能。用户说「帮我准备环境」「第一次用」「装好了吗」「更新众妙技能」「卸载技能」「修复/审核技能跑不起来」「找不到仓库」时用它；zhongmiao-fix / zhongmiao-review 开工前发现仓库或依赖没准备好时，也先按这个技能处理。
---

# 众妙 QA 环境准备（替用户做所有终端操作）

用户可能完全不熟悉终端。**所有命令都由你来运行**，用户只需要回答问题、点「允许」。说话用大白话：每个问题一句话说清是什么、为什么要处理、你打算怎么做。

## 规则

- 先检查，后动手。改动用户电脑上的东西之前（克隆、安装依赖、加远端、移动文件夹），把要做的事列成一个清单，**一次性征得同意**再执行，不要一条条问。
- 只做清单里的事。不改系统设置、不改别人的仓库配置、不删用户的文件、不碰主仓库里未提交的改动。
- 需要用户才知道的信息（GitHub 用户名、仓库放在哪、提交用的名字和邮箱），直接问。
- 不打开 GitHub 网页。需要网页上的操作（例如在 GitHub 上 Fork、接受协作者邀请）时，告诉用户点哪里。
- 不输入密码。git 弹出 GitHub 登录窗口时，请用户自己在窗口里登录。

## 场景一：第一次准备环境 / 检查环境

1. 运行检查（只读）：
   ```bash
   bash <本技能目录>/scripts/setup_check.sh [仓库目录，不知道就不填]
   ```
   每行是 `OK` / `FIX`（需要处理，后面给了建议动作）/ `WARN`（提醒），最后一行是汇总。
2. 把结果翻译成大白话告诉用户：哪些已经好了，哪些要处理。
3. 对每个 `FIX`，按建议动作列清单，征得同意后执行：
   - **没有仓库**：问 GitHub 用户名，克隆他自己的 fork 到 `~/work/courseware-pro-mvp`（`~/work` 不被 iCloud 同步）。还没 fork 的，请他先在 GitHub 网页上打开教授仓库点 Fork。
   - **没有 upstream**：按检查给出的地址加上（如果用户说教授仓库地址不同，以用户为准）。
   - **访问不了教授仓库**：请用户确认已接受协作者邀请；git 弹出登录窗口时让他登录。
   - **没装依赖**：在 `frontend/` 和 `server/` 分别运行 `npm ci`（要几分钟，先告诉用户）。
   - **没装 git / Node**：说明要装什么、为什么。需要弹出安装窗口或输入电脑密码的步骤，请用户自己点。
4. `WARN` 逐条解释，由用户决定：
   - **iCloud**：文件被移出本机会让 git、本地页面、测试卡住。给两个选项：把仓库移到 `~/work`（你可以代做，但要先说明会影响已有的 worktree 路径），或在 Finder 里对该文件夹选「始终保留在此 Mac 上」（用户自己点）。
   - **提交身份不对**：问用户提交时用的名字和邮箱（公开仓库建议用 GitHub noreply 邮箱：`<数字ID>+<用户名>@users.noreply.github.com`）。记下来，之后 commit 用 `git -c user.name=… -c user.email=…`，不改仓库配置。
   - **主目录有未提交改动**：告诉用户这些不会被动到，修复会在独立目录里做。
5. 处理完重新运行检查，直到没有 `FIX`。最后用两三句话告诉用户：环境好了，仓库在哪，接下来可以直接说「用 zhongmiao-fix 修复 <编号>」或「用 zhongmiao-review 审核 PR <号>」。

## 场景二：更新众妙 QA 技能

1. 找到技能仓库的本地副本：默认 `~/zhongmiao-qa-skills`（安装时克隆的位置）；找不到就问用户，或重新克隆 `https://github.com/Yed-13/zhongmiao-qa-skills.git` 到这里。
2. 运行：
   ```bash
   git -C ~/zhongmiao-qa-skills pull --ff-only
   bash ~/zhongmiao-qa-skills/install.sh
   ```
   `install.sh` 默认同时装到 Claude Code 和 Codex；用户只用其中一个时传 `claude` 或 `codex`。
3. 告诉用户更新到了哪个版本（`git -C ~/zhongmiao-qa-skills log -1 --format='%h %cs %s'`），并提醒**新开一个对话**才会用上新版本。
4. 如果用户是用 Claude Code 插件方式装的（`/plugin`），告诉他在 Claude Code 里输入 `/plugin marketplace update zhongmiao-qa-skills`。

## 场景三：检查技能装好了没有 / 卸载

- 检查：列出 `~/.claude/skills/zhongmiao-*` 和 `${CODEX_HOME:-~/.codex}/skills/zhongmiao-*`，应该有五个：zhongmiao-setup、zhongmiao-fix、zhongmiao-fix-no-browser、zhongmiao-review、zhongmiao-review-no-browser。少了就按场景二重新安装。
- 卸载：先确认，再运行 `bash ~/zhongmiao-qa-skills/install.sh uninstall`。

## 场景四：修复 / 审核技能跑到一半出了环境问题

常见的几种，先判断再处理：
- 命令长时间不动、0% CPU：多半是 iCloud 文件不在本机，运行检查看 `icloud` 一行。
- 本地页面第一次启动很慢：正在预构建依赖，等一会儿；多个本地页面同时启动会互相卡住，一次只起一个。
- 端口被占用：换一个端口，不要去关别人的进程，除非用户同意。
- 测试缺浏览器运行时：在 `frontend/` 运行 `npx playwright install chromium --only-shell`（先告诉用户要下载一个浏览器组件）。

处理完回到原来的技能继续。
