import { InteractiveQuizQuestion } from '../lib/api';

/**
 * 10 Canonical, high-yield examination questions on AI, Deep Learning,
 * Transformers, NLP, and Retrieval-Augmented Generation (RAG).
 */
export const SAMPLE_QUIZ_QUESTIONS: InteractiveQuizQuestion[] = [
  {
    id: 1,
    subtitle: 'Attention Mechanisms & Transformers',
    question:
      'In the standard Transformer architecture (Vaswani et al., 2017), what is the computational complexity of the scaled dot-product self-attention mechanism with respect to sequence length n?',
    options: [
      'O(n) linear complexity',
      'O(n²) quadratic complexity',
      'O(n log n) quasilinear complexity',
      'O(1) constant complexity',
    ],
    correctAnswerIndex: 1,
    marks: 1,
    explanation:
      'Standard self-attention computes an n × n attention matrix comparing every token against every other token, resulting in O(n²) time and memory complexity with sequence length n.',
  },
  {
    id: 2,
    subtitle: 'RAG & Neural Reranking',
    question:
      'Why are Cross-Encoder rerankers typically used as a second stage after Bi-Encoder vector retrieval rather than replacing the initial retrieval stage entirely?',
    options: [
      'Cross-Encoders cannot compute semantic similarity scores',
      'Bi-Encoders produce superior quality rankings but require pre-filtering',
      'Cross-Encoders attend across query and candidate tokens jointly, yielding higher precision but too computationally expensive for million-scale searches',
      'Bi-Encoders require GPU hardware while Cross-Encoders can only execute on CPU',
    ],
    correctAnswerIndex: 2,
    marks: 1,
    explanation:
      'Bi-encoders encode queries and documents independently for fast ANN vector search via pre-computed embeddings. Cross-encoders process query and candidate jointly with full cross-attention, which provides superior scoring precision but is computationally prohibitive across millions of documents.',
  },
  {
    id: 3,
    subtitle: 'Neural Network Regularization',
    question:
      'Which regularization technique randomly sets a fraction of neuron activations to 0 at each training step to prevent complex co-adaptation of feature detectors?',
    options: [
      'Batch Normalization',
      'Gradient Clipping',
      'Dropout',
      'Label Smoothing',
    ],
    correctAnswerIndex: 2,
    marks: 1,
    explanation:
      'Dropout randomly zeroes out activations during forward training passes with probability p, preventing interdependent co-adaptations and behaving like an ensemble of thinned sub-networks.',
  },
  {
    id: 4,
    subtitle: 'Vector Semantics & Distance Metrics',
    question:
      'When dense vector embeddings are normalized to unit Euclidean length (L2 norm = 1), cosine similarity between vectors u and v is algebraically identical to which operation?',
    options: [
      'Euclidean distance divided by 2',
      'The standard dot product (u · v)',
      'The Manhattan L1 norm (|u - v|)',
      'The Jaccard index of their token sets',
    ],
    correctAnswerIndex: 1,
    marks: 1,
    explanation:
      'Cosine similarity is defined as (u · v) / (||u|| * ||v||). When vectors are unit-normalized (||u|| = ||v|| = 1), the denominator equals 1, making cosine similarity directly equal to the dot product.',
  },
  {
    id: 5,
    subtitle: 'Domain-Specific Foundation Models',
    question:
      'How was BioBERT (Lee et al.) initialized and trained compared to the original general-domain BERT model?',
    options: [
      'Trained from scratch purely on Wikipedia and BookCorpus',
      'Initialized from general BERT weights and continuously pre-trained on PubMed biomedical abstracts and PMC full-text articles',
      'Trained exclusively using rule-based medical ontologies without neural weights',
      'Trained with recurrent LSTM memory cells on clinical notes',
    ],
    correctAnswerIndex: 1,
    marks: 1,
    explanation:
      'BioBERT takes pre-trained general BERT checkpoints and performs domain-specific continuous masked language model pre-training on PubMed biomedical abstracts and PMC full-text articles.',
  },
  {
    id: 6,
    subtitle: 'Autoregressive LLM Decoding',
    question:
      'What effect does setting temperature T close to 0 have on the softmax probability distribution during LLM next-token generation?',
    options: [
      'It flattens the distribution toward equal uniform probabilities for all vocabulary tokens',
      'It causes the model to sample tokens purely at random',
      'It sharpens the distribution, collapsing it toward greedy deterministic argmax token selection',
      'It disables the attention layers and halts token generation',
    ],
    correctAnswerIndex: 2,
    marks: 1,
    explanation:
      'Dividing logits by temperature T scales differences; as T approaches 0, the logit for the top token exponentially dominates the softmax distribution, yielding deterministic greedy decoding.',
  },
  {
    id: 7,
    subtitle: 'Deep Learning Optimization',
    question:
      'Why did deep neural networks using standard Sigmoid activation functions frequently suffer from the vanishing gradient problem during backpropagation?',
    options: [
      'The derivative of the standard Sigmoid function peaks at only 0.25, causing error signals to exponentially diminish across successive layers',
      'Sigmoid outputs are unbounded, leading to arithmetic overflow',
      'Sigmoid derivatives equal zero for all non-negative inputs',
      'Sigmoid prevents weights from being updated by using non-differentiable step functions',
    ],
    correctAnswerIndex: 0,
    marks: 1,
    explanation:
      'The derivative of the logistic sigmoid σ(z) is σ(z)(1 - σ(z)), which has a maximum value of 0.25. Repeatedly multiplying gradients by values ≤ 0.25 across many layers causes the error gradient to vanish toward zero.',
  },
  {
    id: 8,
    subtitle: 'RAG Document Ingestion & Chunking',
    question:
      'Why is semantic chunking with overlapping boundaries (e.g., 500 tokens with 50-token overlap) widely preferred over naive fixed-character splitting without overlap?',
    options: [
      'Overlap guarantees that vector indexes require zero memory',
      'Overlap prevents critical contextual meaning and entity references from being severed across arbitrary boundary splits',
      'Overlap forces the retriever to return only duplicate passages',
      'Overlap eliminates the need for tokenizers or embeddings',
    ],
    correctAnswerIndex: 1,
    marks: 1,
    explanation:
      'Boundary overlap preserves sentence coherence and relational context across adjacent segments, ensuring that facts or entity mentions split near a boundary still retain complete context in at least one retrieved chunk.',
  },
  {
    id: 9,
    subtitle: 'Hybrid Search & Rank Fusion',
    question:
      'In hybrid retrieval systems combining sparse BM25 keyword search with dense vector search, what is the primary advantage of Reciprocal Rank Fusion (RRF)?',
    options: [
      'It compresses 1536-dimensional vectors into binary hashes',
      'It combines rank positions from multiple distinct retrieval algorithms into a unified score without requiring calibrated raw score normalization',
      'It translates foreign language documents into English',
      'It replaces the vector database with an SQL database',
    ],
    correctAnswerIndex: 1,
    marks: 1,
    explanation:
      'RRF calculates a unified rank score based on 1 / (k + rank_i) across different retrieval algorithms (dense vector + sparse BM25), providing a robust combination that does not suffer from incompatible raw score distributions.',
  },
  {
    id: 10,
    subtitle: 'LLM Faithfulness & Grounding',
    question:
      'Which architectural constraint in modern RAG systems most effectively minimizes parametric hallucination in scientific question answering?',
    options: [
      'Increasing the generation temperature to 1.5',
      'Omitting source document citations from the prompt to avoid bias',
      'Constraining the generation prompt to strict evidence extraction with verbatim source attribution and explicit "not found" refusal thresholds',
      'Using smaller 100M parameter models without fine-tuning',
    ],
    correctAnswerIndex: 2,
    marks: 1,
    explanation:
      'System instructions that strictly ground the generation within retrieved context snippets, enforce verbatim citation attribution, and set a relevance cutoff threshold prevent the model from relying on noisy internal parametric priors when evidence is missing.',
  },
];

/**
 * Robust Fisher-Yates shuffle that randomizes the question sequence for each attempt
 * while preserving the correct answer index of each individual question.
 */
export function shuffleQuestions(questions: InteractiveQuizQuestion[]): InteractiveQuizQuestion[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
