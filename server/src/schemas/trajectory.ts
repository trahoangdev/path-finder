import { z } from '@hono/zod-openapi';

import { EmbeddingVectorSchema } from './common.js';

export const SalaryBandSchema = z
  .enum(['<10tr', '10-20tr', '20-30tr', '30-50tr', '>50tr'])
  .openapi('SalaryBand');

export const TrajectorySnapshotSchema = z
  .object({
    estimated_year: z.number().int().min(2000).max(2100),
    role: z.string(),
    skills_have: z.array(z.string()),
    skills_want: z.array(z.string()),
    cv_embedding: EmbeddingVectorSchema.optional(),
    salary_band: SalaryBandSchema.optional(),
  })
  .openapi('TrajectorySnapshot');

export type TrajectorySnapshot = z.infer<typeof TrajectorySnapshotSchema>;

export const DetectedPivotSchema = z
  .object({
    from_role: z.string(),
    to_role: z.string(),
    skill_added: z.array(z.string()),
    months_taken: z.number().nonnegative(),
    salary_lift_pct: z.number(),
  })
  .openapi('DetectedPivot');

export type DetectedPivot = z.infer<typeof DetectedPivotSchema>;

export const CareerTrajectoryDocSchema = z
  .object({
    _id: z.unknown().optional(),
    anon_id: z.string(),
    source: z.enum(['so_2023', 'so_2024', 'synthetic_vn']),
    country: z.string(),
    current_role: z.string(),
    total_years_exp: z.number().nonnegative(),
    comp_total_usd: z.number().nullable().optional(),
    ed_level: z.string().optional(),
    snapshots: z.array(TrajectorySnapshotSchema),
    pivots_detected: z.array(DetectedPivotSchema).default([]),
  })
  .openapi('CareerTrajectory');

export type CareerTrajectoryDoc = z.infer<typeof CareerTrajectoryDocSchema>;
