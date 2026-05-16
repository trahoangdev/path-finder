import { collections } from '../../config/mongo.js';
import { env } from '../../config/env.js';
import type { SimilarDevsGroup } from '../../schemas/api.js';

export interface SimilarDevsOpts {
  cv_embedding: number[];
  limit?: number;
}

/**
 * Find devs with a similar past profile, then aggregate where they ended up today.
 *
 * MongoDB techniques showcased:
 *   - $vectorSearch on a nested field (snapshots[].cv_embedding)
 *   - $group to compute role distribution
 */
export async function similarDevs({
  cv_embedding,
  limit = 50,
}: SimilarDevsOpts): Promise<SimilarDevsGroup[]> {
  const cursor = collections.careerTrajectories().aggregate<SimilarDevsGroup>([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_TRAJECTORIES,
        path: 'snapshots.cv_embedding',
        queryVector: cv_embedding,
        numCandidates: limit * 4,
        limit,
        filter: {
          country: { $in: ['Vietnam', 'Singapore', 'SEA', 'Thailand', 'Indonesia'] },
        },
      },
    },
    {
      $project: {
        current_role: 1,
        total_years_exp: 1,
        comp_total_usd: 1,
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
    { $limit: 5 },
  ]);

  return cursor.toArray();
}
