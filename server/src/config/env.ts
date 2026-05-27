import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB: z.string().min(1).default('pathfinder'),

  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  // text-embedding-3-small defaults to 1536-dim; we request 768 via the
  // `dimensions` param (Matryoshka truncation) so the Atlas Vector Search
  // indexes built for 768-dim keep working unchanged.
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_LLM_MODEL: z.string().default('gpt-4o-mini'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  VECTOR_INDEX_SKILLS: z.string().default('vec_skills_desc'),
  VECTOR_INDEX_COURSES: z.string().default('vec_courses_desc'),
  VECTOR_INDEX_JOBS: z.string().default('vec_jobs_desc'),
  VECTOR_INDEX_TRAJECTORIES: z.string().default('vec_trajectory_snapshot'),

  // Atlas Search (Lucene) indexes — used by `$search` stages.
  SEARCH_INDEX_JOBS: z.string().default('jobs_text_search'),
  SEARCH_INDEX_COURSES: z.string().default('courses_text_search'),

  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(z.treeifyError(parsed.error));
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
