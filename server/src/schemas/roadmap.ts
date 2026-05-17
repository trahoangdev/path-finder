import { z } from '@hono/zod-openapi';

/** One directed edge in a roadmap.sh ReactFlow graph (ETL → MongoDB). */
export const RoadmapEdgeDocSchema = z
  .object({
    roadmap_slug: z.string(),
    roadmap_title: z.string().optional(),
    source_node_id: z.string(),
    target_node_id: z.string(),
    from_label: z.string(),
    to_label: z.string(),
    computed_at: z.date().optional(),
  })
  .openapi('RoadmapEdge');

export type RoadmapEdgeDoc = z.infer<typeof RoadmapEdgeDocSchema>;
