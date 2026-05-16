import { collections } from '../../config/mongo.js';

export interface SalaryBandOpts {
  /** Target role from the UI (free-form, e.g. "AI Engineer"). */
  target_role: string;
  /**
   * Skills associated with the target role — typically the top missing skills
   * from gap analysis. Used to widen the matching net beyond a simple title
   * regex (e.g. an "AI Engineer" search also includes JDs that ask for
   * `LangChain` or `Vector Databases`).
   */
  target_skills?: string[];
}

/**
 * VN salary context for a target role, derived from the curated `jobs`
 * collection (ITViec sample by default).
 *
 * Single-roundtrip `$facet` pipeline returns four facets:
 *   - `by_level`        — VND salary range bucketed by seniority
 *   - `top_companies`   — companies with the most matching listings
 *   - `top_skills`      — most-requested `required_skills` across matches
 *   - `overall`         — aggregate stats + total match count (`n`)
 *
 * MongoDB techniques showcased:
 *   - $regex title match for the role keyword
 *   - $or composite filter that ALSO admits skill-overlap matches
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
}

// Map a free-form target role to alternative title keywords seen on VN job
// boards. Search uses the union as an `$or` regex over `title`.
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

function buildTitleRegex(targetRole: string): string {
  const key = targetRole.toLowerCase().trim();
  const keywords = ROLE_TITLE_KEYWORDS[key] ?? [targetRole];
  // Escape regex special chars then OR them together.
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return escaped.join('|');
}

export async function salaryBand({
  target_role,
  target_skills = [],
}: SalaryBandOpts): Promise<SalaryBandResult> {
  const titleRegex = buildTitleRegex(target_role);

  type FacetOut = {
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
  };

  const filter: Record<string, unknown> = {
    $or: [
      { title: { $regex: titleRegex, $options: 'i' } },
      ...(target_skills.length > 0
        ? [{ required_skills: { $in: target_skills } }]
        : []),
    ],
  };

  const cursor = collections.jobs().aggregate<FacetOut>([
    { $match: filter },
    {
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
    },
  ]);

  const facets = (await cursor.toArray())[0];
  if (!facets) {
    return {
      target_role,
      total_matches: 0,
      overall: null,
      by_level: [],
      top_companies: [],
      top_required_skills: [],
      source: 'itviec_sample',
    };
  }

  const overall = facets.overall[0]
    ? {
        median_min_vnd: round1(facets.overall[0].median_min),
        median_max_vnd: round1(facets.overall[0].median_max),
        min_vnd: facets.overall[0].min_vnd,
        max_vnd: facets.overall[0].max_vnd,
      }
    : null;

  return {
    target_role,
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
  };
}

function round1(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.round(value * 10) / 10;
}
