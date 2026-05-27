import { collections } from '../../config/mongo.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { CoursePublic } from '../../schemas/course.js';

export interface CourseRecOpts {
  skill_name: string;
  skill_embedding: number[];
  limit?: number;
  free_only?: boolean;
}

/**
 * Recommend courses that teach a given skill, ranked by hybrid search
 * (semantic + lexical) using Reciprocal Rank Fusion (RRF).
 *
 * PRIMARY path — Hybrid Search (`$vectorSearch` + `$unionWith($search)`):
 *   Two retrieval lanes are merged with RRF, the canonical pattern from
 *   "Perform Hybrid Search with MongoDB Vector Search and MongoDB Search"
 *   in the official docs.
 *
 *     score = sum_lanes( weight_lane / (k + rank_lane) )      (k = 60)
 *
 *   - Vector lane:   $vectorSearch on `description_embedding`     (semantic)
 *   - Lexical lane:  $search compound:
 *                      • text on `skills_taught`  (exact taxonomy hit)
 *                      • text on `title`          (token match)
 *                      • text on `description`    (broader context)
 *
 *   The lexical lane is what replaces the previous hand-rolled
 *   `exact_match` / `token_match` $regexMatch fields. It runs in Lucene with
 *   BM25, returns proper ranks, and feeds RRF — which is the merge function
 *   MongoDB's hybrid-search docs recommend.
 *
 * FALLBACK path — Vector-only:
 *   If the Atlas Search index doesn't exist (local Mongo, or
 *   `06_create_indexes.py` hasn't been run yet), we degrade to the previous
 *   behavior: pure $vectorSearch with a small soft boost for documents
 *   whose `skills_taught` literally contains the canonical skill name.
 *
 * MongoDB techniques showcased:
 *   - $vectorSearch with pre-filter (price, MongoDB official)
 *   - $search compound query (Atlas Search, BM25 ranking)
 *   - $unionWith to merge two pipelines on the same collection
 *   - Reciprocal Rank Fusion via $group + $sum
 */
export async function recommendCourses({
  skill_name,
  skill_embedding,
  limit = 3,
  free_only = false,
}: CourseRecOpts): Promise<CoursePublic[]> {
  try {
    const hybrid = await runHybridSearch({
      skill_name,
      skill_embedding,
      limit,
      free_only,
    });
    if (hybrid.length > 0) return hybrid;
  } catch (err) {
    logger.warn(
      { err, index: env.SEARCH_INDEX_COURSES },
      'recommendCourses: hybrid $search failed, falling back to vector-only',
    );
  }
  return runVectorOnly({ skill_name, skill_embedding, limit, free_only });
}

// ─── Hybrid path ────────────────────────────────────────────────────────────

interface RankedCourse extends CoursePublic {
  rrf_score: number;
}

const RRF_K = 60;
const VECTOR_WEIGHT = 0.6;
const LEXICAL_WEIGHT = 0.4;

