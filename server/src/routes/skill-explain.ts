import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  SkillExplainRequestSchema,
  SkillExplainResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { explainSkill } from '../services/aggregations/skill-explain.js';

const route = createRoute({
  method: 'post',
  path: '/skill-explain',
  tags: ['analysis'],
  summary: 'Explain why a missing skill was recommended',
  description: `For any (skill, target_role) pair, return the MongoDB-backed evidence: the
matching \`skill_transitions\` row, the role distribution of trajectories that picked up the
skill, up to 3 sample pivoters, plus the exact aggregation pipelines that produced each
section. Used by the "Why this skill?" drawer for radical transparency.`,
  request: {
    body: { content: { 'application/json': { schema: SkillExplainRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Skill explanation with pipeline transparency',
      content: { 'application/json': { schema: SkillExplainResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Internal error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

export const skillExplainApp = new OpenAPIHono().openapi(route, async (c) => {
  const { skill_name, target_role } = c.req.valid('json');
  const result = await explainSkill({ skill_name, target_role });
  return c.json(result, 200);
});
