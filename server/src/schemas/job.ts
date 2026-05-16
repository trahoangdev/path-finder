import { z } from '@hono/zod-openapi';
import { EmbeddingVectorSchema, SeniorityLevelSchema } from './common.js';

export const JobDocSchema = z
  .object({
    _id: z.unknown().optional(),
    source: z.enum(['itviec', 'topcv', 'adzuna', 'synthetic']),
    source_url: z.string().url().optional(),
    title: z.string().min(1),
    company: z.string(),
    location: z.string(),
    level: SeniorityLevelSchema,
    salary_min: z.number().nonnegative(),
    salary_max: z.number().nonnegative(),
    salary_currency: z.enum(['VND', 'USD']).default('VND'),
    required_skills: z.array(z.string()),
    nice_to_have: z.array(z.string()).default([]),
    description: z.string(),
    description_embedding: EmbeddingVectorSchema,
    posted_at: z.date(),
    scraped_at: z.date(),
  })
  .openapi('Job');

export type JobDoc = z.infer<typeof JobDocSchema>;

export const JobPublicSchema = JobDocSchema.omit({
  description_embedding: true,
  _id: true,
}).openapi('JobPublic');

export type JobPublic = z.infer<typeof JobPublicSchema>;
