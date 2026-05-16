import { z } from '@hono/zod-openapi';

export const EMBEDDING_DIM = 768;

export const EmbeddingVectorSchema = z
  .array(z.number())
  .length(EMBEDDING_DIM)
  .openapi('EmbeddingVector', {
    description: `Vector of ${EMBEDDING_DIM} float32 (OpenAI text-embedding-3-small, Matryoshka-truncated to ${EMBEDDING_DIM}).`,
  });

export const ObjectIdStringSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'Must be a 24-char hex ObjectId')
  .openapi('ObjectIdString');

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .openapi('ErrorResponse');

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const ConfidenceSchema = z.enum(['high', 'medium', 'low']).openapi('Confidence');

export const SeniorityLevelSchema = z
  .enum(['intern', 'junior', 'mid', 'senior', 'lead', 'manager'])
  .openapi('SeniorityLevel');

export const SkillCategorySchema = z
  .enum(['language', 'framework', 'database', 'cloud', 'tool', 'concept', 'soft'])
  .openapi('SkillCategory');

export const SkillLevelSchema = z
  .enum(['beginner', 'intermediate', 'advanced'])
  .openapi('SkillLevel');
