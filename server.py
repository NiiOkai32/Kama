"""Build and serve the static Kama app locally. Run: python server.py"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import subprocess

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
PORT = int(os.environ.get("PORT", "8000"))


class StaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)


if __name__ == "__main__":
    subprocess.run(["node", "build.mjs"], cwd=ROOT, check=True)
    print(f"Kama is available at http://localhost:{PORT}")
    ThreadingHTTPServer(("0.0.0.0", PORT), StaticHandler).serve_forever()
