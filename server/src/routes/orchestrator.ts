import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { embed, extractSkillsFromCV } from '../services/openai.js';
import { gapAnalysis } from '../services/vector-search/skills.js';
import { pivotPaths } from '../services/aggregations/pivot-path.js';
import { proofDrawer } from '../services/aggregations/proof-drawer.js';
import { similarDevs } from '../services/vector-search/similar-devs.js';
import { BadRequestError } from '../lib/errors.js';

const route = createRoute({
  method: 'post',
  path: '/analyze',
  tags: ['analysis'],
  summary: 'End-to-end orchestrator: CV → all recommendations in one call',
  description: `One-shot pipeline:
1. Extract skills + role + years from CV (LLM).
2. Embed CV text and target role description.
3. In parallel: gap analysis, pivot paths, proof drawer, similar devs.
4. Aggregate timings + return combined payload for the dashboard.`,
  request: {
    body: { content: { 'application/json': { schema: AnalyzeRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Combined analysis payload',
      content: { 'application/json': { schema: AnalyzeResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Internal error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

export const orchestratorApp = new OpenAPIHono().openapi(route, async (c) => {
  const { cv_text, target_role } = c.req.valid('json');
  const t0 = performance.now();

  const profile = await extractSkillsFromCV(cv_text);
  const t1 = performance.now();

  const [cv_embedding, target_embedding] = await Promise.all([embed(cv_text), embed(target_role)]);
  const t2 = performance.now();

  const inferredRole = profile.inferred_role;
  if (!inferredRole) {
    throw new BadRequestError('Could not infer current role from CV');
  }

  // Pick the user's top skill as the pivot path "start_skill". For the demo MVP
  // we use the first skill emitted by the LLM; production can use a better
  // heuristic (most-used or highest-level skill).
  const startSkill = profile.skills[0]?.name ?? 'JavaScript';
  // Use the target role itself as a coarse "target_skill" — collection will
  // contain role-keyed transitions when seeded by ETL.
  const targetSkill = target_role;

  const [gap, paths, proof, similar] = await Promise.all([
    gapAnalysis({ cv_embedding, target_embedding, limit: 10 }).then((r) => ({
      result: r,
      t: performance.now(),
    })),
    pivotPaths({ start_skill: startSkill, target_skill: targetSkill, max_depth: 4 }).then((r) => ({
      result: r,
      t: performance.now(),
    })),
    proofDrawer({ from_role: inferredRole, to_role: target_role }).then((r) => ({
      result: r,
      t: performance.now(),
    })),
    similarDevs({ cv_embedding, limit: 50 }).then((r) => ({
      result: r,
      t: performance.now(),
    })),
  ]);
  const tFinal = performance.now();

  return c.json(
    {
      profile,
      gap_analysis: { missing_skills: gap.result },
      pivot_paths: { paths: paths.result },
      proof_drawer: proof.result,
      similar_devs: { groups: similar.result },
      timings_ms: {
        extract: Math.round(t1 - t0),
        embed: Math.round(t2 - t1),
        gap: Math.round(gap.t - t2),
        paths: Math.round(paths.t - t2),
        proof: Math.round(proof.t - t2),
        similar: Math.round(similar.t - t2),
        total: Math.round(tFinal - t0),
      },
    },
    200,
  );
});
