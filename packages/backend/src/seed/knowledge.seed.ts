/**
 * Knowledge base seed pipeline for GESP C++ 1-8.
 *
 * Reads 4 seed data sources, generates embeddings via EmbeddingProvider,
 * and inserts records into LanceDB via VectorStore.
 *
 * Usage:
 *   bun run seed:knowledge              # seed if not already seeded
 *   EMBEDDING_PROVIDER=mock bun run seed:knowledge  # mock mode (no Ollama needed)
 *   bun run seed:knowledge --force      # force re-seed (drops existing data)
 *
 * NOTE: On Intel Mac (darwin-x64), use `node --import tsx src/seed/knowledge.seed.ts`
 * instead of `bun` due to LanceDB native binding compatibility.
 */

import { existsSync, readdirSync } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

import { createEmbeddingProvider } from '../services/embedding';
import { LanceDBFileStore, TABLES } from '../services/vector-store';

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Resolve path relative to this script file */
function resolveSeedPath(relativePath: string): string {
  return join(__dirname, relativePath);
}

/** Resolve path relative to the workspace root (for external seed files) */
function resolveWorkspacePath(relativePath: string): string {
  // Navigate up from packages/backend/src/seed/ to project root
  return join(__dirname, '..', '..', '..', '..', relativePath);
}

// ---------------------------------------------------------------------------
// Seed data reading helpers
// ---------------------------------------------------------------------------

