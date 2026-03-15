#!/bin/bash
# CCD shared hook library — sourced by all hook scripts

CCD_ENV_FILE="$HOME/.ccd/secret"
[ -f "$CCD_ENV_FILE" ] || exit 0
CCD_SECRET=$(cat "$CCD_ENV_FILE" 2>/dev/null)

CCD_PORT="${CCD_PORT:-3500}"
CCD_HOST="${CCD_HOST:-127.0.0.1}"

ccd_detect_tmux() {
  CCD_TMUX_TARGET=""
  [ -n "$TMUX_PANE" ] || return 0
  CCD_TMUX_TARGET=$(tmux display-message -t "$TMUX_PANE" \
    -p '#{session_name}:#{window_index}.#{pane_index}' 2>/dev/null || echo "")
}

ccd_inject_tmux() {
  local json="$1"
  if [ -n "$CCD_TMUX_TARGET" ] && \
     echo "$CCD_TMUX_TARGET" | grep -qE '^[a-zA-Z0-9_.:/@ -]+$'; then
    echo "$json" | sed 's/}$/,"tmux_target":"'"$CCD_TMUX_TARGET"'"}/'
  else
    echo "$json"
  fi
}

ccd_post() {
  local route="$1"
  local payload="$2"
  local max_time="${3:-5}"
  echo "$payload" | curl -s -X POST "http://$CCD_HOST:$CCD_PORT$route" \
    -H "Content-Type: application/json" \
    -H "X-CCD-Secret: $CCD_SECRET" \
    --data-binary @- --max-time "$max_time" > /dev/null 2>&1 || true
}
