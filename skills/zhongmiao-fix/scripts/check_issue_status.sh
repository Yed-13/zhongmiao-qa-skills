#!/usr/bin/env bash
# 领题前查重：这些问题编号是不是已经有人修过 / 正在修。只用 git，不打开 GitHub 网页。
#
# 用法：check_issue_status.sh <主仓库目录> <编号> [编号...] [--prs N | --no-prs]
#   例：check_issue_status.sh ~/work/courseware-pro-mvp A01 B02
#
# 查三处：
#   1. upstream/main 的提交标题和正文（合并的 PR 一般写成「… (Bxx) (#1234)」）
#   2. upstream 上的分支名
#   3. 最近 N 个 PR 的提交（默认 300 个，用 git 拉 refs/pull/<号>/head）——同学从自己 fork 开的 PR
#      只能这样看到。git 看不出 PR 是开着还是已关闭：命中的 PR 请用户自己在 GitHub 上确认状态。
# 任务表的“当前状态”经常落后于实际，不能只看表。
set -euo pipefail

if [ $# -lt 2 ]; then sed -n '2,13p' "$0"; exit 2; fi
REPO="$1"; shift
NPRS=300; CODES=()
while [ $# -gt 0 ]; do
  case "$1" in
    --prs) NPRS="$2"; shift 2 ;;
    --no-prs) NPRS=0; shift ;;
    *) CODES+=("$1"); shift ;;
  esac
done
cd "$REPO"

git remote get-url upstream >/dev/null 2>&1 || { echo "没有名为 upstream 的远端（应指向教授仓库）"; exit 1; }
git fetch --quiet upstream main
echo "upstream/main = $(git rev-parse --short upstream/main)  ($(git log -1 --format=%cs upstream/main))"
MAIN_SUBJECTS=$(git log upstream/main --format=%s)   # 先读进变量：管道里 grep -q 提前退出会在 pipefail 下误判

PR_NUMS=()
if [ "$NPRS" -gt 0 ]; then
  while IFS= read -r n; do PR_NUMS+=("$n"); done < <(git ls-remote upstream 'refs/pull/*/head' \
    | sed -E 's#.*refs/pull/([0-9]+)/head#\1#' | sort -n | tail -n "$NPRS")
  if [ ${#PR_NUMS[@]} -gt 0 ]; then
    specs=(); for n in "${PR_NUMS[@]}"; do specs+=("+refs/pull/$n/head:refs/remotes/upstream-pr/$n"); done
    git fetch --quiet upstream "${specs[@]}" 2>/dev/null || echo "（部分 PR 拉取失败，结果可能不全）"
    echo "已拉取最近 ${#PR_NUMS[@]} 个 PR 的提交（#${PR_NUMS[0]} – #${PR_NUMS[${#PR_NUMS[@]}-1]}）"
  fi
fi
echo

for code in "${CODES[@]}"; do
  echo "=== $code"
  pat="[（( ]${code}[ ,、，/)）]|[（(]${code}[)）]|\\b${code}\\b"
  # 标题或正文里提到编号都算（有的提交只在正文里写编号）
  hits=$(git log upstream/main --grep="$code" --format='%h %cs %s' | head -5 || true)
  if [ -n "$hits" ]; then
    echo "  main 上已有相关提交："
    echo "$hits" | sed 's/^/    /'
    first=$(echo "$hits" | head -1 | cut -d' ' -f1)
    echo "  ↳ 先读提交说明里有没有写「未动 / 范围外 / 另两处」：git log -1 --format=%B $first"
  else
    echo "  main 上没找到带 $code 的提交"
  fi
  lc=$(echo "$code" | tr 'A-Z' 'a-z')
  br=$(git branch -r | grep -iE "(^|[/_-])${lc}([/_-]|$)" | grep -v upstream-pr/ | tr -d ' ' | head -5 || true)
  [ -n "$br" ] && { echo "  upstream 上的相关分支："; echo "$br" | sed 's/^/    /'; }
  for n in "${PR_NUMS[@]+"${PR_NUMS[@]}"}"; do
    ref="refs/remotes/upstream-pr/$n"
    git rev-parse -q --verify "$ref" >/dev/null || continue
    m=$(git log --format='%s%n%b' "upstream/main..$ref" 2>/dev/null | grep -E "$pat" | head -1 || true)
    [ -z "$m" ] && continue
    if grep -qF "(#$n)" <<<"$MAIN_SUBJECTS"; then state="已合并"; else state="未合并（开着还是已关闭请在 GitHub 上确认）"; fi
    echo "  PR #$n 的提交提到 $code —— $state：${m:0:90}"
  done
  echo
done

url=$(git remote get-url upstream | sed -E 's#^git@github.com:#https://github.com/#; s#\.git$##')
echo "提醒用户：git 只能看到 PR 的提交，看不到 PR 标题和开关状态。需要确认时请用户自己打开"
echo "  $url/pulls?q=is%3Apr+is%3Aopen"
