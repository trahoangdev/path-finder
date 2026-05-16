import { z } from '@hono/zod-openapi';
import { ConfidenceSchema } from './common.js';

export const SkillTransitionDocSchema = z
  .object({
    _id: z.unknown().optional(),
    from_skill: z.string().min(1),
    to_skill: z.string().min(1),
    frequency: z.number().int().nonnegative(),
    avg_months: z.number().nonnegative(),
    median_months: z.number().nonnegative(),
    avg_salary_lift_pct: z.number(),
    role_change_rate: z.number().min(0).max(1),
    sample_size: z.number().int().nonnegative(),
    confidence: ConfidenceSchema,
    computed_at: z.date(),
    source_years: z.array(z.number().int()).default([]),
  })
  .openapi('SkillTransition');

export type SkillTransitionDoc = z.infer<typeof SkillTransitionDocSchema>;
