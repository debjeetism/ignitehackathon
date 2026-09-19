"""API routes for the food traceability war room."""
import asyncio
import hashlib
import json
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.models.schemas import AgentMessage, AnalysisRequest, AnalysisResponse, ChatContext, ChatRequest, GraphData, GraphNode, GraphQueryRequest, HealthResponse, IncidentEvent, IngestionResult, ReplacementSuggestion, SearchRequest, SearchResult, SimulatedAction, SimulatedActionRequest, WorkflowAvailability, WorkflowRun
from app.services.agent_service import agent_service
from app.services.cypher_guard import validate_read_query
from app.services.graph_service import graph_service
from app.services.ingestion_service import import_rows, parse_csv
from app.services.persistence_service import persistence_service
from app.services.render_workflow_service import render_workflow_service
from app.services.tavily_service import tavily_service

router = APIRouter(prefix="/api/v1")


async def _resolve_chat_context(context: ChatContext | None) -> ChatContext | None:
    if not context or not context.query or not graph_service.is_connected():
        return context
    blast_radius = await graph_service.trace_contamination(context.query, context.tainted_batch_id)
    return context.model_copy(update={
        "graph_verified": bool(blast_radius.nodes),
        "tainted_batch_id": blast_radius.tainted_batch_id,
        "source_supplier": blast_radius.source_supplier,
        "affected_kitchens": blast_radius.affected_kitchens,
        "disabled_dishes": blast_radius.disabled_dishes,
        "total_risk_score": blast_radius.total_risk_score,
    })


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", timestamp=datetime.now(timezone.utc))


@router.get("/state")
async def get_persistent_state():
    return persistence_service.get_state()


