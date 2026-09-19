"""Validation boundary for untrusted model-generated read queries."""
import re

FORBIDDEN = re.compile(r"\b(delete|detach|drop|remove|set|create|merge|call|load|foreach)\b|//|/\*|;", re.IGNORECASE)


def validate_read_query(query: str) -> bool:
    """Allow only a single read query; callers must still use server-owned templates."""
    return bool(query and not FORBIDDEN.search(query))