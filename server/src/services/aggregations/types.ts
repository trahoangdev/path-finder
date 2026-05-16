/**
 * Internal types shared between aggregation services.
 * Mirror the public schemas in src/schemas/api.ts but live in services/ so
 * services don't depend on API DTO modules circularly.
 */

export type Confidence = 'high' | 'medium' | 'low';

export interface PivotPathEdge {
  from_skill: string;
  to_skill: string;
  depth: number;
  months?: number;
  lift?: number;
}

export interface PivotPath {
  flavor: 'fast' | 'balanced' | 'comprehensive';
  full_path: PivotPathEdge[];
  total_months: number;
  total_lift_pct: number;
  min_confidence_in_path: Confidence;
  path_length: number;
}

export interface ProofDrawerResult {
  sample_size: number;
  conversion_rate: number;
  salary_stats: {
    median_lift_pct: number;
    min_lift_pct: number;
    max_lift_pct: number;
    avg_months: number;
  };
  example_profiles: Array<{
    anon_id: string;
    starting_role?: string;
    current_role: string;
    total_years_exp: number;
    ed_level?: string;
    source: string;
  }>;
  confidence: Confidence;
  data_sources: string[];
}

export interface SalaryInferenceResult {
  to_role: string;
  sample_size: number;
  avg_months: number;
  median_lift_pct: number;
}
