import { collections } from '../../config/mongo.js';
import { env } from '../../config/env.js';
import type { MissingSkill } from '../../schemas/api.js';

/**
 * Gap analysis via Vector Search.
 *
 * Idea: compute "gap vector" = target_emb − cv_emb, then search the `skills`
 * collection for skills semantically closest to that gap direction. Those are
 * the missing skills the user needs to learn to reach the target role.
 *
 * MongoDB techniques showcased:
 *   - $vectorSearch with pre-filter (category, is_emerging)
 *   - $lookup → skill_transitions for evidence enrichment
 */
export interface GapAnalysisOpts {
  cv_embedding: number[];
  target_embedding: number[];
  limit?: number;
}

export async function gapAnalysis({
  cv_embedding,
  target_embedding,
  limit = 10,
}: GapAnalysisOpts): Promise<MissingSkill[]> {
  const gap = target_embedding.map((v, i) => v - (cv_embedding[i] ?? 0));

  const cursor = collections.skills().aggregate<MissingSkill>([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_SKILLS,
        path: 'description_embedding',
        queryVector: gap,
        numCandidates: Math.max(100, limit * 10),
        limit,
        filter: {
          category: { $in: ['framework', 'tool', 'concept', 'cloud'] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        name: 1,
        category: 1,
        description: 1,
        vn_demand_score: 1,
        similarity: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $lookup: {
        from: 'skill_transitions',
        let: { skillName: '$name' },
        pipeline: [
          { $match: { $expr: { $eq: ['$to_skill', '$$skillName'] } } },
          { $sort: { frequency: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 0,
              avg_months: 1,
              avg_salary_lift_pct: 1,
              frequency: 1,
            },
          },
        ],
        as: 'transition_info',
      },
    },
    {
      $addFields: {
        transition: { $arrayElemAt: ['$transition_info', 0] },
      },
    },
    { $project: { transition_info: 0 } },
  ]);

  return cursor.toArray();
}
