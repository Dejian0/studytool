from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Generator


class LLMProvider(ABC):
    """Base class for LLM provider implementations."""

    @abstractmethod
    def stream_chat(
        self, api_key: str, model: str, messages: list[dict]
    ) -> Generator[str, None, None]:
        ...

    @abstractmethod
    def chat_sync(self, api_key: str, model: str, messages: list[dict]) -> str:
        ...

    @abstractmethod
    def supports_vision(self) -> bool:
        ...

    @abstractmethod
    def available_models(self) -> list[str]:
        ...


_providers: dict[str, LLMProvider] = {}
_model_to_provider: dict[str, LLMProvider] = {}


def register_provider(name: str, provider: LLMProvider) -> None:
    """Register a provider and index all its models for lookup."""
    _providers[name] = provider
    for model in provider.available_models():
        _model_to_provider[model] = provider


def get_provider(model: str) -> LLMProvider:
    """Return the provider instance that owns the given model name."""
    provider = _model_to_provider.get(model)
    if provider is None:
        raise ValueError(
            f"Unknown model '{model}'. Available: {list(_model_to_provider.keys())}"
        )
    return provider


def get_all_providers() -> dict[str, LLMProvider]:
    """Return all registered providers keyed by name."""
    return dict(_providers)


def _boot() -> None:
    """Register built-in providers on first import."""
    from .openai_provider import OpenAIProvider
    from .gemini_provider import GeminiProvider

    register_provider("openai", OpenAIProvider())
    register_provider("google", GeminiProvider())


_boot()
