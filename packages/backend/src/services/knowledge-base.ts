/**
 * KnowledgeBaseService — high-level CRUD + semantic search over LanceDB tables.
 *
 * Wraps VectorStore and EmbeddingProvider to provide table-aware operations
 * with auto-embedding for knowledge_points, lesson_plans, practice_questions,
 * and exam_questions.
 */

import type { VectorStore, KnowledgeResult } from './vector-store';
import type { EmbeddingProvider } from './embedding';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KnowledgeTable = 'points' | 'lessons' | 'questions' | 'exams';

export const TABLE_MAP: Record<KnowledgeTable, string> = {
  points: 'knowledge_points',
  lessons: 'lesson_plans',
  questions: 'practice_questions',
  exams: 'exam_questions',
};

export interface PaginatedResult<T = KnowledgeResult> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// KnowledgeBaseService
// ---------------------------------------------------------------------------

export class KnowledgeBaseService {
  constructor(
    private store: VectorStore,
    private embedder: EmbeddingProvider,
  ) {}

  // -----------------------------------------------------------------------
  // CRUD operations
  // -----------------------------------------------------------------------

  /** List records with pagination. */
  async list(
    table: KnowledgeTable,
    page = 1,
    limit = 20,
    filter?: string,
  ): Promise<PaginatedResult> {
    const tableName = TABLE_MAP[table];
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.store.getAll(tableName, { limit, offset, filter }),
      this.store.count(tableName),
    ]);

    return { data, total, page, limit };
  }

  /** Get a single record by ID. */
  async get(table: KnowledgeTable, id: string): Promise<KnowledgeResult | null> {
    const tableName = TABLE_MAP[table];
    return this.store.getById(tableName, id);
  }

  /** Create a new record with auto-generated embedding. */
  async create(
    table: KnowledgeTable,
    data: Record<string, unknown>,
  ): Promise<KnowledgeResult> {
    const tableName = TABLE_MAP[table];
    const id = crypto.randomUUID();

    // Build embedding text and generate vector
    const embeddingText = this.buildEmbeddingText(table, data);
    const vector = embeddingText
      ? await this.embedder.embed(embeddingText)
      : [];

    const record: Record<string, unknown> = {
      ...data,
      id,
      vector,
    };

    await this.store.insert(tableName, [record]);

    // Return the created record (without vector for API response)
    const { vector: _, ...rest } = record;
    return rest as KnowledgeResult;
  }

  /** Update an existing record — rebuilds embedding text. */
  async update(
    table: KnowledgeTable,
    id: string,
    data: Record<string, unknown>,
  ): Promise<KnowledgeResult> {
    const tableName = TABLE_MAP[table];

    // Get existing record to merge with partial update
    const existing = await this.store.getById(tableName, id);
    if (!existing) {
      throw new Error(`Record not found: ${tableName}/${id}`);
    }

    // Merge: existing data overwritten by update data
    const merged = { ...existing, ...data, id };

    // Rebuild embedding text from merged data
    const embeddingText = this.buildEmbeddingText(table, merged);
    const vector = embeddingText
      ? await this.embedder.embed(embeddingText)
      : [];

    const record: Record<string, unknown> = {
      ...merged,
      vector,
    };

    // VectorStore.update uses delete + re-insert pattern
    await this.store.update(tableName, id, record);

    const { vector: _, ...rest } = record;
    return rest as KnowledgeResult;
  }

  /** Delete a record by ID. */
  async delete(table: KnowledgeTable, id: string): Promise<void> {
    const tableName = TABLE_MAP[table];
    await this.store.delete(tableName, id);
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /** Semantic search with auto-embedding of query text. */
  async search(
    table: KnowledgeTable,
    query: string,
    limit = 10,
    filter?: string,
  ): Promise<KnowledgeResult[]> {
    const tableName = TABLE_MAP[table];
    return this.store.search(tableName, query, { limit, filter });
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Build embedding text per table type.
   * Follows vector calculation rules from gesp-data-models.md.
   */
  private buildEmbeddingText(
    table: KnowledgeTable,
    data: Record<string, unknown>,
  ): string {
    switch (table) {
      case 'points': {
        const point = (data.point as string) || '';
        const desc = (data.description as string) || '';
        // Rule: embedding(point + ": " + description), description empty → only point
        return desc ? `${point}: ${desc}` : point;
      }
      case 'lessons': {
        const title = (data.title as string) || '';
        const objectives = Array.isArray(data.objectives)
          ? (data.objectives as string[]).join(' ')
          : '';
        const keyPoints = Array.isArray(data.key_points)
          ? (data.key_points as string[]).join(' ')
          : '';
        // Rule: embedding(title + " " + join(objectives + key_points))
        return `${title} ${objectives} ${keyPoints}`.trim();
      }
      case 'questions': {
        const content = (data.content as string) || '';
        const explanation = (data.explanation as string) || '';
        const hints = Array.isArray(data.hints)
          ? (data.hints as string[]).join(' ')
          : '';
        const mistakes = Array.isArray(data.common_mistakes)
          ? (data.common_mistakes as string[]).join(' ')
          : '';
        // Rule: aggregate content + explanation + hints + common_mistakes,
        //       fallback to content only when all other fields are empty
        const parts = [content, explanation, hints, mistakes].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : content;
      }
      case 'exams': {
        const content = (data.content as string) || '';
        const explanation = (data.explanation as string) || '';
        // Rule: aggregate content + explanation
        return explanation ? `${content}: ${explanation}` : content;
      }
    }
  }
}
