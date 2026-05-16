import { collections } from '../../config/mongo.js';
import type { Confidence, ProofDrawerResult } from './types.js';

export interface ProofDrawerOpts {
  from_role: string;
  to_role: string;
  skills_learned?: string[];
}

/**
 * Compute proof-drawer evidence in a single round-trip.
 *
 * MongoDB techniques showcased:
 *   - $facet to run 4 independent sub-pipelines (count, conversion, salary, examples)
 *   - $cond / $switch for confidence calculation
 *   - $sample for random anonymous examples
 */
export async function proofDrawer({
  from_role,
  to_role,
  skills_learned = [],
}: ProofDrawerOpts): Promise<ProofDrawerResult> {
  type FacetOut = {
    sample_size: Array<{ n: number }>;
    conversion: Array<{
      total_with_intent: number;
      total_completed: number;
    }>;
    salary_stats: Array<{
      median_lift: number;
      min_lift: number;
      max_lift: number;
      avg_months: number;
    }>;
    examples: Array<{
      anon_id: string;
      starting_role: string;
      current_role: string;
      total_years_exp: number;
      ed_level?: string;
      source: string;
    }>;
    sources: Array<{ source: string }>;
  };

  const skillsMatch =
    skills_learned.length > 0
      ? { 'pivots_detected.skill_added': { $all: skills_learned } }
      : {};

  const cursor = collections.careerTrajectories().aggregate<FacetOut>([
    {
      $match: {
        'snapshots.role': from_role,
      },
    },
    {
      $facet: {
        sample_size: [
          { $match: { 'pivots_detected.to_role': to_role } },
          { $count: 'n' },
        ],
        conversion: [
          {
            $group: {
              _id: null,
              total_with_intent: {
                $sum: { $cond: [{ $in: [to_role, '$snapshots.skills_want'] }, 1, 0] },
              },
              total_completed: {
                $sum: { $cond: [{ $eq: ['$current_role', to_role] }, 1, 0] },
              },
            },
          },
          { $project: { _id: 0, total_with_intent: 1, total_completed: 1 } },
        ],
        salary_stats: [
          { $unwind: '$pivots_detected' },
          { $match: { 'pivots_detected.to_role': to_role, ...skillsMatch } },
          {
            $group: {
              _id: null,
              median_lift: { $avg: '$pivots_detected.salary_lift_pct' },
              min_lift: { $min: '$pivots_detected.salary_lift_pct' },
              max_lift: { $max: '$pivots_detected.salary_lift_pct' },
              avg_months: { $avg: '$pivots_detected.months_taken' },
            },
          },
          { $project: { _id: 0 } },
        ],
        examples: [
          { $match: { 'pivots_detected.to_role': to_role } },
          { $sample: { size: 3 } },
          {
            $project: {
              _id: 0,
              anon_id: 1,
              starting_role: { $arrayElemAt: ['$snapshots.role', 0] },
              current_role: 1,
              total_years_exp: 1,
              ed_level: 1,
              source: 1,
            },
          },
        ],
        sources: [
          { $group: { _id: '$source' } },
          { $project: { _id: 0, source: '$_id' } },
        ],
      },
    },
  ]);

  const [raw] = await cursor.toArray();
  if (!raw) {
    return emptyProof();
  }

  const n = raw.sample_size[0]?.n ?? 0;
  const conv = raw.conversion[0];
  const conversion_rate =
    conv && conv.total_with_intent > 0 ? conv.total_completed / conv.total_with_intent : 0;
  const salary = raw.salary_stats[0] ?? {
    median_lift: 0,
    min_lift: 0,
    max_lift: 0,
    avg_months: 0,
  };

  const confidence: Confidence = n >= 100 ? 'high' : n >= 30 ? 'medium' : 'low';

  return {
    sample_size: n,
    conversion_rate,
    salary_stats: {
      median_lift_pct: salary.median_lift,
      min_lift_pct: salary.min_lift,
      max_lift_pct: salary.max_lift,
      avg_months: salary.avg_months,
    },
    example_profiles: raw.examples,
    confidence,
    data_sources: raw.sources.map((s) => s.source),
  };
}

function emptyProof(): ProofDrawerResult {
  return {
    sample_size: 0,
    conversion_rate: 0,
    salary_stats: { median_lift_pct: 0, min_lift_pct: 0, max_lift_pct: 0, avg_months: 0 },
    example_profiles: [],
    confidence: 'low',
    data_sources: [],
  };
}
