#!/bin/bash
. "$HOME/.ccd/hooks/lib/common.sh"

# SessionStart requires tmux — skip if not in tmux
[ -z "$TMUX" ] && exit 0

INPUT=$(cat | tr -d '\n\r')
echo "$INPUT" | grep -q '"session_id"' || exit 0
ccd_detect_tmux
INPUT=$(ccd_inject_tmux "$INPUT")
ccd_post "/hook/session-start" "$INPUT" 3
