import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { embed, embedBatch, extractSkillsFromCV } from '../services/openai.js';
import { gapAnalysis } from '../services/vector-search/skills.js';
import { pivotPaths } from '../services/aggregations/pivot-path.js';
import { proofDrawer } from '../services/aggregations/proof-drawer.js';
import { similarDevs } from '../services/vector-search/similar-devs.js';
import { recommendCourses } from '../services/vector-search/courses.js';
import { salaryBand, type SalaryBandResult } from '../services/aggregations/salary-band.js';
import { salaryInference } from '../services/aggregations/salary-inference.js';
import { BadRequestError } from '../lib/errors.js';
import type { CoursePublic } from '../schemas/course.js';
import type { UserSkill } from '../schemas/user.js';
import { normalizeRole, normalizeTargetRole } from '../lib/role-normalizer.js';
import type { SalaryInferenceResult } from '../services/aggregations/types.js';

function levelRank(level: UserSkill['level']): number {
  return level === 'advanced' ? 3 : level === 'intermediate' ? 2 : 1;
}

// Short stack hints per canonical target role — keeps the target embedding
// anchored on the modern tooling actually used in the role, not on the
// generic title alone.
const TARGET_HINTS: Record<string, string> = {
  'ai engineer':
    'Builds LLM-powered applications. Core stack: LangChain, LlamaIndex, LLM APIs, vector databases (MongoDB Atlas Vector Search, Pinecone), retrieval-augmented generation (RAG), prompt engineering, embeddings, Hugging Face, fine-tuning, FastAPI.',
  'machine learning engineer':
    'Trains and ships ML models in production. Core stack: PyTorch, TensorFlow, MLflow, scikit-learn, Kubernetes, Docker, AWS SageMaker, feature stores, model monitoring, MLOps pipelines.',
  'ml engineer':
    'Trains and ships ML models in production. Core stack: PyTorch, TensorFlow, MLflow, scikit-learn, Kubernetes, Docker, AWS SageMaker, feature stores, model monitoring, MLOps pipelines.',
  'data engineer':
    'Designs ETL pipelines and data warehouses. Core stack: Apache Airflow, Apache Spark, dbt, Snowflake, BigQuery, Kafka, Databricks, Python, SQL.',
  'devops engineer':
    'Automates infrastructure and deployment pipelines. Core stack: Kubernetes, Docker, Terraform, Ansible, Prometheus, Grafana, GitHub Actions, AWS/GCP/Azure, observability.',
  'cloud engineer':
    'Designs cloud-native systems on AWS / GCP / Azure. Core stack: Terraform, CloudFormation, Kubernetes, IAM, networking, cost optimization, multi-region architecture.',
  'solutions architect':
    'Designs scalable distributed systems. Core stack: AWS / GCP / Azure architectures, microservices, event-driven systems, system design, capacity planning, observability.',
  'engineering manager':
    'Leads engineering teams. Core: people management, hiring, technical strategy, architecture review, OKRs, mentoring senior engineers.',
  'mobile engineer (react native)':
    'Builds cross-platform mobile apps. Core stack: React Native, TypeScript, Redux, native modules, iOS/Android, App Store / Play Store deployment.',
  'full-stack engineer':
    'Builds end-to-end web applications. Core stack: TypeScript, React, Next.js, Node.js, Express, PostgreSQL, MongoDB, REST, GraphQL, Docker, AWS.',
  'embedded engineer':
    'Develops firmware and low-level systems for IoT and connected devices. Core stack: C, C++, Rust embedded, RTOS (FreeRTOS, Zephyr), ARM Cortex, STM32, ESP32, I2C/SPI/UART, hardware debugging, MQTT, low-power design.',
  'qa automation engineer':
    'Designs and runs automated test suites for web and mobile apps. Core stack: Playwright, Cypress, Selenium, Appium, TypeScript / Python, REST API testing (Postman, RestAssured), CI/CD pipelines, performance testing (k6, JMeter), test strategy.',
  'security engineer':
    'Hardens applications and infrastructure against attackers. Core stack: OWASP Top 10, threat modeling, penetration testing (Burp Suite, Metasploit), SAST/DAST tooling, container security, IAM, secrets management (Vault), incident response, SIEM (Splunk, ELK), AWS / GCP security primitives.',
};

function buildTargetPrompt(targetRole: string): string {
  const key = targetRole.toLowerCase().trim();
  const hint = TARGET_HINTS[key];
  if (hint) return `Role: ${targetRole}. ${hint}`;
  // Fall back to a generic phrasing for unknown roles.
  return `${targetRole} — a modern technical role in 2026. Focus on the day-to-day technical stack, frameworks, tools, and concepts a ${targetRole} uses on the job.`;
}

