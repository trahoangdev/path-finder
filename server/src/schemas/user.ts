import { z } from '@hono/zod-openapi';
import { SkillLevelSchema } from './common.js';

export const UserSkillSchema = z
  .object({
    name: z.string().min(1),
    level: SkillLevelSchema,
    years: z.number().min(0).max(50),
  })
  .openapi('UserSkill');

export type UserSkill = z.infer<typeof UserSkillSchema>;
