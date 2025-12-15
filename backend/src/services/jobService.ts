import { PrismaClient } from '@prisma/client';
import { AgentTraceEvent } from '../types/agent';

const prisma = new PrismaClient();

export interface CreateJobParams {
  queryText: string;
}

export interface UpdateJobParams {
  status?: string;
  resultId?: string;
  trace?: AgentTraceEvent[];
  cacheKey?: string;
}

class JobService {
  async createJob(params: CreateJobParams) {
    const job = await prisma.job.create({
      data: {
        queryText: params.queryText,
        status: 'pending',
        trace: JSON.stringify([]),
      },
    });
    return job;
  }

  async getJob(id: string) {
    return prisma.job.findUnique({
      where: { id },
      include: { report: true },
    });
  }

  async updateJob(id: string, params: UpdateJobParams) {
    const data: any = {};
    if (params.status) data.status = params.status;
    if (params.resultId) data.resultId = params.resultId;
    if (params.trace) data.trace = JSON.stringify(params.trace);
    if (params.cacheKey) data.cacheKey = params.cacheKey;

    return prisma.job.update({
      where: { id },
      data,
    });
  }

  async appendTraceEvent(id: string, event: AgentTraceEvent) {
    const job = await this.getJob(id);
    if (!job) throw new Error('Job not found');

    const trace: AgentTraceEvent[] = job.trace ? JSON.parse(job.trace) : [];
    trace.push(event);

    return prisma.job.update({
      where: { id },
      data: { trace: JSON.stringify(trace) },
    });
  }

  async getTrace(id: string): Promise<AgentTraceEvent[]> {
    const job = await this.getJob(id);
    if (!job) throw new Error('Job not found');
    return job.trace ? JSON.parse(job.trace) : [];
  }
}

export const jobService = new JobService();
