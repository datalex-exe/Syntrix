import { prisma } from "../db";
import { getSerpProvider } from "../seo/serp";

export async function runRankCheck(keywordId: string): Promise<void> {
  console.log(`[Rank Worker] Starting rank check for keyword ID: ${keywordId}`);
  try {
    const keyword = await prisma.keyword.findUnique({
      where: { id: keywordId },
      include: { project: true }
    });

    if (!keyword) {
      console.warn(`[Rank Worker] Keyword ID ${keywordId} not found in database.`);
      return;
    }

    const provider = getSerpProvider();
    
    // Check position
    const position = await provider.checkPosition(
      keyword.phrase,
      keyword.project.domain,
      keyword.targetCountry
    );

    console.log(`[Rank Worker] Checked rank for "${keyword.phrase}" on "${keyword.project.domain}". Position: ${position}`);

    // Store in rank history
    await prisma.rankHistory.create({
      data: {
        keywordId: keyword.id,
        position,
        checkedAt: new Date()
      }
    });

    // Check if there was a previous rank to flag a big jump/drop
    const history = await prisma.rankHistory.findMany({
      where: { keywordId: keyword.id },
      orderBy: { checkedAt: "desc" },
      take: 2
    });

    if (history.length === 2) {
      const prevPosition = history[1].position;
      const currentPosition = history[0].position;
      const change = prevPosition - currentPosition; // positive means rank improved (e.g. 10 -> 5)

      if (Math.abs(change) >= 5) {
        console.log(`[Rank Worker] ALERT: Keyword "${keyword.phrase}" moved by ${change > 0 ? "+" : ""}${change} positions (from ${prevPosition} to ${currentPosition})!`);
        
        // Slack Webhook notifications
        if (keyword.project.webhookUrl) {
          try {
            console.log(`[Rank Worker] Dispatching ranking shift webhook for project: ${keyword.project.name}`);
            const direction = change > 0 ? "📈 JUMPED" : "📉 DROPPED";
            const diffText = change > 0 ? `+${change}` : `${change}`;
            
            await fetch(keyword.project.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: `🔔 *Syntrix Position Alert* for *${keyword.project.domain}*\n` +
                      `Keyword *"${keyword.phrase}"* has ${direction} by *${diffText}* spots!\n` +
                      `• Previous Rank: #${prevPosition}\n` +
                      `• Current Rank: #${currentPosition}`
              })
            });
          } catch (webhookErr: any) {
            console.error(`[Rank Worker] Webhook dispatch failed:`, webhookErr.message);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[Rank Worker] Failed to run rank check for keyword ${keywordId}:`, error);
    throw error;
  }
}

export async function runSiteAudit(projectId: string): Promise<void> {
  console.log(`[Audit Worker] Starting site audit crawl for project: ${projectId}`);
  try {
    const { crawlAndAudit } = await import("../seo/audit");
    await crawlAndAudit(projectId);
    console.log(`[Audit Worker] Site audit crawl successfully finished for project: ${projectId}`);
  } catch (error) {
    console.error(`[Audit Worker] Site audit crawl failed for project ${projectId}:`, error);
    throw error;
  }
}
