#!/bin/bash
# Klaro LAM Local Runner — polls Supabase for pending runs and fires Docker
# Set these in your environment or .env file — never hardcode keys here
SUPABASE_URL="${SUPABASE_URL:-https://chwyrdublpuavcmjendw.supabase.co}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
GROQ_KEY="${GROQ_API_KEY}"
SAMBANOVA_KEY="${SAMBANOVA_API_KEY:-32d5cbc4-2c1a-41c3-9546-4c02db49d338}"
CEREBRAS_KEY="${CEREBRAS_API_KEY}"

if [ -z "$SUPABASE_KEY" ]; then
  source ~/klaro-pulse/agents/.env 2>/dev/null
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
  GROQ_KEY="${GROQ_API_KEY}"
  CEREBRAS_KEY="${CEREBRAS_API_KEY}"
fi

echo "🤖 Klaro LAM Runner started — polling every 15s"

while true; do
  ROW=$(curl -s "${SUPABASE_URL}/rest/v1/lam_runs?status=eq.pending&order=created_at.asc&limit=1" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}")

  RUN_ID=$(echo "$ROW" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)
  TARGET_URL=$(echo "$ROW" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['url'] if d else '')" 2>/dev/null)

  if [ -n "$RUN_ID" ] && [ -n "$TARGET_URL" ]; then
    echo "$(date '+%H:%M:%S') �� Picked up run $RUN_ID — $TARGET_URL"
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/lam_runs?id=eq.${RUN_ID}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"status":"running","progress":3,"progress_message":"Runner picked up — starting Docker..."}' > /dev/null

    docker run --rm \
      -e SUPABASE_URL="$SUPABASE_URL" \
      -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY" \
      -e GROQ_API_KEY="$GROQ_KEY" \
      -e SAMBANOVA_API_KEY="$SAMBANOVA_KEY" \
      -e CEREBRAS_API_KEY="$CEREBRAS_KEY" \
      -e LAM_RUN_ID="$RUN_ID" \
      klaro-lam "$TARGET_URL"

    echo "$(date '+%H:%M:%S') ✓ Run $RUN_ID complete"
  else
    echo -n "."
  fi
  sleep 15
done
