from __future__ import annotations

import re


def convert_latex_delimiters(text: str) -> str:
    r"""Convert ``\[ .. \]`` and ``\( .. \)`` delimiters to ``$$``/``$``.

    Streamlit's KaTeX renderer expects dollar-sign delimiters, but most LLMs
    emit standard LaTeX delimiters.  This function bridges the gap.
    """
    text = re.sub(r"\\\[(.+?)\\\]", r"$$\1$$", text, flags=re.DOTALL)
    text = re.sub(r"\\\((.+?)\\\)", r"$\1$", text, flags=re.DOTALL)
    return text
