import base64
import json
import sys
from pathlib import Path

source = Path(sys.argv[1])
root = Path("public")
data = json.loads(source.read_text())["result"]["value"]
if isinstance(data, dict):
    data = [data]
for item in data:
    if not item.get("b64"):
        print("fail", item.get("path"), item.get("status"))
        continue
    dest = root / item["path"].lstrip("/")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(base64.b64decode(item["b64"]))
    print(f"{dest} {dest.stat().st_size}")
