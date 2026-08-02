"""
Zelo — API (MotherDuck-backed).

Single-file, dependency-light handler compatible with Vercel's Python
runtime (`api/index.py` -> class named `handler`). Talks to a MotherDuck
(cloud DuckDB) database for products, live feeds, contact messages,
newsletter signups, and buyer accounts.

REQUIRED ENVIRONMENT VARIABLES (set these in your host's dashboard —
Vercel: Project Settings -> Environment Variables):
  MOTHERDUCK_TOKEN   Your MotherDuck access token
  ADMIN_KEY          A secret string. Admin-only routes require the
                      request header  X-Admin-Key: <ADMIN_KEY>
  MD_DATABASE        (optional) database name, defaults to "zelo"

REQUIRED PYTHON PACKAGE (add to requirements.txt):
  duckdb

On first call, the handler creates its tables if they don't exist yet —
there's no separate migration step.

ROUTES
  GET    /api/health                    liveness check
  GET    /api/products                  public — list all products
  POST   /api/products                  admin  — add one product (JSON body)
  POST   /api/products/csv              admin  — bulk import (raw CSV text body)
  PATCH  /api/products/{id}             admin  — update price/stock/etc
  DELETE /api/products/{id}             admin  — remove a product
  GET    /api/live-feeds                public — list live/scheduled streams
  POST   /api/live-feeds                admin  — create/update a live feed
  POST   /api/contact                   public — { name, email, message }
  POST   /api/newsletter                public — { email }
  POST   /api/signup                    public — { name, phone, email, password } -> buyer account, used to "sign up to buy live"
  POST   /api/login                     public — { email, password }

CSV IMPORT FORMAT (header row required, this exact column order is not
required but these column names are expected):
  id,name,sku,price,original_price,stock,image,category,sizes,description,material,origin
"sizes" is a comma-separated list inside the field, e.g. "S,M,L" (quote
the field in your CSV since it contains commas).
"""

import csv
import hashlib
import io
import json
import os
import re
import uuid
from http.server import BaseHTTPRequestHandler

try:
    import duckdb
    DUCKDB_AVAILABLE = True
except ImportError:
    DUCKDB_AVAILABLE = False

MOTHERDUCK_TOKEN = os.environ.get("MOTHERDUCK_TOKEN", "")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")
MD_DATABASE = os.environ.get("MD_DATABASE", "zelo")
if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", MD_DATABASE):
    raise RuntimeError("MD_DATABASE must be a plain identifier (letters, numbers, underscore).")

PRODUCT_ID_RE = re.compile(r"^/api/products/([A-Za-z0-9_-]+)$")
LIVE_FEED_ROUTE = "/api/live-feeds"

_bootstrapped = False  # per-process cache so we don't re-run CREATE TABLE on every request


def get_connection():
    global _bootstrapped
    if not DUCKDB_AVAILABLE:
        raise RuntimeError("duckdb package is not installed. Add 'duckdb' to requirements.txt.")
    if not MOTHERDUCK_TOKEN:
        raise RuntimeError("MOTHERDUCK_TOKEN is not set. Add it in your host's environment variables.")
    # Connect to the account (no database in the connection string yet) so we can
    # create the target database if it doesn't exist — MotherDuck will NOT do this
    # automatically just because you named it in the connection string.
    con = duckdb.connect(f"md:?motherduck_token={MOTHERDUCK_TOKEN}")
    con.execute(f"CREATE DATABASE IF NOT EXISTS {MD_DATABASE}")
    con.execute(f"USE {MD_DATABASE}")
    if not _bootstrapped:
        bootstrap(con)
        _bootstrapped = True

    return con


def bootstrap(con):
    con.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id VARCHAR PRIMARY KEY,
            name VARCHAR,
            sku VARCHAR,
            price DOUBLE,
            original_price DOUBLE,
            stock INTEGER,
            image VARCHAR,
            category VARCHAR,
            sizes VARCHAR,
            description VARCHAR,
            material VARCHAR,
            origin VARCHAR,
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS live_feeds (
            id VARCHAR PRIMARY KEY,
            title VARCHAR,
            host VARCHAR,
            status VARCHAR,
            viewers INTEGER,
            thumbnail VARCHAR,
            started_at TIMESTAMP DEFAULT current_timestamp
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id VARCHAR PRIMARY KEY,
            name VARCHAR,
            email VARCHAR,
            message VARCHAR,
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            email VARCHAR PRIMARY KEY,
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR PRIMARY KEY,
            name VARCHAR,
            phone VARCHAR,
            email VARCHAR,
            password_hash VARCHAR,
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)


