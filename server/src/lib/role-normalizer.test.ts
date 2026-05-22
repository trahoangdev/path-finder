import { describe, expect, it } from 'vitest';

import { normalizeRole, normalizeTargetRole } from './role-normalizer.js';

describe('role normalizer', () => {
  it('maps senior backend titles to the backend canonical role', () => {
    expect(normalizeRole('Senior Backend Engineer', ['Node.js', 'MongoDB'])).toBe(
      'Backend Developer',
    );
  });

  it('maps LLM/RAG stacks to AI Engineer when title is generic', () => {
    expect(normalizeRole('Software Engineer', ['LangChain', 'LLM API', 'RAG'])).toBe(
      'AI Engineer',
    );
  });

  it('keeps supported free-form targets on canonical labels', () => {
    expect(normalizeTargetRole('Machine Learning Engineer')).toBe('ML Engineer');
    expect(normalizeTargetRole('Full-stack Engineer')).toBe('Full-stack Developer');
  });
});
