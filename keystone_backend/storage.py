"""Atomic, privacy-preserving analytics persistence for Keystone."""
from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from pathlib import Path
from typing import Any


class AnalyticsStore:
    def __init__(self, path: Path, salt: str) -> None:
        self.path = path
        self.salt = salt
        self._lock = threading.Lock()
        self.path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if not self.path.exists():
            self._write({"version": 1, "visits": [], "chats": []})

    def _read(self) -> dict[str, Any]:
        try:
            with self.path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            if not isinstance(data.get("visits"), list) or not isinstance(data.get("chats"), list):
                raise ValueError("invalid analytics shape")
            return data
        except (OSError, ValueError, json.JSONDecodeError):
            return {"version": 1, "visits": [], "chats": []}

    def _write(self, data: dict[str, Any]) -> None:
        temporary = self.path.with_suffix(".tmp")
        with temporary.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, separators=(",", ":"))
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, self.path)

    def fingerprint(self, ip: str) -> str:
        return hashlib.sha256(f"{self.salt}:{ip}".encode("utf-8")).hexdigest()[:16]

    def add_visit(self, payload: dict[str, Any], ip: str, user_agent: str) -> None:
        record = {
            "id": payload["sub"],
            "timestamp": int(time.time()),
            "role": payload["role"],
            "admin": payload["role"] == "admin",
            "excludedFromTotals": payload["role"] == "admin",
            "ipHash": self.fingerprint(ip),
            "userAgent": user_agent[:240],
        }
        with self._lock:
            data = self._read()
            data["visits"].append(record)
            data["visits"] = data["visits"][-10000:]
            self._write(data)

    def add_chat(self, payload: dict[str, Any], question: str, section: str) -> None:
        record = {
            "visitorId": payload["sub"],
            "timestamp": int(time.time()),
            "role": payload["role"],
            "admin": payload["role"] == "admin",
            "excludedFromTotals": payload["role"] == "admin",
            "section": section[:80],
            "question": question[:1000],
        }
        with self._lock:
            data = self._read()
            data["chats"].append(record)
            data["chats"] = data["chats"][-20000:]
            self._write(data)

    def metrics(self) -> dict[str, Any]:
        with self._lock:
            data = self._read()
        public_visits = [x for x in data["visits"] if not x.get("excludedFromTotals")]
        public_chats = [x for x in data["chats"] if not x.get("excludedFromTotals")]
        admin_visits = [x for x in data["visits"] if x.get("admin")]
        admin_chats = [x for x in data["chats"] if x.get("admin")]
        return {
            "summary": {
                "reviewerVisits": len(public_visits),
                "uniqueReviewers": len({x.get("id") for x in public_visits}),
                "reviewerChats": len(public_chats),
                "adminVisitsExcluded": len(admin_visits),
                "adminChatsExcluded": len(admin_chats),
            },
            "visits": data["visits"][-250:][::-1],
            "chats": data["chats"][-250:][::-1],
        }
