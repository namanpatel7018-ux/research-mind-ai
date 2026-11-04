"""
ResearchMind AI — Curated Sample Academic Quiz Questions
========================================================
Canonical questions covering Transformers, Attention, RAG, Regularization, and Metrics.
"""

from typing import List, Dict, Any

SAMPLE_QUIZ_QUESTIONS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "subtitle": "Attention Mechanisms & Transformers",
        "question": "In the standard Transformer architecture (Vaswani et al., 2017), what is the computational complexity of the scaled dot-product self-attention mechanism with respect to sequence length n?",
        "options": [
            "O(n) linear complexity",
            "O(n²) quadratic complexity",
            "O(n log n) quasilinear complexity",
            "O(1) constant complexity"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "Standard self-attention computes an n × n attention matrix comparing every token against every other token, resulting in O(n²) time and memory complexity with sequence length n."
    },
    {
        "id": 2,
        "subtitle": "RAG & Neural Reranking",
        "question": "Why are Cross-Encoder rerankers typically used as a second stage after Bi-Encoder vector retrieval rather than replacing the initial retrieval stage entirely?",
        "options": [
            "Cross-Encoders cannot compute semantic similarity scores",
            "Bi-Encoders produce superior quality rankings but require pre-filtering",
            "Cross-Encoders attend across query and candidate tokens jointly, yielding higher precision but too computationally expensive for million-scale searches",
            "Bi-Encoders require GPU hardware while Cross-Encoders can only execute on CPU"
        ],
        "correctAnswerIndex": 2,
        "marks": 1,
        "explanation": "Bi-encoders encode queries and documents independently for fast ANN vector search via pre-computed embeddings. Cross-encoders process query and candidate jointly with full cross-attention, which provides superior scoring precision but is computationally prohibitive across millions of documents."
    },
    {
        "id": 3,
        "subtitle": "Neural Network Regularization",
        "question": "Which regularization technique randomly sets a fraction of neuron activations to 0 at each training step to prevent complex co-adaptation of feature detectors?",
        "options": [
            "Batch Normalization",
            "Gradient Clipping",
            "Dropout",
            "Label Smoothing"
        ],
        "correctAnswerIndex": 2,
        "marks": 1,
        "explanation": "Dropout randomly zeroes out activations during forward training passes with probability p, preventing interdependent co-adaptations and behaving like an ensemble of thinned sub-networks."
    },
    {
        "id": 4,
        "subtitle": "Vector Semantics & Distance Metrics",
        "question": "When dense vector embeddings are normalized to unit Euclidean length (L2 norm = 1), cosine similarity between vectors u and v is algebraically identical to which operation?",
        "options": [
            "Euclidean distance divided by 2",
            "The standard dot product (u · v)",
            "The Manhattan L1 norm (|u - v|)",
            "The Jaccard index of their token sets"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "Cosine similarity is defined as (u · v) / (||u|| * ||v||). When vectors are unit-normalized (||u|| = ||v|| = 1), the denominator equals 1, making cosine similarity directly equal to the dot product."
    },
    {
        "id": 5,
        "subtitle": "Transformer Feedforward Sub-layers",
        "question": "In the original Transformer architecture, what is the standard dimensionality ratio between the inner hidden feed-forward layer (d_ff) and the model dimension (d_model)?",
        "options": [
            "d_ff = d_model / 2",
            "d_ff = 2 * d_model",
            "d_ff = 4 * d_model",
            "d_ff = 8 * d_model"
        ],
        "correctAnswerIndex": 2,
        "marks": 1,
        "explanation": "In Vaswani et al. (2017), d_model = 512 while d_ff = 2048, maintaining an expansion factor of 4:1 before projecting back to d_model."
    },
    {
        "id": 6,
        "subtitle": "Retrieval Augmented Generation (RAG)",
        "question": "In dense retrieval pipelines, what phenomenon occurs when an LLM hallucinated response cites genuine document identifiers but invents the claimed numerical statistics or facts?",
        "options": [
            "Faithfulness failure / Unsupported citation hallucination",
            "Catastrophic forgetting",
            "Out-of-vocabulary tokenization error",
            "Softmax temperature saturation"
        ],
        "correctAnswerIndex": 0,
        "marks": 1,
        "explanation": "Faithfulness measures whether claims made in the generation can be directly inferred from the retrieved context. Fabricating statistics while attaching real citation links is an unsupported citation hallucination."
    },
    {
        "id": 7,
        "subtitle": "Gradient Optimization Algorithms",
        "question": "How does the Adam optimizer calculate the adaptive learning rate update for each individual parameter theta_i?",
        "options": [
            "By computing the Hessian matrix of second-order partial derivatives",
            "By maintaining exponentially decaying averages of past gradients (1st moment) and squared gradients (2nd moment) with bias correction",
            "By performing simulated annealing on the global temperature parameter",
            "By randomly resetting gradients to uniform noise whenever loss plateaus"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "Adam (Adaptive Moment Estimation) tracks exponentially decaying moving averages of the gradient (m_t) and squared gradient (v_t), correcting for initial zero-bias before computing parameter step updates."
    },
    {
        "id": 8,
        "subtitle": "Model Evaluation & Benchmarks",
        "question": "Which evaluation metric measures the harmonic mean of precision and recall, particularly valuable for evaluating information retrieval on imbalanced document datasets?",
        "options": [
            "Area Under the ROC Curve (AUROC)",
            "Mean Reciprocal Rank (MRR)",
            "F1-Score",
            "Perplexity"
        ],
        "correctAnswerIndex": 2,
        "marks": 1,
        "explanation": "The F1-score is defined as 2 * (Precision * Recall) / (Precision + Recall), providing the harmonic mean that penalizes extreme imbalance between precision and recall."
    },
    {
        "id": 9,
        "subtitle": "Positional Encoding in LLMs",
        "question": "What key advantage does Rotary Position Embedding (RoPE) offer over absolute sinusoidal positional embeddings in modern autoregressive LLMs (e.g., LLaMA, Mistral)?",
        "options": [
            "RoPE completely eliminates the need for query and key projection matrices",
            "RoPE naturally incorporates relative position information via inner products while maintaining sequence length generalization properties",
            "RoPE restricts the attention matrix to strictly triangular lower-band form without masking",
            "RoPE reduces memory consumption by 75% through 4-bit scalar quantization"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "RoPE encodes relative position by rotating the affine-transformed query and key representations in complex vector space, ensuring the inner product <R_m q, R_n k> depends purely on relative distance (m - n)."
    },
    {
        "id": 10,
        "subtitle": "Quantization & Inference Efficiency",
        "question": "What is the primary difference between Post-Training Quantization (PTQ) and Quantization-Aware Training (QAT)?",
        "options": [
            "PTQ trains the model from random initialization in INT4 while QAT converts pre-trained FP32 weights directly",
            "PTQ quantizes weights after full model training with minimal calibration, whereas QAT models quantization noise in the forward pass during training to adapt weights",
            "PTQ only operates on embedding layers while QAT only operates on classification heads",
            "PTQ requires full dataset retraining while QAT requires no data at all"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "PTQ converts a pre-trained floating-point model to lower bit-width (e.g. INT8/INT4) using a small calibration dataset without retraining. QAT simulates rounding and clipping during training/fine-tuning so the weights learn to tolerate quantization noise."
    }
]
