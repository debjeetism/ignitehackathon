"""CSV ingestion boundary for operator-supplied traceability records."""
import csv
import io
import re
from typing import Any, Dict, List, Tuple

from app.core.logging import logger
from app.models.schemas import IngestionPreview, IngestionResult


REQUIRED_COLUMNS = ("supplier_name", "batch_number", "ingredient", "kitchen_id", "dish_name")
MAX_BYTES = 2_000_000
MAX_ROWS = 5_000


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _normalize_row(row: Dict[str, str], line_number: int) -> Tuple[Dict[str, Any] | None, str | None]:
    normalized = {key.strip().lower(): (value or "").strip() for key, value in row.items() if key}
    missing = [column for column in REQUIRED_COLUMNS if not normalized.get(column)]
    if missing:
        return None, f"Row {line_number}: missing {', '.join(missing)}"
    usage_type = normalized.get("usage_type", "confirmed").lower()
    if usage_type not in {"confirmed", "menu"}:
        return None, f"Row {line_number}: usage_type must be confirmed or menu"
    supplier_id = normalized.get("supplier_id") or f"supplier:{_slug(normalized['supplier_name'])}"
    batch_id = normalized.get("batch_id") or f"batch:{_slug(normalized['batch_number'])}"
    return {
        "supplier_id": supplier_id,
        "supplier_name": normalized["supplier_name"],
        "batch_id": batch_id,
        "batch_number": normalized["batch_number"],
        "ingredient": normalized["ingredient"],
        "kitchen_id": normalized["kitchen_id"],
        "kitchen_name": normalized.get("kitchen_name") or normalized["kitchen_id"],
        "city": normalized.get("city", ""),
        "region": normalized.get("region", "Delhi-NCR"),
        "dish_id": normalized.get("dish_id") or f"dish:{_slug(normalized['kitchen_id'])}-{_slug(normalized['dish_name'])}",
        "dish_name": normalized["dish_name"],
        "usage_type": usage_type,
        "status": normalized.get("batch_status", "approved"),
        "delivered_at": normalized.get("delivered_at", ""),
    }, None


def parse_csv(filename: str, content: bytes) -> Tuple[IngestionPreview, List[Dict[str, Any]]]:
    if len(content) > MAX_BYTES:
        raise ValueError("CSV file must be smaller than 2 MB")
    try:
        reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    except UnicodeDecodeError as error:
        raise ValueError("CSV must use UTF-8 encoding") from error
    columns = [column.strip().lower() for column in (reader.fieldnames or []) if column]
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in columns]
    if missing_columns:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing_columns)}")
    rows: List[Dict[str, Any]] = []
    errors: List[str] = []
    for line_number, row in enumerate(reader, start=2):
        if line_number > MAX_ROWS + 1:
            errors.append(f"Only the first {MAX_ROWS} rows were processed")
            break
        normalized, error = _normalize_row(row, line_number)
        if normalized:
            rows.append(normalized)
        elif error:
            errors.append(error)
    preview = IngestionPreview(filename=filename, row_count=len(rows) + len(errors), valid_rows=len(rows), rejected_rows=len(errors), columns=columns, rows=rows[:10], errors=errors[:20])
    return preview, rows


async def import_rows(graph_service, rows: List[Dict[str, Any]], preview: IngestionPreview) -> IngestionResult:
    if not rows:
        return IngestionResult(**preview.model_dump(), imported=False)
    query = """
    UNWIND $rows AS row
    MERGE (supplier:Supplier {id: row.supplier_id})
      ON CREATE SET supplier.name = row.supplier_name, supplier.region = row.region, supplier.status = 'active'
    MERGE (batch:Batch {id: row.batch_id})
      SET batch.batchNumber = row.batch_number, batch.ingredient = row.ingredient, batch.status = row.status,
          batch.supplierId = row.supplier_id
    MERGE (kitchen:Kitchen {id: row.kitchen_id})
      SET kitchen.name = row.kitchen_name, kitchen.city = row.city, kitchen.region = row.region
    MERGE (dish:Dish {id: row.dish_id})
      SET dish.name = row.dish_name
    MERGE (supplier)-[:SUPPLIES]->(batch)
    MERGE (batch)-[:DELIVERED_TO]->(kitchen)
    FOREACH (_ IN CASE WHEN row.usage_type = 'confirmed' THEN [1] ELSE [] END |
      MERGE (batch)-[:USED_IN]->(dish))
    FOREACH (_ IN CASE WHEN row.usage_type = 'menu' THEN [1] ELSE [] END |
      MERGE (kitchen)-[:USED_IN]->(dish))
    RETURN count(*) AS imported
    """
    result = await graph_service.execute_write(query, {"rows": rows})
    imported = int(result[0].get("imported", 0)) if result else 0
    logger.info("Traceability CSV import completed: filename=%s rows=%s", preview.filename, imported)
    return IngestionResult(**preview.model_dump(), imported=imported > 0, created_relationships=imported)