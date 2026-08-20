import pytest
from backend.workers.import_worker import CLAIM_NEXT_JOB_SQL


def test_claim_job_sql_uses_skip_locked():
    sql = CLAIM_NEXT_JOB_SQL.lower()
    assert "for update skip locked" in sql
    assert "update private.processing_jobs" in sql
    assert "status = 'processing'" in sql
