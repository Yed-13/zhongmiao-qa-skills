#!/usr/bin/env bash
# 众妙 QA 环境检查：只读，不改任何东西。由 agent 运行，按结果逐项修复（修复前先征得用户同意）。
#
# 用法：setup_check.sh [courseware-pro-mvp 所在目录]
#   不给目录时，在常见位置里找（~/work、~、~/Desktop、~/Documents、~/Downloads 下两层以内）。
#
# 每行输出一个检查项：
#   OK    <项目>  <说明>
#   FIX   <项目>  <问题>  ->  <建议的修复动作>
#   WARN  <项目>  <提醒>
# 最后一行是 SUMMARY：FIX 和 WARN 的数量。
set -uo pipefail

UPSTREAM_DEFAULT="https://github.com/anncaihusky/courseware-pro-mvp.git"
fix=0; warn=0
ok()   { printf 'OK    %-14s %s\n' "$1" "$2"; }
bad()  { printf 'FIX   %-14s %s  ->  %s\n' "$1" "$2" "$3"; fix=$((fix + 1)); }
note() { printf 'WARN  %-14s %s\n' "$1" "$2"; warn=$((warn + 1)); }
# 带超时执行（macOS 没有 timeout 命令）：超时返回 124
with_timeout() {
  local t="$1"; shift
  "$@" & local pid=$!
  ( sleep "$t"; kill -9 "$pid" 2>/dev/null ) & local watcher=$!
  wait "$pid" 2>/dev/null; local rc=$?
  kill "$watcher" 2>/dev/null; wait "$watcher" 2>/dev/null
  [ "$rc" -ge 128 ] && return 124 || return "$rc"
}

# ── 工具 ──
if command -v git >/dev/null 2>&1; then ok git "$(git --version)"; else bad git "没装 git" "macOS 运行 xcode-select --install（会弹出安装窗口，需要用户点安装）"; fi
if command -v node >/dev/null 2>&1; then
  major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  if [ "$major" -ge 18 ]; then ok node "Node $(node -v)"; else bad node "Node $(node -v) 太旧" "安装 Node 18 以上（建议与仓库 CI 一致；可用 nvm 或官网安装包）"; fi
else bad node "没装 Node" "安装 Node 18 以上（官网安装包或 nvm）"; fi
if command -v npm >/dev/null 2>&1; then ok npm "npm $(npm -v)"; else bad npm "没有 npm" "随 Node 一起安装"; fi
if command -v python3 >/dev/null 2>&1 && python3 -c 'import zipfile' >/dev/null 2>&1; then ok python3 "$(python3 --version 2>&1)"; else note python3 "没有可用的 python3：只影响读任务表 Excel，其他功能不受影响"; fi

# ── 仓库 ──
REPO="${1:-}"
if [ -z "$REPO" ]; then
  for base in "$HOME/work" "$HOME" "$HOME/Desktop" "$HOME/Documents" "$HOME/Downloads"; do
    [ -d "$base" ] || continue
    cand=$(find "$base" -maxdepth 3 -type d -name courseware-pro-mvp -not -path '*/node_modules/*' 2>/dev/null | head -1)
    if [ -n "$cand" ] && [ -e "$cand/.git" ]; then REPO="$cand"; break; fi
  done
fi
if [ -z "$REPO" ] || [ ! -e "$REPO/.git" ]; then
  bad repo "没找到 courseware-pro-mvp 的克隆" "问用户的 GitHub 用户名，克隆他自己的 fork：git clone https://github.com/<用户名>/courseware-pro-mvp.git ~/work/courseware-pro-mvp（建议放在不被 iCloud 同步的 ~/work）"
  echo "SUMMARY fix=$fix warn=$warn repo=-"
  exit 0
fi
REPO="$(cd "$REPO" && pwd)"
ok repo "$REPO"

