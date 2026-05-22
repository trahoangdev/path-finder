/**
 * Normalize a free-form role string (as inferred by the LLM from a CV) into
 * one of the canonical roles used by the ETL trajectory generator.
 *
 * The trajectory dataset (`etl/01_generate_trajectories.py`) only stores these
 * roles in `snapshots[].role` and `current_role`:
 *
 *   Frontend Developer · Backend Developer · Full-stack Developer ·
 *   Mobile Developer · Data Engineer · Data Scientist · ML Engineer ·
 *   AI Engineer · DevOps Engineer · Cloud Engineer
 *
 * Without normalization, proof-drawer and similar-devs queries that match on
 * role names from the LLM (e.g. "Tech Lead", "Senior Software Engineer") return
 * zero rows. This helper bridges the gap with a small set of regex heuristics.
 */

export const CANONICAL_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full-stack Developer',
  'Mobile Developer',
  'Data Engineer',
  'Data Scientist',
  'ML Engineer',
  'AI Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

// Strong title-only signals — match the role string verbatim.
const ROLE_PATTERNS: Array<{ canon: CanonicalRole; pat: RegExp }> = [
  { canon: 'Full-stack Developer', pat: /(full[- ]?stack|fullstack)/i },
  { canon: 'AI Engineer', pat: /(\bai\b|gen[- ]?ai|llm|prompt engineer|nlp engineer)/i },
  { canon: 'ML Engineer', pat: /(\bml\b|machine[- ]learning|mle|mlops)/i },
  { canon: 'Data Engineer', pat: /(data engineer|etl developer|pipeline engineer|data platform)/i },
  { canon: 'Data Scientist', pat: /(data scien|analyst|analytics|statistic|bi engineer)/i },
  { canon: 'Mobile Developer', pat: /(mobile|android|ios|react native|flutter)/i },
  { canon: 'DevOps Engineer', pat: /(devops|sre|reliability|platform engineer)/i },
  { canon: 'Cloud Engineer', pat: /(cloud engineer|aws solutions architect|gcp architect)/i },
  { canon: 'Frontend Developer', pat: /(front[- ]?end|ui engineer)/i },
  { canon: 'Backend Developer', pat: /(back[- ]?end|server[- ]side|tech lead.*backend|api developer)/i },
];

// Weighted skill keywords. Each match adds to the bucket; the highest score
// wins. Backend / frontend get the cheapest individual weights because they
// have the largest core stacks, so a single match shouldn't dominate.
type Scored = { canon: CanonicalRole; weight: number; pat: RegExp };

const SKILL_RULES: Scored[] = [
  // Mobile (very specific tokens)
  { canon: 'Mobile Developer', weight: 4, pat: /\b(react native|flutter|swiftui|jetpack compose)\b/i },
  { canon: 'Mobile Developer', weight: 2, pat: /\b(kotlin|swift|android|ios|dart)\b/i },

  // AI Engineer (LLM / RAG)
  { canon: 'AI Engineer', weight: 4, pat: /\b(langchain|llamaindex|llm api|openai api|anthropic|gemini api|rag\b|vector database|vector db)\b/i },
  { canon: 'AI Engineer', weight: 1, pat: /\b(prompt|embedding|hugging ?face)\b/i },

  // ML Engineer (training / serving)
  { canon: 'ML Engineer', weight: 3, pat: /\b(pytorch|tensorflow|mlflow|ray\b|kubeflow|weights\s*&\s*biases)\b/i },
  { canon: 'ML Engineer', weight: 1, pat: /\b(scikit-learn|sklearn|xgboost|lightgbm)\b/i },

  // Data Engineering (orchestration / warehouses)
  { canon: 'Data Engineer', weight: 3, pat: /\b(apache airflow|airflow|dbt\b|snowflake|databricks|bigquery)\b/i },
  { canon: 'Data Engineer', weight: 2, pat: /\b(apache spark|spark\b)\b/i },

  // Data Scientist (analysis)
  { canon: 'Data Scientist', weight: 3, pat: /\b(pandas|jupyter|statsmodels|matplotlib)\b/i },
  { canon: 'Data Scientist', weight: 1, pat: /\b(scikit-learn|sklearn|numpy)\b/i },

  // DevOps (infra automation)
  { canon: 'DevOps Engineer', weight: 3, pat: /\b(terraform|ansible|helm|prometheus|grafana)\b/i },
  { canon: 'DevOps Engineer', weight: 2, pat: /\b(kubernetes|k8s|argo|istio|github actions|gitlab ci|jenkins)\b/i },

  // Cloud (provider depth)
  { canon: 'Cloud Engineer', weight: 2, pat: /\b(cloudformation|aws cdk|gcp|azure|aws solutions)\b/i },

  // Frontend
  { canon: 'Frontend Developer', weight: 2, pat: /\b(react\b|vue\.js|angular|svelte|next\.js|nextjs|tailwind)\b/i },
  { canon: 'Frontend Developer', weight: 1, pat: /\b(redux|webpack|vite|css)\b/i },

  // Backend
  { canon: 'Backend Developer', weight: 2, pat: /\b(node\.js|node|express|nest|fastapi|django|spring boot|spring\b|gin\b|fiber\b)\b/i },
  { canon: 'Backend Developer', weight: 1, pat: /\b(java|go\b|golang|python\b|postgres|postgresql|mongodb|mysql|redis|kafka|rabbitmq|grpc|rest)\b/i },
];

/**
 * Map a free-form role + skill list to the closest canonical role.
 *
 * Strategy:
 *   1. Exact case-insensitive match against the canonical list.
 *   2. Strong keyword regex against the role string (most specific patterns first).
 *   3. Weighted skill-stack vote — accumulate scores from `SKILL_RULES` and
 *      pick the highest bucket.
 *   4. Default to "Backend Developer" when nothing fires.
 */
export function normalizeRole(
  inferredRole: string | undefined,
  skills: string[] = [],
): CanonicalRole {
  const role = (inferredRole ?? '').trim();
  const lower = role.toLowerCase();

  // 1) Exact match
  for (const c of CANONICAL_ROLES) {
    if (lower === c.toLowerCase()) return c;
  }

  // 2) Strong keyword match on the role title
  for (const r of ROLE_PATTERNS) {
    if (r.pat.test(role)) return r.canon;
  }

  // 3) Weighted skill stack vote
  const stack = skills.join(' ');
  if (stack.length > 0) {
    const scores = new Map<CanonicalRole, number>();
    for (const rule of SKILL_RULES) {
      if (rule.pat.test(stack)) {
        scores.set(rule.canon, (scores.get(rule.canon) ?? 0) + rule.weight);
      }
    }
    if (scores.size > 0) {
      let best: CanonicalRole = 'Backend Developer';
      let bestScore = -1;
      for (const [c, s] of scores) {
        if (s > bestScore) {
          best = c;
          bestScore = s;
        }
      }
      return best;
    }
  }

  // 4) Default
  return 'Backend Developer';
}

/**
 * Resolve a free-form target role string from the UI to one of the canonical
 * roles. Falls back to the input string verbatim — `skill_transitions.to_skill`
 * was seeded using the same labels so a passthrough is fine for most presets.
 */
export function normalizeTargetRole(target: string): string {
  const t = target.trim();
  const lower = t.toLowerCase();
  for (const c of CANONICAL_ROLES) {
    if (lower === c.toLowerCase()) return c;
  }
  return normalizeRole(t, []);
}
