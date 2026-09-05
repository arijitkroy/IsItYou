import os
import sys
import uvicorn

CUR_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CUR_DIR)
for p in (PARENT_DIR, CUR_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
