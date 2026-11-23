"""Build and serve the static Kama app locally. Run: python server.py"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import os
import subprocess

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
PORT = int(os.environ.get("PORT", "8000"))


class StaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def send_head(self):
        try:
            requested = unquote(urlsplit(self.path).path, errors="strict")
        except ValueError:
            self.send_error(400)
            return None

        parts = requested.removeprefix("/").split("/") if requested != "/" else ["index.html"]
        if any(not part or part.startswith(".") or "\\" in part or "\0" in part for part in parts):
            self.send_error(404)
            return None

        file = DIST.joinpath(*parts)
        if (
            not file.resolve().is_relative_to(DIST.resolve())
            or not file.is_file()
            or file.suffix == ".map"
            or parts == ["_headers"]
        ):
            self.send_error(404)
            return None

        if requested == "/":
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()


if __name__ == "__main__":
    subprocess.run(["node", "build.mjs"], cwd=ROOT, check=True)
    print(f"Kama is available at http://localhost:{PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), StaticHandler).serve_forever()
