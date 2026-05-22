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
 *   - $match with $in + $setIntersection overlap on array field
 *   - $group to collect matched lifts/months, then exact median in service code
 */
export async function salaryInference({
  skills_learned,
  countries = ['Vietnam', 'Singapore', 'SEA'],
}: SalaryInferenceOpts): Promise<SalaryInferenceResult[]> {
  if (skills_learned.length === 0) return [];

  type RawRow = { _id: string; sample_size: number; months: number[]; lifts: number[] };

  const cursor = collections.careerTrajectories().aggregate<RawRow>([
    { $match: { country: { $in: countries } } },
    { $unwind: '$pivots_detected' },
    { $match: { 'pivots_detected.skill_added': { $in: skills_learned } } },
    {
      $addFields: {
        overlap_count: {
          $size: {
            $setIntersection: ['$pivots_detected.skill_added', skills_learned],
          },
        },
      },
    },
    {
      $group: {
        _id: '$pivots_detected.to_role',
        sample_size: { $sum: 1 },
        months: { $push: '$pivots_detected.months_taken' },
        lifts: { $push: '$pivots_detected.salary_lift_pct' },
        avg_overlap: { $avg: '$overlap_count' },
      },
    },
    { $match: { sample_size: { $gte: 3 } } },
    { $sort: { avg_overlap: -1, sample_size: -1 } },
    { $limit: 10 },
  ]);

  const rows = await cursor.toArray();
  return rows
    .map((r) => {
      const lifts = r.lifts.map(normalizePct);
      return {
        to_role: r._id,
        sample_size: r.sample_size,
        avg_months: average(r.months),
        median_lift_pct: median(lifts),
      };
    })
    .sort((a, b) => b.median_lift_pct - a.median_lift_pct);
}

function normalizePct(value: number): number {
  return value > 0 && value <= 5 ? value * 100 : value;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
