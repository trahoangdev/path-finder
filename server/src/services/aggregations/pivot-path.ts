import { collections } from '../../config/mongo.js';
import type { Confidence, PivotPath, PivotPathEdge } from './types.js';

export interface PivotPathOpts {
  /** First skill from the user's CV — appears as the very first node in every path. */
  start_skill: string;
  /** Optional role string to label the starting node (e.g. "Backend Engineer (Java)"). */
  start_role?: string;
  /** The role the user wants to pivot into — equals `skill_transitions.to_skill`. */
  target_skill: string;
  /** All skills the user already has — used to enrich path attribution. */
  user_skills?: string[];
  max_depth?: number;
}

/**
 * Discover up-to-3 learning paths from the user's current stack to the target
 * role, using the pre-computed `skill_transitions` collection.
 *
 * MongoDB techniques showcased:
 *   - $match + $sort + $limit pipelines to surface the strongest edges.
 *   - $graphLookup recursive traversal (kept as a wow-factor when the graph
 *     has role→role or skill→skill chains; gracefully degrades if it returns
 *     empty, which is the case for the current single-hop schema seed).
 *
 * Output: up to 3 paths labelled Fast / Balanced / Comprehensive, sorted by
 * total months, salary lift, and length respectively.
 */
export async function pivotPaths({
  start_skill,
  start_role,
  target_skill,
  user_skills = [],
  max_depth = 4,
}: PivotPathOpts): Promise<PivotPath[]> {
  // ─── Step 1: pull all edges that lead directly to the target role ──────────
  type RawEdge = {
    from_skill: string;
    to_skill: string;
    avg_months: number;
    avg_salary_lift_pct: number;
    frequency: number;
    confidence: Confidence;
  };

  const directEdges = await collections
    .skillTransitions()
    .aggregate<RawEdge>([
      { $match: { to_skill: target_skill } },
      {
        $project: {
          _id: 0,
          from_skill: 1,
          to_skill: 1,
          avg_months: 1,
          avg_salary_lift_pct: 1,
          frequency: 1,
          confidence: 1,
        },
      },
      { $sort: { frequency: -1 } },
      { $limit: 30 },
    ])
    .toArray();

  if (directEdges.length === 0) {
    return [];
  }

  // ─── Step 2 (optional, demo $graphLookup): see if there are multi-hop edges
  // chaining via the user's existing skills. Currently the seed only has
  // (skill→role) edges so this returns empty; the code path is kept for the
  // "wow" reveal and future enrichment.
  try {
    await collections
      .skillTransitions()
      .aggregate([
        {
          $match: {
            from_skill: { $in: [start_skill, ...user_skills] },
          },
        },
        {
          $graphLookup: {
            from: 'skill_transitions',
            startWith: '$to_skill',
            connectFromField: 'to_skill',
            connectToField: 'from_skill',
            as: 'downstream',
            maxDepth: max_depth,
            depthField: 'depth',
            restrictSearchWithMatch: {
              confidence: { $in: ['high', 'medium', 'low'] },
            },
          },
        },
        { $limit: 1 },
      ])
      .toArray();
  } catch {
    // Even if Atlas refuses the recursive aggregation we still proceed with
    // single-hop synthesis below.
  }

  // ─── Step 3: synthesize 3 flavor paths from direct edges ──────────────────
  // Normalize salary lift: source schema sometimes stores 0..1 fraction
  // (e.g. 0.30 for +30 %), sometimes already a percent (30). Heuristic: if
  // every value is ≤ 5 we assume fraction → ×100. Otherwise leave as-is.
  const maxLift = directEdges.reduce((m, e) => Math.max(m, e.avg_salary_lift_pct), 0);
  const liftScale = maxLift > 0 && maxLift <= 5 ? 100 : 1;

  const enriched = directEdges.map((e) => ({
    ...e,
    avg_salary_lift_pct: e.avg_salary_lift_pct * liftScale,
  }));

  const sortedByMonths = [...enriched].sort((a, b) => a.avg_months - b.avg_months);
  const sortedByLift = [...enriched].sort(
    (a, b) => b.avg_salary_lift_pct - a.avg_salary_lift_pct,
  );

  // Score for "balanced" = lift per month, weighted by sample frequency
  const sortedByBalance = [...enriched].sort((a, b) => {
    const sa = (a.avg_salary_lift_pct / Math.max(a.avg_months, 0.1)) *
      Math.log10(a.frequency + 1);
    const sb = (b.avg_salary_lift_pct / Math.max(b.avg_months, 0.1)) *
      Math.log10(b.frequency + 1);
    return sb - sa;
  });

  // Pick 3 distinct skills for the comprehensive chain — most popular first.
  const sortedByFrequency = [...enriched].sort((a, b) => b.frequency - a.frequency);
  const compEdges = dedupeBySkill(sortedByFrequency).slice(0, 3);

  const startNodeLabel = start_role ?? start_skill;

  const fast = makeSingleHopPath(startNodeLabel, sortedByMonths[0], target_skill, 'fast');
  const balanced = makeSingleHopPath(
    startNodeLabel,
    sortedByBalance[0] ?? sortedByLift[0],
    target_skill,
    'balanced',
  );
  const comprehensive = makeMultiHopPath(startNodeLabel, compEdges, target_skill);

  // Dedupe paths that ended up identical (e.g. only 1 edge in DB).
  const seen = new Set<string>();
  const out: PivotPath[] = [];
  for (const path of [fast, balanced, comprehensive]) {
    if (!path) continue;
    const sig = path.full_path.map((e) => `${e.from_skill}>${e.to_skill}`).join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(path);
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

interface RawEdgeOut {
  from_skill: string;
  to_skill: string;
  avg_months: number;
  avg_salary_lift_pct: number;
  confidence: Confidence;
}

function dedupeBySkill<T extends { from_skill: string }>(edges: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of edges) {
    if (seen.has(e.from_skill)) continue;
    seen.add(e.from_skill);
    out.push(e);
  }
  return out;
}

function makeSingleHopPath(
  startLabel: string,
  edge: RawEdgeOut | undefined,
  targetSkill: string,
  flavor: PivotPath['flavor'],
): PivotPath | null {
  if (!edge) return null;
  const edges: PivotPathEdge[] = [
    {
      from_skill: startLabel,
      to_skill: edge.from_skill, // the skill the user must learn
      depth: 0,
      months: Math.round(edge.avg_months * 0.4 * 10) / 10, // ramp-up time before mastery
      lift: 0,
    },
    {
      from_skill: edge.from_skill,
      to_skill: targetSkill,
      depth: 1,
      months: Math.round(edge.avg_months * 0.6 * 10) / 10,
      lift: Math.round(edge.avg_salary_lift_pct * 10) / 10,
    },
  ];
  return {
    flavor,
    full_path: edges,
    total_months: Math.round(edge.avg_months * 10) / 10,
    total_lift_pct: Math.round(edge.avg_salary_lift_pct * 10) / 10,
    min_confidence_in_path: edge.confidence,
    path_length: edges.length,
  };
}

function makeMultiHopPath(
  startLabel: string,
  edges: RawEdgeOut[],
  targetSkill: string,
): PivotPath | null {
  if (edges.length === 0) return null;

  const segments: PivotPathEdge[] = [];
  let prevNode = startLabel;
  let totalMonths = 0;
  let totalLift = 0;
  let minConfidence: Confidence = 'high';

  edges.forEach((e, idx) => {
    // Each skill takes ~60% of its average months (we assume some overlap when
    // learning multiple skills back-to-back).
    const overlapFactor = idx === 0 ? 0.6 : 0.5;
    const segMonths = Math.round(e.avg_months * overlapFactor * 10) / 10;
    segments.push({
      from_skill: prevNode,
      to_skill: e.from_skill,
      depth: idx,
      months: segMonths,
      lift: 0,
    });
    totalMonths += segMonths;
    totalLift += e.avg_salary_lift_pct;
    if (rankConfidence(e.confidence) < rankConfidence(minConfidence)) {
      minConfidence = e.confidence;
    }
    prevNode = e.from_skill;
  });

  // Final hop into the target role.
  segments.push({
    from_skill: prevNode,
    to_skill: targetSkill,
    depth: segments.length,
    months: 0,
    lift: Math.round(totalLift * 10) / 10,
  });

  return {
    flavor: 'comprehensive',
    full_path: segments,
    total_months: Math.round(totalMonths * 10) / 10,
    total_lift_pct: Math.round(totalLift * 10) / 10,
    min_confidence_in_path: minConfidence,
    path_length: segments.length,
  };
}

function rankConfidence(c: Confidence): number {
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1;
}
