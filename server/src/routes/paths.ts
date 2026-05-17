import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  PivotPathRequestSchema,
  PivotPathResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { pivotPaths } from '../services/aggregations/pivot-path.js';

const route = createRoute({
  method: 'post',
  path: '/pivot-paths',
  tags: ['analysis'],
  summary: 'Discover 3 pivot paths from start_skill → target_skill',
  description: `Uses MongoDB's \`$graphLookup\` operator to traverse the skill_transitions graph
recursively (up to max_depth hops), returning 3 path flavors: **fast** (shortest months),
**balanced** (best lift), **comprehensive** (longest, safest).`,
  request: {
    body: { content: { 'application/json': { schema: PivotPathRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Up to 3 pivot paths',
      content: { 'application/json': { schema: PivotPathResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Internal error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

export const pathsApp = new OpenAPIHono().openapi(route, async (c) => {
  const { start_skill, start_role, target_skill, max_depth } = c.req.valid('json');
  const paths = await pivotPaths({ start_skill, start_role, target_skill, max_depth });
  return c.json({ paths }, 200);
});
