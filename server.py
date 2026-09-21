#!/usr/bin/env python3
"""Secure static server and API surface for the EY Keystone briefing site."""
from __future__ import annotations

import json
import logging
import mimetypes
import os
import posixpath
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from keystone_backend.anthropic_proxy import ClaudeError, complete
from keystone_backend.auth import SlidingWindowLimiter, TokenManager, code_role
from keystone_backend.config import Config
from keystone_backend.storage import AnalyticsStore

ROOT = Path(__file__).resolve().parent
CONFIG = Config.load(ROOT)
TOKENS = TokenManager(CONFIG.token_secret, CONFIG.token_ttl_seconds)
LIMITER = SlidingWindowLimiter()
STORE = AnalyticsStore(CONFIG.data_dir / "visitor_logs.json", CONFIG.analytics_salt)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
LOG = logging.getLogger("keystone")

SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
}

DENIED_COMPONENTS = {"data", "keystone_backend", "__pycache__", ".git"}
DENIED_FILES = {"server.py", ".env", ".gitignore", "AGENTS.md", "_headers", "keystone_access_codes.txt"}


class KeystoneHandler(BaseHTTPRequestHandler):
    server_version = "Keystone"
    sys_version = ""

    def log_message(self, fmt: str, *args: object) -> None:
        LOG.info("%s %s", self.client_address[0], fmt % args)

    @property
    def client_ip(self) -> str:
        forwarded = self.headers.get("X-Forwarded-For", "").split(",", 1)[0].strip()
        return forwarded or self.client_address[0]

    def _headers(self, status: int, content_type: str, length: int, cache: str = "no-store") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", cache)
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        self.end_headers()

    def _json(self, status: int, payload: dict[str, object], extra: dict[str, str] | None = None) -> None:
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        if extra:
            for name, value in extra.items():
                self.send_header(name, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _body_json(self, max_bytes: int = 180_000) -> dict[str, object]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("Invalid content length") from exc
        if length <= 0 or length > max_bytes:
            raise OverflowError("Request body is missing or too large")
        raw = self.rfile.read(length)
        try:
            value = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("Request body must be valid JSON") from exc
        if not isinstance(value, dict):
            raise ValueError("Request body must be a JSON object")
        return value

    def _token_payload(self) -> dict[str, object] | None:
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        return TOKENS.verify(auth[7:].strip())

    def _require_token(self, admin: bool = False) -> dict[str, object] | None:
        payload = self._token_payload()
        if payload is None:
            self._json(HTTPStatus.UNAUTHORIZED, {"error": "Missing or invalid access token"})
            return None
        if admin and payload.get("role") != "admin":
            self._json(HTTPStatus.FORBIDDEN, {"error": "Admin access required"})
            return None
        return payload

    def do_HEAD(self) -> None:
        self.do_GET()

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/api/health":
            self._json(HTTPStatus.OK, {"ok": True, "model": CONFIG.model})
            return
        if path == "/api/session":
            payload = self._require_token()
            if payload:
                self._json(HTTPStatus.OK, {"ok": True, "role": payload["role"], "expires": payload["exp"]})
            return
        if path == "/api/metrics":
            payload = self._require_token(admin=True)
            if payload:
                self._json(HTTPStatus.OK, STORE.metrics())
            return
        if path.startswith("/api/"):
            self._json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        self._serve_static(path)

    def do_POST(self) -> None:
        path = urlsplit(self.path).path
        if path == "/api/access":
            self._access()
            return
        if path == "/api/claude":
            self._claude()
            return
        if path == "/api/analytics/chat":
            self._chat()
            return
        self._json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def _access(self) -> None:
        allowed, retry = LIMITER.allow(f"gate:{self.client_ip}", 8, 900)
        if not allowed:
            self._json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "Too many access attempts"}, {"Retry-After": str(retry)})
            return
        try:
            body = self._body_json(4096)
        except OverflowError as exc:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": str(exc)})
            return
        except ValueError as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        code = body.get("code")
        if not isinstance(code, str) or len(code) > 160:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "Invalid access code"})
            return
        role = code_role(code.strip(), CONFIG.reviewer_code, CONFIG.admin_code)
        if role is None:
            self._json(HTTPStatus.UNAUTHORIZED, {"error": "Access code not recognized"})
            return
        previous = body.get("visitorId") if isinstance(body.get("visitorId"), str) else None
        token, payload = TOKENS.issue(role, previous)
        STORE.add_visit(payload, self.client_ip, self.headers.get("User-Agent", ""))
        self._json(HTTPStatus.OK, {"ok": True, "token": token, "role": role, "visitorId": payload["sub"], "expires": payload["exp"]})

    def _claude(self) -> None:
        payload = self._require_token()
        if payload is None:
            return
        allowed, retry = LIMITER.allow(f"claude:{payload['sub']}", 75, 600)
        global_allowed, global_retry = LIMITER.allow("claude:global", 600, 3600)
        if not allowed or not global_allowed:
            self._json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "Chat rate limit reached"}, {"Retry-After": str(max(retry, global_retry))})
            return
        try:
            body = self._body_json()
            text = complete(CONFIG.anthropic_api_key, CONFIG.model, body)
            self._json(HTTPStatus.OK, {"content": text, "model": CONFIG.model})
        except OverflowError as exc:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": str(exc)})
        except ValueError as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except ClaudeError as exc:
            LOG.warning("Claude upstream failure status=%s visitor=%s", exc.status, str(payload["sub"])[:8])
            self._json(exc.status, {"error": exc.public_message})
        except Exception:
            LOG.exception("Unexpected Claude proxy failure")
            self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "The live agent could not complete the request"})

    def _chat(self) -> None:
        payload = self._require_token()
        if payload is None:
            return
        try:
            body = self._body_json(8192)
        except OverflowError as exc:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": str(exc)})
            return
        except ValueError as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        question = body.get("question")
        section = body.get("section", "")
        if not isinstance(question, str) or not question.strip() or len(question) > 2000:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "Invalid question"})
            return
        if not isinstance(section, str):
            section = ""
        STORE.add_chat(payload, question.strip(), section)
        self._json(HTTPStatus.OK, {"ok": True})

    def _serve_static(self, request_path: str) -> None:
        decoded = unquote(request_path)
        for _ in range(2):
            next_decoded = unquote(decoded)
            if next_decoded == decoded:
                break
            decoded = next_decoded
        normalized = posixpath.normpath("/" + decoded.lstrip("/"))
        parts = [part for part in normalized.split("/") if part]
        if any(part.startswith(".") or part in DENIED_COMPONENTS for part in parts) or (parts and parts[-1] in DENIED_FILES):
            self._json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        relative = normalized.lstrip("/") or "index.html"
        target = (CONFIG.root / relative).resolve()
        try:
            target.relative_to(CONFIG.root)
        except ValueError:
            self._json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            self._json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        mime = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        content_type = mime + ("; charset=utf-8" if mime.startswith("text/") or mime in {"application/javascript", "application/json"} else "")
        body = target.read_bytes()
        cache = "public, max-age=86400" if target.suffix in {".css", ".js", ".woff2", ".png", ".svg"} else "no-store"
        self._headers(HTTPStatus.OK, content_type, len(body), cache)
        if self.command != "HEAD":
            self.wfile.write(body)


class KeystoneServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(ROOT)
    server = KeystoneServer((CONFIG.host, CONFIG.port), KeystoneHandler)
    LOG.info("Keystone listening on %s:%s model=%s", CONFIG.host, CONFIG.port, CONFIG.model)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
