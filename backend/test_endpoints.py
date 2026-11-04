import urllib.request
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def test_api():
    print("Testing GET /health...")
    with urllib.request.urlopen("http://localhost:8000/health") as res:
        print("Health status:", res.status, res.read().decode())

    print("\nTesting GET /api/ai/files...")
    with urllib.request.urlopen("http://localhost:8000/api/ai/files") as res:
        print("Files status:", res.status, res.read().decode())

    print("\nTesting POST /api/ai/chat...")
    data = json.dumps({"prompt": "Hello! What can you help me with?"}).encode("utf-8")
    req = urllib.request.Request(
        "http://localhost:8000/api/ai/chat",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            print("Chat status:", res.status)
            body = json.loads(res.read().decode())
            print("Chat answer:", body.get("answer", "")[:150])
    except urllib.error.HTTPError as e:
        print(f"Chat error: {e.code} - {e.read().decode()}")

if __name__ == "__main__":
    test_api()
