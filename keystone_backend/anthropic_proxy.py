"""Minimal server-side Anthropic Messages API client."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


class ClaudeError(RuntimeError):
    def __init__(self, status: int, public_message: str) -> None:
        super().__init__(public_message)
        self.status = status
        self.public_message = public_message


def _validated_messages(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list) or not value or len(value) > 8:
        raise ClaudeError(400, "messages must contain between 1 and 8 items")
    result: list[dict[str, str]] = []
    total = 0
    for item in value:
        if not isinstance(item, dict) or item.get("role") not in {"user", "assistant"}:
            raise ClaudeError(400, "invalid message role")
        content = item.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ClaudeError(400, "message content must be non-empty text")
        if len(content) > 100_000:
            raise ClaudeError(413, "message content is too large")
        total += len(content)
        result.append({"role": item["role"], "content": content})
    if total > 120_000:
        raise ClaudeError(413, "request content is too large")
    return result


def complete(api_key: str, model: str, request_body: dict[str, Any]) -> str:
    messages = _validated_messages(request_body.get("messages"))
    requested_tokens = request_body.get("max_tokens", 1400)
    try:
        max_tokens = max(128, min(int(requested_tokens), 1800))
    except (TypeError, ValueError):
        max_tokens = 1400
    payload = json.dumps({
        "model": model,
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "messages": messages,
    }).encode("utf-8")
    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        method="POST",
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "user-agent": "ey-keystone-production/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        status = exc.code if 400 <= exc.code <= 599 else 502
        if status in {401, 403}:
            message = "The Claude service credential is unavailable"
        elif status == 429:
            message = "The Claude service is busy; please retry shortly"
        elif status == 400:
            message = "Claude rejected the request format"
        else:
            status = 502
            message = "The Claude service did not complete the request"
        raise ClaudeError(status, message) from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ClaudeError(502, "The Claude service is temporarily unreachable") from exc

    parts = [block.get("text", "") for block in data.get("content", []) if block.get("type") == "text"]
    text = "".join(parts).strip()
    if not text:
        raise ClaudeError(502, "Claude returned an empty response")
    return text