async function runHybridSearch({
  skill_name,
  skill_embedding,
  limit,
  free_only,
}: CourseRecOpts & { limit: number }): Promise<CoursePublic[]> {
  const candidatePoolPerLane = Math.max(limit * 10, 30);
  const filter = buildVectorFilter(Boolean(free_only));

  // Lexical lane match: same price/official filter applied as a $match after
  // $search since $search itself doesn't do equality filters cheaply for
  // mixed numeric/boolean filters here.
  const lexicalPostFilter = buildLexicalPostFilter(Boolean(free_only));

  const cursor = collections.courses().aggregate<RankedCourse>([
    // ─── Lane A: vector search (semantic) ─────────────────────────────────
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_COURSES,
        path: 'description_embedding',
        queryVector: skill_embedding,
        // Recommended: 10–20× limit. Use the candidate pool size directly.
        numCandidates: Math.max(candidatePoolPerLane * 10, 200),
        limit: candidatePoolPerLane,
        filter,
      },
    },
    {
      $group: {
        _id: null,
        docs: {
          $push: {
            doc: '$$ROOT',
            score: { $meta: 'vectorSearchScore' },
          },
        },
      },
    },
    { $unwind: { path: '$docs', includeArrayIndex: 'rank' } },
    {
      $project: {
        _id: '$docs.doc._id',
        doc: '$docs.doc',
        rrf_contribution: {
          $divide: [VECTOR_WEIGHT, { $add: [RRF_K, '$rank'] }],
        },
      },
    },

    // ─── Lane B: lexical search (Atlas $search), merged via $unionWith ────
    {
      $unionWith: {
        coll: 'courses',
        pipeline: [
          {
            $search: {
              index: env.SEARCH_INDEX_COURSES,
              compound: {
                should: [
                  // Exact taxonomy hit — strongest lexical signal.
                  {
                    text: {
                      query: skill_name,
                      path: 'skills_taught',
                      score: { boost: { value: 5 } },
                    },
                  },
                  {
                    text: {
                      query: skill_name,
                      path: 'title',
                      score: { boost: { value: 3 } },
                    },
                  },
                  {
                    text: {
                      query: skill_name,
                      path: 'description',
                    },
                  },
                ],
                minimumShouldMatch: 1,
              },
            },
          },
          ...(lexicalPostFilter ? [{ $match: lexicalPostFilter }] : []),
          { $limit: candidatePoolPerLane },
          {
            $group: {
              _id: null,
              docs: { $push: '$$ROOT' },
            },
          },
          { $unwind: { path: '$docs', includeArrayIndex: 'rank' } },
          {
            $project: {
              _id: '$docs._id',
              doc: '$docs',
              rrf_contribution: {
                $divide: [LEXICAL_WEIGHT, { $add: [RRF_K, '$rank'] }],
              },
            },
          },
        ],
      },
    },

    // ─── Fuse: sum RRF contributions per doc ─────────────────────────────
    {
      $group: {
        _id: '$_id',
        doc: { $first: '$doc' },
        rrf_score: { $sum: '$rrf_contribution' },
      },
    },
    { $sort: { rrf_score: -1 } },
    { $limit: limit },
    {
      $replaceWith: {
        $mergeObjects: ['$doc', { rrf_score: '$rrf_score' }],
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
        // Surface the fused score under the existing `similarity` field so
        // the client/UI keeps rendering without a schema change.
        similarity: '$rrf_score',
      },
    },
  ]);

  return cursor.toArray();
}

function buildVectorFilter(freeOnly: boolean): Record<string, unknown> {
  if (freeOnly) return { price_usd: 0 };
  return {
    $or: [
      { is_mongodb_official: true },
      { price_usd: 0 },
      { price_usd: { $lte: 50 } },
    ],
  };
}

function buildLexicalPostFilter(freeOnly: boolean): Record<string, unknown> | null {
  // Match the vector lane's pre-filter so both lanes operate on the same
  // candidate space.
  if (freeOnly) return { price_usd: 0 };
  return {
    $or: [
      { is_mongodb_official: true },
      { price_usd: 0 },
      { price_usd: { $lte: 50 } },
    ],
  };
}

// ─── Fallback (vector-only) ────────────────────────────────────────────────

async function runVectorOnly({
  skill_name,
  skill_embedding,
  limit,
  free_only,
}: CourseRecOpts & { limit: number }): Promise<CoursePublic[]> {
  const filter = buildVectorFilter(Boolean(free_only));

  const cursor = collections.courses().aggregate<CoursePublic>([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_COURSES,
        path: 'description_embedding',
        queryVector: skill_embedding,
        numCandidates: Math.max(limit * 20, 200),
        limit: Math.max(limit * 5, 15),
        filter,
      },
    },
    {
      $addFields: {
        similarity: { $meta: 'vectorSearchScore' },
        // Soft boost: course's canonical skill list contains the requested
        // skill name. Without Atlas Search this is the best lexical signal
        // we have.
        exact_match: {
          $cond: [{ $in: [skill_name, { $ifNull: ['$skills_taught', []] }] }, 1, 0],
        },
      },
    },
    { $sort: { exact_match: -1, similarity: -1 } },
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
