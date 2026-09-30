"""Tests for database URL handling in database.py."""
from sqlalchemy.engine import make_url

from database import DATABASE_URL, SYNC_DATABASE_URL


def test_sync_url_uses_the_installed_psycopg2_driver():
    # Alembic runs synchronously with this URL; psycopg2-binary is the sync
    # driver in requirements.txt, so it must be named explicitly.
    assert make_url(SYNC_DATABASE_URL).drivername == "postgresql+psycopg2"


def test_sync_url_points_at_the_same_database():
    sync, async_ = make_url(SYNC_DATABASE_URL), make_url(DATABASE_URL)
    assert (sync.host, sync.port, sync.database) == (async_.host, async_.port, async_.database)
