from __future__ import annotations

import base64
from collections.abc import Generator

from lib.providers import get_provider


def encode_images(page_bytes_list: list[bytes]) -> list[dict]:
    """Convert raw PNG byte buffers into OpenAI-style vision content blocks.

    These blocks are understood by all providers (each provider converts
    them internally to its native format).
    """
    blocks: list[dict] = []
    for png in page_bytes_list:
        b64 = base64.b64encode(png).decode("ascii")
        blocks.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "high"},
            }
        )
    return blocks


def build_messages(
    system_prompt: str,
    history: list[dict],
    user_text: str,
    image_blocks: list[dict],
) -> list[dict]:
    """Assemble the full messages array in OpenAI format.

    Prior history is sent as plain text (no old images re-sent).  Only the
    current user turn carries the active-context slide images.
    """
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    user_content: list[dict] = [{"type": "text", "text": user_text}, *image_blocks]
    messages.append({"role": "user", "content": user_content})
    return messages


def stream_chat(
    api_key: str,
    model: str,
    messages: list[dict],
) -> Generator[str, None, None]:
    """Stream a chat completion via the appropriate provider."""
    provider = get_provider(model)
    return provider.stream_chat(api_key, model, messages)


def chat_sync(
    api_key: str,
    model: str,
    messages: list[dict],
) -> str:
    """Send a chat completion via the appropriate provider (non-streaming)."""
    provider = get_provider(model)
    return provider.chat_sync(api_key, model, messages)


def analyze_exams(
    api_key: str,
    model: str,
    system_prompt: str,
    exam_images: list[bytes],
) -> str:
    """Send all exam page images with the analyzer prompt (non-streaming)."""
    image_blocks = encode_images(exam_images)
    messages = build_messages(
        system_prompt, [], "Analyze the following exam papers.", image_blocks
    )
    return chat_sync(api_key, model, messages)
