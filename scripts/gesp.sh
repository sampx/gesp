#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT=3000
WEB_PORT=3001
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DEBUG=0
FORCE=0
COMMAND=""
SUBCOMMAND=""

log()   { echo "[ok] $*"; }
warn()  { echo "[!] $*"; }
err()   { echo "[x] $*" >&2; }
info()  { echo "[i] $*"; }
debug() { ((DEBUG)) && echo "[debug] $*" || true; }

die() { err "$@"; exit 1; }

port_pid()  { lsof -ti :"$1" 2>/dev/null || true; }
port_info() { lsof -i :"$1" -P -n 2>/dev/null | tail -n +2 || true; }

kill_tree() {
  local pid=$1 sig=${2:-TERM}
  debug "sending SIG${sig} to pid $pid"
  kill -s "$sig" "$pid" 2>/dev/null || true
  if ((FORCE)); then
    sleep 0.3
    kill -0 "$pid" 2>/dev/null || return 0
    debug "force killing pid $pid"
    kill -s KILL "$pid" 2>/dev/null || true
  fi
}

cmd_status() {
  echo "GESP Dev Status"
  echo ""

  for label_port in "Backend:$BACKEND_PORT" "Web:$WEB_PORT"; do
    local label="${label_port%%:*}" port="${label_port##*:}"
    local pid
    pid=$(port_pid "$port")
    if [ -n "$pid" ]; then
      info "$label (port $port): running (pid $pid)"
      ((DEBUG)) && port_info "$port" | while read -r line; do echo "  $line"; done
    else
      warn "$label (port $port): not running"
    fi
  done
}

cmd_stop() {
  echo "Stopping GESP dev servers..."
  local stopped=0

  for pattern in "turbo dev" "packages/backend/src/index.ts" "next-server.*apps/web"; do
    local pids
    pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      for pid in $pids; do
        kill_tree "$pid"
        log "stopped process $pid (${pattern%% *})"
        ((stopped++))
      done
    fi
  done

  for port in $BACKEND_PORT $WEB_PORT; do
    local pid
    pid=$(port_pid "$port")
    if [ -n "$pid" ]; then
      kill_tree "$pid"
      log "freed port $port (pid $pid)"
      ((stopped++))
    fi
  done

  if ((stopped)); then
    log "stopped $stopped process(es)"
  else
    warn "no dev servers running"
  fi
}

cmd_dev() {
  if [ "$SUBCOMMAND" = "stop" ]; then
    cmd_stop
    return
  fi

  if [ "$SUBCOMMAND" = "status" ]; then
    cmd_status
    return
  fi

  cmd_stop 2>/dev/null || true

  local env_prefix=""
  if ((DEBUG)); then
    env_prefix="LOG_LEVEL=debug ENABLE_DEBUG=true"
    echo "Debug mode: LOG_LEVEL=debug ENABLE_DEBUG=true"
  fi

  echo "Starting GESP dev servers..."
  cd "$PROJECT_DIR"
  exec env $env_prefix bun run dev
}

show_help() {
  cat <<'EOF'
gesp -- GESP development helper

Usage:
  gesp [options] dev [stop|status]

Commands:
  dev            Start dev servers (backend + web via turbo)
  dev stop       Stop all dev servers
  dev status     Show running dev server status

Options:
  -h, --help     Show this help
  --debug        Verbose output (show port details, signals)
  --force        Force kill (SIGKILL after SIGTERM)

Examples:
  gesp dev                Start all dev servers
  gesp dev stop           Graceful stop
  gesp dev stop --force   Force kill stale processes
  gesp --debug dev status Check ports with details
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)    show_help; exit 0 ;;
    --debug)      DEBUG=1; shift ;;
    --force)      FORCE=1; shift ;;
    dev)          COMMAND="dev"; shift ;;
    stop)         SUBCOMMAND="stop"; shift ;;
    status)       SUBCOMMAND="status"; shift ;;
    *)            die "unknown argument: $1 (try --help)" ;;
  esac
done

[ -z "$COMMAND" ] && { show_help; exit 1; }

case "$COMMAND" in
  dev) cmd_dev ;;
  *)   die "unknown command: $COMMAND" ;;
esac
