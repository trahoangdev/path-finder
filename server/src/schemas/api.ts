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

// ─── /skill-explain ─────────────────────────────────────────────────────────

export const SkillExplainRequestSchema = z
  .object({
    skill_name: z.string().min(1).max(120),
    target_role: z.string().min(1).max(120),
  })
  .openapi('SkillExplainRequest');

const SkillTransitionRowSchema = z
  .object({
    from_skill: z.string(),
    to_skill: z.string(),
    edge_kind: z.string().optional(),
    frequency: z.number().optional(),
    avg_months: z.number().optional(),
    avg_salary_lift_pct: z.number().optional(),
    role_change_rate: z.number().optional(),
    sample_size: z.number().optional(),
    confidence: ConfidenceSchema.optional(),
    target_roles: z.array(z.string()).optional(),
  })
  .openapi('SkillTransitionRow');

const SkillMetadataSchema = z
  .object({
    name: z.string(),
    slug: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    prerequisites: z.array(z.string()).optional(),
    related_skills: z.array(z.string()).optional(),
    popularity_rank: z.number().optional(),
    is_emerging: z.boolean().optional(),
    vn_demand_score: z.number().optional(),
  })
  .openapi('SkillMetadata');

const RoleDistributionRowSchema = z
  .object({
    role: z.string(),
    count: z.number().int(),
    avg_months: z.number().optional(),
    avg_salary_lift_pct: z.number().optional(),
  })
  .openapi('RoleDistributionRow');

const SampleTrajectorySchema = z
  .object({
    anon_id: z.string(),
    starting_role: z.string().optional(),
    current_role: z.string(),
    total_years_exp: z.number(),
    comp_total_usd: z.number().optional(),
    source: z.string(),
    matched_pivot: z
      .object({
        from_role: z.string().optional(),
        to_role: z.string().optional(),
        months_to_pivot: z.number().optional(),
        salary_lift_pct: z.number().optional(),
        skills_learned: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .openapi('SampleTrajectory');

export const SkillExplainResponseSchema = z
  .object({
    skill_name: z.string(),
    target_role: z.string(),
    metadata: SkillMetadataSchema.nullable(),
    transition_evidence: z.object({
      direct: SkillTransitionRowSchema.nullable(),
      role_distribution: z.array(RoleDistributionRowSchema),
    }),
    sample_trajectories: z.array(SampleTrajectorySchema),
    pipelines: z.object({
      skill_transitions_pipeline: z.array(z.unknown()),
      skill_metadata_pipeline: z.array(z.unknown()),
      role_distribution_pipeline: z.array(z.unknown()),
      sample_trajectories_pipeline: z.array(z.unknown()),
    }),
    aggregation_stages: z.array(z.string()),
  })
  .openapi('SkillExplainResponse');

// ─── /pivot-paths ────────────────────────────────────────────────────────────

export const PivotPathRequestSchema = z
  .object({
    start_skill: z.string().min(1),
    start_role: z.string().min(1).optional(),
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

export const CoursesBySkillSchema = z
  .array(
    z.object({
      skill: z.string(),
      courses: z.array(CoursePublicSchema),
    }),
  )
  .openapi('CoursesBySkill');

// ─── /analyze: salary band + post-pivot lift (UC-5 + market context) ──────

export const SalaryBandLevelSchema = z
  .object({
    level: z.string(),
    count: z.number().int(),
    median_min_vnd: z.number(),
    median_max_vnd: z.number(),
    min_vnd: z.number(),
    max_vnd: z.number(),
  })
  .openapi('SalaryBandLevel');

export const SalaryBandCompanySchema = z
  .object({
    company: z.string(),
    count: z.number().int(),
    top_title: z.string(),
    top_level: z.string().optional(),
  })
  .openapi('SalaryBandCompany');

export const SalaryBandSkillSchema = z
  .object({
    skill: z.string(),
    count: z.number().int(),
  })
  .openapi('SalaryBandSkill');

export const SalaryBandReportSchema = z
  .object({
    target_role: z.string(),
    total_matches: z.number().int(),
    overall: z
      .object({
        median_min_vnd: z.number(),
        median_max_vnd: z.number(),
        min_vnd: z.number(),
        max_vnd: z.number(),
      })
      .nullable(),
    by_level: z.array(SalaryBandLevelSchema),
    top_companies: z.array(SalaryBandCompanySchema),
    top_required_skills: z.array(SalaryBandSkillSchema),
    source: z.string(),
    /**
     * Which retrieval path produced the result. `atlas_search` means the
     * Lucene-backed `$search` index served the query (BM25 ranking);
     * `regex_fallback` means the index was unavailable and the legacy
     * `$match` + `$regex` pipeline was used instead.
     */
    retrieval: z.enum(['atlas_search', 'regex_fallback']).default('regex_fallback'),
  })
  .openapi('SalaryBandReport');

export const PivotSalaryLiftSchema = z
  .object({
    to_role: z.string(),
    sample_size: z.number().int(),
    avg_months: z.number(),
    median_lift_pct: z.number(),
  })
  .openapi('PivotSalaryLift');

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
    courses_by_skill: CoursesBySkillSchema,
    salary_band: SalaryBandReportSchema,
    pivot_salary_lift: z.array(PivotSalaryLiftSchema),
    timings_ms: z.object({
      extract: z.number(),
      embed: z.number(),
      gap: z.number(),
      paths: z.number(),
      proof: z.number(),
      similar: z.number(),
      courses: z.number(),
      salary: z.number(),
      total: z.number(),
    }),
  })
  .openapi('AnalyzeResponse');
