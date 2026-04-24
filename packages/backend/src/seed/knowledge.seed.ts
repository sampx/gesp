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

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { createEmbeddingProvider } from '../services/embedding';
import { LanceDBFileStore, TABLES } from '../services/vector-store';
import { logger } from '../utils/logger';

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
  // Navigate up from packages/backend/src/seed/ to workspace root
  // 6 levels: seed/ → src/ → backend/ → packages/ → gesp/ → projects/ → workspace root
  return join(__dirname, '..', '..', '..', '..', '..', '..', relativePath);
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
    logger.info({ batch: Math.floor(i / BATCH_SIZE) + 1, total_batches: Math.ceil(texts.length / BATCH_SIZE), count: batch.length }, 'Embedding batch');
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

export async function seedKnowledgePoints(
  store: LanceDBFileStore,
  provider: ReturnType<typeof createEmbeddingProvider>
): Promise<number> {
  logger.info('Seeding knowledge_points...');

  const filePath = resolveSeedPath('knowledge-points-gesp-cpp-1-8.json');
  const points = readJsonFile(filePath) as KnowledgePoint[];

  logger.info({ count: points.length }, 'Found knowledge points');

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
  logger.info({ count: records.length }, 'Inserted knowledge points');
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

export async function seedPracticeQuestions(
  store: LanceDBFileStore,
  provider: ReturnType<typeof createEmbeddingProvider>
): Promise<number> {
  logger.info('Seeding practice_questions...');

  const filePath = resolveWorkspacePath(
    'docs/products/gesp/seed/practice-cpp-l1.json'
  );
  const data = readJsonFile(filePath) as { practice_questions: PracticeQuestion[] };
  const questions = data.practice_questions;

  logger.info({ count: questions.length }, 'Found practice questions');

  // Build embedding texts
  const texts = questions.map((q) => {
    const parts = [q.content];
    if (q.explanation) parts.push(q.explanation);
    if (q.hints && q.hints.length > 0) parts.push(q.hints.join(' '));
    return parts.join(' | ');
  });

  const vectors = await embedInBatches(provider, texts);

  const records = questions.map((q, i) => ({
    id: q.id,
    lesson_ref: q.lesson_ref ?? '',
    language: q.language,
    level: q.level,
    difficulty: q.difficulty,
    question_type: q.question_type,
    point_ids: JSON.stringify(q.point_ids || []),
    content: q.content,
    options: JSON.stringify(q.options),
    answer: q.answer,
    score: q.score,
    explanation: q.explanation,
    hints: JSON.stringify(q.hints || []),
    common_mistakes: JSON.stringify(q.common_mistakes || []),
    test_cases: JSON.stringify(q.test_cases || []),
    tags: JSON.stringify(q.tags || []),
    status: q.status,
    vector: vectors[i],
  }));
  logger.info({ count: records.length }, 'Inserted practice questions');
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

export async function seedExamQuestions(
  store: LanceDBFileStore,
  provider: ReturnType<typeof createEmbeddingProvider>
): Promise<number> {
  logger.info('Seeding exam_questions...');

  const filePath = resolveWorkspacePath(
    'docs/products/gesp/seed/exam-cpp-l1-2026-03.json'
  );
  const data = readJsonFile(filePath) as { exam_questions: ExamQuestion[] };
  const questions = data.exam_questions;

  logger.info({ count: questions.length }, 'Found exam questions');

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
    options: JSON.stringify(q.options),
    answer: q.answer,
    score: q.score,
    tags: JSON.stringify(q.tags || []),
    explanation: q.explanation || '',
    reference_code: q.reference_code || '',
    point_ids: JSON.stringify(q.point_ids || []),
    test_cases: JSON.stringify(q.test_cases || []),
    vector: vectors[i],
  }));

  await store.insert(TABLES.EXAM_QUESTIONS, records);
  logger.info({ count: records.length }, 'Inserted exam questions');
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

export async function seedLessonPlans(
  store: LanceDBFileStore,
  provider: ReturnType<typeof createEmbeddingProvider>
): Promise<number> {
  logger.info('Seeding lesson_plans...');

  const filePath = resolveWorkspacePath(
    'docs/products/gesp/seed/lesson-cpp-g3-05.json'
  );
  const data = readJsonFile(filePath) as { lesson_plans: LessonPlan[] };
  const plans = data.lesson_plans;

  logger.info({ count: plans.length }, 'Found lesson plans');

  // Build embedding texts
  const texts = plans.map((p) => {
    const parts = [p.title];
    if (p.objectives && p.objectives.length > 0) parts.push(p.objectives.join(' '));
    if (p.key_points && p.key_points.length > 0) parts.push(p.key_points.join(' '));
    return parts.join(' | ');
  });

  const vectors = await embedInBatches(provider, texts);

  const records = plans.map((p, i) => ({
    id: p.id,
    language: p.language,
    level: p.level,
    phase: p.phase,
    title: p.title,
    objectives: JSON.stringify(p.objectives || []),
    key_points: JSON.stringify(p.key_points || []),
    difficulties: JSON.stringify(p.difficulties || []),
    teaching_design: JSON.stringify(p.teaching_design || []),
    evaluation: p.evaluation || '',
    tags: JSON.stringify(p.tags || []),
    source_file: p.source_file || '',
    vector: vectors[i],
  }));

  await store.insert(TABLES.LESSON_PLANS, records);
  logger.info({ count: records.length }, 'Inserted lesson plans');
  return records.length;
}

// CLI entry point: scripts/seed-knowledge.ts
