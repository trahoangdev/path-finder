import { collections } from '../../config/mongo.js';
import type { Confidence, PivotPath, PivotPathEdge } from './types.js';

export interface PivotPathOpts {
  /** First skill from the user's CV; used when there is no normalized role. */
  start_skill: string;
  /** Canonical current role; preferred graph root when available. */
  start_role?: string;
  /** Target role node in the transition graph. */
  target_skill: string;
  /** Existing user skills are kept for fallback synthesis only. */
  user_skills?: string[];
  max_depth?: number;
}

type EdgeKind = 'role_to_skill' | 'skill_to_skill' | 'skill_to_role';

interface RawEdge {
  from_skill: string;
  to_skill: string;
  edge_kind?: EdgeKind;
  target_roles?: string[];
  avg_months: number;
  avg_salary_lift_pct: number;
  frequency: number;
  confidence: Confidence;
}

interface ReachableSeed extends RawEdge {
  downstream?: RawEdge[];
}

interface CandidatePath {
  edges: RawEdge[];
  total_months: number;
  total_lift_pct: number;
  min_confidence: Confidence;
  support: number;
}

/**
 * Discover up-to-3 real learning paths through the pre-computed transition
 * graph. `$graphLookup` is now the primary retrieval path:
 *
 *   current role -> learned skill -> ... -> target role
 *
 * If an old database still has only legacy `skill -> role` edges, the service
 * falls back to the previous direct-edge synthesis so the API degrades instead
 * of going dark before ETL is re-run.
 */
export async function pivotPaths({
  start_skill,
  start_role,
  target_skill,
  user_skills = [],
  max_depth = 4,
}: PivotPathOpts): Promise<PivotPath[]> {
  const graphStart = start_role ?? start_skill;
  const graphCandidates = await graphLookupPaths({
    start_node: graphStart,
    target_node: target_skill,
    max_depth,
  });

  if (graphCandidates.length > 0) {
    return selectGraphFlavors(graphCandidates);
  }

  return synthesizeLegacyPaths({
    start_skill,
    start_role,
    target_skill,
    user_skills,
  });
}

async function graphLookupPaths({
  start_node,
  target_node,
  max_depth,
}: {
  start_node: string;
  target_node: string;
  max_depth: number;
}): Promise<CandidatePath[]> {
  const seeds = await collections
    .skillTransitions()
    .aggregate<ReachableSeed>([
      {
        $match: {
          from_skill: start_node,
          target_roles: target_node,
          $or: [{ edge_kind: 'role_to_skill' }, { edge_kind: { $exists: false } }],
        },
      },
      {
        $graphLookup: {
          from: 'skill_transitions',
          startWith: '$to_skill',
          connectFromField: 'to_skill',
          connectToField: 'from_skill',
          as: 'downstream',
          maxDepth: Math.max(max_depth - 1, 0),
          depthField: 'depth',
          restrictSearchWithMatch: {
            confidence: { $in: ['high', 'medium', 'low'] },
            target_roles: target_node,
          },
        },
      },
      {
        $project: {
          _id: 0,
          from_skill: 1,
          to_skill: 1,
          edge_kind: 1,
          target_roles: 1,
          avg_months: 1,
          avg_salary_lift_pct: 1,
          frequency: 1,
          confidence: 1,
          downstream: 1,
        },
      },
    ])
    .toArray();

  if (seeds.length === 0) return [];

  const allEdges = dedupeEdges(
    seeds.flatMap((seed) => [stripDownstream(seed), ...(seed.downstream ?? [])]),
  );
  const adjacency = new Map<string, RawEdge[]>();
  for (const edge of allEdges) {
    const list = adjacency.get(edge.from_skill) ?? [];
    list.push(edge);
    adjacency.set(edge.from_skill, list);
  }

  const found: RawEdge[][] = [];
  dfs({
    node: start_node,
    target: target_node,
    adjacency,
    path: [],
    visited: new Set([start_node]),
    max_depth,
    found,
  });

  return found
    .map(toCandidatePath)
    .sort((a, b) => {
      const months = a.total_months - b.total_months;
      if (months !== 0) return months;
      const lift = b.total_lift_pct - a.total_lift_pct;
      if (lift !== 0) return lift;
      return b.support - a.support;
    });
}

function dfs({
  node,
  target,
  adjacency,
  path,
  visited,
  max_depth,
  found,
}: {
  node: string;
  target: string;
  adjacency: Map<string, RawEdge[]>;
  path: RawEdge[];
  visited: Set<string>;
  max_depth: number;
  found: RawEdge[][];
}): void {
  if (path.length > max_depth) return;
  if (node === target && path.length > 0) {
    found.push(path);
    return;
  }

  for (const edge of adjacency.get(node) ?? []) {
    if (visited.has(edge.to_skill)) continue;
    dfs({
      node: edge.to_skill,
      target,
      adjacency,
      path: [...path, edge],
      visited: new Set([...visited, edge.to_skill]),
      max_depth,
      found,
    });
  }
}

