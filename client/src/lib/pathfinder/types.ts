/**
 * Shape of every PathFinder API payload the client consumes.
 *
 * Mirrors the Zod schemas in `server/src/schemas/api.ts`. We keep this manual
 * (instead of generating from OpenAPI) because the surface is small and we want
 * zero new build-time deps.
 */

// ─── Shared primitives ───────────────────────────────────────────────────────

export type Confidence = "high" | "medium" | "low";

export type SeniorityLevel =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "manager";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface UserSkill {
  name: string;
  level: SkillLevel;
  years: number;
}

// ─── /health ─────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  checks: { db: boolean; ai: boolean };
  timestamp: string;
}

// ─── /api/extract-skills ─────────────────────────────────────────────────────

export interface ExtractedProfile {
  skills: UserSkill[];
  inferred_role?: string;
  inferred_years?: number;
}

// ─── /api/gap-analysis ───────────────────────────────────────────────────────

export interface MissingSkill {
  name: string;
  category: string;
  description: string;
  similarity: number;
  vn_demand_score: number;
  transition?: {
    avg_months?: number;
    avg_salary_lift_pct?: number;
    frequency?: number;
  } | null;
}

// ─── /api/pivot-paths ────────────────────────────────────────────────────────

export interface PivotPathEdge {
  from_skill: string;
  to_skill: string;
  depth: number;
  months?: number;
  lift?: number;
}

export interface PivotPath {
  flavor: "fast" | "balanced" | "comprehensive";
  full_path: PivotPathEdge[];
  total_months: number;
  total_lift_pct: number;
  min_confidence_in_path: Confidence;
  path_length: number;
}

// ─── /api/proof-drawer ───────────────────────────────────────────────────────

export interface ExampleProfile {
  anon_id: string;
  starting_role?: string;
  current_role: string;
  total_years_exp: number;
  ed_level?: string;
  source: string;
}

export interface ProofDrawerResponse {
  sample_size: number;
  conversion_rate: number; // 0..1
  salary_stats: {
    median_lift_pct: number;
    min_lift_pct: number;
    max_lift_pct: number;
    avg_months: number;
  };
  example_profiles: ExampleProfile[];
  confidence: Confidence;
  data_sources: string[];
}

// ─── /api/similar-devs ───────────────────────────────────────────────────────

export interface SimilarDevsGroup {
  role: string;
  count: number;
  avg_salary_usd: number | null;
}

// ─── /api/course-recommendations ─────────────────────────────────────────────

export interface CoursePublic {
  title: string;
  provider:
    | "coursera"
    | "udemy"
    | "learn.mongodb.com"
    | "freecodecamp"
    | "youtube"
    | "other";
  url: string;
  price_usd: number;
  duration_hours: number;
  level: SkillLevel;
  skills_taught: string[];
  description: string;
  rating: number;
  enrollment_count: number;
  is_mongodb_official: boolean;
  similarity?: number;
}

// ─── /api/skill-explain ──────────────────────────────────────────────────────

export interface SkillTransitionRow {
  from_skill: string;
  to_skill: string;
  edge_kind?: string;
  frequency?: number;
  avg_months?: number;
  avg_salary_lift_pct?: number;
  role_change_rate?: number;
  sample_size?: number;
  confidence?: Confidence;
  target_roles?: string[];
}

export interface SkillMetadata {
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  prerequisites?: string[];
  related_skills?: string[];
  popularity_rank?: number;
  is_emerging?: boolean;
  vn_demand_score?: number;
}

export interface RoleDistributionRow {
  role: string;
  count: number;
  avg_months?: number;
  avg_salary_lift_pct?: number;
}

export interface SampleTrajectory {
  anon_id: string;
  starting_role?: string;
  current_role: string;
  total_years_exp: number;
  comp_total_usd?: number;
  source: string;
  matched_pivot?: {
    from_role?: string;
    to_role?: string;
    months_to_pivot?: number;
    salary_lift_pct?: number;
    skills_learned?: string[];
  };
}

export interface SkillExplainRequest {
  skill_name: string;
  target_role: string;
}

export interface SkillExplainResponse {
  skill_name: string;
  target_role: string;
  metadata: SkillMetadata | null;
  transition_evidence: {
    direct: SkillTransitionRow | null;
    role_distribution: RoleDistributionRow[];
  };
  sample_trajectories: SampleTrajectory[];
  pipelines: {
    skill_transitions_pipeline: unknown[];
    skill_metadata_pipeline: unknown[];
    role_distribution_pipeline: unknown[];
    sample_trajectories_pipeline: unknown[];
  };
  aggregation_stages: string[];
}

// ─── /api/analyze (orchestrator) ─────────────────────────────────────────────

export interface AnalyzeRequest {
  cv_text: string;
  target_role: string;
}

export interface CoursesForSkill {
  skill: string;
  courses: CoursePublic[];
}

// ─── /api/analyze: salary band sub-tree ──────────────────────────────────────

export interface SalaryBandLevel {
  level: string;
  count: number;
  /** Average of `salary_min` across matches at this seniority (VND millions). */
  median_min_vnd: number;
  /** Average of `salary_max` across matches at this seniority (VND millions). */
  median_max_vnd: number;
  min_vnd: number;
  max_vnd: number;
}

export interface SalaryBandCompany {
  company: string;
  count: number;
  top_title: string;
  top_level?: string;
}

export interface SalaryBandSkill {
  skill: string;
  count: number;
}

export interface SalaryBandReport {
  target_role: string;
  total_matches: number;
  overall: {
    median_min_vnd: number;
    median_max_vnd: number;
    min_vnd: number;
    max_vnd: number;
  } | null;
  by_level: SalaryBandLevel[];
  top_companies: SalaryBandCompany[];
  top_required_skills: SalaryBandSkill[];
  source: string;
}

export interface PivotSalaryLift {
  to_role: string;
  sample_size: number;
  avg_months: number;
  median_lift_pct: number;
}

export interface AnalyzeResponse {
  profile: ExtractedProfile;
  gap_analysis: { missing_skills: MissingSkill[] };
  pivot_paths: { paths: PivotPath[] };
  proof_drawer: ProofDrawerResponse;
  similar_devs: { groups: SimilarDevsGroup[] };
  courses_by_skill: CoursesForSkill[];
  salary_band: SalaryBandReport;
  pivot_salary_lift: PivotSalaryLift[];
  timings_ms: {
    extract: number;
    embed: number;
    gap: number;
    paths: number;
    proof: number;
    similar: number;
    courses: number;
    salary: number;
    total: number;
  };
}

// ─── Standard error envelope ─────────────────────────────────────────────────

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
