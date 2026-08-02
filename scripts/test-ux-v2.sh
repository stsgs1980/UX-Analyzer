#!/bin/bash
set -e
cd /home/z/my-project/UX-Analyzer

# Kill ALL node processes to avoid EADDRINUSE
pkill -9 -f "node" 2>/dev/null || true
sleep 3

# Verify port is free
if lsof -i :3000 2>/dev/null; then
  echo "WARNING: Port 3000 still in use!"
  fuser -k 3000/tcp 2>/dev/null || true
  sleep 2
fi

# Start production server
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

NODE_OPTIONS="--max-old-space-size=512" node /tmp/start-ux.js -p 3000 > /tmp/ux-run.log 2>&1 &
SRV_PID=$!
echo "PID: $SRV_PID"

for i in $(seq 1 15); do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "Ready after ${i}s"
    break
  fi
done

echo ""
echo "=== ANALYZE: GitHub repo ==="
RESP=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://github.com/vercel/next.js"]}')
echo "  $RESP"
AID=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('analysisId',''))" 2>/dev/null)

echo ""
echo "=== ANALYZE: Vercel.com (has og:image) ==="
RESP2=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://vercel.com"]}')
echo "  $RESP2"
AID2=$(echo "$RESP2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('analysisId',''))" 2>/dev/null)

echo ""
echo "=== Waiting 60s for pipelines ==="
sleep 60

echo ""
echo "=== Server alive? ==="
kill -0 $SRV_PID 2>/dev/null && echo "YES" || echo "NO"

echo ""
echo "=== Results ==="
for label_aid in "GitHub:$AID" "Vercel:$AID2"; do
  label="${label_aid%%:*}"
  aid="${label_aid##*:}"
  echo ""
  echo "--- ${label} ---"
  curl -s "http://localhost:3000/api/analyses/${aid}" 2>/dev/null | python3 -c "
import sys,json
try:
    a=json.load(sys.stdin)
    print(f'  Status: {a[\"status\"]}')
    dm=a.get('designMd','') or ''
    print(f'  DesignMD: {len(dm)} chars')
    res=a.get('result','') or ''
    if res:
        r=json.loads(res) if isinstance(res, str) else res
        ds = r.get('meta',{}).get('dataSources',[])
        prov = r.get('meta',{}).get('aiProvider','?')
        conf = r.get('meta',{}).get('confidence','?')
        print(f'  DataSources: {ds}')
        print(f'  Provider: {prov}')
        print(f'  Confidence: {conf}')
        if r.get('vlmAnalysis'):
            vlm = r['vlmAnalysis']
            print(f'  VLM keys: {list(vlm.keys())[:8]}')
        print(f'  Result size: {len(str(res))} chars')
    err=a.get('error','') or ''
    if err: print(f'  Error: {err[:200]}')
except Exception as e: print(f'  err: {e}')
"
done

echo ""
echo "=== LOG (last 50 lines) ==="
tail -50 /tmp/ux-run.log

echo ""
echo "=== DONE ==="
