#!/usr/bin/env bash
# 为一个问题编号建独立工作目录（git worktree），基于最新 upstream/main。
#
# 用法：new_task_worktree.sh <主仓库目录> <任务名> [基准，默认 upstream/main]
#   例：new_task_worktree.sh ~/work/courseware-pro-mvp b12
#   结果：~/work/b12-pr ，分支 qa/b12-pr
#
# 做的事：
#   - fetch upstream main
#   - 在主仓库同级目录建 <任务名>-pr，分支 qa/<任务名>-pr
#   - 如果主仓库已装依赖且锁文件与基准一致，把 frontend/ server/ 的 node_modules 软链过去
#     （省一次安装；锁文件不一致就不链，提示你自己装）
# 不做的事：不复制 .env.local 等本机配置，不碰主仓库里未提交的改动。
set -euo pipefail

if [ $# -lt 2 ]; then sed -n '2,13p' "$0"; exit 2; fi
MAIN="$(cd "$1" && pwd)"; NAME="$2"; BASE="${3:-upstream/main}"
DEST="$(dirname "$MAIN")/${NAME}-pr"
BRANCH="qa/${NAME}-pr"

cd "$MAIN"
git fetch --quiet upstream main
[ -e "$DEST" ] && { echo "目录已存在：$DEST（不覆盖）"; exit 1; }
git show-ref --verify --quiet "refs/heads/$BRANCH" && { echo "分支已存在：$BRANCH（不覆盖）"; exit 1; }

git worktree add --quiet -b "$BRANCH" "$DEST" "$BASE"
echo "已建：$DEST  分支 $BRANCH  基于 $(git rev-parse --short "$BASE")"

for part in frontend server; do
  src="$MAIN/$part/node_modules"
  [ -d "$src" ] || { echo "  $part：主仓库没有 node_modules，需要在新目录里自己安装"; continue; }
  # 只比锁文件：package.json 里改 scripts（例如测试清单）不影响已装的依赖
  if git diff --quiet HEAD "$BASE" -- "$part/package-lock.json" 2>/dev/null; then
    ln -s "$src" "$DEST/$part/node_modules"
    echo "  $part/node_modules → 软链到主仓库（锁文件一致）"
  else
    echo "  $part：锁文件和主仓库当前版本不同，不软链；请在 $DEST/$part 里按锁文件安装（npm ci）"
  fi
done

cat <<EOF

下一步：
  cd "$DEST"
  git status --short && git branch --show-current
提示：多个 Vite 同时跑时，软链共享的 node_modules/.vite 缓存会互相卡住，
给本地 QA 配置单独的 cacheDir（见 references/local-qa.md）。
EOF