async def _parse_ingestion_file(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a UTF-8 .csv file")
    try:
        return parse_csv(file.filename, await file.read())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


async def _ingest_csv(file: UploadFile, commit: bool) -> IngestionResult:
    preview, rows = await _parse_ingestion_file(file)
    if not commit:
        return IngestionResult(**preview.model_dump(), imported=False)
    if not graph_service.is_connected():
        raise HTTPException(status_code=503, detail="Graph database unavailable")
    return await import_rows(graph_service, rows, preview)


@router.post("/ingestion/preview", response_model=IngestionResult)
async def preview_ingestion(file: UploadFile = File(...)):
    return await _ingest_csv(file, commit=False)


@router.post("/ingestion/import", response_model=IngestionResult)
async def import_ingestion(file: UploadFile = File(...)):
    return await _ingest_csv(file, commit=True)


@router.get("/ingestion/workflow", response_model=WorkflowAvailability)
async def workflow_availability():
    return WorkflowAvailability(
        enabled=render_workflow_service.is_configured(),
        task_slug=settings.RENDER_WORKFLOW_TASK_SLUG or None,
    )


@router.post("/ingestion/workflow/start", response_model=WorkflowRun)
async def start_ingestion_workflow(file: UploadFile = File(...)):
    if not render_workflow_service.is_configured():
        raise HTTPException(status_code=503, detail="Render Workflow is not configured")
    preview, rows = await _parse_ingestion_file(file)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV contains no valid rows")
    try:
        return await render_workflow_service.start_ingestion(preview.filename, rows)
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.get("/ingestion/workflow/{run_id}", response_model=WorkflowRun)
async def get_ingestion_workflow(run_id: str):
    if not render_workflow_service.is_configured():
        raise HTTPException(status_code=503, detail="Render Workflow is not configured")
    try:
        return await render_workflow_service.get_status(run_id)
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.delete("/state/chat")
async def clear_persistent_chat():
    persistence_service.clear_chat()
    return {"status": "cleared"}


async def _analyze(request: AnalysisRequest, notify=None):
    incident_id = "inc-" + hashlib.sha1(request.query.encode("utf-8")).hexdigest()[:12]
    provider_status = {
        "neo4j": "connected" if graph_service.is_connected() else "unavailable",
        "tavily": "configured" if tavily_service.is_ready() else "unavailable",
        "llm": "configured" if agent_service.is_ready() else "fallback",
    }

    async def record(event, details=None):
        persistence_service.save_event(event)
        if notify:
            await notify(event, details)

    await record(IncidentEvent(incident_id=incident_id, event="trace_started", message="Incident trace started", source="system", status="running"))
    blast_radius = await graph_service.trace_contamination(request.query, request.batch_id, request.supplier_id, request.region_filter) if request.include_graph else None
    if blast_radius is None:
        from app.models.schemas import BlastRadius
        blast_radius = BlastRadius()
    await record(
        IncidentEvent(incident_id=incident_id, event="graph_completed", message=f"Neo4j returned {len(blast_radius.affected_kitchens)} kitchens and {len(blast_radius.disabled_dishes)} confirmed dishes", source="Neo4j", status="success"),
        {"graph_data": {"nodes": [node.model_dump(mode="json") for node in blast_radius.nodes], "edges": [edge.model_dump(mode="json") for edge in blast_radius.edges]}, "blast_radius": blast_radius.model_dump(mode="json")},
    )

    search_results: List[SearchResult] = []
    if request.include_search:
        search_results = await tavily_service.search(f"{request.query} food safety recall Delhi NCR", max_results=5)
        await record(IncidentEvent(incident_id=incident_id, event="search_completed", message=f"Tavily returned {len(search_results)} contextual sources", source="Tavily", status="success" if tavily_service.is_ready() else "warning"))

    graph_context = f"Verified graph facts: batch={blast_radius.tainted_batch_id}, supplier={blast_radius.source_supplier}, kitchens={blast_radius.affected_kitchens}, dishes={blast_radius.disabled_dishes}, risk={blast_radius.total_risk_score}"
    search_context = "\n".join(f"{item.title}: {item.content}" for item in search_results)
    summary = await agent_service.analyze_with_context(request.query, search_context, graph_context)
    if not blast_radius.nodes:
        summary = "Graph trace unavailable: no verified connected path was returned. " + summary

    analysis = AnalysisResponse(
        incident_id=incident_id,
        summary=summary,
        query=request.query,
        graph_data=GraphData(nodes=blast_radius.nodes, edges=blast_radius.edges),
        blast_radius=blast_radius,
        search_results=search_results,
        sources=[item.url for item in search_results],
        recommended_actions=[
            "Isolate the flagged batch and verify receiving records.",
            "Review affected dishes before any menu change.",
            "Notify the affected kitchen cluster with the verified graph counts.",
        ],
        provider_status=provider_status,
        provenance={
            "graph_timestamp": blast_radius.traced_at,
            "graph_authoritative": True,
            "search_timestamp": datetime.now(timezone.utc) if request.include_search else None,
            "interpretation_source": "LLM" if agent_service.is_ready() else "deterministic fallback",
        },
    )
    persistence_service.save_analysis(analysis)
    await record(IncidentEvent(incident_id=incident_id, event="summary_ready", message="Investigator brief generated from graph facts and contextual evidence", source="LLM", status="success" if agent_service.is_ready() else "warning"))
    return analysis


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    return await _analyze(request)


@router.post("/analyze/stream")
async def analyze_stream(request: AnalysisRequest):
    async def event_generator():
        queue = []

        async def notify(event, details=None):
            queue.append((event, details or {}))

        task = asyncio.create_task(_analyze(request, notify))
        while not task.done() or queue:
            if queue:
                event, details = queue.pop(0)
                payload = {"event": event.event, "incident_id": event.incident_id, "message": event.message, "source": event.source, "status": event.status, "timestamp": event.timestamp.isoformat(), **details}
                yield f"data: {json.dumps(payload)}\n\n"
            else:
                await asyncio.sleep(0.05)
        analysis = await task
        yield f"data: {json.dumps({'event': 'analysis_ready', 'analysis': analysis.model_dump(mode='json')})}\n\n"
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/chat")
async def chat(request: ChatRequest):
    context = await _resolve_chat_context(request.context)
    response = await agent_service.chat(request.messages, context=context)
    persistence_service.save_chat(request.messages + [AgentMessage(role="assistant", content=response)])
    return {"response": response}


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    if not request.stream:
        return await chat(request)

    async def event_generator():
        context = await _resolve_chat_context(request.context)
        response_parts = []
        for event in ("trace_started", "entity_resolved"):
            yield f"data: {json.dumps({'event': event})}\n\n"
        async for chunk in agent_service.stream_chat(request.messages, context=context):
            response_parts.append(chunk)
            yield f"data: {json.dumps({'event': 'summary_ready', 'content': chunk})}\n\n"
        persistence_service.save_chat(request.messages + [AgentMessage(role="assistant", content="".join(response_parts))])
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/graph/nodes", response_model=List[GraphNode])
async def get_graph_nodes(label: str = "*", limit: int = 50):
    if not graph_service.is_connected():
        raise HTTPException(status_code=503, detail="Graph database unavailable")
    return await graph_service.get_nodes_by_label(label, limit)


@router.get("/graph/overview", response_model=GraphData)
async def get_graph_overview():
    if not graph_service.is_connected():
        raise HTTPException(status_code=503, detail="Graph database unavailable")
    return await graph_service.get_graph_overview()


@router.get("/graph/subgraph", response_model=GraphData)
async def get_subgraph(node_id: str, depth: int = 2):
    if not graph_service.is_connected():
        raise HTTPException(status_code=503, detail="Graph database unavailable")
    return await graph_service.get_subgraph(node_id, depth)


@router.post("/search")
async def search(request: SearchRequest):
    results = await tavily_service.search(request.query, request.max_results, request.search_depth, request.include_domains)
    return {"results": results, "provider_status": "configured" if tavily_service.is_ready() else "unavailable"}


@router.get("/incidents/{incident_id}/events", response_model=List[IncidentEvent])
async def get_incident_events(incident_id: str):
    return persistence_service.get_events(incident_id)


@router.get("/incidents/{incident_id}/alternatives", response_model=List[ReplacementSuggestion])
async def get_incident_alternatives(incident_id: str):
    analysis = persistence_service.get_analysis()
    if not analysis or analysis.incident_id != incident_id:
        return []
    ingredient = next((node.properties.get("ingredient") for node in analysis.graph_data.nodes if node.label == "Batch"), "Paneer")
    return await graph_service.get_replacements(ingredient, analysis.blast_radius.tainted_batch_id)


@router.post("/incidents/{incident_id}/actions", response_model=SimulatedAction)
async def create_simulated_action(incident_id: str, request: SimulatedActionRequest):
    if not request.confirmed:
        raise HTTPException(status_code=400, detail="Explicit confirmation is required for simulated actions")
    analysis = persistence_service.get_analysis()
    if not analysis or analysis.incident_id != incident_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    target = analysis.blast_radius.tainted_batch_id or "incident blast radius"
    action = SimulatedAction(incident_id=incident_id, action=request.action, target=target, actor=request.actor, status="simulated-confirmed")
    persistence_service.save_action(action)
    persistence_service.save_event(IncidentEvent(incident_id=incident_id, event="action_simulated", message=f"{request.action} confirmed for {target}", source="Simulation", status="success"))
    return action


@router.post("/graph/query", response_model=GraphData)
async def safe_graph_query(request: GraphQueryRequest):
    if not validate_read_query(request.query):
        persistence_service.save_event(IncidentEvent(incident_id="query-guard", event="query_rejected", message="Untrusted graph query rejected; server-owned trace used", source="Security", status="warning"))
    trace = await graph_service.trace_contamination(request.incident_query)
    return GraphData(nodes=trace.nodes, edges=trace.edges)
