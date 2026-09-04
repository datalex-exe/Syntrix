import { chromium } from "playwright";
import { prisma } from "../db";

export interface AuditResult {
  url: string;
  loadTimeMs: number;
  title: string | null;
  metaDescription: string | null;
  issues: {
    type: string;
    severity: "critical" | "warning" | "info";
    details: string;
  }[];
}

export async function crawlAndAudit(projectId: string, maxPages = 10): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    console.error(`[Audit Engine] Project ${projectId} not found.`);
    return;
  }

  // Fetch all keywords tracked in this project for internal linking advisor
  const trackedKeywords = await prisma.keyword.findMany({
    where: { projectId }
  });
  const keywordPhrases = trackedKeywords.map((k) => k.phrase);

  const domain = project.domain;
  const startUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const targetDomainHost = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

  console.log(`[Audit Engine] Starting crawl for domain: ${domain} (Start URL: ${startUrl})`);

  // Clear previous audit issues for a fresh crawl
  await prisma.auditIssue.deleteMany({
    where: { projectId }
  });

  const visitedUrls = new Set<string>();
  const urlsToVisit = [startUrl];
  
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Syntrix/1.0"
    });

    const page = await context.newPage();

    while (urlsToVisit.length > 0 && visitedUrls.size < maxPages) {
      let currentUrl = urlsToVisit.shift();
      if (!currentUrl) continue;

      // Normalize URL (strip hashes)
      currentUrl = currentUrl.split("#")[0];
      if (visitedUrls.has(currentUrl)) continue;
      visitedUrls.add(currentUrl);

      console.log(`[Audit Engine] Auditing page [${visitedUrls.size}/${maxPages}]: ${currentUrl}`);

      try {
        const startTime = Date.now();
        const response = await page.goto(currentUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        const loadTimeMs = Date.now() - startTime;

        const status = response ? response.status() : 500;
        
        if (status >= 400) {
          await prisma.auditIssue.create({
            data: {
              projectId,
              url: currentUrl,
              issueType: "broken-page",
              severity: "critical",
              details: `Page returned HTTP status error code ${status}.`
            }
          });
          continue;
        }

        // Run Page Analysis
        const auditData = await page.evaluate(({ phrases }) => {
          const titleTag = document.querySelector("title");
          const metaDescTag = document.querySelector("meta[name='description']");
          const title = titleTag ? titleTag.innerText.trim() : null;
          const metaDescription = metaDescTag ? metaDescTag.getAttribute("content")?.trim() || null : null;

          const issues: { type: string; severity: "critical" | "warning" | "info"; details: string }[] = [];

          // 1. Check title
          if (!title) {
            issues.push({
              type: "missing-title",
              severity: "critical",
              details: "Missing HTML title tag."
            });
          } else if (title.length < 10) {
            issues.push({
              type: "short-title",
              severity: "warning",
              details: `Title is very short (${title.length} characters). Recommended: 30-60 characters.`
            });
          }

          // 2. Check meta description
          if (!metaDescription) {
            issues.push({
              type: "missing-meta-description",
              severity: "critical",
              details: "Missing HTML meta description tag."
            });
          } else if (metaDescription.length < 50) {
            issues.push({
              type: "short-meta-description",
              severity: "warning",
              details: `Meta description is very short (${metaDescription.length} characters). Recommended: 120-160 characters.`
            });
          }

          // 3. Check alt text
          const images = Array.from(document.querySelectorAll("img"));
          let missingAltCount = 0;
          images.forEach((img) => {
            if (!img.hasAttribute("alt") || img.getAttribute("alt")?.trim() === "") {
              missingAltCount++;
            }
          });

          if (missingAltCount > 0) {
            issues.push({
              type: "missing-alt-text",
              severity: "warning",
              details: `${missingAltCount} images are missing descriptive alt text attributes.`
            });
          }

          // 4. Check HTTPS resource mix
          const resources = Array.from(document.querySelectorAll("link, script, img"));
          let unsecureCount = 0;
          resources.forEach((el) => {
            const src = el.getAttribute("src") || el.getAttribute("href") || "";
            if (src.startsWith("http://")) {
              unsecureCount++;
            }
          });

          if (unsecureCount > 0) {
            issues.push({
              type: "mixed-content",
              severity: "critical",
              details: `${unsecureCount} unsecure resources (HTTP) loaded on HTTPS page.`
            });
          }

          // 5. Internal link opportunities check
          const pageText = document.body.innerText.toLowerCase();
          const anchors = Array.from(document.querySelectorAll("a"));
          const anchorHrefTexts = anchors.map((a) => ({
            text: a.innerText.toLowerCase(),
            href: a.getAttribute("href") || ""
          }));

          phrases.forEach((phrase: string) => {
            const lowerPhrase = phrase.toLowerCase();
            if (pageText.includes(lowerPhrase)) {
              // Check if any existing anchor text or destination URL includes the keyword phrase
              const hasLink = anchorHrefTexts.some(
                (a) => a.text.includes(lowerPhrase) || a.href.toLowerCase().includes(lowerPhrase)
              );
              if (!hasLink) {
                issues.push({
                  type: "internal-link-opportunity",
                  severity: "info",
                  details: `Page content contains the keyword phrase "${phrase}" but does not contain a link to its topic. Add an internal link to improve relevancy.`
                });
              }
            }
          });

          // 6. Gather all local links for next hops
          const links = Array.from(document.querySelectorAll("a"))
            .map((a) => a.getAttribute("href"))
            .filter((href): href is string => !!href);

          return { title, metaDescription, issues, links };
        }, { phrases: keywordPhrases });

        // 7. Save issues to DB
        for (const issue of auditData.issues) {
          await prisma.auditIssue.create({
            data: {
              projectId,
              url: currentUrl,
              issueType: issue.type,
              severity: issue.severity,
              details: issue.details
            }
          });
        }

        // 8. Slow page check
        if (loadTimeMs > 3000) {
          await prisma.auditIssue.create({
            data: {
              projectId,
              url: currentUrl,
              issueType: "slow-page",
              severity: "warning",
              details: `Page took ${loadTimeMs}ms to load. Recommended load speed is under 2000ms.`
            }
          });
        }

        // Add discovered links to next hop crawl
        auditData.links.forEach((link) => {
          try {
            const absoluteUrl = new URL(link, currentUrl).toString();
            const linkHost = new URL(absoluteUrl).host;
            
            // Check if link matches our domain host and hasn't been visited
            if (linkHost.replace("www.", "") === targetDomainHost.replace("www.", "")) {
              if (!visitedUrls.has(absoluteUrl) && !urlsToVisit.includes(absoluteUrl)) {
                urlsToVisit.push(absoluteUrl);
              }
            }
          } catch (e) {
            // Invalid links ignore
          }
        });

      } catch (err: any) {
        console.error(`[Audit Engine] Error visiting page ${currentUrl}:`, err.message);
        await prisma.auditIssue.create({
          data: {
            projectId,
            url: currentUrl,
            issueType: "crawl-error",
            severity: "info",
            details: `Failed to load page: ${err.message}`
          }
        });
      }
    }

    // Run XML Sitemap audits
    await auditSitemap(projectId, startUrl, visitedUrls);

    // Call PageSpeed (or simulate if no API Key)
    await runPageSpeedChecks(projectId, startUrl);

    console.log(`[Audit Engine] Crawl completed. Audited ${visitedUrls.size} pages.`);
  } catch (error) {
    console.error("[Audit Engine] Crawler failed completely:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function auditSitemap(projectId: string, startUrl: string, visitedUrls: Set<string>): Promise<void> {
  const sitemapUrl = `${startUrl.replace(/\/$/, "")}/sitemap.xml`;
  console.log(`[Audit Engine] Querying XML sitemap at: ${sitemapUrl}`);

  try {
    const res = await fetch(sitemapUrl);
    if (!res.ok) {
      await prisma.auditIssue.create({
        data: {
          projectId,
          url: sitemapUrl,
          issueType: "missing-sitemap",
          severity: "warning",
          details: `Could not fetch sitemap.xml. Server returned status code ${res.status}.`
        }
      });
      return;
    }

    const xml = await res.text();
    // Simple regex matching for sitemap location nodes
    const locs = Array.from(xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)).map((m) => m[1]);

    if (locs.length === 0) {
      await prisma.auditIssue.create({
        data: {
          projectId,
          url: sitemapUrl,
          issueType: "empty-sitemap",
          severity: "warning",
          details: `sitemap.xml was fetched successfully but contains no URL <loc> tags.`
        }
      });
      return;
    }

    // 1. Check if all crawled pages are declared inside the sitemap
    for (const crawledUrl of visitedUrls) {
      const matchFound = locs.some(
        (loc) => loc.replace(/\/$/, "").toLowerCase() === crawledUrl.replace(/\/$/, "").toLowerCase()
      );

      if (!matchFound) {
        await prisma.auditIssue.create({
          data: {
            projectId,
            url: crawledUrl,
            issueType: "sitemap-missing-url",
            severity: "warning",
            details: `Page is linked internally on site but is missing from sitemap.xml.`
          }
        });
      }
    }

    // 2. Validate up to 5 URLs in sitemap for broken paths (limits request times)
    const sampleUrls = locs.slice(0, 5);
    for (const testUrl of sampleUrls) {
      try {
        const testRes = await fetch(testUrl, { method: "HEAD" });
        if (testRes.status >= 400) {
          await prisma.auditIssue.create({
            data: {
              projectId,
              url: testUrl,
              issueType: "sitemap-broken-url",
              severity: "critical",
              details: `Sitemap contains a broken URL link. Checked status returned was HTTP ${testRes.status}.`
            }
          });
        }
      } catch (e) {
        // network issue
      }
    }
  } catch (err: any) {
    console.warn(`[Audit Engine] Sitemap parsing failed:`, err.message);
  }
}

