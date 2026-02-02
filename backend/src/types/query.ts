import { z } from 'zod';

export const QueryRequestSchema = z.object({
  queryText: z.string().min(1, 'Query text is required'),
});

export type QueryRequest = z.infer<typeof QueryRequestSchema>;

export const ExecutionPlanSchema = z.object({
  condition: z.string().optional(),
  country: z.string().optional(),
  molecule: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  agentsToRun: z.array(z.enum(['clinical', 'patent', 'scope', 'fto', 'market', 'decision']))
    .default(['scope', 'fto', 'clinical', 'market', 'decision']),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
