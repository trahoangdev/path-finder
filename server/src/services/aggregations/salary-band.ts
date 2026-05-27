import type { Document } from 'mongodb';
import { collections } from '../../config/mongo.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface SalaryBandOpts {
  /** Target role from the UI (free-form, e.g. "AI Engineer"). */
  target_role: string;
  /**
   * Skills associated with the target role — typically the top missing skills
   * from gap analysis. Used to widen the matching net beyond a simple title
   * match (e.g. an "AI Engineer" search also includes JDs that ask for
   * `LangChain` or `Vector Databases`).
   */
  target_skills?: string[];
}

/**
 * VN salary context for a target role, derived from the curated `jobs`
 * collection (ITViec sample by default).
 *
 * PRIMARY path — MongoDB Atlas Search (`$search`):
 *   The first stage is `$search` with a `compound` query that combines
 *   - a `text` operator on `title` (BM25 ranking on the role keyword set)
 *   - a `text` operator on `required_skills` (boosted when target_skills
 *     are passed in from gap analysis)
 *   This replaces the previous `$regex` approach, which couldn't tokenize,
 *   couldn't score, and didn't use any index. With `$search` we get Lucene
 *   tokenization, fuzzy matching, BM25 scoring and the JD's `searchScore`
 *   surfaces in the response so a judge can reason about ranking.
 *
 * FALLBACK path — `$match` + `$regex`:
 *   Kicks in if the Atlas Search index is missing (e.g. local Mongo, or
 *   `06_create_indexes.py` hasn't been run yet). Same shape, lower fidelity.
 *
 * MongoDB techniques showcased:
 *   - $search compound query (Atlas Search) with BM25 scoring
 *   - $facet: four independent aggregations in one round-trip
 *   - $group + $avg + $min/$max for range distribution
 */
export interface SalaryBandLevel {
  level: string;
  count: number;
  /** Average of `salary_min` across matches at this level (VND millions). */
  median_min_vnd: number;
  /** Average of `salary_max` across matches at this level (VND millions). */
  median_max_vnd: number;
  min_vnd: number;
  max_vnd: number;
}

export interface SalaryBandCompany {
  company: string;
  count: number;
  top_title: string;
  top_level?: string;
}

export interface SalaryBandSkill {
  skill: string;
  count: number;
}

export interface SalaryBandResult {
  target_role: string;
  total_matches: number;
  overall: {
    /** Average of `salary_min` across ALL matched jobs (VND millions). */
    median_min_vnd: number;
    /** Average of `salary_max` across ALL matched jobs (VND millions). */
    median_max_vnd: number;
    min_vnd: number;
    max_vnd: number;
  } | null;
  by_level: SalaryBandLevel[];
  top_companies: SalaryBandCompany[];
  top_required_skills: SalaryBandSkill[];
  source: string;
  /**
   * Which retrieval path produced this result. Surfaced so the UI can show
   * an "Atlas Search BM25" badge when available.
   */
  retrieval: 'atlas_search' | 'regex_fallback';
}

// Map a free-form target role to alternative title keywords seen on VN job
// boards. Used both by `$search` (as token list for the `text` operator) and
// by the regex fallback.
const ROLE_TITLE_KEYWORDS: Record<string, string[]> = {
  'ai engineer': ['AI Engineer', 'AI/ML', 'LLM', 'Generative AI', 'GenAI'],
  'machine learning engineer': ['Machine Learning', 'ML Engineer', 'MLE'],
  'ml engineer': ['Machine Learning', 'ML Engineer', 'MLE'],
  'data engineer': ['Data Engineer', 'ETL', 'Data Platform', 'Data Pipeline'],
  'data scientist': ['Data Scientist', 'Data Analyst', 'Analytics'],
  'devops engineer': ['DevOps', 'SRE', 'Site Reliability', 'Platform Engineer'],
  'cloud engineer': ['Cloud Engineer', 'Cloud Architect', 'AWS', 'GCP', 'Azure'],
  'solutions architect': ['Solutions Architect', 'Solution Architect', 'System Architect'],
  'engineering manager': ['Engineering Manager', 'Tech Lead', 'Team Lead'],
  'mobile engineer (react native)': ['Mobile', 'React Native', 'Android', 'iOS', 'Flutter'],
  'mobile developer': ['Mobile', 'React Native', 'Android', 'iOS', 'Flutter'],
  'full-stack engineer': ['Full-stack', 'Fullstack', 'Full Stack'],
  'full-stack developer': ['Full-stack', 'Fullstack', 'Full Stack'],
  'frontend developer': ['Frontend', 'Front-end', 'Front End'],
  'backend developer': ['Backend', 'Back-end', 'Back End'],
  'embedded engineer': ['Embedded', 'Firmware', 'IoT'],
  'qa automation engineer': ['QA', 'Test Automation', 'SDET', 'Quality Engineer'],
  'security engineer': ['Security', 'AppSec', 'DevSecOps', 'Cybersecurity'],
};

function titleKeywords(targetRole: string): string[] {
  const key = targetRole.toLowerCase().trim();
  return ROLE_TITLE_KEYWORDS[key] ?? [targetRole];
}

function buildTitleRegex(targetRole: string): string {
  // Escape regex special chars then OR them together.
  const escaped = titleKeywords(targetRole).map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  return escaped.join('|');
}

