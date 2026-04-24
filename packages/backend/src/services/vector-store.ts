/**
 * VectorStore abstraction and LanceDB file-mode implementation.
 *
 * Provides a unified interface for vector search/CRUD across 4 LanceDB tables:
 * knowledge_points, lesson_plans, practice_questions, exam_questions.
 *
 * NOTE: LanceDB native bindings require darwin-arm64 (Apple Silicon) or Linux.
 * On darwin-x64 (Intel Mac), use `node --import tsx` to run seed scripts
 * with a compatible LanceDB version (0.22.x).
 */

import type { EmbeddingProvider } from './embedding';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface KnowledgeResult {
  id: string;
  score?: number;
  [key: string]: unknown;
}

export interface VectorStore {
  search(
    table: string,
    query: string | number[],
    options?: { limit?: number; filter?: string }
  ): Promise<KnowledgeResult[]>;
  insert(table: string, records: Record<string, unknown>[]): Promise<void>;
  getAll(
    table: string,
    options?: { limit?: number; offset?: number; filter?: string }
  ): Promise<KnowledgeResult[]>;
  getById(table: string, id: string): Promise<KnowledgeResult | null>;
  update(table: string, id: string, data: Record<string, unknown>): Promise<void>;
  delete(table: string, id: string): Promise<void>;
  count(table: string): Promise<number>;
}

// ---------------------------------------------------------------------------
// Table name constants
// ---------------------------------------------------------------------------

export const TABLES = {
  KNOWLEDGE_POINTS: 'knowledge_points',
  LESSON_PLANS: 'lesson_plans',
  PRACTICE_QUESTIONS: 'practice_questions',
  EXAM_QUESTIONS: 'exam_questions',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

// ---------------------------------------------------------------------------
// LanceDB import (may fail on unsupported platforms)
// ---------------------------------------------------------------------------

let lancedb: typeof import('@lancedb/lancedb') | null = null;
let lancedbLoadError: string | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  lancedb = require('@lancedb/lancedb');
} catch (err) {
  lancedbLoadError = `LanceDB native binding not available: ${err instanceof Error ? err.message : String(err)}. ` +
    'On Intel Mac, use `node --import tsx` instead of `bun`. ' +
    'Ensure @lancedb/lancedb is installed with the correct platform-specific optional dependency.';
}

// ---------------------------------------------------------------------------
// LanceDBFileStore implementation
// ---------------------------------------------------------------------------

export class LanceDBFileStore implements VectorStore {
  private dbPath: string;
  private embeddingProvider: EmbeddingProvider;
  private db: InstanceType<typeof import('@lancedb/lancedb').Connection> | null = null;
  private tableCache: Map<string, unknown> = new Map();

  constructor(opts: { dbPath: string; embeddingProvider: EmbeddingProvider }) {
    if (!lancedb) {
      throw new Error(lancedbLoadError || 'LanceDB not available');
    }
    this.dbPath = opts.dbPath;
    this.embeddingProvider = opts.embeddingProvider;
  }

  /** Connect to (or create) the LanceDB database */
  private async getDb() {
    if (!this.db) {
      this.db = await lancedb!.connect(this.dbPath);
    }
    return this.db;
  }

  /** Get or create a table. If the table doesn't exist, create with first record's schema. */
  private async getOrConnectTable(
    tableName: string,
    seedData?: Record<string, unknown>[]
  ) {
    const db = await this.getDb();

    // Check cache first
    if (this.tableCache.has(tableName)) {
      return this.tableCache.get(tableName) as import('@lancedb/lancedb').Table;
    }

    // Check if table exists
    const existingTables = await db.tableNames();
    if (existingTables.includes(tableName)) {
      const table = await db.openTable(tableName);
      this.tableCache.set(tableName, table);
      return table;
    }

    // Create table with seed data (must have at least one record to infer schema)
    if (seedData && seedData.length > 0) {
      const table = await db.createTable(tableName, seedData);
      this.tableCache.set(tableName, table);
      return table;
    }

    throw new Error(
      `Table '${tableName}' does not exist and no seed data provided to create it. ` +
      'Insert data first using the insert() method with initial records.'
    );
  }

  // -----------------------------------------------------------------------
  // VectorStore interface implementation
  // -----------------------------------------------------------------------

  async search(
    tableName: string,
    query: string | number[],
    options?: { limit?: number; filter?: string }
  ): Promise<KnowledgeResult[]> {
    const table = await this.getOrConnectTable(tableName);
    const limit = options?.limit ?? 10;

    let queryVector: number[];
    if (typeof query === 'string') {
      queryVector = await this.embeddingProvider.embed(query);
    } else {
      queryVector = query;
    }

    let searchQuery = table.search(queryVector).limit(limit);

    if (options?.filter) {
      searchQuery = searchQuery.where(options.filter);
    }

    const results = await searchQuery.toArray();

    return results.map((r: Record<string, unknown>) => {
      const { _distance, ...rest } = r as Record<string, unknown> & { _distance?: number };
      return {
        ...rest,
        score: _distance !== undefined ? 1 - _distance : undefined,
      } as KnowledgeResult;
    });
  }

  async insert(tableName: string, records: Record<string, unknown>[]): Promise<void> {
    if (records.length === 0) return;

    const db = await this.getDb();
    const existingTables = await db.tableNames();

    if (existingTables.includes(tableName)) {
      const table = await this.getOrConnectTable(tableName);
      await table.add(records);
    } else {
      // Create table with first batch of records
      const table = await db.createTable(tableName, records);
      this.tableCache.set(tableName, table);
    }
  }

  async getAll(
    tableName: string,
    options?: { limit?: number; offset?: number; filter?: string }
  ): Promise<KnowledgeResult[]> {
    const table = await this.getOrConnectTable(tableName);

    let query = table.query();
    if (options?.filter) {
      query = query.where(options.filter);
    }

    const limit = options?.limit ?? 1000;
    query = query.limit(limit + (options?.offset ?? 0));

    const results = await query.toArray();

    // Apply offset manually (LanceDB doesn't natively support offset in queries)
    const offset = options?.offset ?? 0;
    const sliced = results.slice(offset, offset + limit);

    return sliced.map((r: Record<string, unknown>) => r as KnowledgeResult);
  }

  async getById(tableName: string, id: string): Promise<KnowledgeResult | null> {
    const table = await this.getOrConnectTable(tableName);
    const results = await table.query().where(`id = '${id}'`).limit(1).toArray();

    if (results.length === 0) return null;
    return results[0] as KnowledgeResult;
  }

  async update(tableName: string, id: string, data: Record<string, unknown>): Promise<void> {
    // LanceDB doesn't support in-place update — use delete + re-insert pattern.
    // The record must include all fields including the vector.
    const table = await this.getOrConnectTable(tableName);
    await table.delete(`id = '${id}'`);
    await table.add([data]);
  }

  async delete(tableName: string, id: string): Promise<void> {
    const table = await this.getOrConnectTable(tableName);
    await table.delete(`id = '${id}'`);
  }

  async count(tableName: string): Promise<number> {
    const table = await this.getOrConnectTable(tableName);
    return table.countRows();
  }
}
