"""
ResearchMind AI — Database Connection & Schema Management
=========================================================
Manages SQLite connection lifecycle, WAL mode, foreign keys, and DDL schema.
"""

import sqlite3
from pathlib import Path
from typing import Generator
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("researchmind.infrastructure.database")


class DatabaseManager:
    """Manages SQLite connections and schema initialization."""

    def __init__(self, db_path: Path = None):
        self.db_path = db_path or settings.DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def get_connection(self) -> sqlite3.Connection:
        """Creates and configures an ACID-compliant connection."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def init_schema(self) -> None:
        """Idempotently initializes all application tables and indexes."""
        with self.get_connection() as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                active_file TEXT,
                mode TEXT DEFAULT 'strict',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                text TEXT NOT NULL,
                image TEXT,
                mode TEXT DEFAULT 'strict',
                provider TEXT,
                sources_json TEXT,
                retrieval_json TEXT,
                usage_json TEXT,
                used_chunks_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at ASC);
            CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);

            CREATE TABLE IF NOT EXISTS summaries (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                document_name TEXT NOT NULL,
                summary TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_summaries_user ON summaries(user_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS comparisons (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                document_names_json TEXT NOT NULL,
                comparison TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_comparisons_user ON comparisons(user_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS presentations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                source_document_id TEXT,
                num_slides INTEGER DEFAULT 8,
                filename TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_presentations_user ON presentations(user_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS literature_reviews (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                document_names_json TEXT NOT NULL,
                review TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_literature_user ON literature_reviews(user_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                reference_id TEXT,
                metadata_json TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS document_terminology (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                term TEXT NOT NULL,
                expanded_term TEXT NOT NULL,
                page_number INTEGER DEFAULT 1,
                chunk_id TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_terminology_user_doc ON document_terminology(user_id, document_id);
            CREATE INDEX IF NOT EXISTS idx_terminology_terms ON document_terminology(user_id, term, expanded_term);

            CREATE TABLE IF NOT EXISTS user_settings (
                user_id TEXT PRIMARY KEY,
                theme TEXT DEFAULT 'dark',
                response_style TEXT DEFAULT 'detailed',
                default_mode TEXT DEFAULT 'strict',
                citation_display TEXT DEFAULT 'inline',
                notifications INTEGER DEFAULT 1,
                auto_save INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS saved_answers (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                conversation_id TEXT,
                message_id TEXT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                sources_json TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_saved_answers_user ON saved_answers(user_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS quiz_submissions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                percentage REAL NOT NULL,
                passed INTEGER NOT NULL,
                topic TEXT,
                time_spent_seconds INTEGER DEFAULT 0,
                answers_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user ON quiz_submissions(user_id, created_at DESC);
            """)
            conn.commit()


# Default singleton instance
db_manager = DatabaseManager()
