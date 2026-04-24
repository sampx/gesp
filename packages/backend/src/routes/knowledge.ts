/**
 * Knowledge API routes — admin CRUD + student search.
 *
 * Admin routes: /api/admin/knowledge/*
 * Student routes: /api/student/knowledge/search
 *
 * All routes use Zod validation and auth middleware.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AdminAuth, StudentAuth } from '../middleware/auth';
import { success, error } from '../utils/response';
import {
  KnowledgeBaseService,
  type KnowledgeTable,
  TABLE_MAP,
} from '../services/knowledge-base';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const pointSchema = z.object({
  level: z.number().int().min(1).max(8),
  block: z.string().min(1),
  point: z.string().min(1),
  mastery_verb: z.enum(['了解', '理解', '掌握']).default('了解'),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  language: z.string().default('C++'),
  block_order: z.number().int().default(1),
  point_order: z.number().int().default(1),
});

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  filter: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listPointsSchema = paginationSchema.extend({
  level: z.coerce.number().int().min(1).max(8).optional(),
  block: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helper: get KB service from context
// ---------------------------------------------------------------------------

type Variables = {
  knowledgeBaseService: KnowledgeBaseService;
};

function getKB(c: { get: (key: string) => KnowledgeBaseService }): KnowledgeBaseService {
  return c.get('knowledgeBaseService');
}

// ---------------------------------------------------------------------------
// Admin routes — full CRUD for points, list + search for others
// ---------------------------------------------------------------------------

const adminKnowledgeRouter = new Hono<{ Variables: Variables }>();

// List knowledge points (paginated, with optional level/block filters)
adminKnowledgeRouter.get(
  '/points',
  AdminAuth(),
  zValidator('query', listPointsSchema),
  async (c) => {
    const kb = getKB(c);
    const { page, limit, level, block } = c.req.valid('query');
    const filterParts: string[] = [];
    if (level) filterParts.push(`level = ${level}`);
    if (block) filterParts.push(`block = '${block.replace(/'/g, "''")}'`);
    const filter = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;
    const result = await kb.list('points', page, limit, filter);
    return c.json({ success: true, message: 'Success', data: result });
  },
);

// Semantic search for knowledge points
adminKnowledgeRouter.get(
  '/points/search',
  AdminAuth(),
  zValidator('query', searchSchema),
  async (c) => {
    const kb = getKB(c);
    const { query, limit, filter } = c.req.valid('query');
    const results = await kb.search('points', query, limit, filter);
    return c.json({ success: true, message: 'Success', data: results });
  },
);

// Get single knowledge point
adminKnowledgeRouter.get(
  '/points/:id',
  AdminAuth(),
  async (c) => {
    const kb = getKB(c);
    const id = c.req.param('id')!;
    const result = await kb.get('points', id);
    if (!result) return error(c, 'Not found', 404);
    return c.json({ success: true, message: 'Success', data: result });
  },
);

// Create knowledge point
adminKnowledgeRouter.post(
  '/points',
  AdminAuth(),
  zValidator('json', pointSchema),
  async (c) => {
    const kb = getKB(c);
    const data = c.req.valid('json');
    const result = await kb.create('points', data);
    return c.json({ success: true, message: 'Success', data: result }, 201);
  },
);

// Update knowledge point (partial)
adminKnowledgeRouter.put(
  '/points/:id',
  AdminAuth(),
  zValidator('json', pointSchema.partial()),
  async (c) => {
    const kb = getKB(c);
    const data = c.req.valid('json');
    const result = await kb.update('points', c.req.param('id')!, data);
    return c.json({ success: true, message: 'Success', data: result });
  },
);

// Delete knowledge point
adminKnowledgeRouter.delete(
  '/points/:id',
  AdminAuth(),
  async (c) => {
    const kb = getKB(c);
    await kb.delete('points', c.req.param('id')!);
    return c.json({ success: true, message: '已删除' });
  },
);

// ---------------------------------------------------------------------------
// Admin routes — list + search for lessons, questions, exams
// ---------------------------------------------------------------------------

// Lessons
adminKnowledgeRouter.get(
  '/lessons',
  AdminAuth(),
  zValidator('query', paginationSchema),
  async (c) => {
    const kb = getKB(c);
    const { page, limit } = c.req.valid('query');
    const result = await kb.list('lessons', page, limit);
    return c.json({ success: true, message: 'Success', data: result });
  },
);

adminKnowledgeRouter.get(
  '/lessons/search',
  AdminAuth(),
  zValidator('query', searchSchema),
  async (c) => {
    const kb = getKB(c);
    const { query, limit, filter } = c.req.valid('query');
    const results = await kb.search('lessons', query, limit, filter);
    return c.json({ success: true, message: 'Success', data: results });
  },
);

// Questions
adminKnowledgeRouter.get(
  '/questions',
  AdminAuth(),
  zValidator('query', paginationSchema),
  async (c) => {
    const kb = getKB(c);
    const { page, limit } = c.req.valid('query');
    const result = await kb.list('questions', page, limit);
    return c.json({ success: true, message: 'Success', data: result });
  },
);

adminKnowledgeRouter.get(
  '/questions/search',
  AdminAuth(),
  zValidator('query', searchSchema),
  async (c) => {
    const kb = getKB(c);
    const { query, limit, filter } = c.req.valid('query');
    const results = await kb.search('questions', query, limit, filter);
    return c.json({ success: true, message: 'Success', data: results });
  },
);

// Exams
adminKnowledgeRouter.get(
  '/exams',
  AdminAuth(),
  zValidator('query', paginationSchema),
  async (c) => {
    const kb = getKB(c);
    const { page, limit } = c.req.valid('query');
    const result = await kb.list('exams', page, limit);
    return c.json({ success: true, message: 'Success', data: result });
  },
);

adminKnowledgeRouter.get(
  '/exams/search',
  AdminAuth(),
  zValidator('query', searchSchema),
  async (c) => {
    const kb = getKB(c);
    const { query, limit, filter } = c.req.valid('query');
    const results = await kb.search('exams', query, limit, filter);
    return c.json({ success: true, message: 'Success', data: results });
  },
);

// ---------------------------------------------------------------------------
// Student routes — search only, limited to 5 results
// ---------------------------------------------------------------------------

const studentKnowledgeRouter = new Hono<{ Variables: Variables }>();

studentKnowledgeRouter.get(
  '/search',
  StudentAuth(),
  zValidator('query', searchSchema.pick({ query: true, limit: true })),
  async (c) => {
    const kb = getKB(c);
    const { query, limit = 5 } = c.req.valid('query');
    // Student search capped at 5 results
    const cappedLimit = Math.min(limit, 5);
    const results = await kb.search('points', query, cappedLimit);
    return c.json({ success: true, message: 'Success', data: results });
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export { adminKnowledgeRouter, studentKnowledgeRouter };
