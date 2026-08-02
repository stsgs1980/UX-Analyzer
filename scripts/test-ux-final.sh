#!/bin/bash
set -e
cd /home/z/my-project/UX-Analyzer

pkill -f "node.*start-ux\|node.*server" 2>/dev/null || true
sleep 2

# Start production server with error trapping
cat > /tmp/start-ux.js << 'WRAPPER'
process.on('uncaughtException', (err) => {
  console.error('[FATAL]', err?.message?.substring(0,500));
});
process.on('unhandledRejection', (r) => {
  console.error('[REJECT]', String(r).substring(0,500));
});
process.chdir('/home/z/my-project/UX-Analyzer');
require('/home/z/my-project/UX-Analyzer/.next/standalone/server.js');
WRAPPER

NODE_OPTIONS="--max-old-space-size=512" node /tmp/start-ux.js -p 3000 > /tmp/ux-final.log 2>&1 &
SRV_PID=$!
echo "=== Server PID: $SRV_PID ==="

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
  echo "  GET ${path} => HTTP ${CODE}"
done

echo ""
echo "========== API: SETTINGS =========="
curl -s http://localhost:3000/api/settings

echo ""
echo ""
echo "========== ANALYZE: GITHUB (vercel/next.js) =========="
RESP=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://github.com/vercel/next.js"]}')
echo "  $RESP"
AID=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('analysisId',''))" 2>/dev/null)

echo ""
echo "========== ANALYZE: DRIBBBLE =========="
RESP2=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://dribbble.com/shots/24297073-Mobile-Banking-App-Design"]}')
echo "  $RESP2"
AID2=$(echo "$RESP2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('analysisId',''))" 2>/dev/null)

echo ""
echo "========== ANALYZE: REGULAR URL (vercel.com) =========="
RESP3=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://vercel.com"]}')
echo "  $RESP3"
AID3=$(echo "$RESP3" | python3 -c "import sys,json;print(json.load(sys.stdin).get('analysisId',''))" 2>/dev/null)

echo ""
echo "========== WAITING 45s FOR PIPELINES =========="
sleep 45

echo ""
echo "========== RESULTS =========="

echo "--- Process alive? ---"
kill -0 $SRV_PID 2>/dev/null && echo "  YES" || echo "  NO (died)"

echo ""
for label_aid in "GitHub:$AID" "Dribbble:$AID2" "Vercel:$AID3"; do
  label="${label_aid%%:*}"
  aid="${label_aid##*:}"
  if [ -n "$aid" ]; then
    echo "--- ${label} (${aid:0:12}...) ---"
    curl -s "http://localhost:3000/api/analyses/${aid}" | python3 -c "
import sys,json
try:
    a=json.load(sys.stdin)
    print(f'  Status: {a[\"status\"]}')
    print(f'  Source: {a.get(\"sourceType\",\"?\")}')
    dm=a.get('designMd','')
    if dm: print(f'  DesignMD: {len(dm)} chars')
    else: print('  DesignMD: (empty)')
    res=a.get('result','')
    if res:
        try:
            r=json.loads(res) if isinstance(res, str) else res
            ds = r.get('meta',{}).get('dataSources',[])
            prov = r.get('meta',{}).get('aiProvider','?')
            print(f'  Result: {len(str(res))} chars')
            print(f'  DataSources: {ds}')
            print(f'  Provider: {prov}')
            if r.get('vlmAnalysis'):
                print(f'  VLM keys: {list(r[\"vlmAnalysis\"].keys())[:5]}')
        except: print(f'  Result: {len(str(res))} chars (raw)')
    err=a.get('error','')
    if err: print(f'  Error: {err[:200]}')
except Exception as e: print(f'  Parse error: {e}')
" 2>/dev/null
  fi
done

echo ""
echo "========== SERVER LOG (last 40 lines) =========="
tail -40 /tmp/ux-final.log

echo ""
echo "========== MEMORY =========="
free -m | head -2

echo ""
echo "========== DONE =========="