origin=$(git -C "$REPO" remote get-url origin 2>/dev/null || true)
upstream=$(git -C "$REPO" remote get-url upstream 2>/dev/null || true)
if [ -n "$origin" ]; then ok origin "$origin"; else bad origin "没有 origin 远端" "git -C \"$REPO\" remote add origin https://github.com/<用户名>/courseware-pro-mvp.git"; fi
if [ -z "$upstream" ]; then
  if [ -n "$origin" ] && echo "$origin" | grep -q 'anncaihusky/courseware-pro-mvp'; then
    note upstream "origin 指向的是教授仓库本身，不是你的 fork：可以审核，但推送要推到自己的 fork（先在 GitHub 网页上点 Fork）"
  else
    bad upstream "没有 upstream 远端（教授仓库）" "git -C \"$REPO\" remote add upstream $UPSTREAM_DEFAULT"
  fi
else
  ok upstream "$upstream"
  with_timeout 20 git -C "$REPO" ls-remote --exit-code upstream HEAD >/dev/null 2>&1; rc=$?
  if [ "$rc" -eq 0 ]; then ok upstream-读取 "能访问教授仓库"
  elif [ "$rc" -eq 124 ]; then note upstream-读取 "20 秒内没连上教授仓库（网络慢或在等登录）：稍后重跑本检查"
  else bad upstream-读取 "访问不了教授仓库" "确认已被加为协作者，并在 git 弹出的 GitHub 登录窗口里登录；然后重跑本检查"; fi
fi

# ── 依赖 ──
for part in frontend server; do
  if [ -d "$REPO/$part/node_modules" ]; then ok "$part 依赖" "已安装"
  else bad "$part 依赖" "没装依赖" "cd \"$REPO/$part\" && npm ci（需要几分钟）"; fi
done

# ── iCloud 移出本机的文件（会让 git / Vite / 测试卡住不动）──
n=$( { find "$REPO/.git" "$REPO/frontend/node_modules" -flags +dataless 2>/dev/null || true; } | head -200 | wc -l | tr -d ' ')
if [ "${n:-0}" -gt 0 ]; then
  note icloud "有 $n+ 个文件被 iCloud 移出本机，git 和 Vite 可能卡住。建议把仓库移到不同步的 ~/work，或在 Finder 里对该文件夹选「始终保留在此 Mac 上」（由用户决定，不要自动移动）"
else ok icloud "没有被移出本机的文件"; fi

# ── 工作区状态（只报告，不改；有 iCloud 移出的文件时 git status 可能卡死，跳过）──
if [ "${n:-0}" -gt 0 ]; then
  note 工作区 "跳过 git status（文件不在本机时会卡住）；处理完 iCloud 问题后重跑本检查"
else
  tmp=$(mktemp)
  if with_timeout 30 git -C "$REPO" status --porcelain >"$tmp" 2>/dev/null; then
    dirty=$(head -50 "$tmp" | wc -l | tr -d ' ')
    if [ "$dirty" -gt 0 ]; then note 工作区 "主目录有 $dirty+ 处未提交改动：不要动它们，修复会在独立 worktree 里做"; else ok 工作区 "干净"; fi
  else
    note 工作区 "git status 30 秒没跑完，跳过（可能是磁盘或 iCloud 慢）"
  fi
  rm -f "$tmp"
fi
name=$(git -C "$REPO" config user.name 2>/dev/null || true); email=$(git -C "$REPO" config user.email 2>/dev/null || true)
owner=$(echo "$origin" | sed -E 's#^(https://github.com/|git@github.com:)([^/]+)/.*#\2#')
if [ -z "$name" ] || [ -z "$email" ]; then
  note git-身份 "没配置提交身份：要 commit 时问用户用什么名字和邮箱（公开仓库建议用 GitHub noreply 邮箱），用 git -c user.name=… -c user.email=… 提交"
elif [ -n "$owner" ] && ! printf '%s %s' "$name" "$email" | grep -qi -- "$owner"; then
  note git-身份 "仓库里配置的提交身份是 $name <$email>，和 fork 所有者 $owner 对不上：可能是别人或机器账号。commit 前问用户用哪个身份，用 git -c user.name=… -c user.email=… 提交，不要改仓库配置"
else
  ok git-身份 "$name <$email>"
fi

echo "SUMMARY fix=$fix warn=$warn repo=$REPO"
