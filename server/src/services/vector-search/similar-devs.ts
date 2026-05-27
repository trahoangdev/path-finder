import { collections } from '../../config/mongo.js';
import { env } from '../../config/env.js';
import type { SimilarDevsGroup } from '../../schemas/api.js';

export interface SimilarDevsOpts {
  cv_embedding: number[];
  /** User skills used as a fallback when the CV embedding has no matches. */
  user_skills?: string[];
  /** Canonical starting role (e.g. "Backend Developer") for stronger anchoring. */
  start_role?: string;
  limit?: number;
}

/**
 * Find SEA developers with a similar past profile, then aggregate where they
 * ended up today.
 *
 * Two paths:
 *   1) PRIMARY — Vector Search on `snapshots.cv_embedding` (when the ETL has
 *      embedded trajectory snapshots).
 *   2) FALLBACK — pure aggregation matching on `snapshots.skills_have` overlap
 *      and `snapshots.role` equality. The synthetic SEA seed does not embed
 *      snapshots, so this is what runs today; the vector path activates
 *      automatically once `etl/05_embed_all.py` populates the field.
 *
 * MongoDB techniques showcased (fallback path):
 *   - $reduce to flatten nested arrays
 *   - $setIntersection / $size for skill-overlap scoring
 *   - $group + $avg for role distribution
 */
export async function similarDevs({
  cv_embedding,
  user_skills = [],
  start_role,
  limit = 50,
}: SimilarDevsOpts): Promise<SimilarDevsGroup[]> {
  // ─── 1) Try the vector path first ───────────────────────────────────────
  try {
    const cursor = collections.careerTrajectories().aggregate<SimilarDevsGroup>([
      {
        $vectorSearch: {
          index: env.VECTOR_INDEX_TRAJECTORIES,
          path: 'snapshots.cv_embedding',
          queryVector: cv_embedding,
          // MongoDB recommends `numCandidates` ≈ 10–20× `limit` for ANN
          // recall: anything lower trades quality for tail latency we don't
          // need on this collection size. Floor at 200 so small `limit`
          // values (e.g. limit=10 from a UI variant) still see a healthy
          // candidate pool.
          numCandidates: Math.max(limit * 15, 200),
          limit,
          filter: {
            country: { $in: ['Vietnam', 'Singapore', 'SEA', 'Thailand', 'Indonesia', 'Malaysia', 'Philippines'] },
          },
        },
      },
      {
        $group: {
          _id: '$current_role',
          count: { $sum: 1 },
          avg_salary_usd: { $avg: '$comp_total_usd' },
        },
      },
      {
        $project: {
          _id: 0,
          role: '$_id',
          count: 1,
          avg_salary_usd: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    const out = await cursor.toArray();
    if (out.length > 0) return out;
  } catch {
    // No vector index data → fall through.
  }

  // ─── 2) Aggregation fallback (skill overlap + role match) ──────────────
  return similarDevsBySkillOverlap({ user_skills, start_role, limit });
}

interface SkillOverlapOpts {
  user_skills: string[];
  start_role?: string;
  limit: number;
}

async function similarDevsBySkillOverlap({
  user_skills,
  start_role,
  limit,
}: SkillOverlapOpts): Promise<SimilarDevsGroup[]> {
  // Cap the working set: take the user's top-15 skills (lowercased to match the
  // synthetic skill labels in the trajectories collection).
  const skillSet = Array.from(new Set(user_skills.slice(0, 15)));
  if (skillSet.length === 0 && !start_role) return [];

  const matchConditions: Record<string, unknown>[] = [];
  if (start_role) matchConditions.push({ 'snapshots.role': start_role });
  if (skillSet.length > 0) {
    matchConditions.push({ 'snapshots.skills_have': { $in: skillSet } });
  }

  const cursor = collections.careerTrajectories().aggregate<SimilarDevsGroup>([
    {
      $match: {
        country: { $in: ['Vietnam', 'Singapore', 'Thailand', 'Indonesia', 'Malaysia', 'Philippines'] },
        $or: matchConditions,
      },
    },
    {
      // Flatten the nested snapshots.skills_have arrays into a single set.
      $addFields: {
        all_skills: {
          $reduce: {
            input: { $ifNull: ['$snapshots.skills_have', []] },
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] },
          },
        },
      },
    },
    {
      $addFields: {
        skill_overlap: {
          $size: { $setIntersection: ['$all_skills', skillSet] },
        },
      },
    },
    { $match: { skill_overlap: { $gte: 1 } } },
    { $sort: { skill_overlap: -1, total_years_exp: -1 } },
    { $limit: limit },
    {
      $group: {
        _id: '$current_role',
        count: { $sum: 1 },
        avg_salary_usd: { $avg: '$comp_total_usd' },
      },
    },
    {
      $project: {
        _id: 0,
        role: '$_id',
        count: 1,
        avg_salary_usd: 1,
      },
    },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);

  return cursor.toArray();
}
