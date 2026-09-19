"""Neo4j operations for bounded, authoritative contamination tracing."""
import re
from typing import Any, Dict, List, Optional
from neo4j import Driver, GraphDatabase
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import BlastRadius, GraphData, GraphEdge, GraphNode, ReplacementSuggestion


class GraphService:
    IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
    TRACE_QUERY = """
        MATCH (supplier:Supplier)-[:SUPPLIES]->(batch:Batch)-[:DELIVERED_TO]->(kitchen:Kitchen)
        WHERE ($batch_id IS NOT NULL AND batch.id = $batch_id)
           OR ($supplier_id IS NOT NULL AND supplier.id = $supplier_id)
           OR ($batch_id IS NULL AND $supplier_id IS NULL AND batch.status = 'contaminated' AND (toLower(batch.batchNumber) CONTAINS $term OR toLower(batch.ingredient) CONTAINS $term OR toLower(supplier.name) CONTAINS $term OR toLower(kitchen.city) CONTAINS $term))
        WITH supplier, batch, collect(DISTINCT kitchen) AS kitchens LIMIT $result_limit
        OPTIONAL MATCH (batch)-[:USED_IN]->(affectedDish:Dish)
        WITH supplier, batch, kitchens, collect(DISTINCT affectedDish) AS affectedDishes
        RETURN [{id: supplier.id, label: 'Supplier', properties: properties(supplier)}] +
            [{id: batch.id, label: 'Batch', properties: properties(batch)}] +
            [kitchen IN kitchens | {id: kitchen.id, label: 'Kitchen', properties: properties(kitchen)}] +
            [dish IN affectedDishes | {id: dish.id, label: 'Dish', properties: properties(dish)}] AS nodes,
            [{source: supplier.id, target: batch.id, type: 'SUPPLIES'}] +
            [kitchen IN kitchens | {source: batch.id, target: kitchen.id, type: 'DELIVERED_TO'}] +
            [dish IN affectedDishes | {source: batch.id, target: dish.id, type: 'USED_IN'}] AS edges,
            [kitchen IN kitchens | kitchen.name] AS kitchens,
            [dish IN affectedDishes | dish.name] AS dishes,
            batch.id AS batch_id, supplier.name AS supplier_name
    """

    def __init__(self):
        self.driver: Optional[Driver] = None
        if settings.NEO4J_PASSWORD:
            try:
                uri = settings.NEO4J_URI
                if settings.NEO4J_TRUST_ALL_CERTIFICATES:
                    uri = uri.replace("neo4j+s://", "neo4j+ssc://")
                    logger.warning("Neo4j TLS certificate verification is disabled")
                self.driver = GraphDatabase.driver(uri, auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD), connection_timeout=3.0)
            except Exception:
                logger.exception("Neo4j connection error")

    def close(self):
        if self.driver:
            self.driver.close()

    def is_connected(self) -> bool:
        if not self.driver:
            return False
        try:
            self.driver.verify_connectivity()
            return True
        except Exception:
            logger.warning("Neo4j connectivity check failed; continuing with provider-unavailable state")
            return False

    async def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None):
        if not self.driver:
            return []
        try:
            with self.driver.session(database=settings.NEO4J_DATABASE) as session:
                return [record.data() for record in session.run(query, parameters or {})]
        except Exception:
            logger.exception("Neo4j query error")
            return []

    async def execute_write(self, query: str, parameters: Optional[Dict[str, Any]] = None):
        if not self.driver:
            raise RuntimeError("Neo4j is unavailable")
        try:
            with self.driver.session(database=settings.NEO4J_DATABASE) as session:
                return [record.data() for record in session.run(query, parameters or {})]
        except Exception:
            logger.exception("Neo4j write error")
            raise

    @staticmethod
    def _incident_term(query_text: str) -> str:
        normalized = query_text.lower()
        for term in ("paneer", "noida", "gurugram", "delhi", "contaminated supplier"):
            if term in normalized:
                return term
        words = re.findall(r"[a-z0-9-]{4,}", normalized)
        return words[0] if words else normalized[:200]

    async def trace_contamination(self, query_text: str, batch_id: Optional[str] = None, supplier_id: Optional[str] = None, region_filter: Optional[str] = None) -> BlastRadius:
        term = self._incident_term(region_filter or query_text)
        rows = await self.execute_query(self.TRACE_QUERY, {"batch_id": batch_id, "supplier_id": supplier_id, "term": term, "result_limit": 200})
        if not rows:
            return BlastRadius()
        row = rows[0]
        nodes = [GraphNode(id=str(item["id"]), label=item["label"], properties=self._json_safe(item.get("properties", {}))) for item in row.get("nodes", [])]
        edges = [GraphEdge(source=str(item["source"]), target=str(item["target"]), type=item["type"]) for item in row.get("edges", [])]
        kitchens = [str(item) for item in row.get("kitchens", []) if item]
        dishes = [str(item) for item in row.get("dishes", []) if item]
        return BlastRadius(tainted_batch_id=row.get("batch_id"), source_supplier=row.get("supplier_name"), affected_kitchens=kitchens, disabled_dishes=dishes, total_risk_score=min(100.0, 35.0 + len(kitchens) * 12.0 + len(dishes) * 4.0), nodes=nodes, edges=edges)

    async def get_nodes_by_label(self, label: str, limit: int = 50) -> List[GraphNode]:
        limit = max(1, min(limit, 100))
        if label != "*":
            self._validate_identifier(label, "label")
        label_clause = f":`{label}`" if label != "*" else ""
        rows = await self.execute_query(f"MATCH (n{label_clause}) RETURN coalesce(n.id, n.name, elementId(n)) AS id, labels(n) AS labels, properties(n) AS properties LIMIT $limit", {"limit": limit})
        return [GraphNode(id=str(row["id"]), label=(row.get("labels") or ["Node"])[0], properties=self._json_safe(row.get("properties", {}))) for row in rows]

    async def get_graph_overview(self) -> GraphData:
        query = """
        MATCH (supplier:Supplier)-[:SUPPLIES]->(batch:Batch)-[:DELIVERED_TO]->(kitchen:Kitchen)-[:USED_IN]->(dish:Dish)
        WITH collect(DISTINCT supplier) + collect(DISTINCT batch) + collect(DISTINCT kitchen) + collect(DISTINCT dish) AS graph_nodes,
             collect(DISTINCT {source: supplier.id, target: batch.id, type: 'SUPPLIES'}) +
             collect(DISTINCT {source: batch.id, target: kitchen.id, type: 'DELIVERED_TO'}) +
             collect(DISTINCT {source: kitchen.id, target: dish.id, type: 'USED_IN'}) AS graph_edges
        RETURN [node IN graph_nodes | {id: coalesce(node.id, node.name, elementId(node)), label: coalesce(labels(node)[0], 'Node'), properties: properties(node)}] AS nodes,
               graph_edges AS edges
        """
        rows = await self.execute_query(query)
        if not rows:
            return GraphData()
        row = rows[0]
        nodes = [GraphNode(id=str(item["id"]), label=str(item["label"]), properties=self._json_safe(item.get("properties", {}))) for item in row.get("nodes", [])]
        edges = [GraphEdge(source=str(item["source"]), target=str(item["target"]), type=str(item["type"])) for item in row.get("edges", [])]
        return GraphData(nodes=nodes, edges=edges)

    async def get_replacements(self, ingredient: str, exclude_batch_id: Optional[str] = None) -> List[ReplacementSuggestion]:
        query = """
        MATCH (supplier:Supplier)-[:SUPPLIES]->(batch:Batch)
        WHERE batch.status = 'approved' AND toLower(batch.ingredient) = toLower($ingredient)
          AND ($exclude_batch_id IS NULL OR batch.id <> $exclude_batch_id)
        OPTIONAL MATCH (batch)-[:DELIVERED_TO]->(kitchen:Kitchen)
        RETURN batch.id AS batch_id, batch.batchNumber AS batch_number, batch.ingredient AS ingredient,
               supplier.name AS supplier, batch.status AS status, batch.receivedAt AS freshness,
               collect(DISTINCT kitchen.region) AS delivered_regions
        ORDER BY batch.receivedAt DESC LIMIT 2
        """
        rows = await self.execute_query(query, {"ingredient": ingredient, "exclude_batch_id": exclude_batch_id})
        return [ReplacementSuggestion(batch_id=str(row["batch_id"]), batch_number=str(row["batch_number"]), ingredient=str(row["ingredient"]), supplier=str(row["supplier"]), status=str(row["status"]), delivered_regions=[str(region) for region in row.get("delivered_regions", []) if region], freshness=row.get("freshness")) for row in rows]

    async def get_subgraph(self, node_id: str, depth: int = 2) -> GraphData:
        depth = max(1, min(depth, 3))
        rows = await self.execute_query(f"MATCH path=(n)-[*1..{depth}]-(m) WHERE n.id=$node_id OR n.name=$node_id RETURN [x IN nodes(path) | {{id: coalesce(x.id,x.name,elementId(x)), labels: labels(x), properties: properties(x)}}] AS path_nodes, [r IN relationships(path) | {{type: type(r), properties: properties(r)}}] AS path_relationships LIMIT 100", {"node_id": node_id})
        nodes: Dict[str, GraphNode] = {}
        edges: Dict[str, GraphEdge] = {}
        for row in rows:
            path_nodes = row.get("path_nodes", [])
            for item in path_nodes:
                item_id = str(item["id"])
                nodes[item_id] = GraphNode(id=item_id, label=(item.get("labels") or ["Node"])[0], properties=self._json_safe(item.get("properties", {})))
            for index, relation in enumerate(row.get("path_relationships", [])):
                if index + 1 < len(path_nodes):
                    source, target = str(path_nodes[index]["id"]), str(path_nodes[index + 1]["id"])
                    edge_type = str(relation.get("type", "RELATED_TO"))
                    edges[f"{source}:{edge_type}:{target}"] = GraphEdge(source=source, target=target, type=edge_type)
        return GraphData(nodes=list(nodes.values()), edges=list(edges.values()))

    @classmethod
    def _validate_identifier(cls, value: str, name: str):
        if not cls.IDENTIFIER_PATTERN.fullmatch(value):
            raise ValueError(f"Invalid Neo4j {name}")

    @staticmethod
    def _json_safe(value: Any):
        if isinstance(value, dict):
            return {key: GraphService._json_safe(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)):
            return [GraphService._json_safe(item) for item in value]
        if hasattr(value, "isoformat"):
            return value.isoformat()
        if hasattr(value, "tolist"):
            return GraphService._json_safe(value.tolist())
        return value


graph_service = GraphService()
