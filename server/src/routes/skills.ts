import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  ExtractSkillsRequestSchema,
  ExtractSkillsResponseSchema,
  EmbedRequestSchema,
  EmbedResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';
import { embed, extractSkillsFromCV } from '../services/openai.js';
import { env } from '../config/env.js';

export const skillsApp = new OpenAPIHono();

const extractRoute = createRoute({
  method: 'post',
  path: '/extract-skills',
  tags: ['cv'],
  summary: 'Extract structured skills from CV text via LLM',
  description: 'Parses a paste-able CV string into a structured skill list using OpenAI GPT (JSON mode).',
  request: {
    body: {
      content: { 'application/json': { schema: ExtractSkillsRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'Extracted profile',
      content: { 'application/json': { schema: ExtractSkillsResponseSchema } },
    },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    502: { description: 'AI upstream error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

skillsApp.openapi(extractRoute, async (c) => {
  const { cv_text } = c.req.valid('json');
  const result = await extractSkillsFromCV(cv_text);
  return c.json(result, 200);
});

const embedRoute = createRoute({
  method: 'post',
  path: '/embed',
  tags: ['ai'],
  summary: 'Generate an OpenAI embedding vector (768-dim) for a text snippet',
  request: {
    body: { content: { 'application/json': { schema: EmbedRequestSchema } } },
  },
  responses: {
    200: { description: 'Embedding vector', content: { 'application/json': { schema: EmbedResponseSchema } } },
    400: { description: 'Bad request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    502: { description: 'AI upstream error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

skillsApp.openapi(embedRoute, async (c) => {
  const { text } = c.req.valid('json');
  const embedding = await embed(text);
  return c.json(
    {
      embedding,
      model: env.OPENAI_EMBEDDING_MODEL,
      dimensions: embedding.length,
    },
    200,
  );
});
