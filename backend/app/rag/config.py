"""
Centralized Configuration Loader for ResearchMind AI RAG Pipeline.
Loads settings from config.yaml with environment variable overrides and sensible fallbacks.
"""

import os
from pathlib import Path
from typing import Dict, Any
import yaml

# Search locations for config.yaml
CONFIG_SEARCH_PATHS = [
    Path(__file__).resolve().parents[3] / "config.yaml",  # Research mind ai10/config.yaml
    Path(__file__).resolve().parents[2] / "config.yaml",  # backend/config.yaml
    Path.cwd() / "config.yaml",
]

_DEFAULT_CONFIG: Dict[str, Any] = {
    "chunking": {
        "target_tokens": 600,
        "min_tokens": 200,
        "max_tokens": 800,
        "overlap_percentage": 0.12,
        "split_on_headings": True,
        "split_on_paragraphs": True,
        "prefix_context": True,
    },
    "retrieval": {
        "top_k_candidates": 25,
        "dense_weight": 1.0,
        "bm25_weight": 1.0,
        "rrf_k": 60.0,
    },
    "diversity": {
        "max_chunks_per_page": 2,
        "final_context_min": 5,
        "final_context_max": 8,
        "mmr_lambda": 0.7,
    },
    "reranker": {
        "enabled": True,
        "model_type": "bge-reranker",
        "model_name": "ms-marco-MiniLM-L-12-v2",
        "cohere_model": "rerank-v3.5",
        "min_relevance_score": 0.15,
    },
    "query_understanding": {
        "history_rewriting": True,
        "acronym_expansion": True,
        "num_query_variants": 3,
        "vague_routing_enabled": True,
    },
    "indexing_extras": {
        "document_summary_enabled": True,
        "section_summary_enabled": True,
        "acronym_glossary_file": "data/glossary.json",
    },
    "generation": {
        "prompt_template_file": "PROMPT.md",
        "min_relevance_threshold": 0.15,
        "strict_missing_phrase": "I couldn't find this in the provided documents.",
    }
}

_LOADED_CONFIG: Dict[str, Any] = {}


def load_rag_config() -> Dict[str, Any]:
    global _LOADED_CONFIG
    if _LOADED_CONFIG:
        return _LOADED_CONFIG

    cfg = dict(_DEFAULT_CONFIG)
    for p in CONFIG_SEARCH_PATHS:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    file_data = yaml.safe_load(f)
                    if isinstance(file_data, dict):
                        for k, v in file_data.items():
                            if isinstance(v, dict) and k in cfg:
                                cfg[k].update(v)
                            else:
                                cfg[k] = v
                break
            except Exception:
                pass

    # Optional environment variable overrides
    if os.getenv("TOP_K_RETRIEVAL"):
        cfg["retrieval"]["top_k_candidates"] = int(os.getenv("TOP_K_RETRIEVAL"))
    if os.getenv("TOP_K_RERANK"):
        cfg["diversity"]["final_context_max"] = int(os.getenv("TOP_K_RERANK"))
    if os.getenv("MIN_RELEVANCE_SCORE"):
        cfg["reranker"]["min_relevance_score"] = float(os.getenv("MIN_RELEVANCE_SCORE"))

    _LOADED_CONFIG = cfg
    return _LOADED_CONFIG


def get_config_section(section: str) -> Dict[str, Any]:
    cfg = load_rag_config()
    return cfg.get(section, _DEFAULT_CONFIG.get(section, {}))
