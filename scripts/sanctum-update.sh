#!/usr/bin/env bash
# SANCTUM — update a self-hosted install (this repository: API + UI).
#
# Typical layout on the host:
#   /opt/sanctum/cxl-sanctum   (clone of this repo)
#   /opt/sanctum/venv
#   /etc/sanctum.env          (optional — DB and secrets)
#
#   ./sanctum-update.sh            # pull, then build/restart only if anything changed
#   ./sanctum-update.sh --build    # skip git pull; force pip+migrate+npm build+restart
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
  sed -n '2,22p' "$0" | sed 's/^# //' | sed 's/^#//'
}

FORCE_BUILD=0

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  --build)
    FORCE_BUILD=1
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

preflight_writable() {
  local dir=$1
  local label=$2
  if [[ ! -w "$dir" ]]; then
    cat >&2 <<EOF
error: $label not writable by $(id -un): $dir

Multiple operators? Grant shared group ownership once, then re-run:

  sudo groupadd -f sanctum
  sudo usermod -aG sanctum \$(id -un)
  sudo chown -R \$(stat -c '%U' "$dir"):sanctum "$SANCTUM_ROOT"
  sudo find "$SANCTUM_ROOT" -type d -exec chmod 2775 {} \;
  sudo find "$SANCTUM_ROOT" -type f -exec chmod g+rw {} \;
  # log out and back in (or run: newgrp sanctum) to pick up the new group
EOF
    exit 1
  fi
}

preflight_git_trust() {
  local dir=$1
  if ! git -C "$dir" rev-parse HEAD >/dev/null 2>&1; then
    cat >&2 <<EOF
error: git cannot operate in $dir as $(id -un).

If you see 'dubious ownership', the repo owner (uid) differs from yours.
Group membership is not enough — tell git to trust the path:

  sudo git config --system --add safe.directory $dir

Then re-run this script.
EOF
    exit 1
  fi
}

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

[[ -d "$CORE_REPO/.git" ]] || die "not a git repo: $CORE_REPO"
preflight_writable "$CORE_REPO" "repo"
preflight_writable "$CORE_REPO/.git" ".git directory"
preflight_git_trust "$CORE_REPO"

RUN_BUILD=0

if [[ "$FORCE_BUILD" -eq 1 ]]; then
  echo ">>> --build: skipping git pull; forcing rebuild of current checkout"
  echo "    at $(git -C "$CORE_REPO" rev-parse --short HEAD) on $(git -C "$CORE_REPO" rev-parse --abbrev-ref HEAD)"
  RUN_BUILD=1
elif prompt_yn "Pull latest from git (cxl-sanctum)?" Y; then
  echo ">>> git pull"
  if pull_and_changed "$CORE_REPO"; then
    RUN_BUILD=1
    echo "    new commits pulled"
  else
    echo "    already up to date"
    echo "    (re-run with --build to force pip + migrate + npm build + restart)"
  fi
fi

if [[ "$RUN_BUILD" -eq 1 ]]; then
  preflight_writable "$VENV" "venv"
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
  echo "Nothing to do — use --build to rebuild the current checkout without pulling."
fi