function toCandidatePath(edges: RawEdge[]): CandidatePath {
  const maxLift = edges.reduce((m, e) => Math.max(m, e.avg_salary_lift_pct), 0);
  const liftScale = maxLift > 0 && maxLift <= 5 ? 100 : 1;
  return {
    edges,
    total_months: round1(edges.reduce((sum, e) => sum + e.avg_months, 0)),
    total_lift_pct: round1(
      edges.reduce((sum, e) => sum + e.avg_salary_lift_pct * liftScale, 0),
    ),
    min_confidence: edges.reduce<Confidence>(
      (min, edge) =>
        rankConfidence(edge.confidence) < rankConfidence(min) ? edge.confidence : min,
      'high',
    ),
    support: edges.reduce((min, edge) => Math.min(min, edge.frequency), Number.MAX_SAFE_INTEGER),
  };
}

function selectGraphFlavors(candidates: CandidatePath[]): PivotPath[] {
  const seen = new Set<string>();
  const out: PivotPath[] = [];

  pushBestDistinct(out, seen, 'fast', candidates, compareFast);
  pushBestDistinct(out, seen, 'balanced', candidates, compareBalanced);
  pushBestDistinct(out, seen, 'comprehensive', candidates, compareComprehensive);

  return out;
}

function pushBestDistinct(
  out: PivotPath[],
  seen: Set<string>,
  flavor: PivotPath['flavor'],
  candidates: CandidatePath[],
  compare: (a: CandidatePath, b: CandidatePath) => number,
): void {
  const candidate = [...candidates]
    .sort(compare)
    .find((path) => !seen.has(pathSignature(path.edges)));
  if (!candidate) return;
  seen.add(pathSignature(candidate.edges));
  out.push(toPivotPath(flavor, candidate));
}

function compareFast(a: CandidatePath, b: CandidatePath): number {
  return (
    a.total_months - b.total_months ||
    b.support - a.support ||
    b.total_lift_pct - a.total_lift_pct
  );
}

function compareBalanced(a: CandidatePath, b: CandidatePath): number {
  const score = (p: CandidatePath) =>
    (p.total_lift_pct / Math.max(p.total_months, 0.1)) * Math.log10(p.support + 1);
  return score(b) - score(a) || b.support - a.support;
}

function compareComprehensive(a: CandidatePath, b: CandidatePath): number {
  return (
    b.edges.length - a.edges.length ||
    rankConfidence(b.min_confidence) - rankConfidence(a.min_confidence) ||
    b.support - a.support ||
    b.total_lift_pct - a.total_lift_pct
  );
}

function toPivotPath(flavor: PivotPath['flavor'], candidate: CandidatePath): PivotPath {
  const full_path: PivotPathEdge[] = candidate.edges.map((edge, idx) => ({
    from_skill: edge.from_skill,
    to_skill: edge.to_skill,
    depth: idx,
    months: round1(edge.avg_months),
    lift: edge.avg_salary_lift_pct > 0 ? round1(normalizeLift(edge.avg_salary_lift_pct)) : 0,
  }));

  return {
    flavor,
    full_path,
    total_months: candidate.total_months,
    total_lift_pct: candidate.total_lift_pct,
    min_confidence_in_path: candidate.min_confidence,
    path_length: full_path.length,
  };
}

