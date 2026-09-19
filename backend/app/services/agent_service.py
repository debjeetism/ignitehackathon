"""LangChain agent service for AI orchestration."""
from typing import AsyncGenerator, List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import AgentMessage, ChatContext


class AgentService:
    """Service for LangChain agent operations."""
    
    def __init__(self):
        self.llm = None
        if settings.OPENAI_API_KEY:
            # Build kwargs dynamically
            kwargs = {
                "model": settings.OPENAI_MODEL,
                "api_key": settings.OPENAI_API_KEY,
                "streaming": True,
            }
            # Add custom base URL if provided
            if settings.OPENAI_BASE_URL:
                kwargs["base_url"] = settings.OPENAI_BASE_URL
            
            self.llm = ChatOpenAI(**kwargs)
    
    def is_ready(self) -> bool:
        """Check if agent is configured."""
        return self.llm is not None

    @staticmethod
    def _content_text(content: Any) -> str:
        """Normalize LangChain string or content-block responses."""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in content
            )
        return str(content)
    
    async def chat(
        self,
        messages: List[AgentMessage],
        system_prompt: str = None,
        context: ChatContext = None,
    ) -> str:
        """Get chat response from agent."""
        if not self.llm:
            return "Agent not configured. Please set OPENAI_API_KEY."
        
        langchain_messages = []
        
        prompt = self._chat_context_prompt(context)
        if system_prompt or prompt:
            langchain_messages.append(SystemMessage(content="\n\n".join(filter(None, [system_prompt, prompt]))))
        
        for msg in messages:
            if msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                langchain_messages.append(AIMessage(content=msg.content))
        
        try:
            response = await self.llm.ainvoke(langchain_messages)
            return self._content_text(response.content)
        except Exception:
            logger.exception("Agent chat error")
            return "The agent could not complete the request. Please try again."
    
    async def stream_chat(
        self,
        messages: List[AgentMessage],
        system_prompt: str = None,
        context: ChatContext = None,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response from agent."""
        if not self.llm:
            yield "Agent not configured. Please set OPENAI_API_KEY."
            return
        
        langchain_messages = []
        
        prompt = self._chat_context_prompt(context)
        if system_prompt or prompt:
            langchain_messages.append(SystemMessage(content="\n\n".join(filter(None, [system_prompt, prompt]))))
        
        for msg in messages:
            if msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                langchain_messages.append(AIMessage(content=msg.content))
        
        try:
            async for chunk in self.llm.astream(langchain_messages):
                if chunk.content:
                    yield chunk.content
        except Exception:
            logger.exception("Agent streaming error")
            yield "The agent could not complete the request. Please try again."

    @staticmethod
    def _chat_context_prompt(context: ChatContext = None) -> str:
        if not context:
            return ""
        fact_status = "verified graph facts" if context.graph_verified else "incident context that has not been reverified by the graph"
        return f"""You are the Communications Officer for a food traceability incident.
    Use the {fact_status} below for batch, supplier, kitchen, dish, and risk details. Do not claim you lack context when these facts answer the question. Do not invent entities or counts. If a requested fact is absent, say that it is not present in the verified trace.

Verified investigator facts:
- Incident: {context.incident_id or 'not provided'}
- Incident report: {context.query or 'not provided'}
- Contaminated batch: {context.tainted_batch_id or 'not identified'}
- Supplier: {context.source_supplier or 'not identified'}
- Affected kitchens: {', '.join(context.affected_kitchens) or 'none returned'}
- Dishes for review: {', '.join(context.disabled_dishes) or 'none returned'}
- Trace risk score: {context.total_risk_score}%

Treat menu changes, payment holds, and merchant actions as simulations requiring confirmation."""
    
    async def analyze_with_context(
        self,
        query: str,
        search_context: str = "",
        graph_context: str = ""
    ) -> str:
        """Analyze query with search and graph context."""
        if not self.llm:
            return "Agent not configured."
        
        prompt = f"""Analyze the following query using the provided context.

Query: {query}

Web Search Context:
{search_context}

Graph Database Context:
{graph_context}

Graph interpretation rules:
- Affected kitchens are locations that received the contaminated batch and require investigation or quarantine.
- Dishes for removal are only dishes explicitly linked to that batch in the graph.
- Never classify every dish prepared by an affected kitchen as contaminated without an explicit batch-to-dish link.
- Do not invent health outcomes, recall classifications, contamination causes, or counts beyond the verified graph facts and clearly labeled external evidence.

Provide a comprehensive analysis that synthesizes all available information and clearly distinguishes confirmed dish impact from kitchen-level investigation."""
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            return self._content_text(response.content)
        except Exception:
            logger.exception("Agent analysis error")
            return "The analysis could not be completed. Please try again."


agent_service = AgentService()
