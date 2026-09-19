"""Durable local persistence for the latest incident and communications transcript."""
import json
import sqlite3
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.models.schemas import AgentMessage, AnalysisResponse, IncidentEvent, SimulatedAction


class PersistenceService:
    def __init__(self):
        self.database_path = Path(settings.IGNITE_STATE_DB)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self):
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self):
        with self._connect() as connection:
            connection.execute(
                """CREATE TABLE IF NOT EXISTS app_state (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )"""
            )

    def save_analysis(self, analysis: AnalysisResponse):
        self._save("analysis", analysis.model_dump(mode="json"))
        history = self._get("analysis_history") or []
        history.append(analysis.model_dump(mode="json"))
        self._save("analysis_history", history[-20:])

    def get_analysis(self) -> Optional[AnalysisResponse]:
        value = self._get("analysis")
        return AnalysisResponse.model_validate(value) if value else None

    def save_chat(self, messages: list[AgentMessage]):
        self._save("chat", [message.model_dump(mode="json") for message in messages])

    def get_chat(self) -> list[AgentMessage]:
        value = self._get("chat") or []
        return [AgentMessage.model_validate(message) for message in value]

    def clear_chat(self):
        with self._connect() as connection:
            connection.execute("DELETE FROM app_state WHERE key = ?", ("chat",))

    def save_event(self, event: IncidentEvent):
        events = self._get("events") or []
        events.append(event.model_dump(mode="json"))
        self._save("events", events[-100:])

    def get_events(self, incident_id: Optional[str] = None):
        events = [IncidentEvent.model_validate(item) for item in (self._get("events") or [])]
        return [event for event in events if not incident_id or event.incident_id == incident_id]

    def save_action(self, action: SimulatedAction):
        actions = self._get("actions") or []
        actions.append(action.model_dump(mode="json"))
        self._save("actions", actions[-100:])

    def get_actions(self, incident_id: Optional[str] = None):
        actions = [SimulatedAction.model_validate(item) for item in (self._get("actions") or [])]
        return [action for action in actions if not incident_id or action.incident_id == incident_id]

    def get_state(self):
        analysis = self.get_analysis()
        return {
            "analysis": analysis.model_dump(mode="json") if analysis else None,
            "messages": [message.model_dump(mode="json") for message in self.get_chat()],
            "events": [event.model_dump(mode="json") for event in self.get_events()],
            "actions": [action.model_dump(mode="json") for action in self.get_actions()],
        }

    def _save(self, key: str, value):
        encoded = json.dumps(value, separators=(",", ":"))
        with self._connect() as connection:
            connection.execute(
                """INSERT INTO app_state(key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at""",
                (key, encoded),
            )

    def _get(self, key: str):
        with self._connect() as connection:
            row = connection.execute("SELECT value FROM app_state WHERE key = ?", (key,)).fetchone()
        return json.loads(row["value"]) if row else None


persistence_service = PersistenceService()
