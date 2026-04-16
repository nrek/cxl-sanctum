#!/usr/bin/env bash
# SANCTUM — update a self-hosted install (this repository: API + UI).
#
# Typical layout on the host:
#   /opt/sanctum/cxl-sanctum   (clone of this repo)
#   /opt/sanctum/venv
#   /etc/sanctum.env          (optional — DB and secrets)
#
#   ./sanctum-update.sh
#   ./sanctum-update.sh --help
#
# Paths (override with env):
#   SANCTUM_ROOT   default /opt/sanctum
#   CORE_REPO      default $SANCTUM_ROOT/cxl-sanctum
#   VENV           default $SANCTUM_ROOT/venv
#   ENV_FILE       default /etc/sanctum.env (sourced when present)
#
# Build-time UI URL (must match your public API for browsers):
#   NEXT_PUBLIC_API_URL  e.g. https://sanctum.example.com/api

set -euo pipefail

die() { echo "error: $*" >&2; exit 1; }

usage() {
  sed -n '2,20p' "$0" | sed 's/^# //' | sed 's/^#//'
}

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  "")
    ;;
  *)
    die "unknown option: $1 — use --help"
    ;;
esac

SANCTUM_ROOT="${SANCTUM_ROOT:-/opt/sanctum}"
CORE_REPO="${CORE_REPO:-$SANCTUM_ROOT/cxl-sanctum}"
VENV="${VENV:-$SANCTUM_ROOT/venv}"
ENV_FILE="${ENV_FILE:-/etc/sanctum.env}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}"

prompt_yn() {
  local prompt=$1
  local default=${2:-N}
  local reply
  if [[ "$default" =~ ^[Yy]$ ]]; then
    read -r -p "$prompt [Y/n] " reply || true
    [[ -z "$reply" || "$reply" =~ ^[Yy] ]]
  else
    read -r -p "$prompt [y/N] " reply || true
    [[ "$reply" =~ ^[Yy]$ ]]
  fi
}

pull_and_changed() {
  local dir=$1
  local before after
  [[ -d "$dir/.git" ]] || die "not a git repo: $dir"
  before=$(git -C "$dir" rev-parse HEAD)
  git -C "$dir" pull --ff-only 2>/dev/null || git -C "$dir" pull
  after=$(git -C "$dir" rev-parse HEAD)
  if [[ "$before" != "$after" ]]; then
    return 0
  fi
  return 1
}

load_env_if_present() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
  fi
}

activate_venv() {
  # shellcheck source=/dev/null
  source "$VENV/bin/activate"
}

echo "Self-hosted Sanctum update"
echo "  repo:     $CORE_REPO"
echo "  venv:     $VENV"
echo "  env file: $ENV_FILE (optional)"
echo "  NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
echo

CHANGED_CORE=0

if prompt_yn "Pull latest from git (cxl-sanctum)?" Y; then
  echo ">>> git pull"
  if pull_and_changed "$CORE_REPO"; then
    CHANGED_CORE=1
    echo "    new commits pulled"
  else
    echo "    already up to date"
  fi
fi

if [[ "$CHANGED_CORE" -eq 1 ]]; then
  echo
  echo ">>> pip install (server/requirements.txt)"
  activate_venv
  pip install -r "$CORE_REPO/server/requirements.txt"

  echo
  echo ">>> django migrate (sanctum.settings)"
  load_env_if_present
  (cd "$CORE_REPO/server" && python manage.py migrate)

  echo
  echo ">>> npm ci + build (ui/)"
  (cd "$CORE_REPO/ui" && NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" npm ci && npm run build)
  echo ">>> copy Next standalone static assets (if using standalone output)"
  if [[ -d "$CORE_REPO/ui/.next/standalone" ]]; then
    mkdir -p "$CORE_REPO/ui/.next/standalone/.next"
    cp -r "$CORE_REPO/ui/.next/static" "$CORE_REPO/ui/.next/standalone/.next/static"
  else
    echo "    (no .next/standalone — skip copy; use your own start command)"
  fi

  echo
  echo ">>> systemctl restart sanctum-api sanctum-ui"
  sudo systemctl restart sanctum-api sanctum-ui
  echo "Done."
else
  echo
  echo "No new commits — skipped pip, migrate, npm, and restart."
fi
