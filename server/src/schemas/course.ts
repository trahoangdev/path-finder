import { z } from '@hono/zod-openapi';
import { EmbeddingVectorSchema, SkillLevelSchema } from './common.js';

export const CourseDocSchema = z
  .object({
    _id: z.unknown().optional(),
    title: z.string().min(1),
    provider: z.enum(['coursera', 'udemy', 'learn.mongodb.com', 'freecodecamp', 'youtube', 'other']),
    url: z.string().url(),
    price_usd: z.number().nonnegative().default(0),
    duration_hours: z.number().nonnegative().default(0),
    level: SkillLevelSchema,
    skills_taught: z.array(z.string()).default([]),
    description: z.string(),
    description_embedding: EmbeddingVectorSchema,
    rating: z.number().min(0).max(5).default(0),
    enrollment_count: z.number().int().nonnegative().default(0),
    is_mongodb_official: z.boolean().default(false),
  })
  .openapi('Course');

export type CourseDoc = z.infer<typeof CourseDocSchema>;

export const CoursePublicSchema = CourseDocSchema.omit({
  description_embedding: true,
  _id: true,
})
  .extend({
    similarity: z.number().optional(),
  })
  .openapi('CoursePublic');

export type CoursePublic = z.infer<typeof CoursePublicSchema>;
