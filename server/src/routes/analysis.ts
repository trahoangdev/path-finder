import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  GapAnalysisRequestSchema,
  GapAnalysisResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { gapAnalysis } from '../services/vector-search/skills.js';

const route = createRoute({
  method: 'post',
  path: '/gap-analysis',
  tags: ['analysis'],
  summary: 'Find skills the user is missing to reach a target role',
  description: `Uses MongoDB Atlas Vector Search to find skills semantically closest to the
*gap vector* (target_embedding − cv_embedding) — i.e. the semantic direction the user must
move in. Each result is enriched with transition metadata (time-to-acquire, salary lift).`,
  request: {
    body: { content: { 'application/json': { schema: GapAnalysisRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Ranked missing skills',
      content: { 'application/json': { schema: GapAnalysisResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Internal error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

export const analysisApp = new OpenAPIHono().openapi(route, async (c) => {
  const { cv_embedding, target_embedding, limit } = c.req.valid('json');
  const missing_skills = await gapAnalysis({ cv_embedding, target_embedding, limit });
  return c.json({ missing_skills }, 200);
});
