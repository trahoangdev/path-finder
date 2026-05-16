import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  SimilarDevsRequestSchema,
  SimilarDevsResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { similarDevs } from '../services/vector-search/similar-devs.js';

const route = createRoute({
  method: 'post',
  path: '/similar-devs',
  tags: ['analysis'],
  summary: 'Find devs with similar past profiles and where they ended up',
  description: `Vector Search on \`career_trajectories.snapshots[].cv_embedding\` to locate
similar dev pasts (filtered by country), then aggregates current roles + avg salary.`,
  request: {
    body: { content: { 'application/json': { schema: SimilarDevsRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Top current-role distribution',
      content: { 'application/json': { schema: SimilarDevsResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Internal error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

export const similarApp = new OpenAPIHono().openapi(route, async (c) => {
  const { cv_embedding, limit } = c.req.valid('json');
  const groups = await similarDevs({ cv_embedding, limit });
  return c.json({ groups }, 200);
});
