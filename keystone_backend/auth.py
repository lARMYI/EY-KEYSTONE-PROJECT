"""Signed access tokens, code verification, and in-memory abuse controls."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import threading
import time
import uuid
from collections import defaultdict, deque
from typing import Any


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


class TokenManager:
    def __init__(self, secret: bytes, ttl_seconds: int) -> None:
        self.secret = secret
        self.ttl_seconds = ttl_seconds

    def issue(self, role: str, visitor_id: str | None = None) -> tuple[str, dict[str, Any]]:
        now = int(time.time())
        payload = {
            "v": 1,
            "sub": visitor_id or uuid.uuid4().hex,
            "role": role,
            "iat": now,
            "exp": now + self.ttl_seconds,
            "nonce": uuid.uuid4().hex[:12],
        }
        encoded = _b64url(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
        signature = _b64url(hmac.new(self.secret, encoded.encode("ascii"), hashlib.sha256).digest())
        return f"{encoded}.{signature}", payload

    def verify(self, token: str) -> dict[str, Any] | None:
        try:
            encoded, provided = token.split(".", 1)
            expected = _b64url(hmac.new(self.secret, encoded.encode("ascii"), hashlib.sha256).digest())
            if not hmac.compare_digest(provided, expected):
                return None
            payload = json.loads(_unb64url(encoded))
            if payload.get("v") != 1 or int(payload.get("exp", 0)) < int(time.time()):
                return None
            if payload.get("role") not in {"reviewer", "admin"} or not payload.get("sub"):
                return None
            return payload
        except (ValueError, TypeError, json.JSONDecodeError):
            return None


def code_role(code: str, reviewer_code: str, admin_code: str) -> str | None:
    candidate = code.encode("utf-8")
    if hmac.compare_digest(candidate, admin_code.encode("utf-8")):
        return "admin"
    if hmac.compare_digest(candidate, reviewer_code.encode("utf-8")):
        return "reviewer"
    return None


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= limit:
                retry = max(1, int(window_seconds - (now - events[0])))
                return False, retry
            events.append(now)
            if len(self._events) > 5000:
                stale = [k for k, q in self._events.items() if not q or q[-1] < cutoff]
                for stale_key in stale[:1000]:
                    self._events.pop(stale_key, None)
            return True, 0
