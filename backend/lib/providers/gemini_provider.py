from __future__ import annotations

import base64
from collections.abc import Generator

from google import genai
from google.genai import types

from . import LLMProvider


class GeminiProvider(LLMProvider):

    MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]

    def stream_chat(
        self, api_key: str, model: str, messages: list[dict]
    ) -> Generator[str, None, None]:
        client = genai.Client(api_key=api_key)
        system_instruction, contents = _convert_messages(messages)
        config = types.GenerateContentConfig(system_instruction=system_instruction) if system_instruction else None

        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                yield chunk.text

    def chat_sync(self, api_key: str, model: str, messages: list[dict]) -> str:
        client = genai.Client(api_key=api_key)
        system_instruction, contents = _convert_messages(messages)
        config = types.GenerateContentConfig(system_instruction=system_instruction) if system_instruction else None

        # #region agent log
        import json as _json, time as _time
        try:
            with open("/home/think/projects/studytool/.cursor/debug-ecebc5.log", "a") as _f:
                _f.write(_json.dumps({"sessionId":"ecebc5","location":"gemini_provider.py:chat_sync","message":"chat_sync_called","data":{"model":model,"num_contents":len(contents),"has_system":system_instruction is not None},"timestamp":int(_time.time()*1000),"hypothesisId":"H1,H3"}) + "\n")
        except Exception:
            pass
        # #endregion

        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            # #region agent log
            try:
                with open("/home/think/projects/studytool/.cursor/debug-ecebc5.log", "a") as _f:
                    _f.write(_json.dumps({"sessionId":"ecebc5","location":"gemini_provider.py:chat_sync_error","message":"chat_sync_failed","data":{"model":model,"error_type":type(exc).__name__,"error_str":str(exc)[:500]},"timestamp":int(_time.time()*1000),"hypothesisId":"H1,H3,H4"}) + "\n")
            except Exception:
                pass
            # #endregion
            raise
        return response.text or ""

    def supports_vision(self) -> bool:
        return True

    def available_models(self) -> list[str]:
        return list(self.MODELS)


def _convert_messages(
    messages: list[dict],
) -> tuple[str | None, list[types.Content]]:
    """Convert OpenAI-format messages to Gemini format.

    Returns (system_instruction, contents).
    """
    system_instruction: str | None = None
    contents: list[types.Content] = []

    for msg in messages:
        role = msg["role"]

        if role == "system":
            system_instruction = msg["content"] if isinstance(msg["content"], str) else ""
            continue

        gemini_role = "model" if role == "assistant" else "user"
        parts = _convert_content_to_parts(msg["content"])
        if parts:
            contents.append(types.Content(role=gemini_role, parts=parts))

    return system_instruction, contents


def _convert_content_to_parts(content: str | list[dict]) -> list[types.Part]:
    """Convert an OpenAI message content field to a list of Gemini Parts."""
    if isinstance(content, str):
        return [types.Part.from_text(text=content)]

    parts: list[types.Part] = []
    for block in content:
        block_type = block.get("type", "")

        if block_type == "text":
            text = block.get("text", "")
            if text:
                parts.append(types.Part.from_text(text=text))

        elif block_type == "image_url":
            image_url = block.get("image_url", {}).get("url", "")
            if image_url.startswith("data:"):
                mime_type, b64_data = _parse_data_url(image_url)
                image_bytes = base64.b64decode(b64_data)
                parts.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))

    return parts


def _parse_data_url(data_url: str) -> tuple[str, str]:
    """Parse a data URI like 'data:image/png;base64,iVBOR...' into (mime_type, base64_data)."""
    header, _, b64_data = data_url.partition(",")
    mime_type = header.split(":")[1].split(";")[0] if ":" in header else "image/png"
    return mime_type, b64_data