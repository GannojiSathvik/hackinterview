"""Tests for resume upload handling in routes/resume.py."""
import os
import tempfile

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes import resume as resume_routes
from services.resume_parser import ResumeParserService

# A client-controlled filename that tries to escape the temp directory. The
# target directory does not exist, so even unpatched code cannot write there.
TRAVERSAL_NAME = "../../../../no-such-dir-hackinterview-test/evil.pdf"


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(resume_routes.router)
    return TestClient(app)


@pytest.fixture
def captured_paths(monkeypatch):
    paths = []

    def fake_extract(file_path):
        paths.append(file_path)
        return "resume text"

    monkeypatch.setattr(ResumeParserService, "extract_text_from_pdf", staticmethod(fake_extract))
    return paths


def test_upload_filename_cannot_choose_the_save_path(client, captured_paths):
    res = client.post("/api/parse-resume", files={"file": (TRAVERSAL_NAME, b"%PDF-1.4", "application/pdf")})

    assert res.status_code == 200
    saved_path = captured_paths[0]
    assert os.path.dirname(os.path.realpath(saved_path)) == os.path.realpath(tempfile.gettempdir())
    assert "evil" not in os.path.basename(saved_path)
    assert not os.path.exists(saved_path)  # temp file is cleaned up


def test_unsupported_file_type_is_rejected(client, captured_paths):
    res = client.post("/api/parse-resume", files={"file": ("resume.exe", b"MZ", "application/octet-stream")})

    assert res.status_code == 400
    assert captured_paths == []