interface FacetOut {
  by_level: Array<{
    _id: string;
    count: number;
    median_min: number;
    median_max: number;
    min_vnd: number;
    max_vnd: number;
  }>;
  top_companies: Array<{
    _id: string;
    count: number;
    top_title: string;
    top_level: string;
  }>;
  top_skills: Array<{ _id: string; count: number }>;
  overall: Array<{
    n: number;
    median_min: number;
    median_max: number;
    min_vnd: number;
    max_vnd: number;
  }>;
}

const FACET_STAGE: Document = {
  $facet: {
    by_level: [
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 },
          median_min: { $avg: '$salary_min' },
          median_max: { $avg: '$salary_max' },
          min_vnd: { $min: '$salary_min' },
          max_vnd: { $max: '$salary_max' },
        },
      },
      { $sort: { median_max: 1 } },
    ],
    top_companies: [
      { $sort: { salary_max: -1 } },
      {
        $group: {
          _id: '$company',
          count: { $sum: 1 },
          top_title: { $first: '$title' },
          top_level: { $first: '$level' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ],
    top_skills: [
      { $unwind: '$required_skills' },
      { $group: { _id: '$required_skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ],
    overall: [
      {
        $group: {
          _id: null,
          n: { $sum: 1 },
          median_min: { $avg: '$salary_min' },
          median_max: { $avg: '$salary_max' },
          min_vnd: { $min: '$salary_min' },
          max_vnd: { $max: '$salary_max' },
        },
      },
    ],
  },
};

export async function salaryBand({
  target_role,
  target_skills = [],
}: SalaryBandOpts): Promise<SalaryBandResult> {
  // 1) Try Atlas Search first.
  try {
    const facets = await runAtlasSearchPipeline(target_role, target_skills);
    if (facets && (facets.overall[0]?.n ?? 0) > 0) {
      return projectResult(target_role, facets, 'atlas_search');
    }
    // No matches via $search — fall through to regex so we still return data
    // when the index exists but the query was too narrow.
  } catch (err) {
    // Common case: index doesn't exist yet (`IndexNotFound` / 27 / 31082).
    // We log once and degrade gracefully — the regex path still serves.
    logger.warn(
      { err, index: env.SEARCH_INDEX_JOBS },
      'salary-band: $search failed, falling back to regex',
    );
  }

  const facets = await runRegexPipeline(target_role, target_skills);
  return projectResult(target_role, facets, 'regex_fallback');
}

async function runAtlasSearchPipeline(
  targetRole: string,
  targetSkills: string[],
): Promise<FacetOut | null> {
  const keywords = titleKeywords(targetRole).join(' ');

  // `compound.should` lets a hit on EITHER title OR required_skills count.
  // `minimumShouldMatch: 1` enforces at-least-one — replacing the old `$or`.
  const should: Document[] = [
    {
      text: {
        query: keywords,
        path: 'title',
        score: { boost: { value: 5 } },
      },
    },
  ];
  if (targetSkills.length > 0) {
    should.push({
      text: {
        // Atlas Search `text` accepts a string OR array of strings.
        query: targetSkills,
        path: 'required_skills',
        score: { boost: { value: 3 } },
      },
    });
  }

  const cursor = collections.jobs().aggregate<FacetOut>([
    {
      $search: {
        index: env.SEARCH_INDEX_JOBS,
        compound: {
          should,
          minimumShouldMatch: 1,
        },
      },
    },
    {
      // Surface the BM25 score so consumers can render "matched via Atlas
      // Search (relevance: 0.42)" if needed. Not used downstream but cheap.
      $addFields: { search_score: { $meta: 'searchScore' } },
    },
    FACET_STAGE,
  ]);

  const out = (await cursor.toArray())[0];
  return out ?? null;
}

async function runRegexPipeline(
  targetRole: string,
  targetSkills: string[],
): Promise<FacetOut> {
  const titleRegex = buildTitleRegex(targetRole);
  const filter: Record<string, unknown> = {
    $or: [
      { title: { $regex: titleRegex, $options: 'i' } },
      ...(targetSkills.length > 0
        ? [{ required_skills: { $in: targetSkills } }]
        : []),
    ],
  };

  const cursor = collections
    .jobs()
    .aggregate<FacetOut>([{ $match: filter }, FACET_STAGE]);

  return (await cursor.toArray())[0] ?? emptyFacet();
}

function emptyFacet(): FacetOut {
  return { by_level: [], top_companies: [], top_skills: [], overall: [] };
}

function projectResult(
  targetRole: string,
  facets: FacetOut,
  retrieval: SalaryBandResult['retrieval'],
): SalaryBandResult {
  const overall = facets.overall[0]
    ? {
        median_min_vnd: round1(facets.overall[0].median_min),
        median_max_vnd: round1(facets.overall[0].median_max),
        min_vnd: facets.overall[0].min_vnd,
        max_vnd: facets.overall[0].max_vnd,
      }
    : null;

  return {
    target_role: targetRole,
    total_matches: facets.overall[0]?.n ?? 0,
    overall,
    by_level: facets.by_level.map((row) => ({
      level: row._id,
      count: row.count,
      median_min_vnd: round1(row.median_min),
      median_max_vnd: round1(row.median_max),
      min_vnd: row.min_vnd,
      max_vnd: row.max_vnd,
    })),
    top_companies: facets.top_companies.map((row) => ({
      company: row._id,
      count: row.count,
      top_title: row.top_title,
      top_level: row.top_level,
    })),
    top_required_skills: facets.top_skills.map((row) => ({
      skill: row._id,
      count: row.count,
    })),
    source: 'itviec_sample',
    retrieval,
  };
}

function round1(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.round(value * 10) / 10;
}
