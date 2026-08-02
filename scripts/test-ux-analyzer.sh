#!/bin/bash
set -e

cd /home/z/my-project/UX-Analyzer

# Kill any existing servers
pkill -f "node.*server" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
sleep 2

# Create wrapper with error handling
cat > /tmp/start-ux.js << 'WRAPPER'
process.on('uncaughtException', (err) => {
  console.error('[FATAL]', err?.message?.substring(0,300));
  if(err?.stack) console.error(err.stack.substring(0,500));
});
process.on('unhandledRejection', (r) => {
  console.error('[REJECT]', String(r).substring(0,300));
});
process.chdir('/home/z/my-project/UX-Analyzer');
require('/home/z/my-project/UX-Analyzer/.next/standalone/server.js');
WRAPPER

echo "=== Starting production server ==="
NODE_OPTIONS="--max-old-space-size=512" node /tmp/start-ux.js -p 3000 > /tmp/ux-test.log 2>&1 &
SRV_PID=$!
echo "PID: $SRV_PID"

# Wait for ready
for i in $(seq 1 15); do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "Server ready after ${i}s"
    break
  fi
done

echo ""
echo "========== PAGE ROUTES =========="
for path in "/" "/history" "/settings"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${path}")
  SIZE=$(curl -s "http://localhost:3000${path}" | wc -c)
  echo "  GET ${path} => HTTP ${CODE} (${SIZE} bytes)"
done

echo ""
echo "========== API ROUTES =========="

echo "--- GET /api/settings ---"
curl -s http://localhost:3000/api/settings
echo ""

echo ""
echo "--- GET /api/analyses ---"
ANALYSES=$(curl -s http://localhost:3000/api/analyses)
echo "$ANALYSES" | python3 -c "
import sys,json
try:
    data=json.load(sys.stdin)
    print(f'  Total: {len(data)} analyses')
    for a in data[:5]:
        print(f'  {a[\"id\"][:12]}... status={a[\"status\"]} type={a.get(\"sourceType\",\"?\")}')
except: print('  (empty or parse error)')
"

echo ""
echo "========== ANALYZE: DRIBBBLE =========="
RESP1=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://dribbble.com/shots/24297073-Mobile-Banking-App-Design"]}')
echo "  Response: $RESP1"
AID1=$(echo "$RESP1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('analysisId',''))" 2>/dev/null || echo "")

echo ""
echo "========== ANALYZE: GITHUB =========="
RESP2=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://github.com/vercel/next.js"]}')
echo "  Response: $RESP2"
AID2=$(echo "$RESP2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('analysisId',''))" 2>/dev/null || echo "")

echo ""
echo "========== WAITING 30s FOR PIPELINE =========="
sleep 30

echo ""
echo "========== CHECK RESULTS =========="

echo "--- Process alive? ---"
kill -0 $SRV_PID 2>/dev/null && echo "  YES" || echo "  NO (server died)"

echo ""
echo "--- Analysis 1 (Dribbble) ---"
if [ -n "$AID1" ]; then
  curl -s "http://localhost:3000/api/analyses/${AID1}" | python3 -c "
import sys,json
try:
    a=json.load(sys.stdin)
    print(f'  Status: {a[\"status\"]}')
    print(f'  Source: {a.get(\"sourceType\",\"?\")}')
    dm=a.get('designMd','')
    if dm: print(f'  DesignMD: {len(dm)} chars')
    else: print('  DesignMD: (empty)')
    err=a.get('error','')
    if err: print(f'  Error: {err[:300]}')
    res=a.get('result','')
    if res: print(f'  Result: {len(res)} chars')
except Exception as e: print(f'  Error: {e}')
" 2>/dev/null
else
  echo "  (no analysis ID)"
fi

echo ""
echo "--- Analysis 2 (GitHub) ---"
if [ -n "$AID2" ]; then
  curl -s "http://localhost:3000/api/analyses/${AID2}" | python3 -c "
import sys,json
try:
    a=json.load(sys.stdin)
    print(f'  Status: {a[\"status\"]}')
    print(f'  Source: {a.get(\"sourceType\",\"?\")}')
    dm=a.get('designMd','')
    if dm: print(f'  DesignMD: {len(dm)} chars')
    else: print('  DesignMD: (empty)')
    err=a.get('error','')
    if err: print(f'  Error: {err[:300]}')
    res=a.get('result','')
    if res: print(f'  Result: {len(res)} chars')
except Exception as e: print(f'  Error: {e}')
" 2>/dev/null
else
  echo "  (no analysis ID)"
fi

echo ""
echo "========== SERVER LOG (last 30 lines) =========="
tail -30 /tmp/ux-test.log

echo ""
echo "========== MEMORY STATUS =========="
free -m | head -2

echo ""
echo "========== TEST COMPLETE =========="
