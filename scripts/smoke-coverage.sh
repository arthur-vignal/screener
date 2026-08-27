#!/bin/bash
TOKEN="rgaM31HZQkVunRuafvYgYy"
echo "=== coverage direto na brapi (referência) ==="
for sym in PETR4 VALE3 ITUB4 BBSE3 MXRF11 BOVA11 ROXO34; do
  echo "--- $sym ---"
  curl -s "https://brapi.dev/api/v2/tickers/coverage?symbols=$sym&token=$TOKEN" | python -c "
import json, sys
d = json.load(sys.stdin)
if 'results' in d and d['results']:
    r = d['results'][0]
    print(f\"  assetType={r.get('assetType')} subType={r.get('subType')} status={r.get('status')}\")
    av = r.get('availableData', {})
    flags = [k for k,v in av.items() if v]
    print(f\"  available: {flags}\")
else:
    print('  NO results')
"
done
