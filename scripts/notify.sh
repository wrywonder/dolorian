#!/usr/bin/env bash
# notify.sh — the "pull me in" / "FYI" channel for the Dolorian loop.
# Usage: notify.sh <kind> <message>
#   kind: needs-you | fyi
# macOS notification by default. Uncomment the webhook block for phone push
# (Pushover, Slack incoming webhook, ntfy.sh — pick one).

KIND="$1"
MSG="${2:-Dolorian loop update}"

case "$KIND" in
  needs-you) TITLE="🟠 Dolorian needs you"; SOUND="Sosumi" ;;
  fyi)       TITLE="🔵 Dolorian FYI";       SOUND="Tink"   ;;
  *)         TITLE="Dolorian";              SOUND="Glass"  ;;
esac

# --- macOS desktop notification ---
osascript -e "display notification \"${MSG}\" with title \"${TITLE}\" sound name \"${SOUND}\"" 2>/dev/null

# --- Phone push (uncomment ONE) -------------------------------------------
# Pushover (good for phone-away-from-desk; only ping for needs-you):
# if [ "$KIND" = "needs-you" ]; then
#   curl -s -F "token=$PUSHOVER_TOKEN" -F "user=$PUSHOVER_USER" \
#        -F "title=${TITLE}" -F "message=${MSG}" https://api.pushover.net/1/messages.json >/dev/null
# fi
#
# Slack incoming webhook:
# curl -s -X POST -H 'Content-type: application/json' \
#      --data "{\"text\":\"${TITLE}: ${MSG}\"}" "$SLACK_WEBHOOK_URL" >/dev/null
# --------------------------------------------------------------------------

exit 0
