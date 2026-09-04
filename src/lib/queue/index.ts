import { runRankCheck, runSiteAudit } from "./jobs";

export interface QueueService {
  addRankCheckJob(keywordId: string): Promise<void>;
  addSiteAuditJob(projectId: string): Promise<void>;
}

// In-Memory Throttled Queue (Local Fallback)
export class InMemoryQueueService implements QueueService {
  private queue: Array<{ type: "rank" | "audit"; id: string }> = [];
  private isProcessing = false;

  async addRankCheckJob(keywordId: string): Promise<void> {
    console.log(`[Queue] (InMemory) Queued rank check for keyword ID: ${keywordId}`);
    this.queue.push({ type: "rank", id: keywordId });
    this.triggerProcessing();
  }

  async addSiteAuditJob(projectId: string): Promise<void> {
    console.log(`[Queue] (InMemory) Queued site audit for project ID: ${projectId}`);
    this.queue.push({ type: "audit", id: projectId });
    this.triggerProcessing();
  }

  private async triggerProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Async worker loop
    (async () => {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) continue;

        try {
          if (job.type === "rank") {
            await runRankCheck(job.id);
          } else if (job.type === "audit") {
            await runSiteAudit(job.id);
          }
        } catch (error) {
          console.error(`[Queue] (InMemory) Job failed during execution:`, error);
        }

        // Throttle delay: wait 1 second to respect API limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      this.isProcessing = false;
    })();
  }
}

// BullMQ & Redis Queue Service
export class BullMqQueueService implements QueueService {
  private rankQueue: any;
  private auditQueue: any;
  private connection: any;

  constructor(redisUrl: string) {
    try {
      const { Queue } = require("bullmq");
      const IORedis = require("ioredis");
      
      this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      this.rankQueue = new Queue("rank-checks", { connection: this.connection });
      this.auditQueue = new Queue("site-audits", { connection: this.connection });
      
      console.log(`[Queue] (BullMQ) Queues initialized successfully on Redis: ${redisUrl}`);
    } catch (e) {
      console.error("[Queue] Failed to initialize BullMQ. Falling back to InMemoryQueue.", e);
      throw e;
    }
  }

  async addRankCheckJob(keywordId: string): Promise<void> {
    await this.rankQueue.add("check", { keywordId }, { removeOnComplete: true });
    console.log(`[Queue] (BullMQ) Added rank check job for keyword: ${keywordId}`);
  }

  async addSiteAuditJob(projectId: string): Promise<void> {
    await this.auditQueue.add("audit", { projectId }, { removeOnComplete: true });
    console.log(`[Queue] (BullMQ) Added site audit job for project: ${projectId}`);
  }
}

// Singleton Queue Provider
const globalForQueue = global as unknown as {
  queueService: QueueService | undefined;
};

export function getQueueService(): QueueService {
  if (globalForQueue.queueService) {
    return globalForQueue.queueService;
  }

  const redisUrl = process.env.REDIS_URL;
  let service: QueueService;

  if (redisUrl) {
    try {
      service = new BullMqQueueService(redisUrl);
    } catch (e) {
      service = new InMemoryQueueService();
    }
  } else {
    console.log("[Queue] No REDIS_URL found. Using InMemoryQueueService.");
    service = new InMemoryQueueService();
  }

  if (process.env.NODE_ENV !== "production") {
    globalForQueue.queueService = service;
  }

  return service;
}
