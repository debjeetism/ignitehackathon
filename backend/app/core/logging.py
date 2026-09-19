"""Central logging configuration for the Ignite Agent backend."""
import logging
import logging.config
from pathlib import Path


LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def configure_logging(data_dir: str) -> Path:
    """Configure console and file logging, returning the log directory."""
    log_dir = Path(data_dir).expanduser() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "ignite-agent.log"

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {"format": LOG_FORMAT},
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "stream": "ext://sys.stdout",
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "default",
                "filename": str(log_file),
                "maxBytes": 5_000_000,
                "backupCount": 3,
                "encoding": "utf-8",
            },
        },
        "root": {
            "level": "INFO",
            "handlers": ["console", "file"],
        },
    })
    return log_dir


logger = logging.getLogger("ignite_agent")