function readJsonFile(filePath: string): unknown {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Embedding helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 32; // embed in batches to avoid Ollama timeouts

async function embedInBatches(
  provider: ReturnType<typeof createEmbeddingProvider>,
  texts: string[]
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`  Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} (${batch.length} texts)`);
    const embeddings = await provider.embedBatch(batch);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

// ---------------------------------------------------------------------------
// Individual seed functions
// ---------------------------------------------------------------------------

interface KnowledgePoint {
  id: string;
  language: string;
  level: number;
  block: string;
  block_order: number;
  point: string;
  point_order: number;
  mastery_verb: string;
  description: string;
  tags: string[];
}

async function seedKnowledgePoints(
  store: LanceDBFileStore,
  provider: ReturnType<typeof createEmbeddingProvider>
): Promise<number> {
  console.log('\n📖 Seeding knowledge_points...');

  const filePath = resolveSeedPath('knowledge-points-gesp-cpp-1-8.json');
  const points = readJsonFile(filePath) as KnowledgePoint[];

  console.log(`  Found ${points.length} knowledge points`);

  // Build embedding texts
  const texts = points.map((p) => {
    const parts = [p.point];
    if (p.description) parts.push(p.description);
    if (p.tags && p.tags.length > 0) parts.push(p.tags.join(' '));
    return parts.join(': ');
  });

  const vectors = await embedInBatches(provider, texts);

  // Build records with vector field
  const records = points.map((p, i) => ({
    ...p,
    vector: vectors[i],
  }));

  await store.insert(TABLES.KNOWLEDGE_POINTS, records);
  console.log(`  ✅ Inserted ${records.length} knowledge points`);
  return records.length;
}

interface PracticeQuestion {
  id: string;
  lesson_ref: string | null;
  language: string;
  level: number;
  difficulty: number;
  question_type: string;
  point_ids: string[];
  content: string;
  options: string[];
  answer: string;
  score: number;
  explanation: string;
  hints: string[];
  common_mistakes: string[];
  test_cases: Array<{ input: string; output: string; hidden?: boolean }>;
  tags: string[];
  status: string;
}

async function seedPracticeQuestions(
  store: LanceDBFileStore,
  provider: ReturnType<typeof createEmbeddingProvider>
): Promise<number> {
  console.log('\n📝 Seeding practice_questions...');

  const filePath = resolveWorkspacePath(
    'docs/products/gesp/seed/practice-cpp-l1.json'
  );
  const data = readJsonFile(filePath) as { practice_questions: PracticeQuestion[] };
  const questions = data.practice_questions;

  console.log(`  Found ${questions.length} practice questions`);

  // Build embedding texts
  const texts = questions.map((q) => {
    const parts = [q.content];
    if (q.explanation) parts.push(q.explanation);
    if (q.hints && q.hints.length > 0) parts.push(q.hints.join(' '));
    return parts.join(' | ');
  });

  const vectors = await embedInBatches(provider, texts);

  const records = questions.map((q, i) => ({
    ...q,
    vector: vectors[i],
  }));

  await store.insert(TABLES.PRACTICE_QUESTIONS, records);
  console.log(`  ✅ Inserted ${records.length} practice questions`);
  return records.length;
}

interface ExamQuestion {
  id: string;
  session_ref: string;
  question_type: string;
  question_number: number;
  content: string;
  options: string[];
  answer: string;
  score: number;
  tags: string[];
  explanation?: string;
  reference_code?: string;
  point_ids: string[];
  test_cases?: Array<{ input: string; output: string; hidden?: boolean }>;
}

async function seedExamQuestions(
  store: LanceDBFileStore,
  provider: ReturnType<typeof createEmbeddingProvider>
): Promise<number> {
  console.log('\n📋 Seeding exam_questions...');

  const filePath = resolveWorkspacePath(
    'docs/products/gesp/seed/exam-cpp-l1-2026-03.json'
  );
  const data = readJsonFile(filePath) as { exam_questions: ExamQuestion[] };
  const questions = data.exam_questions;

  console.log(`  Found ${questions.length} exam questions`);

  // Build embedding texts
  const texts = questions.map((q) => {
    const parts = [q.content];
    if (q.explanation) parts.push(q.explanation);
    if (q.reference_code) parts.push(q.reference_code);
    return parts.join(' | ');
  });

  const vectors = await embedInBatches(provider, texts);

  const records = questions.map((q, i) => ({
    id: q.id,
    session_ref: q.session_ref,
    question_type: q.question_type,
    question_number: q.question_number,
    content: q.content,
    options: q.options,
    answer: q.answer,
    score: q.score,
    tags: q.tags || [],
    explanation: q.explanation || '',
    reference_code: q.reference_code || '',
    point_ids: q.point_ids || [],
    test_cases: q.test_cases || [],
    vector: vectors[i],
  }));

  await store.insert(TABLES.EXAM_QUESTIONS, records);
  console.log(`  ✅ Inserted ${records.length} exam questions`);
  return records.length;
}

interface LessonPlan {
  id: string;
  language: string;
  level: number;
  phase: string;
  title: string;
  objectives: string[];
  key_points: string[];
  difficulties: string[];
  teaching_design: Array<{ stage: string; activity: string; intent: string }>;
  evaluation: string;
  tags: string[];
  source_file: string;
}

async function seedLessonPlans(
  store: LanceDBFileStore,
  provider: ReturnType<typeof createEmbeddingProvider>
): Promise<number> {
  console.log('\n📚 Seeding lesson_plans...');

  const filePath = resolveWorkspacePath(
    'docs/products/gesp/seed/lesson-cpp-g3-05.json'
  );
  const data = readJsonFile(filePath) as { lesson_plans: LessonPlan[] };
  const plans = data.lesson_plans;

  console.log(`  Found ${plans.length} lesson plans`);

  // Build embedding texts
  const texts = plans.map((p) => {
    const parts = [p.title];
    if (p.objectives && p.objectives.length > 0) parts.push(p.objectives.join(' '));
    if (p.key_points && p.key_points.length > 0) parts.push(p.key_points.join(' '));
    return parts.join(' | ');
  });

  const vectors = await embedInBatches(provider, texts);

  const records = plans.map((p, i) => ({
    ...p,
    vector: vectors[i],
  }));

  await store.insert(TABLES.LESSON_PLANS, records);
  console.log(`  ✅ Inserted ${records.length} lesson plans`);
  return records.length;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

/**
 * Seed all knowledge base tables into LanceDB.
 *
 * @param force - If true, re-seed even if data directory already exists.
 */
export async function seedAll(force = false): Promise<void> {
  const dbPath = join(__dirname, '..', '..', 'data', 'gesp.lance');
  const dbDir = join(__dirname, '..', '..', 'data');

  console.log('🚀 GESP Knowledge Base Seed Pipeline');
  console.log(`   DB path: ${dbPath}`);

  // Check if already seeded
  if (!force && existsSync(dbDir)) {
    try {
      const files = readdirSync(dbDir);
      if (files.length > 0) {
        console.log('⏭️  Database directory already exists and is not empty. Use --force to re-seed.');
        return;
      }
    } catch {
      // Directory may be empty or inaccessible, proceed with seeding
    }
  }

  if (force && existsSync(dbDir)) {
    console.log('🔄 Force mode: existing data will be replaced by new LanceDB tables.');
  }

  // Create embedding provider
  console.log('\n🔧 Creating EmbeddingProvider...');
  const embeddingProvider = createEmbeddingProvider();
  console.log(`   Provider: ${process.env.EMBEDDING_PROVIDER || 'ollama'}`);

  // Create vector store
  console.log('🔧 Creating LanceDBFileStore...');
  const store = new LanceDBFileStore({
    dbPath,
    embeddingProvider,
  });

  // Seed all tables
  const results: Record<string, number> = {};

  results[TABLES.KNOWLEDGE_POINTS] = await seedKnowledgePoints(store, embeddingProvider);
  results[TABLES.PRACTICE_QUESTIONS] = await seedPracticeQuestions(store, embeddingProvider);
  results[TABLES.EXAM_QUESTIONS] = await seedExamQuestions(store, embeddingProvider);
  results[TABLES.LESSON_PLANS] = await seedLessonPlans(store, embeddingProvider);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Seed Summary:');
  for (const [table, count] of Object.entries(results)) {
    console.log(`   ${table}: ${count} records`);
  }
  console.log('='.repeat(50));
  console.log('✅ Knowledge base seeding complete!');
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const forceMode = args.includes('--force') || args.includes('-f');

seedAll(forceMode).catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
