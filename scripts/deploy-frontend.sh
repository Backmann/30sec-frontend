#!/bin/sh
# Release the frontend on the server, prove it works, and undo it if it does
# not. The same shape as the API's scripts/deploy-api.sh in the 30sec repo.
#
# Called by .github/workflows/deploy.yml right after `git pull` in
# /root/30sec-frontend. The compose file that defines the `frontend` service
# lives in /root/30sec, so the docker compose commands run from there.
#
# Why each step exists:
#   - The container healthcheck only asks for `/`, which stays 200 even when
#     every script 404s or one page throws while rendering. The smoke checks
#     (scripts/smoke.mjs) cover both.
#   - Before building, the image the running container actually uses is
#     tagged 30sec-frontend:previous. If the new release is not healthy, or
#     fails a smoke check, that image is put back and the run still ends red.
#
# Test hooks: DOCKER (the docker command), WAIT_SECONDS (pause between health
# polls) and COMPOSE_DIR can be overridden; production uses the defaults.

set -eu

DOCKER=${DOCKER:-docker}
WAIT_SECONDS=${WAIT_SECONDS:-10}
COMPOSE_DIR=${COMPOSE_DIR:-/root/30sec}
SCRIPTS_DIR=$(cd "$(dirname "$0")" && pwd)
CONTAINER=30sec-frontend
IMAGE=30sec-frontend
SMOKE_TARGET=http://127.0.0.1:3001

cd "$COMPOSE_DIR"

wait_healthy() {
  i=1
  while [ "$i" -le 9 ]; do
    sleep "$WAIT_SECONDS"
    status=$($DOCKER inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo missing)
    echo "   [attempt $i/9] status: $status"
    [ "$status" = healthy ] && return 0
    i=$((i + 1))
  done
  return 1
}

# Runs inside the image just built: same Node, nothing to download.
smoke() {
  $DOCKER run --rm --network host \
    -v "$SCRIPTS_DIR:/scripts:ro" \
    --entrypoint node "$IMAGE" /scripts/smoke.mjs "$SMOKE_TARGET"
}

restart_nginx() {
  $DOCKER restart 30sec-nginx >/dev/null && sleep 3
}

rollback() {
  reason=$1
  echo ""
  echo "FAIL: $reason"
  $DOCKER compose logs frontend --tail 50 || true
  if [ -z "$PREVIOUS" ]; then
    echo "No earlier image to return to. The new release stays as it is."
    exit 1
  fi
  echo ""
  echo "-> ROLLBACK: putting back the image that ran before this release..."
  $DOCKER tag "$IMAGE:previous" "$IMAGE:latest"
  $DOCKER compose up -d --force-recreate --no-deps frontend
  if wait_healthy; then
    restart_nginx
    echo "-> Smoke checks on the restored release:"
    if smoke; then
      echo "ROLLED BACK: the previous release is running and passes its checks."
    else
      echo "ROLLED BACK, but the previous release fails its checks too — look now."
    fi
  else
    echo "ROLLBACK FAILED: the previous release did not become healthy — look now."
  fi
  exit 1
}

echo "-> Remembering the image the frontend runs now..."
PREVIOUS=$($DOCKER inspect --format='{{.Image}}' "$CONTAINER" 2>/dev/null || true)
if [ -n "$PREVIOUS" ]; then
  $DOCKER tag "$PREVIOUS" "$IMAGE:previous"
  echo "   kept as $IMAGE:previous"
else
  echo "   no running frontend — nothing to roll back to on failure"
fi

echo "-> Rebuilding and starting frontend container..."
$DOCKER compose up -d --build --force-recreate --no-deps frontend

echo "-> Waiting for health check (up to 90s)..."
wait_healthy || rollback "frontend did not become healthy in time"
echo "OK: frontend is healthy. Restarting nginx..."
restart_nginx

echo "-> Smoke checks against the new release..."
smoke || rollback "smoke checks failed on the new release"

echo "DEPLOYED: healthy and passing smoke checks."
