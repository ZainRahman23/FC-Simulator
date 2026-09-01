#!/usr/bin/env python3
"""Static + API proxy server for the live match visual preview.

Serves the repository root (frozen assets + sandbox pages) and forwards
/api/* to the untouched Touchline engine server on 127.0.0.1:8000, so the
browser needs no CORS and server.py needs no modification.

Run:  python3 sandbox/visual/serve_match.py   (engine server must be running)
Open: http://127.0.0.1:8124/sandbox/visual/match.html
"""
import http.server
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENGINE = "http://127.0.0.1:8000"
PORT = 8124


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def end_headers(self):
        # dev preview: browsers must revalidate every load (stale cached
        # match.html/match.js previously hid newly committed controls)
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _proxy(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(
            ENGINE + self.path, data=body, method=self.command,
            headers={"Content-Type": self.headers.get("Content-Type", "application/json")})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                payload = r.read()
                self.send_response(r.status)
                self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
        except urllib.error.HTTPError as e:
            payload = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as e:  # engine down etc.
            msg = ('{"error": "engine unreachable: %s"}' % e).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        self.send_error(405)

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"match preview: http://127.0.0.1:{PORT}/sandbox/visual/match.html")
    server.serve_forever()
