import { z } from '@hono/zod-openapi';
import { EmbeddingVectorSchema, SkillLevelSchema } from './common.js';

export const UserSkillSchema = z
  .object({
    name: z.string().min(1),
    level: SkillLevelSchema,
    years: z.number().min(0).max(50),
  })
  .openapi('UserSkill');

export type UserSkill = z.infer<typeof UserSkillSchema>;

export const UserSessionDocSchema = z
  .object({
    _id: z.unknown().optional(),
    display_name: z.string(),
    current_role: z.string(),
    years_exp: z.number().min(0).max(50),
    skills: z.array(UserSkillSchema),
    cv_text: z.string(),
    cv_embedding: EmbeddingVectorSchema,
    target_role: z.string().optional(),
    target_embedding: EmbeddingVectorSchema.optional(),
    created_at: z.date(),
    ttl_expires_at: z.date(),
  })
  .openapi('UserSession');

export type UserSessionDoc = z.infer<typeof UserSessionDocSchema>;