def hash_password(pw):
    # NOTE: sha256 is a placeholder. Swap for bcrypt/argon2 before real launch.
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()


def row_to_product(row, cols):
    d = dict(zip(cols, row))
    d["sizes"] = (d.get("sizes") or "").split(",") if d.get("sizes") else []
    if d.get("created_at") is not None:
        d["created_at"] = str(d["created_at"])
    return d


class handler(BaseHTTPRequestHandler):

    # ---------- helpers ----------
    def _send(self, status, payload):
        body = json.dumps(payload, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw or b"{}")
        except json.JSONDecodeError:
            return {}

    def _body_text(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return ""
        return self.rfile.read(length).decode("utf-8", errors="replace")

    def _is_admin(self):
        return bool(ADMIN_KEY) and self.headers.get("X-Admin-Key") == ADMIN_KEY

    def _require_admin(self):
        if not self._is_admin():
            self._send(401, {"error": "missing or invalid X-Admin-Key header"})
            return False
        return True

    def _db_error(self, e):
        self._send(500, {"error": str(e), "hint": "Check MOTHERDUCK_TOKEN / duckdb install on the server."})

    # ---------- routing ----------
    def do_GET(self):
        path = self.path.split("?")[0]
        try:
            if path == "/api/health":
                info = {"duckdb_available": DUCKDB_AVAILABLE, "motherduck_token_set": bool(MOTHERDUCK_TOKEN), "database": MD_DATABASE}
                try:
                    con = get_connection()
                    tables = [r[0] for r in con.execute("SHOW TABLES").fetchall()]
                    info["status"] = "ok"
                    info["connected"] = True
                    info["tables"] = tables
                    self._send(200, info)
                except Exception as e:
                    info["status"] = "error"
                    info["connected"] = False
                    info["error"] = str(e)
                    self._send(200, info)
                return
            if path == "/api/products":
                con = get_connection()
                cols = ["id","name","sku","price","original_price","stock","image","category","sizes","description","material","origin","created_at"]
                rows = con.execute(f"SELECT {','.join(cols)} FROM products ORDER BY created_at DESC").fetchall()
                self._send(200, {"products": [row_to_product(r, cols) for r in rows]})
                return
            if path == LIVE_FEED_ROUTE:
                con = get_connection()
                cols = ["id","title","host","status","viewers","thumbnail","started_at"]
                rows = con.execute(f"SELECT {','.join(cols)} FROM live_feeds WHERE status = 'live' ORDER BY started_at DESC").fetchall()
                self._send(200, {"feeds": [dict(zip(cols, r)) for r in rows]})
                return
            self._send(404, {"error": "not found"})
        except Exception as e:
            self._db_error(e)

    def do_POST(self):
        path = self.path.split("?")[0]
        try:
            if path == "/api/products":
                if not self._require_admin():
                    return
                data = self._body_json()
                pid = data.get("id") or uuid.uuid4().hex[:10]
                con = get_connection()
                con.execute(
                    "INSERT OR REPLACE INTO products (id,name,sku,price,original_price,stock,image,category,sizes,description,material,origin) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                    [pid, data.get("name",""), data.get("sku",""), float(data.get("price") or 0), float(data.get("original_price") or data.get("price") or 0),
                     int(data.get("stock") or 0), data.get("image",""), data.get("category",""), ",".join(data.get("sizes") or []),
                     data.get("description",""), data.get("material",""), data.get("origin","")]
                )
                self._send(200, {"status": "created", "id": pid})
                return

            if path == "/api/products/csv":
                if not self._require_admin():
                    return
                text = self._body_text()
                reader = csv.DictReader(io.StringIO(text))
                con = get_connection()
                count = 0
                for row in reader:
                    pid = (row.get("id") or "").strip() or uuid.uuid4().hex[:10]
                    con.execute(
                        "INSERT OR REPLACE INTO products (id,name,sku,price,original_price,stock,image,category,sizes,description,material,origin) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                        [pid, row.get("name","").strip(), row.get("sku","").strip(),
                         float(row.get("price") or 0), float(row.get("original_price") or row.get("price") or 0),
                         int(float(row.get("stock") or 0)), row.get("image","").strip(), row.get("category","").strip(),
                         row.get("sizes","").strip(), row.get("description","").strip(), row.get("material","").strip(), row.get("origin","").strip()]
                    )
                    count += 1
                self._send(200, {"status": "imported", "count": count})
                return

            if path == LIVE_FEED_ROUTE:
                if not self._require_admin():
                    return
                data = self._body_json()
                fid = data.get("id") or uuid.uuid4().hex[:10]
                con = get_connection()
                con.execute(
                    "INSERT OR REPLACE INTO live_feeds (id,title,host,status,viewers,thumbnail) VALUES (?,?,?,?,?,?)",
                    [fid, data.get("title",""), data.get("host",""), data.get("status","live"), int(data.get("viewers") or 0), data.get("thumbnail","")]
                )
                self._send(200, {"status": "saved", "id": fid})
                return

            if path == "/api/contact":
                data = self._body_json()
                if not data.get("name") or not data.get("message"):
                    self._send(400, {"error": "name and message are required"}); return
                con = get_connection()
                con.execute("INSERT INTO contacts (id,name,email,message) VALUES (?,?,?,?)",
                            [uuid.uuid4().hex[:10], data.get("name",""), data.get("email",""), data.get("message","")])
                self._send(200, {"status": "received"})
                return

            if path == "/api/newsletter":
                data = self._body_json()
                email = (data.get("email") or "").strip()
                if "@" not in email:
                    self._send(400, {"error": "valid email required"}); return
                con = get_connection()
                con.execute("INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)", [email])
                self._send(200, {"status": "subscribed", "email": email})
                return

            if path == "/api/signup":
                data = self._body_json()
                required = ["name", "phone", "password"]
                missing = [f for f in required if not data.get(f)]
                if missing:
                    self._send(400, {"error": f"missing fields: {', '.join(missing)}"}); return
                con = get_connection()
                uid = uuid.uuid4().hex[:10]
                con.execute("INSERT INTO users (id,name,phone,email,password_hash) VALUES (?,?,?,?,?)",
                            [uid, data["name"], data["phone"], data.get("email",""), hash_password(data["password"])])
                self._send(200, {"status": "signed_up", "user_id": uid})
                return

            if path == "/api/login":
                data = self._body_json()
                con = get_connection()
                cols = ["id","name","phone","email","password_hash"]
                rows = con.execute(f"SELECT {','.join(cols)} FROM users WHERE email = ? OR phone = ?",
                                    [data.get("email",""), data.get("phone","")]).fetchall()
                if not rows or rows[0][4] != hash_password(data.get("password","")):
                    self._send(401, {"error": "invalid credentials"}); return
                u = dict(zip(cols, rows[0])); u.pop("password_hash")
                self._send(200, {"status": "logged_in", "user": u})
                return

            self._send(404, {"error": "not found"})
        except Exception as e:
            self._db_error(e)

    def do_PATCH(self):
        path = self.path.split("?")[0]
        m = PRODUCT_ID_RE.match(path)
        if not m:
            self._send(404, {"error": "not found"}); return
        if not self._require_admin():
            return
        try:
            pid = m.group(1)
            data = self._body_json()
            fields, values = [], []
            for key in ["name","sku","price","original_price","stock","image","category","description","material","origin"]:
                if key in data:
                    fields.append(f"{key} = ?")
                    values.append(data[key])
            if "sizes" in data:
                fields.append("sizes = ?")
                values.append(",".join(data["sizes"]))
            if not fields:
                self._send(400, {"error": "no fields to update"}); return
            values.append(pid)
            con = get_connection()
            con.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = ?", values)
            self._send(200, {"status": "updated", "id": pid})
        except Exception as e:
            self._db_error(e)

    def do_DELETE(self):
        path = self.path.split("?")[0]
        m = PRODUCT_ID_RE.match(path)
        if not m:
            self._send(404, {"error": "not found"}); return
        if not self._require_admin():
            return
        try:
            pid = m.group(1)
            con = get_connection()
            con.execute("DELETE FROM products WHERE id = ?", [pid])
            self._send(200, {"status": "deleted", "id": pid})
        except Exception as e:
            self._db_error(e)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key")
        self.end_headers()
