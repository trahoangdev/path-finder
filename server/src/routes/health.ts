import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { HealthResponseSchema, ErrorResponseSchema } from '../schemas/index.js';
import { isMongoHealthy } from '../config/mongo.js';
import { isOpenAIHealthy } from '../services/openai.js';

const SERVICE_VERSION = '0.1.0';

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['system'],
  summary: 'Service health probe',
  description: 'Returns aggregate health of MongoDB Atlas + OpenAI connectivity.',
  responses: {
    200: {
      description: 'Service status',
      content: { 'application/json': { schema: HealthResponseSchema } },
    },
    500: {
      description: 'Server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

export const healthApp = new OpenAPIHono().openapi(healthRoute, async (c) => {
  const [db, ai] = await Promise.all([isMongoHealthy(), isOpenAIHealthy()]);
  const status: 'ok' | 'degraded' | 'down' =
    db && ai ? 'ok' : !db && !ai ? 'down' : 'degraded';

  return c.json(
    {
      status,
      version: SERVICE_VERSION,
      checks: { db, ai },
      timestamp: new Date().toISOString(),
    },
    200,
  );
});
