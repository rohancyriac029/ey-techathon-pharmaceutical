import { Router } from 'express';
import { jobService } from '../services/jobService';
import { runMasterAgent } from '../agents/masterAgent';
import { QueryRequestSchema } from '../types/query';

const router = Router();

// POST /api/query - Start a new analysis job
router.post('/', async (req, res) => {
  try {
    const validation = QueryRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.issues,
      });
    }

    const { queryText } = validation.data;

    // Create job
    const job = await jobService.createJob({ queryText });

    // Start master agent asynchronously (don't await)
    runMasterAgent(queryText, job.id).catch(error => {
      console.error('Master agent execution error:', error);
    });

    res.status(201).json({
      jobId: job.id,
      status: job.status,
    });
  } catch (error) {
    console.error('Query route error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET /api/jobs/:id - Get job status
router.get('/:id', async (req, res) => {
  try {
    const job = await jobService.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      status: job.status,
      queryText: job.queryText,
      resultId: job.resultId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to retrieve job' });
  }
});

// GET /api/jobs/:id/trace - Get agent execution trace
router.get('/:id/trace', async (req, res) => {
  try {
    const trace = await jobService.getTrace(req.params.id);
    res.json(trace);
  } catch (error) {
    console.error('Get trace error:', error);
    res.status(500).json({ error: 'Failed to retrieve trace' });
  }
});

export default router;
