// ================================================================
// OpenAI Embedding Service
// ================================================================
// Purpose: Generate text embeddings using OpenAI's text-embedding-ada-002 model
// Reference: docs/features/ai-concierge/phase-0/PHASE-0-HYBRID-SEARCH-IMPLEMENTATION.md
//
// Model: text-embedding-ada-002
// Dimensions: 1536
// Cost: $0.0001 per 1K tokens (~750 words)
// Max Input: 8,191 tokens
// ================================================================

const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_TOKENS = 8191; // Model limit

/**
 * Generate embedding for a single text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - 1536-dimensional embedding vector
 */
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  // Truncate text if too long (rough estimate: 4 chars per token)
  const maxChars = MAX_TOKENS * 4;
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedText,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding returned from OpenAI');
    }

    const embedding = response.data[0].embedding;

    // Verify embedding dimensions
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`);
    }

    return embedding;
  } catch (error) {
    console.error('OpenAI embedding generation failed:', error.message);

    // Handle specific OpenAI errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'Unknown error';

      if (status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (status === 400) {
        throw new Error(`OpenAI API error: ${message}`);
      }
    }

    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @param {number} batchSize - Number of texts per API call (max 2048 for ada-002)
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
async function generateEmbeddingsBatch(texts, batchSize = 20) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts must be a non-empty array');
  }

  const embeddings = [];

  // Process in batches to avoid rate limits and reduce API calls
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embeddings returned from OpenAI');
      }

      // Extract embeddings in order
      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);

      embeddings.push(...batchEmbeddings);

      // Log progress
      console.log(`Generated embeddings for ${embeddings.length}/${texts.length} texts`);

      // Rate limiting: Wait 1 second between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);

      // Fallback: Generate embeddings one by one for this batch
      console.log('Retrying batch one by one...');
      for (const text of batch) {
        try {
          const embedding = await generateEmbedding(text);
          embeddings.push(embedding);
        } catch (singleError) {
          console.error('Single embedding generation failed:', singleError.message);
          // Push null for failed embeddings
          embeddings.push(null);
        }
        // Rate limiting for individual calls
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} embedding1 - First embedding vector
 * @param {number[]} embedding2 - Second embedding vector
 * @returns {number} - Cosine similarity score (0-1, higher = more similar)
 */
function cosineSimilarity(embedding1, embedding2) {
  if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
    throw new Error('Embeddings must be arrays');
  }

  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Estimate token count for text (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} - Estimated token count
 */
function estimateTokenCount(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Calculate embedding generation cost
 * @param {number} tokenCount - Number of tokens
 * @returns {number} - Cost in USD
 */
function calculateCost(tokenCount) {
  // Cost: $0.0001 per 1K tokens
  return (tokenCount / 1000) * 0.0001;
}

/**
 * Check if OpenAI API is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  cosineSimilarity,
  estimateTokenCount,
  calculateCost,
  isConfigured,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MAX_TOKENS
};
