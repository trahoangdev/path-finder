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

// ─── /api/analyze (orchestrator) ─────────────────────────────────────────────

export interface AnalyzeRequest {
  cv_text: string;
  target_role: string;
}

export interface CoursesForSkill {
  skill: string;
  courses: CoursePublic[];
}

export interface AnalyzeResponse {
  profile: ExtractedProfile;
  gap_analysis: { missing_skills: MissingSkill[] };
  pivot_paths: { paths: PivotPath[] };
  proof_drawer: ProofDrawerResponse;
  similar_devs: { groups: SimilarDevsGroup[] };
  courses_by_skill: CoursesForSkill[];
  timings_ms: {
    extract: number;
    embed: number;
    gap: number;
    paths: number;
    proof: number;
    similar: number;
    courses: number;
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
