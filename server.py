"""Local dev server for the ViralX site.

Serves this folder (with HTTP Range support so <video> can seek, like a real host) and accepts
POST /save?name=<file>.png|.jpg|.json so the in-browser renderer can export frames into ./export.
Binds to 127.0.0.1 only.
"""
import http.server
import os
import re
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
EXPORT = os.path.join(ROOT, "export")
PORT = int(os.environ.get("PORT", "3011"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r"bytes=(\d*)-(\d*)", rng)
        size = os.path.getsize(path)
        if not m:
            return super().send_head()
        start = int(m.group(1)) if m.group(1) else max(0, size - int(m.group(2) or 0))
        end = int(m.group(2)) if m.group(1) and m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_error(416)
            return None
        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._range_left = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, "_range_left", None)
        if left is None:
            return super().copyfile(source, outputfile)
        self._range_left = None
        while left > 0:
            chunk = source.read(min(65536, left))
            if not chunk:
                break
            try:
                outputfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break
            left -= len(chunk)

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        if url.path != "/save":
            self.send_error(404)
            return
        name = os.path.basename(urllib.parse.parse_qs(url.query).get("name", [""])[0])
        if not name.endswith((".png", ".jpg", ".json")):
            self.send_error(400, "name must end in .png, .jpg or .json")
            return
        length = int(self.headers.get("Content-Length", "0"))
        os.makedirs(EXPORT, exist_ok=True)
        with open(os.path.join(EXPORT, name), "wb") as f:
            f.write(self.rfile.read(length))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


if __name__ == "__main__":
    print(f"ViralX site on http://localhost:{PORT}")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
