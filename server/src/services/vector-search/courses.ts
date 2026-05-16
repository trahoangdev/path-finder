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
 *   - $match (post-filter) for exact skill match
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
    filter.$or = [{ is_mongodb_official: true }, { price_usd: 0 }, { price_usd: { $lte: 50 } }];
  }

  const cursor = collections.courses().aggregate<CoursePublic>([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_COURSES,
        path: 'description_embedding',
        queryVector: skill_embedding,
        numCandidates: Math.max(50, limit * 10),
        limit: limit * 3, // over-fetch then post-filter
        filter,
      },
    },
    {
      $match: {
        skills_taught: skill_name,
      },
    },
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
        similarity: { $meta: 'vectorSearchScore' },
      },
    },
    { $limit: limit },
  ]);

  return cursor.toArray();
}
