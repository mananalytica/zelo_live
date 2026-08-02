"""
Zelo — API entry point (stub).

This is written as a single-file, dependency-free handler compatible with
Vercel's Python runtime (`api/index.py` -> exposes a class named `handler`).
If you deploy elsewhere (a VPS, Render, etc.) swap this for a real
framework (FastAPI/Flask) — the route map below shows what each page
on the site expects to be able to call.

Wired up but intentionally minimal:
  GET  /api/health              -> liveness check
  POST /api/newsletter          -> { email }              (contact / footer signup)
  POST /api/booking             -> { name, phone, date, service }   (booking.html)
  POST /api/measurements        -> { profile fields }      (measurements.html)
  POST /api/leads               -> { name, phone, source } (landing-booking.html)

None of these persist anywhere yet — they validate input and return a
mock success response. Plug in your database / CRM / order system where
marked TODO.
"""

import json
from http.server import BaseHTTPRequestHandler


ROUTES = {
    "/api/health",
    "/api/newsletter",
    "/api/booking",
    "/api/measurements",
    "/api/leads",
}


def _json_response(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _read_json_body(handler):
    length = int(handler.headers.get("Content-Length", 0))
    if length == 0:
        return {}
    raw = handler.rfile.read(length)
    try:
        return json.loads(raw or b"{}")
    except json.JSONDecodeError:
        return {}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/health":
            _json_response(self, 200, {"status": "ok", "service": "zelo-api"})
            return
        _json_response(self, 404, {"error": "not found"})

    def do_POST(self):
        path = self.path.split("?")[0]
        if path not in ROUTES:
            _json_response(self, 404, {"error": "not found"})
            return

        data = _read_json_body(self)

        if path == "/api/newsletter":
            email = (data.get("email") or "").strip()
            if "@" not in email:
                _json_response(self, 400, {"error": "valid email required"})
                return
            # TODO: push to your mailing list provider
            _json_response(self, 200, {"status": "subscribed", "email": email})
            return

        if path == "/api/booking":
            required = ["name", "phone", "date", "service"]
            missing = [f for f in required if not data.get(f)]
            if missing:
                _json_response(self, 400, {"error": f"missing fields: {', '.join(missing)}"})
                return
            # TODO: write to booking calendar / DB, notify tailoring team
            _json_response(self, 200, {"status": "booked", "reference": "ZB-" + str(abs(hash(json.dumps(data))))[:8]})
            return

        if path == "/api/measurements":
            # TODO: persist against the customer's account
            _json_response(self, 200, {"status": "saved"})
            return

        if path == "/api/leads":
            required = ["name", "phone"]
            missing = [f for f in required if not data.get(f)]
            if missing:
                _json_response(self, 400, {"error": f"missing fields: {', '.join(missing)}"})
                return
            # TODO: forward to CRM / ad-conversion webhook
            _json_response(self, 200, {"status": "received"})
            return

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
