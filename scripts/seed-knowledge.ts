/**
 * CLI script to seed knowledge base into LanceDB.
 *
 * Usage:
 *   # From project root (gesp/)
 *   bun run scripts/seed-knowledge.ts            # seed missing tables
 *   bun run scripts/seed-knowledge.ts --force    # force re-seed all tables
 *   EMBEDDING_PROVIDER=mock bun run scripts/seed-knowledge.ts  # mock embeddings
 *
 * Tables seeded:
 *   - knowledge_points (GESP C++ 1-8 知识点)
 *   - practice_questions (练习题)
 *   - exam_questions (真题)
 *   - lesson_plans (教案)
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createEmbeddingProvider } from '../packages/backend/src/services/embedding';
import { LanceDBFileStore, TABLES } from '../packages/backend/src/services/vector-store';
import { logger } from '../packages/backend/src/utils/logger';
import {
  seedKnowledgePoints,
  seedPracticeQuestions,
  seedExamQuestions,
  seedLessonPlans,
} from '../packages/backend/src/seed/knowledge.seed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve LanceDB path relative to backend package
const dbPath = join(__dirname, '..', 'packages', 'backend', 'data', 'gesp.lance');

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');

  logger.info({ db_path: dbPath, force }, 'GESP Knowledge Base Seed CLI');

  const embeddingProvider = createEmbeddingProvider();
  logger.info({ provider: process.env.EMBEDDING_PROVIDER || 'ollama' }, 'EmbeddingProvider created');

  const store = new LanceDBFileStore({ dbPath, embeddingProvider });

  type SeedFn = (s: LanceDBFileStore, p: ReturnType<typeof createEmbeddingProvider>) => Promise<number>;
  const tables: Array<{ name: string; seed: SeedFn }> = [
    { name: TABLES.KNOWLEDGE_POINTS, seed: seedKnowledgePoints },
    { name: TABLES.PRACTICE_QUESTIONS, seed: seedPracticeQuestions },
    { name: TABLES.EXAM_QUESTIONS, seed: seedExamQuestions },
    { name: TABLES.LESSON_PLANS, seed: seedLessonPlans },
  ];

  const results: Record<string, number> = {};

  for (const { name, seed } of tables) {
    if (force) {
      await store.dropTable(name);
      logger.info({ table: name }, 'Dropped existing table (force mode)');
    } else {
      try {
        const rowCount = await store.count(name);
        if (rowCount > 0) {
          logger.info({ table: name, row_count: rowCount }, 'Table already has data, skipped');
          results[name] = 0;
          continue;
        }
      } catch {
        // Table doesn't exist yet — proceed to seed
      }
    }

    try {
      const count = await seed(store, embeddingProvider);
      results[name] = count;
    } catch (err) {
      logger.error({ table: name, err }, 'Seed failed for table');
      results[name] = -1;
    }
  }

  logger.info({ results }, 'Seed summary');
  logger.info('Knowledge base seeding complete');
}

main().catch((err) => {
  logger.error({ err }, 'Seed CLI failed');
  process.exit(1);
});