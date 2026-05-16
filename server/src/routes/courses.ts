import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  CourseRecRequestSchema,
  CourseRecResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { recommendCourses } from '../services/vector-search/courses.js';

const route = createRoute({
  method: 'post',
  path: '/course-recommendations',
  tags: ['analysis'],
  summary: 'Recommend courses that teach a target skill',
  description: `Hybrid Vector Search: pre-filter on price + MongoDB official, post-filter on
exact skill match. Returns top-K courses ranked by semantic similarity to the skill embedding.`,
  request: {
    body: { content: { 'application/json': { schema: CourseRecRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Top-K courses',
      content: { 'application/json': { schema: CourseRecResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Internal error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

export const coursesApp = new OpenAPIHono().openapi(route, async (c) => {
  const { skill_name, skill_embedding, limit, free_only } = c.req.valid('json');
  const courses = await recommendCourses({ skill_name, skill_embedding, limit, free_only });
  return c.json({ courses }, 200);
});
