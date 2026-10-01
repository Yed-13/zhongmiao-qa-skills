#!/usr/bin/env bash
# 把 zhongmiao QA 技能装到 Claude Code 和/或 Codex 的个人技能目录。
#
# 用法（在本仓库根目录执行）：
#   bash install.sh            # 同时装到 Claude Code 和 Codex
#   bash install.sh claude     # 只装到 ~/.claude/skills/
#   bash install.sh codex      # 只装到 ~/.codex/skills/（设置了 CODEX_HOME 时用 $CODEX_HOME/skills/）
#   bash install.sh uninstall  # 从两个目录里删掉这四个技能
#
# 四个技能目录会一起复制（不做浏览器复测的两个版本要用完整版目录里的参考文件和脚本）。
# 已经装过同名技能时直接覆盖；更新时先 git pull 再重新执行一次即可。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude/skills"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
SKILLS=()
for d in "$HERE"/skills/zhongmiao-*; do [ -f "$d/SKILL.md" ] && SKILLS+=("$(basename "$d")"); done
[ ${#SKILLS[@]} -gt 0 ] || { echo "没找到 skills/zhongmiao-*/SKILL.md，请在本仓库根目录执行"; exit 1; }

install_to() {
  local dest="$1" label="$2"
  mkdir -p "$dest"
  for name in "${SKILLS[@]}"; do
    rm -rf "${dest:?}/$name"
    cp -R "$HERE/skills/$name" "$dest/$name"
  done
  echo "已装到 $label：$dest"
  printf '  - %s\n' "${SKILLS[@]}"
}

uninstall_from() {
  local dest="$1" label="$2" n=0
  for name in "${SKILLS[@]}"; do
    if [ -d "$dest/$name" ]; then rm -rf "${dest:?}/$name"; n=$((n + 1)); fi
  done
  echo "已从 $label 删除 $n 个技能（$dest）"
}

case "${1:-both}" in
  claude) install_to "$CLAUDE_DIR" "Claude Code" ;;
  codex)  install_to "$CODEX_DIR" "Codex" ;;
  both)   install_to "$CLAUDE_DIR" "Claude Code"; install_to "$CODEX_DIR" "Codex" ;;
  uninstall) uninstall_from "$CLAUDE_DIR" "Claude Code"; uninstall_from "$CODEX_DIR" "Codex" ;;
  *) sed -n '2,11p' "$0"; exit 2 ;;
esac

[ "${1:-both}" = "uninstall" ] || echo "装好了。新开一个 Claude Code / Codex 会话后生效。"
