import { createHash, randomBytes } from 'crypto';

/**
 * Embedding provider interface for generating vector embeddings.
 * Implementations: OllamaEmbeddingProvider, OpenAIEmbeddingProvider, MockEmbeddingProvider.
 */
export interface EmbeddingProvider {
  /** Generate embedding for a single text */
  embed(text: string): Promise<number[]>;
  /** Generate embeddings for multiple texts in batch */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Vector dimension, detected at runtime from first call */
  readonly dimension: number;
}

// ---------------------------------------------------------------------------
// OllamaEmbeddingProvider — calls Ollama's OpenAI-compatible /embeddings endpoint
// ---------------------------------------------------------------------------

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;
  private _dimension: number | null = null;

  constructor(opts: { baseUrl: string; model: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, ''); // strip trailing slash
    this.model = opts.model;
  }

  get dimension(): number {
    if (this._dimension === null) {
      throw new Error('Dimension not yet detected — call embed() first');
    }
    return this._dimension;
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.callApi([text]);
    this._dimension = result[0].length;
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const result = await this.callApi(texts);
    if (this._dimension === null && result.length > 0) {
      this._dimension = result[0].length;
    }
    return result;
  }

  private async callApi(input: string[]): Promise<number[][]> {
    const url = `${this.baseUrl}/embeddings`;
    const body = JSON.stringify({ model: this.model, input });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (err) {
      throw new Error(
        `Ollama embedding request failed (url=${url}, model=${this.model}): ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Ollama embedding error ${response.status} (url=${url}, model=${this.model}): ${text}`
      );
    }

    const json = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    if (!json.data || json.data.length === 0) {
      throw new Error(
        `Ollama returned empty embeddings (url=${url}, model=${this.model})`
      );
    }

    return json.data.map((d) => d.embedding);
  }
}

// ---------------------------------------------------------------------------
// OpenAIEmbeddingProvider — calls OpenAI /v1/embeddings
// ---------------------------------------------------------------------------

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private _dimension: number | null = null;

  constructor(opts: { apiKey: string; model?: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model || 'text-embedding-3-small';
  }

  get dimension(): number {
    if (this._dimension === null) {
      throw new Error('Dimension not yet detected — call embed() first');
    }
    return this._dimension;
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.callApi([text]);
    this._dimension = result[0].length;
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const result = await this.callApi(texts);
    if (this._dimension === null && result.length > 0) {
      this._dimension = result[0].length;
    }
    return result;
  }

  private async callApi(input: string[]): Promise<number[][]> {
    const url = 'https://api.openai.com/v1/embeddings';
    const body = JSON.stringify({ model: this.model, input });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
      });
    } catch (err) {
      throw new Error(
        `OpenAI embedding request failed (model=${this.model}): ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `OpenAI embedding error ${response.status} (model=${this.model}): ${text}`
      );
    }

    const json = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    if (!json.data || json.data.length === 0) {
      throw new Error(
        `OpenAI returned empty embeddings (model=${this.model})`
      );
    }

    return json.data.map((d) => d.embedding);
  }
}

// ---------------------------------------------------------------------------
// MockEmbeddingProvider — deterministic 768-d vectors for testing
// ---------------------------------------------------------------------------

const MOCK_DIMENSION = 768;

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly dimension = MOCK_DIMENSION;

  async embed(text: string): Promise<number[]> {
    return this.textToVector(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.textToVector(t));
  }

  /**
   * Generate a deterministic 768-d vector from text using MD5 hash as seed.
   * Uses simple PRNG seeded from hash for reproducibility.
   */
  private textToVector(text: string): number[] {
    const hash = createHash('md5').update(text).digest();
    // Use first 8 bytes as seed for a simple LCG PRNG
    const seed = hash.readBigUInt64LE(0);
    let state = seed;

    const vector: number[] = new Array(MOCK_DIMENSION);
    for (let i = 0; i < MOCK_DIMENSION; i++) {
      // LCG: state = state * 6364136223846793005 + 1442695040888963407
      state = (state * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
      // Map to [-1, 1]
      vector[i] = (Number(state >> 33n) / 2147483648) - 1;
    }
    return vector;
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

export function createEmbeddingProvider(config?: {
  provider?: 'ollama' | 'openai' | 'mock';
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}): EmbeddingProvider {
  const provider = config?.provider || process.env.EMBEDDING_PROVIDER || 'ollama';

  if (provider === 'ollama') {
    return new OllamaEmbeddingProvider({
      baseUrl:
        config?.baseUrl ||
        process.env.EMBEDDING_BASE_URL ||
        'http://localhost:11434/v1',
      model:
        config?.model ||
        process.env.EMBEDDING_MODEL ||
        'nomic-embed-text-v2-moe',
    });
  }

  if (provider === 'openai') {
    return new OpenAIEmbeddingProvider({
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY || '',
      model: config?.model || 'text-embedding-3-small',
    });
  }

  if (provider === 'mock') {
    return new MockEmbeddingProvider();
  }

  throw new Error(`Unknown embedding provider: ${provider}`);
}
