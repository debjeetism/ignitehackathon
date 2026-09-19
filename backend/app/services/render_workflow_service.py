"""Optional Render Workflow client for long-running ingestion jobs."""
from typing import Any, Dict, List

from app.core.config import settings
from app.core.logging import logger


class RenderWorkflowService:
    def is_configured(self) -> bool:
        return bool(settings.RENDER_API_KEY and settings.RENDER_WORKFLOW_TASK_SLUG)

    async def start_ingestion(self, filename: str, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.is_configured():
            raise RuntimeError("Render Workflow is not configured")
        try:
            from render import RenderAsync

            client = RenderAsync(token=settings.RENDER_API_KEY)
            run = await client.workflows.start_task(
                settings.RENDER_WORKFLOW_TASK_SLUG,
                {"filename": filename, "rows": rows},
            )
            logger.info("Render ingestion workflow started: run_id=%s", run.id)
            return {"run_id": run.id, "status": self._status(run.status), "task_slug": settings.RENDER_WORKFLOW_TASK_SLUG}
        except Exception as error:
            logger.warning("Render ingestion workflow unavailable: reason=%s", type(error).__name__)
            raise RuntimeError("Unable to start Render Workflow") from error

    async def get_status(self, run_id: str) -> Dict[str, Any]:
        if not self.is_configured():
            raise RuntimeError("Render Workflow is not configured")
        try:
            from render import RenderAsync

            client = RenderAsync(token=settings.RENDER_API_KEY)
            run = await client.workflows.get_task_run(run_id)
            status = self._status(run.status)
            result = run.results[0] if status == "completed" and run.results else None
            return {
                "run_id": run.id,
                "status": status,
                "task_slug": settings.RENDER_WORKFLOW_TASK_SLUG,
                "result": result,
                "error": getattr(run, "error", None),
            }
        except Exception as error:
            logger.warning("Render ingestion workflow status unavailable: run_id=%s reason=%s", run_id, type(error).__name__)
            raise RuntimeError("Unable to read Render Workflow status") from error

    @staticmethod
    def _status(value: Any) -> str:
        return getattr(value, "value", str(value))


render_workflow_service = RenderWorkflowService()