#!/usr/bin/env bash
# 把一个 PR 的最新提交拉到独立的只读审核目录，并打印审核需要的基本事实。
#
# 用法：fetch_pr.sh <主仓库目录> <PR 号> [审核目录，默认 <主仓库同级>/pr<号>-review]
#
# 输出：PR head 完整 SHA、合并基点、提交列表、改动文件统计、与最新 upstream/main 的试合并结果。
# 审核结论里要写清「审的是 head <SHA>，对照 main <SHA>」——作者之后再推，结论就不再自动成立。
# 不会修改主仓库工作区；审核目录是 detached 状态，审完用：git worktree remove <目录>
set -euo pipefail

if [ $# -lt 2 ]; then sed -n '2,9p' "$0"; exit 2; fi
MAIN="$(cd "$1" && pwd)"; PR="$2"
DEST="${3:-$(dirname "$MAIN")/pr${PR}-review}"
cd "$MAIN"

git fetch --quiet upstream main "pull/${PR}/head:refs/remotes/pr/${PR}" --force
HEAD_SHA=$(git rev-parse "pr/${PR}")
MAIN_SHA=$(git rev-parse upstream/main)
BASE_SHA=$(git merge-base upstream/main "pr/${PR}")

echo "PR #${PR}"
echo "  head        $HEAD_SHA"
echo "  合并基点    $BASE_SHA"
echo "  最新 main   $MAIN_SHA   （基点之后 main 又进了 $(git rev-list --count "$BASE_SHA..upstream/main") 个提交）"
echo
echo "提交："
git log --format='  %h %an %cs %s' "$BASE_SHA..pr/${PR}"
echo
echo "改动文件："
git diff --stat "$BASE_SHA" "pr/${PR}" | tail -40 | sed 's/^/  /'
echo
if git merge-tree --write-tree upstream/main "pr/${PR}" >/dev/null 2>&1; then
  echo "与最新 main 试合并：无冲突"
else
  echo "与最新 main 试合并：有冲突 ——"
  { git merge-tree --write-tree --name-only upstream/main "pr/${PR}" 2>/dev/null || true; } | sed -n '2,20p' | sed '/^$/,$d' | sed 's/^/  /'
fi
echo "main 在基点之后也改过的同名文件（可能互相覆盖，值得看）："
comm -12 <(git diff --name-only "$BASE_SHA" "pr/${PR}" | sort) <(git diff --name-only "$BASE_SHA" upstream/main | sort) | sed 's/^/  /' || true

if [ -e "$DEST" ]; then
  echo; echo "审核目录已存在，未重建：$DEST（需要更新就先 git worktree remove 再重跑）"
else
  git worktree add --quiet --detach "$DEST" "pr/${PR}"
  for part in frontend server; do
    [ -d "$MAIN/$part/node_modules" ] && ln -s "$MAIN/$part/node_modules" "$DEST/$part/node_modules"
  done
  echo; echo "审核目录：$DEST（detached @ ${HEAD_SHA:0:8}，node_modules 已软链）"
fi
