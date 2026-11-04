import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

def run_e2e():
    print("=== Step 1: Login ===")
    login_resp = requests.post(
        f"{BASE_URL}/api/auth/token",
        data={"username": "researcher@example.com", "password": "Research@123"}
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful! Token acquired.")

    print("\n=== Step 2: List Indexed Files ===")
    files_resp = requests.get(f"{BASE_URL}/api/ai/files", headers=headers)
    assert files_resp.status_code == 200, f"List files failed: {files_resp.text}"
    files_data = files_resp.json()
    print("Files retrieved:", [f["filename"] for f in files_data.get("files", [])])
    for f in files_data.get("files", []):
        print(f" - {f['filename']}: pages={f.get('page_count')}, chunks={f.get('chunk_count')}, size={f.get('size')} bytes")

    print("\n=== Step 3: Grounded RAG Query ===")
    query_payload = {
        "prompt": "What do the Red, Amber, and Green color codes indicate in RAG reporting according to the document?",
        "filename": "report_RAG.pdf"
    }
    chat_resp = requests.post(f"{BASE_URL}/api/ai/chat", json=query_payload, headers=headers)
    assert chat_resp.status_code == 200, f"Chat query failed: {chat_resp.text}"
    chat_data = chat_resp.json()
    print("Answer:\n", chat_data.get("answer"))
    print("\nCitations:")
    for c in chat_data.get("sources", []):
        doc_name = c.get('document_name') or c.get('document_id')
        print(f" - Doc: {doc_name}, Page: {c.get('page_number')}, Section: {c.get('section')}")
        print(f"   Quote: {c.get('evidence', '')[:100]}...")
    
    print("\nRetrieval Stats:")
    print(json.dumps(chat_data.get("retrieval"), indent=2))
    
    print("\nUsage Stats:")
    print(json.dumps(chat_data.get("usage"), indent=2))

    print("\n=== Step 4: Ungrounded / Out-of-Domain Query ===")
    unanswerable_payload = {
        "prompt": "What is the capital of Mars and its exact population in 3000 AD?",
        "filename": "report_RAG.pdf"
    }
    unans_resp = requests.post(f"{BASE_URL}/api/ai/chat", json=unanswerable_payload, headers=headers)
    assert unans_resp.status_code == 200, f"Unanswerable query failed: {unans_resp.text}"
    unans_data = unans_resp.json()
    reply = unans_data.get("answer", "")
    print("Unanswerable Answer:\n", reply)
    expected_phrase = "I couldn't find sufficient information in the provided material to answer this question."
    assert expected_phrase in reply, f"Expected fallback phrase '{expected_phrase}' not in '{reply}'"
    print("PASSED: Fallback phrase strictly respected!")

    print("\n=== Step 5: Document Viewer Page Stream Endpoint ===")
    page_resp = requests.get(f"{BASE_URL}/api/ai/files/report_RAG.pdf/page/1", headers=headers)
    assert page_resp.status_code == 200, f"Page endpoint failed: {page_resp.text}"
    page_data = page_resp.json()
    print("Page 1 details fetched successfully:")
    print(f" - Page number: {page_data.get('page_number')}/{page_data.get('total_pages')}")
    print(f" - Blocks found: {len(page_data.get('blocks', []))}")
    print(f" - Text snippet: {page_data.get('text', '')[:120]}...")

    print("\n==========================================")
    print("ALL 5 E2E INTEGRATION CHECKS PASSED 100%!")
    print("==========================================")

if __name__ == "__main__":
    run_e2e()
