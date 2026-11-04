"""
ResearchMind AI — Centralized Structured Logging Configuration
==============================================================
"""

import logging
import os
import sys

def configure_logging(level: str = None) -> None:
    """Configures root and application loggers."""
    log_level_str = level or os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True
    )

def get_logger(name: str) -> logging.Logger:
    """Returns a named logger."""
    return logging.getLogger(name)
