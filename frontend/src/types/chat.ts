/**
 * Shared Chat & RAG Types
 */

export interface CitationSource {
  document_id: string;
  document_name: string;
  page_number: number;
  section: string;
  chunk_id: string;
  evidence: string;
  bbox?: number[];
}

export interface RetrievalStats {
  total_chunks: number;
  retrieved_chunks: number;
  reranked_chunks: number;
  used_chunks: number;
  query_type: string;
  methods: string[];
}

export interface UsageStats {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
}

export interface UsedChunkDetail {
  chunk_id: string;
  document_name: string;
  page_number: number;
  section: string;
  score: number;
  text_snippet: string;
  bbox?: number[];
}

export interface ChatResponse {
  query: string;
  answer: string;
  sources: (CitationSource | string)[];
  retrieval?: RetrievalStats;
  usage?: UsageStats;
  used_chunks_detail?: UsedChunkDetail[];
  provider?: string;
  fallback_used?: boolean;
  conversation_id?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'ai';
  text: string;
  image?: string;
  mode?: string;
  provider?: string;
  sources?: (CitationSource | string)[];
  retrieval?: RetrievalStats;
  usage?: UsageStats;
  used_chunks_detail?: UsedChunkDetail[];
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  active_file?: string;
  mode: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  messages?: ConversationMessage[];
}
