import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  ProofDrawerRequestSchema,
  ProofDrawerResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { proofDrawer } from '../services/aggregations/proof-drawer.js';

const route = createRoute({
  method: 'post',
  path: '/proof-drawer',
  tags: ['analysis'],
  summary: 'Evidence for "Why this recommendation?" UX',
  description: `Single \`$facet\` aggregation that returns sample size, conversion rate, salary
lift distribution, 3 anonymized example profiles, and confidence — all in one round-trip.`,
  request: {
    body: { content: { 'application/json': { schema: ProofDrawerRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Proof drawer payload',
      content: { 'application/json': { schema: ProofDrawerResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Internal error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

export const proofApp = new OpenAPIHono().openapi(route, async (c) => {
  const { from_role, to_role, skills_learned } = c.req.valid('json');
  const result = await proofDrawer({ from_role, to_role, skills_learned });
  return c.json(result, 200);
});
