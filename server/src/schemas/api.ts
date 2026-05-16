import { z } from '@hono/zod-openapi';
import { ConfidenceSchema, EmbeddingVectorSchema } from './common.js';
import { UserSkillSchema } from './user.js';
import { CoursePublicSchema } from './course.js';

// ─── /health ─────────────────────────────────────────────────────────────────

export const HealthResponseSchema = z
  .object({
    status: z.enum(['ok', 'degraded', 'down']),
    version: z.string(),
    checks: z.object({
      db: z.boolean(),
      ai: z.boolean(),
    }),
    timestamp: z.string(),
  })
  .openapi('HealthResponse');

// ─── /extract-skills ─────────────────────────────────────────────────────────

export const ExtractSkillsRequestSchema = z
  .object({
    cv_text: z.string().min(50, 'CV text must be at least 50 chars').max(8000),
  })
  .openapi('ExtractSkillsRequest');

export const ExtractSkillsResponseSchema = z
  .object({
    skills: z.array(UserSkillSchema),
    inferred_role: z.string().optional(),
    inferred_years: z.number().optional(),
  })
  .openapi('ExtractSkillsResponse');

// ─── /embed ──────────────────────────────────────────────────────────────────

export const EmbedRequestSchema = z
  .object({
    text: z.string().min(1).max(8000),
  })
  .openapi('EmbedRequest');

export const EmbedResponseSchema = z
  .object({
    embedding: EmbeddingVectorSchema,
    model: z.string(),
    dimensions: z.number().int(),
  })
  .openapi('EmbedResponse');

// ─── /gap-analysis ───────────────────────────────────────────────────────────

export const GapAnalysisRequestSchema = z
  .object({
    cv_embedding: EmbeddingVectorSchema,
    target_embedding: EmbeddingVectorSchema,
    limit: z.number().int().min(1).max(50).default(10),
  })
  .openapi('GapAnalysisRequest');

export const MissingSkillSchema = z
  .object({
    name: z.string(),
    category: z.string(),
    description: z.string(),
    similarity: z.number(),
    vn_demand_score: z.number(),
    transition: z
      .object({
        avg_months: z.number().optional(),
        avg_salary_lift_pct: z.number().optional(),
        frequency: z.number().optional(),
      })
      .nullable()
      .optional(),
  })
  .openapi('MissingSkill');

export type MissingSkill = z.infer<typeof MissingSkillSchema>;

export const GapAnalysisResponseSchema = z
  .object({
    missing_skills: z.array(MissingSkillSchema),
  })
  .openapi('GapAnalysisResponse');

// ─── /pivot-paths ────────────────────────────────────────────────────────────

export const PivotPathRequestSchema = z
  .object({
    start_skill: z.string().min(1),
    target_skill: z.string().min(1),
    max_depth: z.number().int().min(1).max(6).default(4),
  })
  .openapi('PivotPathRequest');

export const PivotPathEdgeSchema = z
  .object({
    from_skill: z.string(),
    to_skill: z.string(),
    depth: z.number().int(),
    months: z.number().optional(),
    lift: z.number().optional(),
  })
  .openapi('PivotPathEdge');

export const PivotPathSchema = z
  .object({
    flavor: z.enum(['fast', 'balanced', 'comprehensive']),
    full_path: z.array(PivotPathEdgeSchema),
    total_months: z.number(),
    total_lift_pct: z.number(),
    min_confidence_in_path: ConfidenceSchema,
    path_length: z.number().int(),
  })
  .openapi('PivotPath');

export const PivotPathResponseSchema = z
  .object({
    paths: z.array(PivotPathSchema),
  })
  .openapi('PivotPathResponse');

// ─── /proof-drawer ───────────────────────────────────────────────────────────

export const ProofDrawerRequestSchema = z
  .object({
    from_role: z.string().min(1),
    to_role: z.string().min(1),
    skills_learned: z.array(z.string()).default([]),
  })
  .openapi('ProofDrawerRequest');

export const ExampleProfileSchema = z
  .object({
    anon_id: z.string(),
    starting_role: z.string().optional(),
    current_role: z.string(),
    total_years_exp: z.number(),
    ed_level: z.string().optional(),
    source: z.string(),
  })
  .openapi('ExampleProfile');

export const ProofDrawerResponseSchema = z
  .object({
    sample_size: z.number().int(),
    conversion_rate: z.number().min(0).max(1),
    salary_stats: z.object({
      median_lift_pct: z.number(),
      min_lift_pct: z.number(),
      max_lift_pct: z.number(),
      avg_months: z.number(),
    }),
    example_profiles: z.array(ExampleProfileSchema),
    confidence: ConfidenceSchema,
    data_sources: z.array(z.string()),
  })
  .openapi('ProofDrawerResponse');

// ─── /similar-devs ───────────────────────────────────────────────────────────

export const SimilarDevsRequestSchema = z
  .object({
    cv_embedding: EmbeddingVectorSchema,
    limit: z.number().int().min(1).max(100).default(50),
  })
  .openapi('SimilarDevsRequest');

export const SimilarDevsGroupSchema = z
  .object({
    role: z.string(),
    count: z.number().int(),
    avg_salary_usd: z.number().nullable(),
  })
  .openapi('SimilarDevsGroup');

export type SimilarDevsGroup = z.infer<typeof SimilarDevsGroupSchema>;

export const SimilarDevsResponseSchema = z
  .object({
    groups: z.array(SimilarDevsGroupSchema),
  })
  .openapi('SimilarDevsResponse');

// ─── /course-recommendations ─────────────────────────────────────────────────

export const CourseRecRequestSchema = z
  .object({
    skill_name: z.string().min(1),
    skill_embedding: EmbeddingVectorSchema,
    limit: z.number().int().min(1).max(20).default(3),
    free_only: z.boolean().default(false),
  })
  .openapi('CourseRecRequest');

export const CourseRecResponseSchema = z
  .object({
    courses: z.array(CoursePublicSchema),
  })
  .openapi('CourseRecResponse');

// ─── /analyze (orchestrator) ─────────────────────────────────────────────────

export const AnalyzeRequestSchema = z
  .object({
    cv_text: z.string().min(50).max(8000),
    target_role: z.string().min(1),
  })
  .openapi('AnalyzeRequest');

export const AnalyzeResponseSchema = z
  .object({
    profile: z.object({
      skills: z.array(UserSkillSchema),
      inferred_role: z.string().optional(),
      inferred_years: z.number().optional(),
    }),
    gap_analysis: GapAnalysisResponseSchema,
    pivot_paths: PivotPathResponseSchema,
    proof_drawer: ProofDrawerResponseSchema,
    similar_devs: SimilarDevsResponseSchema,
    timings_ms: z.object({
      extract: z.number(),
      embed: z.number(),
      gap: z.number(),
      paths: z.number(),
      proof: z.number(),
      similar: z.number(),
      total: z.number(),
    }),
  })
  .openapi('AnalyzeResponse');
