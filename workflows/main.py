"""Render Workflow tasks for asynchronous traceability ingestion."""
import asyncio
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from render import Retry, TaskContext, Workflows

from app.core.config import settings
from app.core.logging import configure_logging
from app.models.schemas import IngestionPreview
from app.services.graph_service import graph_service
from app.services.ingestion_service import import_rows


configure_logging(settings.IGNITE_DATA_DIR)
app = Workflows()


@app.task(
    name="ingest_traceability_rows",
    retry=Retry(max_retries=2, wait_duration_ms=2000, backoff_scaling=2),
    timeout_seconds=1800,
)
def ingest_traceability_rows(ctx: TaskContext, filename: str, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not rows:
        return {"filename": filename, "imported": False, "created_relationships": 0}
    preview = IngestionPreview(
        filename=filename,
        row_count=len(rows),
        valid_rows=len(rows),
        rejected_rows=0,
        columns=list(rows[0].keys()),
        rows=rows[:10],
    )
    result = asyncio.run(import_rows(graph_service, rows, preview))
    return result.model_dump(mode="json")


if __name__ == "__main__":
    app.start()