async function runPageSpeedChecks(projectId: string, url: string): Promise<void> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

  if (apiKey) {
    try {
      const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const score = data.lighthouseResult?.categories?.performance?.score;
        if (score !== undefined) {
          const perfScore = Math.round(score * 100);
          console.log(`[Audit Engine] PageSpeed Score for ${url}: ${perfScore}`);
          
          await prisma.auditIssue.create({
            data: {
              projectId,
              url,
              issueType: "pagespeed-score",
              severity: perfScore >= 90 ? "info" : perfScore >= 50 ? "warning" : "critical",
              details: `Lighthouse Performance Score is ${perfScore}/100.`
            }
          });
          return;
        }
      }
    } catch (e) {
      console.error("[Audit Engine] Failed to get real PageSpeed details:", e);
    }
  }

  // Fallback / Mock PageSpeed: Generate deterministic score based on domain name
  let score = 85;
  for (let i = 0; i < url.length; i++) {
    score = (score + url.charCodeAt(i)) % 41 + 55; // Generates score between 55 and 95
  }
  
  await prisma.auditIssue.create({
    data: {
      projectId,
      url,
      issueType: "pagespeed-score",
      severity: score >= 90 ? "info" : score >= 50 ? "warning" : "critical",
      details: `Lighthouse Performance Score is ${score}/100. (Mocked)`
    }
  });
}
