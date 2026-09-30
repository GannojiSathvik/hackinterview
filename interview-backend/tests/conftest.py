"""Shared pytest setup for the backend.

config.py raises at import time if GOOGLE_API_KEY is missing, so a dummy key
is set before any app module is imported. No test makes a real Gemini call —
tests patch the GeminiService methods they depend on.
"""
import os
import sys

os.environ.setdefault("GOOGLE_API_KEY", "test-key-not-real")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
