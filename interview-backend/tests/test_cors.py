"""CORS configuration tests for main.py."""
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def _preflight(origin):
    return client.options(
        "/",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )


def test_frontend_origin_is_allowed():
    res = _preflight("http://localhost:3000")
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_unknown_origin_is_not_allowed():
    res = _preflight("https://evil.example")
    assert "access-control-allow-origin" not in res.headers
