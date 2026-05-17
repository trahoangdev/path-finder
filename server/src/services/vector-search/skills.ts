import { collections } from '../../config/mongo.js';
import { env } from '../../config/env.js';
import type { MissingSkill } from '../../schemas/api.js';

export interface GapAnalysisOpts {
  cv_embedding: number[];
  target_embedding: number[];
  /** Skills the user already has — excluded from the gap output. */
  user_skills?: string[];
  /** Canonical target role label, used to query `skill_transitions`. */
  target_role?: string;
  limit?: number;
}

interface SkillInfo {
  description?: string;
  category?: string;
  vn_demand_score?: number;
}

interface TransitionRow {
  from_skill: string;
  avg_months?: number;
  avg_salary_lift_pct?: number;
  frequency?: number;
  skill_info?: SkillInfo;
}

/**
 * Gap analysis — surface the skills the user must learn to reach the target.
 *
 * Two retrieval paths run in parallel and are merged:
 *
 *   1) EVIDENCE-FIRST (`skill_transitions` → target_role)
 *      The pre-computed `skill_transitions` collection contains curated edges
 *      `(skill → role)` derived from real trajectory data. Skills that have
 *      actually moved people into the target role are the most trustworthy
 *      "gap" signal. We join with `skills` to pull description / category.
 *
 *   2) SEMANTIC FALLBACK (`$vectorSearch` on `skills`)
 *      For free-form targets or to fill the list when `skill_transitions` is
 *      sparse, we vector-search the `skills` collection against the rich
 *      target prompt. Roadmap.sh-style junk titles are filtered out.
 *
 * The merge is dedupe-by-name with evidence rows winning on tie.
 *
 * MongoDB techniques showcased:
 *   - $vectorSearch with pre-filter and post-filter
 *   - $lookup with `let` + `$expr` for cross-collection enrichment
 *   - $match/$regex composite filters to scrub noisy taxonomy entries
 */
export async function gapAnalysis({
  target_embedding,
  user_skills = [],
  target_role,
  limit = 10,
}: GapAnalysisOpts): Promise<MissingSkill[]> {
  const userSkillsLower = new Set(user_skills.map((s) => s.toLowerCase()));

  const [evidence, semantic] = await Promise.all([
    target_role ? evidenceGap(target_role, limit) : Promise.resolve<MissingSkill[]>([]),
    semanticGap(target_embedding, limit),
  ]);

  // Evidence first (high-trust), then dedupe-append semantic suggestions.
  const seen = new Set<string>();
  const merged: MissingSkill[] = [];
  for (const row of [...evidence, ...semantic]) {
    const key = row.name.toLowerCase();
    if (userSkillsLower.has(key) || seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
    if (merged.length >= limit) break;
  }
  return merged;
}

async function evidenceGap(targetRole: string, limit: number): Promise<MissingSkill[]> {
  type Row = TransitionRow & {
    skill_info?: SkillInfo;
  };

  const rows = await collections
    .skillTransitions()
    .aggregate<Row>([
      {
        $match: {
          to_skill: targetRole,
          $or: [{ edge_kind: 'skill_to_role' }, { edge_kind: { $exists: false } }],
        },
      },
      { $sort: { frequency: -1, avg_salary_lift_pct: -1 } },
      { $limit: Math.max(limit * 2, 12) },
      {
        $lookup: {
          from: 'skills',
          let: { skName: '$from_skill' },
          pipeline: [
            { $match: { $expr: { $eq: ['$name', '$$skName'] } } },
            { $limit: 1 },
            {
              $project: {
                _id: 0,
                description: 1,
                category: 1,
                vn_demand_score: 1,
              },
            },
          ],
          as: 'skill_info',
        },
      },
      {
        $addFields: {
          skill_info: { $arrayElemAt: ['$skill_info', 0] },
        },
      },
      {
        $project: {
          _id: 0,
          from_skill: 1,
          avg_months: 1,
          avg_salary_lift_pct: 1,
          frequency: 1,
          skill_info: 1,
        },
      },
    ])
    .toArray();

  if (rows.length === 0) return [];

  // Normalize salary lift: source stores 0..1 fraction OR % depending on
  // pivot pipeline version. Heuristic: max ≤ 5 ⇒ fraction.
  const maxLift = rows.reduce(
    (m, r) => Math.max(m, r.avg_salary_lift_pct ?? 0),
    0,
  );
  const liftScale = maxLift > 0 && maxLift <= 5 ? 100 : 1;
  // Normalize "similarity" using frequency log-scale so values fall in [0, 1].
  const maxFreq = rows.reduce((m, r) => Math.max(m, r.frequency ?? 0), 1);

  return rows.map((r) => ({
    name: r.from_skill,
    category: r.skill_info?.category ?? 'concept',
    description:
      r.skill_info?.description ??
      `${r.from_skill} — a skill that ${r.frequency ?? 0} devs added to pivot into ${targetRole}.`,
    similarity: 0.5 + 0.5 * Math.log10((r.frequency ?? 1) + 1) / Math.log10(maxFreq + 1),
    vn_demand_score: r.skill_info?.vn_demand_score ?? 0,
    transition: {
      avg_months: r.avg_months,
      avg_salary_lift_pct: (r.avg_salary_lift_pct ?? 0) * liftScale,
      frequency: r.frequency,
    },
  }));
}

async function semanticGap(
  targetEmbedding: number[],
  limit: number,
): Promise<MissingSkill[]> {
  const cursor = collections.skills().aggregate<MissingSkill>([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_SKILLS,
        path: 'description_embedding',
        queryVector: targetEmbedding,
        numCandidates: Math.max(400, limit * 30),
        limit: Math.max(limit * 6, 60),
        filter: {
          category: { $in: ['framework', 'tool', 'concept', 'cloud', 'language'] },
        },
      },
    },
    {
      // Aggressive junk-name filter: drop tutorial titles, Sanity-style IDs,
      // and obvious single-word ambiguous nouns the scrape swept up.
      $match: {
        $and: [
          { name: { $not: { $regex: '\\?' } } },
          { name: { $not: { $regex: '^(What|How|When|Why|Learn|Understanding|Intro|Introduction|Fundamentals|Basics|Overview|Guide|Tutorial|Getting Started|About)\\b', $options: 'i' } } },
          // Sanity CDN IDs: 15+ chars of base62/underscore with no spaces.
          { name: { $not: { $regex: '^[A-Za-z0-9_]{15,}$' } } },
          // Obvious off-topic single-word nouns.
          { name: { $not: { $regex: '^(Apache|Mode|General|Misc|Other|Operators|Glossary|Topics|Roadmap|Econometrics)$', $options: 'i' } } },
          { $expr: { $gte: [{ $strLenCP: '$name' }, 2] } },
        ],
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
          { $match: { $expr: { $eq: ['$from_skill', '$$skillName'] } } },
          {
            $match: {
              $or: [{ edge_kind: 'skill_to_role' }, { edge_kind: { $exists: false } }],
            },
          },
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
    { $limit: Math.max(limit * 2, 20) },
  ]);

  return cursor.toArray();
}
