/**
 * Gap analysis is implemented via Vector Search (see vector-search/skills.ts).
 * This module re-exports it for a consistent service surface, in case future
 * versions add an aggregation-only fallback.
 */
export { gapAnalysis } from '../vector-search/skills.js';
export type { GapAnalysisOpts } from '../vector-search/skills.js';
