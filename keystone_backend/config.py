"""Environment-backed configuration for the Keystone production server."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Config:
    root: Path
    data_dir: Path
    host: str
    port: int
    model: str
    anthropic_api_key: str
    reviewer_code: str
    admin_code: str
    token_secret: bytes
    analytics_salt: str
    token_ttl_seconds: int

    @classmethod
    def load(cls, root: Path) -> "Config":
        required = {
            "ANTHROPIC_API_KEY": os.environ.get("ANTHROPIC_API_KEY", ""),
            "KEYSTONE_REVIEWER_CODE": os.environ.get("KEYSTONE_REVIEWER_CODE", ""),
            "KEYSTONE_ADMIN_CODE": os.environ.get("KEYSTONE_ADMIN_CODE", ""),
            "KEYSTONE_TOKEN_SECRET": os.environ.get("KEYSTONE_TOKEN_SECRET", ""),
            "KEYSTONE_ANALYTICS_SALT": os.environ.get("KEYSTONE_ANALYTICS_SALT", ""),
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise RuntimeError("Missing required configuration: " + ", ".join(missing))
        if required["KEYSTONE_REVIEWER_CODE"] == required["KEYSTONE_ADMIN_CODE"]:
            raise RuntimeError("Reviewer and admin access codes must differ")

        data_dir = root / "data"
        data_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        return cls(
            root=root,
            data_dir=data_dir,
            host=os.environ.get("KEYSTONE_HOST", "127.0.0.1"),
            port=int(os.environ.get("KEYSTONE_PORT", "8081")),
            model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            anthropic_api_key=required["ANTHROPIC_API_KEY"],
            reviewer_code=required["KEYSTONE_REVIEWER_CODE"],
            admin_code=required["KEYSTONE_ADMIN_CODE"],
            token_secret=required["KEYSTONE_TOKEN_SECRET"].encode("utf-8"),
            analytics_salt=required["KEYSTONE_ANALYTICS_SALT"],
            token_ttl_seconds=int(os.environ.get("KEYSTONE_TOKEN_TTL_SECONDS", "86400")),
        )
