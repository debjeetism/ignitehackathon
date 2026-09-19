"""Pydantic contracts for the traceability war room."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"


class AnalysisRequest(BaseModel):
    query: str = Field(..., min_length=10, max_length=5000)
    include_graph: bool = True
    include_search: bool = True
    batch_id: Optional[str] = Field(default=None, max_length=200)
    supplier_id: Optional[str] = Field(default=None, max_length=200)
    region_filter: Optional[str] = Field(default=None, max_length=100)


class GraphNode(BaseModel):
    id: str
    label: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphData(BaseModel):
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)


class SearchResult(BaseModel):
    title: str
    url: str
    content: str = ""
    score: float = 0.0


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    max_results: int = Field(default=5, ge=1, le=20)
    search_depth: str = Field(default="basic", pattern="^(basic|advanced|fast|ultra-fast)$")
    include_domains: List[str] = Field(default_factory=list)


class BlastRadius(BaseModel):
    tainted_batch_id: Optional[str] = None
    source_supplier: Optional[str] = None
    affected_kitchens: List[str] = Field(default_factory=list)
    disabled_dishes: List[str] = Field(default_factory=list)
    total_risk_score: float = Field(default=0, ge=0, le=100)
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    traced_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnalysisResponse(BaseModel):
    summary: str
    query: str
    incident_id: str = "incident-local"
    graph_data: GraphData = Field(default_factory=GraphData)
    blast_radius: BlastRadius = Field(default_factory=BlastRadius)
    search_results: List[SearchResult] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    provider_status: Dict[str, str] = Field(default_factory=dict)
    provenance: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IncidentEvent(BaseModel):
    incident_id: str
    event: str
    message: str
    source: str = "system"
    status: str = "info"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SimulatedActionRequest(BaseModel):
    action: str = Field(..., pattern="^(menu_disable|supplier_hold|kitchen_quarantine)$")
    confirmed: bool = False
    actor: str = Field(default="demo-operator", min_length=1, max_length=100)


class SimulatedAction(BaseModel):
    incident_id: str
    action: str
    target: str
    actor: str
    status: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReplacementSuggestion(BaseModel):
    batch_id: str
    batch_number: str
    ingredient: str
    supplier: str
    status: str
    delivered_regions: List[str] = Field(default_factory=list)
    freshness: Optional[str] = None


class GraphQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    incident_query: str = Field(..., min_length=10, max_length=5000)


class IngestionPreview(BaseModel):
    filename: str
    row_count: int
    valid_rows: int
    rejected_rows: int
    columns: List[str] = Field(default_factory=list)
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class IngestionResult(IngestionPreview):
    imported: bool = False
    created_relationships: int = 0


class WorkflowRun(BaseModel):
    run_id: str
    status: str
    task_slug: str
    result: Optional[Any] = None
    error: Optional[str] = None


class WorkflowAvailability(BaseModel):
    enabled: bool
    task_slug: Optional[str] = None


class AgentMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatContext(BaseModel):
    incident_id: Optional[str] = None
    query: Optional[str] = None
    graph_verified: bool = False
    tainted_batch_id: Optional[str] = None
    source_supplier: Optional[str] = None
    affected_kitchens: List[str] = Field(default_factory=list)
    disabled_dishes: List[str] = Field(default_factory=list)
    total_risk_score: float = Field(default=0, ge=0, le=100)


class ChatRequest(BaseModel):
    messages: List[AgentMessage]
    stream: bool = True
    context: Optional[ChatContext] = None


class EntityRelation(BaseModel):
    source_id: str
    target_id: str
    relation_type: str
    strength: float = Field(ge=0.0, le=1.0)
    properties: Dict[str, Any] = Field(default_factory=dict)
