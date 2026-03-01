from __future__ import annotations

import base64
from collections.abc import Generator

from openai import OpenAI


def encode_images(page_bytes_list: list[bytes]) -> list[dict]:
    """Convert raw PNG byte buffers into OpenAI vision content blocks."""
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
    """Assemble the full messages array for the OpenAI chat completions API.

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
    """Stream a chat completion and yield text deltas as they arrive."""
    client = OpenAI(api_key=api_key)
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


def chat_sync(
    api_key: str,
    model: str,
    messages: list[dict],
) -> str:
    """Send a chat completion and return the full response text (non-streaming)."""
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(model=model, messages=messages)
    return response.choices[0].message.content or ""


def analyze_exams(
    api_key: str,
    model: str,
    system_prompt: str,
    exam_images: list[bytes],
) -> str:
    """Send all exam page images with the analyzer prompt (non-streaming)."""
    image_blocks = encode_images(exam_images)
    user_content: list[dict] = [
        {"type": "text", "text": "Analyze the following exam papers."},
        *image_blocks,
    ]
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
    )
    return response.choices[0].message.content or ""
