import OpenAI from 'openai';
import { env } from '../config/env.js';
import { EMBEDDING_DIM } from '../schemas/common.js';
import { AIServiceError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { UserSkill } from '../schemas/user.js';

/**
 * OpenAI SDK client. Used for:
 *  - Embeddings (text-embedding-3-small with `dimensions: 768` via Matryoshka
 *    truncation so the Atlas Vector Search indexes built for 768-dim keep
 *    working — same shape as the previous Gemini pipeline).
 *  - LLM CV extraction (gpt-4o-mini with JSON mode).
 */
const ai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Embed a single text into a 768-dim vector via OpenAI `text-embedding-3-small`.
 *
 * Note: OpenAI embeddings do not support a "task_type" hint like Gemini did —
 * the model is task-agnostic. The parameter is kept for API symmetry but
 * unused.
 */
export async function embed(text: string): Promise<number[]> {
  try {
    const result = await ai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: text,
      // text-embedding-3-* support Matryoshka truncation via `dimensions`.
      // 768 keeps the Atlas Vector Search index schema unchanged.
      dimensions: EMBEDDING_DIM,
    });
    const values = result.data?.[0]?.embedding;
    if (!values || values.length === 0) {
      throw new Error('OpenAI returned empty embedding');
    }
    return values;
  } catch (err) {
    logger.error({ err }, 'OpenAI embed failed');
    throw new AIServiceError('Embedding generation failed', {
      cause: (err as Error).message,
    });
  }
}

/**
 * Batch-embed multiple texts in one round-trip. OpenAI accepts an array as
 * `input`; this is much faster than parallel single calls and uses 1 RPM slot.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    const result = await ai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIM,
    });
    const out = (result.data ?? []).map((d) => d.embedding);
    if (out.length !== texts.length) {
      throw new Error(`Expected ${texts.length} embeddings, got ${out.length}`);
    }
    return out;
  } catch (err) {
    logger.error({ err, count: texts.length }, 'OpenAI embedBatch failed');
    throw new AIServiceError('Batch embedding failed', {
      cause: (err as Error).message,
    });
  }
}

const EXTRACT_PROMPT = `You are a tech-resume parser. Given the CV/resume below, extract a JSON object with this exact shape:

{
  "skills": [{"name": string, "level": "beginner"|"intermediate"|"advanced", "years": number}],
  "inferred_role": string,
  "inferred_years": number
}

Rules:
- skills: only technical skills (languages, frameworks, databases, tools, cloud). Max 25.
- name: canonical form (e.g. "React", "Next.js", "MongoDB", "Python", "AWS").
- level: based on tenure & responsibility; junior=beginner, mid=intermediate, senior+=advanced.
- years: float, rough estimate from CV.
- inferred_role: current/most-recent role title.
- inferred_years: total years of professional experience.
- Output ONLY the JSON. No prose.

CV:
"""
{{CV}}
"""`;

export interface ExtractedProfile {
  skills: UserSkill[];
  inferred_role?: string;
  inferred_years?: number;
}

export async function extractSkillsFromCV(cvText: string): Promise<ExtractedProfile> {
  try {
    const prompt = EXTRACT_PROMPT.replace('{{CV}}', cvText);
    const response = await ai.chat.completions.create({
      model: env.OPENAI_LLM_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict JSON-only tech-resume parser. Reply with a single JSON object that matches the schema described in the user message.',
        },
        { role: 'user', content: prompt },
      ],
    });
    const text = response.choices?.[0]?.message?.content ?? '';
    if (!text) {
      throw new Error('OpenAI returned empty content');
    }
    const parsed = JSON.parse(text) as ExtractedProfile;
    if (!Array.isArray(parsed.skills)) {
      throw new Error('Invalid LLM output: skills not array');
    }
    return parsed;
  } catch (err) {
    logger.error({ err }, 'OpenAI extractSkills failed');
    throw new AIServiceError('Skill extraction failed', {
      cause: (err as Error).message,
    });
  }
}

export async function isOpenAIHealthy(): Promise<boolean> {
  try {
    const v = await embed('healthcheck');
    return v.length > 0;
  } catch {
    return false;
  }
}
