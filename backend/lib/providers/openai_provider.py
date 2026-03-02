from __future__ import annotations

from collections.abc import Generator

from openai import OpenAI

from . import LLMProvider


class OpenAIProvider(LLMProvider):

    MODELS = ["gpt-5.2", "gpt-5-mini", "gpt-5-nano"]

    def stream_chat(
        self, api_key: str, model: str, messages: list[dict]
    ) -> Generator[str, None, None]:
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

    def chat_sync(self, api_key: str, model: str, messages: list[dict]) -> str:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(model=model, messages=messages)
        return response.choices[0].message.content or ""

    def supports_vision(self) -> bool:
        return True

    def available_models(self) -> list[str]:
        return list(self.MODELS)