async function synthesizeLegacyPaths({
  start_skill,
  start_role,
  target_skill,
}: {
  start_skill: string;
  start_role?: string;
  target_skill: string;
  user_skills: string[];
}): Promise<PivotPath[]> {
  const directEdges = await collections
    .skillTransitions()
    .aggregate<RawEdge>([
      {
        $match: {
          to_skill: target_skill,
          $or: [{ edge_kind: 'skill_to_role' }, { edge_kind: { $exists: false } }],
        },
      },
      {
        $project: {
          _id: 0,
          from_skill: 1,
          to_skill: 1,
          edge_kind: 1,
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

  if (directEdges.length === 0) return [];

  const sortedByMonths = [...directEdges].sort((a, b) => a.avg_months - b.avg_months);
  const sortedByBalance = [...directEdges].sort((a, b) => {
    const sa =
      (normalizeLift(a.avg_salary_lift_pct) / Math.max(a.avg_months, 0.1)) *
      Math.log10(a.frequency + 1);
    const sb =
      (normalizeLift(b.avg_salary_lift_pct) / Math.max(b.avg_months, 0.1)) *
      Math.log10(b.frequency + 1);
    return sb - sa;
  });
  const sortedByFrequency = [...directEdges].sort((a, b) => b.frequency - a.frequency);

  const startNodeLabel = start_role ?? start_skill;
  const fast = makeLegacySingleHopPath(startNodeLabel, sortedByMonths[0], target_skill, 'fast');
  const balanced = makeLegacySingleHopPath(
    startNodeLabel,
    sortedByBalance[0],
    target_skill,
    'balanced',
  );
  const comprehensive = makeLegacyMultiHopPath(
    startNodeLabel,
    dedupeBySkill(sortedByFrequency).slice(0, 3),
    target_skill,
  );

  const seen = new Set<string>();
  const out: PivotPath[] = [];
  for (const path of [fast, balanced, comprehensive]) {
    if (!path) continue;
    const sig = pathSignature(
      path.full_path.map((edge) => ({
        ...edge,
        avg_months: edge.months ?? 0,
        avg_salary_lift_pct: edge.lift ?? 0,
        frequency: 0,
        confidence: path.min_confidence_in_path,
      })),
    );
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(path);
  }
  return out;
}

function makeLegacySingleHopPath(
  startLabel: string,
  edge: RawEdge | undefined,
  targetSkill: string,
  flavor: PivotPath['flavor'],
): PivotPath | null {
  if (!edge) return null;
  const lift = normalizeLift(edge.avg_salary_lift_pct);
  const edges: PivotPathEdge[] = [
    {
      from_skill: startLabel,
      to_skill: edge.from_skill,
      depth: 0,
      months: round1(edge.avg_months * 0.4),
      lift: 0,
    },
    {
      from_skill: edge.from_skill,
      to_skill: targetSkill,
      depth: 1,
      months: round1(edge.avg_months * 0.6),
      lift: round1(lift),
    },
  ];
  return {
    flavor,
    full_path: edges,
    total_months: round1(edge.avg_months),
    total_lift_pct: round1(lift),
    min_confidence_in_path: edge.confidence,
    path_length: edges.length,
  };
}

function makeLegacyMultiHopPath(
  startLabel: string,
  edges: RawEdge[],
  targetSkill: string,
): PivotPath | null {
  if (edges.length === 0) return null;

  const segments: PivotPathEdge[] = [];
  let prevNode = startLabel;
  let totalMonths = 0;
  let totalLift = 0;
  let minConfidence: Confidence = 'high';

  edges.forEach((edge, idx) => {
    const overlapFactor = idx === 0 ? 0.6 : 0.5;
    const segMonths = round1(edge.avg_months * overlapFactor);
    segments.push({
      from_skill: prevNode,
      to_skill: edge.from_skill,
      depth: idx,
      months: segMonths,
      lift: 0,
    });
    totalMonths += segMonths;
    totalLift += normalizeLift(edge.avg_salary_lift_pct);
    if (rankConfidence(edge.confidence) < rankConfidence(minConfidence)) {
      minConfidence = edge.confidence;
    }
    prevNode = edge.from_skill;
  });

  segments.push({
    from_skill: prevNode,
    to_skill: targetSkill,
    depth: segments.length,
    months: 0,
    lift: round1(totalLift),
  });

  return {
    flavor: 'comprehensive',
    full_path: segments,
    total_months: round1(totalMonths),
    total_lift_pct: round1(totalLift),
    min_confidence_in_path: minConfidence,
    path_length: segments.length,
  };
}

function stripDownstream(seed: ReachableSeed): RawEdge {
  const { downstream: _downstream, ...edge } = seed;
  return edge;
}

function dedupeEdges(edges: RawEdge[]): RawEdge[] {
  const seen = new Set<string>();
  const out: RawEdge[] = [];
  for (const edge of edges) {
    const sig = `${edge.from_skill}>${edge.to_skill}:${edge.edge_kind ?? 'legacy'}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(edge);
  }
  return out;
}

function dedupeBySkill<T extends { from_skill: string }>(edges: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const edge of edges) {
    if (seen.has(edge.from_skill)) continue;
    seen.add(edge.from_skill);
    out.push(edge);
  }
  return out;
}

function pathSignature(edges: Array<{ from_skill: string; to_skill: string }>): string {
  return edges.map((edge) => `${edge.from_skill}>${edge.to_skill}`).join('|');
}

function normalizeLift(value: number): number {
  return value > 0 && value <= 5 ? value * 100 : value;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function rankConfidence(c: Confidence): number {
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1;
}
