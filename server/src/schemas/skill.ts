import { z } from '@hono/zod-openapi';
import { EmbeddingVectorSchema, SkillCategorySchema } from './common.js';

export const SkillDocSchema = z
  .object({
    _id: z.unknown().optional(),
    name: z.string().min(1),
    slug: z.string().min(1),
    category: SkillCategorySchema,
    description: z.string(),
    description_embedding: EmbeddingVectorSchema,
    prerequisites: z.array(z.string()).default([]),
    related_skills: z.array(z.string()).default([]),
    popularity_rank: z.number().int().min(1),
    is_emerging: z.boolean().default(false),
    vn_demand_score: z.number().min(0).max(1).default(0),
  })
  .openapi('Skill');

export type SkillDoc = z.infer<typeof SkillDocSchema>;

export const SkillPublicSchema = SkillDocSchema.omit({
  description_embedding: true,
  _id: true,
}).openapi('SkillPublic');

export type SkillPublic = z.infer<typeof SkillPublicSchema>;
