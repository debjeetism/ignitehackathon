"""Tavily search service wrapper."""
import asyncio
from typing import List
from tavily import TavilyClient
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import SearchResult


class TavilyService:
    """Service for Tavily web search operations."""
    
    def __init__(self):
        self.client = None
        if settings.TAVILY_API_KEY:
            self.client = TavilyClient(api_key=settings.TAVILY_API_KEY)

    def is_ready(self) -> bool:
        """Return whether the Tavily client is configured."""
        return self.client is not None
    
    async def search(
        self,
        query: str,
        max_results: int = 5,
        search_depth: str = "basic",
        include_domains: List[str] = None
    ) -> List[SearchResult]:
        """Execute Tavily search and return formatted results."""
        if not self.client or not query.strip():
            return []

        try:
            response = await asyncio.to_thread(
                self.client.search,
                query=query.strip(),
                max_results=max(1, min(max_results, 20)),
                search_depth=search_depth,
                include_domains=include_domains or [],
            )
            
            results = []
            for result in response.get("results", []):
                results.append(SearchResult(
                    title=result.get("title", ""),
                    url=result.get("url", ""),
                    content=result.get("content", ""),
                    score=result.get("score", 0.0)
                ))
            
            return results
        except Exception:
            logger.exception("Tavily search error")
            return []
    
    async def get_context(self, query: str, max_tokens: int = 4000) -> str:
        """Get search context as formatted text for LLM."""
        if not self.client or not query.strip():
            return ""

        try:
            context = await asyncio.to_thread(
                self.client.get_search_context,
                query=query.strip(),
                max_tokens=max(256, min(max_tokens, 8000)),
            )
            return context
        except Exception:
            logger.exception("Tavily context error")
            return ""


tavily_service = TavilyService()
