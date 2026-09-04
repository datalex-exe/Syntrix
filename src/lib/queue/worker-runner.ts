import { runRankCheck, runSiteAudit } from "./jobs";

export function startWorker() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error("[Worker Process] REDIS_URL is not set. Standalone worker cannot start.");
    process.exit(1);
  }

  console.log(`[Worker Process] Initializing BullMQ workers on Redis: ${redisUrl}`);

  try {
    const { Worker } = require("bullmq");
    const IORedis = require("ioredis");

    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    const rankWorker = new Worker(
      "rank-checks",
      async (job: any) => {
        const { keywordId } = job.data;
        await runRankCheck(keywordId);
      },
      { connection, concurrency: 1 }
    );

    const auditWorker = new Worker(
      "site-audits",
      async (job: any) => {
        const { projectId } = job.data;
        await runSiteAudit(projectId);
      },
      { connection, concurrency: 1 }
    );

    rankWorker.on("completed", (job: any) => {
      console.log(`[Worker Process] Rank check job ${job.id} completed successfully.`);
    });

    rankWorker.on("failed", (job: any, error: Error) => {
      console.error(`[Worker Process] Rank check job ${job?.id} failed:`, error);
    });

    auditWorker.on("completed", (job: any) => {
      console.log(`[Worker Process] Site audit job ${job.id} completed successfully.`);
    });

    auditWorker.on("failed", (job: any, error: Error) => {
      console.error(`[Worker Process] Site audit job ${job?.id} failed:`, error);
    });

    console.log("[Worker Process] Standalone workers are active and listening for queued jobs.");
  } catch (error) {
    console.error("[Worker Process] Critical error initializing workers:", error);
    process.exit(1);
  }
}
