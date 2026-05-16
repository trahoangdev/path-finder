import { collections } from '../../config/mongo.js';
import type { SalaryInferenceResult } from './types.js';

export interface SalaryInferenceOpts {
  skills_learned: string[];
  countries?: string[];
}

/**
 * Infer expected salary lift and time-to-pivot after acquiring a set of skills.
 *
 * MongoDB techniques:
 *   - $unwind on pivots_detected
 *   - $match with $all operator on array field
 *   - $group + $avg for median (approximation)
 */
export async function salaryInference({
  skills_learned,
  countries = ['Vietnam', 'Singapore', 'SEA'],
}: SalaryInferenceOpts): Promise<SalaryInferenceResult[]> {
  if (skills_learned.length === 0) return [];

  type RawRow = { _id: string; sample_size: number; avg_months: number; median_lift: number };

  const cursor = collections.careerTrajectories().aggregate<RawRow>([
    { $match: { country: { $in: countries } } },
    { $unwind: '$pivots_detected' },
    { $match: { 'pivots_detected.skill_added': { $all: skills_learned } } },
    {
      $group: {
        _id: '$pivots_detected.to_role',
        sample_size: { $sum: 1 },
        avg_months: { $avg: '$pivots_detected.months_taken' },
        median_lift: { $avg: '$pivots_detected.salary_lift_pct' },
      },
    },
    { $match: { sample_size: { $gte: 3 } } },
    { $sort: { median_lift: -1 } },
    { $limit: 10 },
  ]);

  const rows = await cursor.toArray();
  return rows.map((r) => ({
    to_role: r._id,
    sample_size: r.sample_size,
    avg_months: r.avg_months,
    median_lift_pct: r.median_lift,
  }));
}
