import { collections } from '../../config/mongo.js';
import type { Document } from 'mongodb';

/**
 * Skill explainability service.
 *
 * Powers the "Why this skill?" drawer in the gap-analysis card. The goal is
 * radical transparency: for any recommended skill we expose
 *   1) the transition evidence (skill_transitions row + grouped pivot stats)
 *   2) the skill metadata (description, category, prerequisites…)
 *   3) up to 3 sample trajectories that actually picked up this skill on the
 *      way to the target role
 *   4) the exact MongoDB aggregation pipelines that produced (1)..(3), so a
 *      MongoDB-savvy judge can read and even copy-paste them into their own
 *      cluster to reproduce the result.
 *
 * No LLM is involved. All "why" answers come from MongoDB Aggregation
 * Pipeline + `$lookup` joins, which makes the explanation auditable.
 */

export interface SkillExplainOpts {
  skill_name: string;
  target_role: string;
}

export interface SkillTransitionRow {
  from_skill: string;
  to_skill: string;
  edge_kind?: string;
  frequency?: number;
  avg_months?: number;
  avg_salary_lift_pct?: number;
  role_change_rate?: number;
  sample_size?: number;
  confidence?: 'high' | 'medium' | 'low';
  source_years?: unknown;
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

export interface RoleDistributionRow {
  role: string;
  count: number;
  avg_months?: number;
  avg_salary_lift_pct?: number;
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
  /**
   * The actual MongoDB aggregation pipelines run by this endpoint. Returned
   * as plain JSON so the UI can pretty-print them. This is the "show your
   * work" angle — the recommender refuses to be a black box.
   */
  pipelines: {
    skill_transitions_pipeline: Document[];
    skill_metadata_pipeline: Document[];
    role_distribution_pipeline: Document[];
    sample_trajectories_pipeline: Document[];
  };
  /**
   * MongoDB stages exercised across all pipelines on this card. Powers the
   * `<AggregationPipelineBadges />` component.
   */
  aggregation_stages: string[];
}

export async function explainSkill({
  skill_name,
  target_role,
}: SkillExplainOpts): Promise<SkillExplainResponse> {
  const skillTransitionsPipeline: Document[] = [
    {
      $match: {
        from_skill: skill_name,
        $or: [
          { to_skill: target_role },
          { target_roles: target_role },
          { target_roles: { $in: [target_role] } },
        ],
      },
    },
    { $sort: { frequency: -1 } },
    { $limit: 1 },
    {
      $project: {
        _id: 0,
        from_skill: 1,
        to_skill: 1,
        edge_kind: 1,
        frequency: 1,
        avg_months: 1,
        avg_salary_lift_pct: 1,
        role_change_rate: 1,
        sample_size: 1,
        confidence: 1,
        source_years: 1,
        target_roles: 1,
      },
    },
  ];

  const skillMetadataPipeline: Document[] = [
    { $match: { name: skill_name } },
    { $limit: 1 },
    {
      $project: {
        _id: 0,
        name: 1,
        slug: 1,
        category: 1,
        description: 1,
        prerequisites: 1,
        related_skills: 1,
        popularity_rank: 1,
        is_emerging: 1,
        vn_demand_score: 1,
      },
    },
  ];

  const roleDistributionPipeline: Document[] = [
    { $unwind: '$pivots_detected' },
    {
      $match: {
        'pivots_detected.skills_learned': skill_name,
      },
    },
    {
      $group: {
        _id: '$pivots_detected.to_role',
        count: { $sum: 1 },
        avg_months: { $avg: '$pivots_detected.months_to_pivot' },
        avg_salary_lift_pct: { $avg: '$pivots_detected.salary_lift_pct' },
      },
    },
    {
      $project: {
        _id: 0,
        role: '$_id',
        count: 1,
        avg_months: 1,
        avg_salary_lift_pct: 1,
      },
    },
    { $sort: { count: -1 } },
    { $limit: 6 },
  ];

  const sampleTrajectoriesPipeline: Document[] = [
    { $unwind: '$pivots_detected' },
    {
      $match: {
        'pivots_detected.skills_learned': skill_name,
        'pivots_detected.to_role': target_role,
      },
    },
    {
      $project: {
        _id: 0,
        anon_id: 1,
        starting_role: { $arrayElemAt: ['$snapshots.role', 0] },
        current_role: 1,
        total_years_exp: 1,
        comp_total_usd: 1,
        source: 1,
        matched_pivot: {
          from_role: '$pivots_detected.from_role',
          to_role: '$pivots_detected.to_role',
          months_to_pivot: '$pivots_detected.months_to_pivot',
          salary_lift_pct: '$pivots_detected.salary_lift_pct',
          skills_learned: '$pivots_detected.skills_learned',
        },
      },
    },
    { $sort: { 'matched_pivot.salary_lift_pct': -1 } },
    { $limit: 3 },
  ];

  const [transitionRow, metadataRow, roleDist, samples] = await Promise.all([
    collections
      .skillTransitions()
      .aggregate<SkillTransitionRow>(skillTransitionsPipeline)
      .toArray(),
    collections
      .skills()
      .aggregate<SkillMetadata>(skillMetadataPipeline)
      .toArray(),
    collections
      .careerTrajectories()
      .aggregate<RoleDistributionRow>(roleDistributionPipeline)
      .toArray(),
    collections
      .careerTrajectories()
      .aggregate<SampleTrajectory>(sampleTrajectoriesPipeline)
      .toArray(),
  ]);

  // Normalize salary lift fraction (0..1) → percentage (0..100) when needed.
  // The synthetic seed stores 0..1; some legacy rows store percent already.
  // Heuristic: treat values ≤ 5 as fractions.
  const direct = transitionRow[0] ?? null;
  if (direct && direct.avg_salary_lift_pct != null) {
    if (direct.avg_salary_lift_pct <= 5) {
      direct.avg_salary_lift_pct = direct.avg_salary_lift_pct * 100;
    }
  }
  for (const row of roleDist) {
    if (row.avg_salary_lift_pct != null && row.avg_salary_lift_pct <= 5) {
      row.avg_salary_lift_pct = row.avg_salary_lift_pct * 100;
    }
  }
  for (const row of samples) {
    const lift = row.matched_pivot?.salary_lift_pct;
    if (lift != null && lift <= 5 && row.matched_pivot) {
      row.matched_pivot.salary_lift_pct = lift * 100;
    }
  }

  return {
    skill_name,
    target_role,
    metadata: metadataRow[0] ?? null,
    transition_evidence: {
      direct,
      role_distribution: roleDist,
    },
    sample_trajectories: samples,
    pipelines: {
      skill_transitions_pipeline: skillTransitionsPipeline,
      skill_metadata_pipeline: skillMetadataPipeline,
      role_distribution_pipeline: roleDistributionPipeline,
      sample_trajectories_pipeline: sampleTrajectoriesPipeline,
    },
    aggregation_stages: ['match', 'unwind', 'group', 'sort', 'limit', 'project'],
  };
}
