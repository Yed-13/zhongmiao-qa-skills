#!/usr/bin/env bash
# 领题前查重：这些问题编号是不是已经有人修过 / 正在修。
#
# 用法：check_issue_status.sh <主仓库目录> <编号> [编号...]
#   例：check_issue_status.sh ~/work/courseware-pro-mvp A01 B02
#
# 查三处：
#   1. upstream/main 的提交标题（合并的 PR 一般写成「… (Bxx) (#1234)」）
#   2. upstream 上的分支名
#   3. 提醒你去 GitHub 看 open PR —— 同学从自己 fork 开的 PR 不会出现在 upstream 分支里，
#      仓库是私有的，必须在已登录的浏览器里看。
# 任务表的“当前状态”经常落后于实际，不能只看表。
set -euo pipefail

if [ $# -lt 2 ]; then
  sed -n '2,12p' "$0"; exit 2
fi
REPO="$1"; shift
cd "$REPO"

git remote get-url upstream >/dev/null 2>&1 || { echo "没有名为 upstream 的远端（应指向教授仓库）"; exit 1; }
git fetch --quiet upstream main
echo "upstream/main = $(git rev-parse --short upstream/main)  ($(git log -1 --format=%cs upstream/main))"
echo

for code in "$@"; do
  echo "=== $code"
  hits=$(git log upstream/main --format='%h %cs %s' | grep -E "[（(]${code}[)）]|[（( ]${code}[ ,、，/)）]|\b${code}\b" | head -5 || true)
  if [ -n "$hits" ]; then
    echo "  main 上已有相关提交："
    echo "$hits" | sed 's/^/    /'
    first=$(echo "$hits" | head -1 | cut -d' ' -f1)
    echo "  ↳ 先读提交说明里有没有写「未动 / 范围外 / 另两处」：git log -1 --format=%B $first"
  else
    echo "  main 上没找到带 $code 的提交"
  fi
  lc=$(echo "$code" | tr 'A-Z' 'a-z')
  br=$(git branch -r | grep -iE "(^|[/_-])${lc}([/_-]|$)" | tr -d ' ' | head -5 || true)
  [ -n "$br" ] && { echo "  upstream 上的相关分支："; echo "$br" | sed 's/^/    /'; }
  echo
done

url=$(git remote get-url upstream | sed -E 's#^git@github.com:#https://github.com/#; s#\.git$##')
echo "下一步：在已登录的浏览器打开 open PR 列表，按编号或关键词搜标题："
echo "  $url/pulls?q=is%3Apr+is%3Aopen"
echo "（fork 上开的 PR 只在这里能看到。）"