const route = createRoute({
  method: 'post',
  path: '/analyze',
  tags: ['analysis'],
  summary: 'End-to-end orchestrator: CV → all recommendations in one call',
  description: `One-shot pipeline:
1. Extract skills + role + years from CV (LLM).
2. Embed CV text and target role description.
3. In parallel: gap analysis, pivot paths, proof drawer, similar developers.
4. Aggregate timings + return combined payload for the dashboard.`,
  request: {
    body: { content: { 'application/json': { schema: AnalyzeRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Combined analysis payload',
      content: { 'application/json': { schema: AnalyzeResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Internal error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

export const orchestratorApp = new OpenAPIHono().openapi(route, async (c) => {
  const { cv_text, target_role } = c.req.valid('json');
  const t0 = performance.now();

  const profile = await extractSkillsFromCV(cv_text);
  const t1 = performance.now();

  // Embed the target role with a rich prompt so the vector aligns with the
  // role's stack rather than just the bare title (e.g. "AI Engineer" alone
  // tends to overlap with generic data/analyst content; adding context steers
  // the gap analysis toward modern AI tooling).
  const targetPrompt = buildTargetPrompt(target_role);
  const [cv_embedding, target_embedding] = await Promise.all([
    embed(cv_text),
    embed(targetPrompt),
  ]);
  const t2 = performance.now();

  const inferredRole = profile.inferred_role;
  if (!inferredRole) {
    throw new BadRequestError('Could not infer current role from CV');
  }

  // Pick a sensible starting skill: prefer the highest-level skill, then
  // longest-tenure, falling back to the first emitted by the LLM.
  const rankedSkills = [...profile.skills].sort((a, b) => {
    const lvl = levelRank(b.level) - levelRank(a.level);
    return lvl !== 0 ? lvl : b.years - a.years;
  });
  const startSkill = rankedSkills[0]?.name ?? 'JavaScript';
  const userSkills = rankedSkills.map((s) => s.name);

  // Normalize free-form role strings into the canonical labels used by the
  // synthetic trajectory dataset. The LLM tends to emit titles like "Tech Lead"
  // / "Senior Software Engineer"; the dataset only knows "Backend Developer"
  // etc. so matching without normalization yields 0 rows for proof + similar.
  const canonicalStartRole = normalizeRole(inferredRole, userSkills);
  const canonicalTargetRole = normalizeTargetRole(target_role);
  // `skill_transitions.to_skill` was seeded with target-role labels, so reuse
  // the normalized target as the graph-key.
  const targetSkill = canonicalTargetRole;

  const [gap, paths, proof, similar] = await Promise.all([
    gapAnalysis({
      cv_embedding,
      target_embedding,
      user_skills: userSkills,
      target_role: canonicalTargetRole,
      limit: 10,
    }).then((r) => ({
      result: r,
      t: performance.now(),
    })),
    pivotPaths({
      start_skill: startSkill,
      start_role: canonicalStartRole,
      target_skill: targetSkill,
      user_skills: userSkills,
      max_depth: 4,
    }).then((r) => ({
      result: r,
      t: performance.now(),
    })),
    proofDrawer({ from_role: canonicalStartRole, to_role: canonicalTargetRole }).then(
      (r) => ({
        result: r,
        t: performance.now(),
      }),
    ),
    similarDevs({
      cv_embedding,
      user_skills: userSkills,
      start_role: canonicalStartRole,
      limit: 50,
    }).then((r) => ({
      result: r,
      t: performance.now(),
    })),
  ]);

  // ─── Phase 2: course recommendations + salary band ─────────────────────────
  //
  // Both depend on the gap-analysis output (top missing skills). Run them
  // alongside salary inference + jobs salary band in parallel — they hit
  // different collections so contention is minimal.
  const topMissing = gap.result.slice(0, 3);
  const missingSkillNames = topMissing.map((s) => s.name);
  const tCoursesStart = performance.now();

  const [coursesBySkill, salaryBandResult, pivotSalaryLift] = await Promise.all([
    buildCourseRecommendations(topMissing),
    salaryBand({
      target_role,
      target_skills: missingSkillNames,
    }).catch(() => emptySalaryBand(target_role)),
    salaryInference({ skills_learned: missingSkillNames }).catch(
      () => [] as SalaryInferenceResult[],
    ),
  ]);

  const tFinal = performance.now();

  return c.json(
    {
      profile,
      gap_analysis: { missing_skills: gap.result },
      pivot_paths: { paths: paths.result },
      proof_drawer: proof.result,
      similar_devs: { groups: similar.result },
      courses_by_skill: coursesBySkill,
      salary_band: salaryBandResult,
      pivot_salary_lift: pivotSalaryLift,
      timings_ms: {
        extract: Math.round(t1 - t0),
        embed: Math.round(t2 - t1),
        gap: Math.round(gap.t - t2),
        paths: Math.round(paths.t - t2),
        proof: Math.round(proof.t - t2),
        similar: Math.round(similar.t - t2),
        courses: Math.round(tFinal - tCoursesStart),
        salary: Math.round(tFinal - tCoursesStart),
        total: Math.round(tFinal - t0),
      },
    },
    200,
  );
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function buildCourseRecommendations(
  topMissing: Array<{ name: string; description: string }>,
): Promise<Array<{ skill: string; courses: CoursePublic[] }>> {
  if (topMissing.length === 0) return [];
  try {
    const skillEmbeddings = await embedBatch(
      topMissing.map((s) => `${s.name}. ${s.description}`),
    );
    const courseResults = await Promise.all(
      topMissing.map((skill, idx) =>
        recommendCourses({
          skill_name: skill.name,
          skill_embedding: skillEmbeddings[idx]!,
          limit: 3,
        }).catch(() => [] as CoursePublic[]),
      ),
    );
    return topMissing.map((skill, idx) => ({
      skill: skill.name,
      courses: courseResults[idx] ?? [],
    }));
  } catch {
    return topMissing.map((skill) => ({ skill: skill.name, courses: [] }));
  }
}

function emptySalaryBand(targetRole: string): SalaryBandResult {
  return {
    target_role: targetRole,
    total_matches: 0,
    overall: null,
    by_level: [],
    top_companies: [],
    top_required_skills: [],
    source: 'itviec_sample',
    retrieval: 'regex_fallback',
  };
}
