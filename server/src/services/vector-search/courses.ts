import { collections } from '../../config/mongo.js';
import { env } from '../../config/env.js';
import type { CoursePublic } from '../../schemas/course.js';

export interface CourseRecOpts {
  skill_name: string;
  skill_embedding: number[];
  limit?: number;
  free_only?: boolean;
}

/**
 * Recommend courses that teach a given skill, ranked by semantic similarity.
 *
 * MongoDB techniques:
 *   - $vectorSearch with `filter` (pre-filter price + MongoDB official)
 *   - $addFields to score exact / fuzzy matches against `skills_taught`
 *   - $sort on a composite (exact_match desc, similarity desc) for hybrid ranking
 *
 * Why no strict $match on skills_taught? The course catalog uses canonical
 * skill names (e.g. "MongoDB Vector Search", "Aggregation Pipeline") while
 * the gap analysis surfaces semantically-related skill names (e.g. "Vector
 * Databases"). Falling back to vector similarity ranking keeps results
 * relevant without dropping every row to zero.
 */
export async function recommendCourses({
  skill_name,
  skill_embedding,
  limit = 3,
  free_only = false,
}: CourseRecOpts): Promise<CoursePublic[]> {
  const filter: Record<string, unknown> = {};
  if (free_only) {
    filter.price_usd = 0;
  } else {
    filter.$or = [
      { is_mongodb_official: true },
      { price_usd: 0 },
      { price_usd: { $lte: 50 } },
    ];
  }

  const lower = skill_name.toLowerCase();
  const tokens = lower.split(/[^a-z0-9+#.]+/i).filter((t) => t.length >= 3);

  const cursor = collections.courses().aggregate<CoursePublic>([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_COURSES,
        path: 'description_embedding',
        queryVector: skill_embedding,
        numCandidates: Math.max(100, limit * 20),
        limit: Math.max(limit * 5, 15),
        filter,
      },
    },
    {
      $addFields: {
        similarity: { $meta: 'vectorSearchScore' },
        // exact_match = 1 when the canonical skill name appears in skills_taught.
        exact_match: {
          $cond: [{ $in: [skill_name, { $ifNull: ['$skills_taught', []] }] }, 1, 0],
        },
      },
    },
    {
      $addFields: {
        // token_match = 1 when any tokenized form of the skill matches the
        // lowercased title / description — gives a soft boost without
        // collapsing the candidate pool.
        token_match: tokens.length === 0
          ? 0
          : {
              $cond: [
                {
                  $regexMatch: {
                    input: { $concat: [{ $toLower: '$title' }, ' ', { $toLower: '$description' }] },
                    regex: tokens.join('|'),
                  },
                },
                1,
                0,
              ],
            },
      },
    },
    {
      $sort: { exact_match: -1, token_match: -1, similarity: -1 },
    },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        title: 1,
        provider: 1,
        url: 1,
        price_usd: 1,
        duration_hours: 1,
        level: 1,
        skills_taught: 1,
        description: 1,
        rating: 1,
        enrollment_count: 1,
        is_mongodb_official: 1,
        similarity: 1,
      },
    },
  ]);

  return cursor.toArray();
}
