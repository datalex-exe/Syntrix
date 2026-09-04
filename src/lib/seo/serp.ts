export interface SerpProvider {
  checkPosition(keyword: string, domain: string, countryCode?: string): Promise<number>;
}

// Deterministic mock provider that gives realistic, slightly fluctuating ranks
export class MockSerpProvider implements SerpProvider {
  async checkPosition(keyword: string, domain: string, countryCode: string = "US"): Promise<number> {
    // Artificial latency to simulate API calls
    await new Promise((resolve) => setTimeout(resolve, 300));

    // String hashing
    let hash = 0;
    const str = `${keyword.toLowerCase()}:${domain.toLowerCase()}:${countryCode.toUpperCase()}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    
    // Base position between 2 and 60
    const basePos = Math.abs(hash % 59) + 2;
    
    // Use the current date to introduce a daily ranking fluctuation (-4 to +4)
    const today = new Date();
    const daySeed = today.getFullYear() * 365 + today.getMonth() * 30 + today.getDate();
    const fluctuation = ((hash + daySeed) % 9) - 4;
    
    return Math.max(1, Math.min(100, basePos + fluctuation));
  }
}

// SerpApi Google Search Provider
export class SerpApiProvider implements SerpProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async checkPosition(keyword: string, domain: string, countryCode: string = "US"): Promise<number> {
    const gl = countryCode.toLowerCase();
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(keyword)}&api_key=${this.apiKey}&gl=${gl}&hl=en&num=100`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`SerpApi search failed with status ${response.status}`);
      }
      const data = await response.json();
      
      const organicResults = data.organic_results;
      if (!organicResults || !Array.isArray(organicResults)) {
        return 101; // Not found in top 100
      }

      const targetDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");

      for (const result of organicResults) {
        const link = result.link || "";
        const resultDomain = link.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
        
        if (resultDomain.startsWith(targetDomain)) {
          return result.position || 101;
        }
      }

      return 101; // Not found
    } catch (error) {
      console.error(`Error in SerpApiProvider for keyword "${keyword}":`, error);
      throw error;
    }
  }
}

// DataForSEO Live SERP Provider
export class DataForSeoSerpProvider implements SerpProvider {
  private apiLogin: string;
  private apiPassword: string;

  constructor(apiLogin: string, apiPassword: string) {
    this.apiLogin = apiLogin;
    this.apiPassword = apiPassword;
  }

  async checkPosition(keyword: string, domain: string, countryCode: string = "US"): Promise<number> {
    // Basic implementation of DataForSEO SERP check
    const authString = Buffer.from(`${this.apiLogin}:${this.apiPassword}`).toString("base64");
    const url = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";
    const postData = [
      {
        keyword: keyword,
        language_code: "en",
        location_code: this.getLocationCode(countryCode),
        limit: 100
      }
    ];

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error(`DataForSEO API failed with status ${response.status}`);
      }

      const data = await response.json();
      const items = data.tasks?.[0]?.result?.[0]?.items;
      if (!items || !Array.isArray(items)) {
        return 101;
      }

      const targetDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");

      for (const item of items) {
        if (item.type !== "organic") continue;
        const link = item.url || "";
        const resultDomain = link.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");

        if (resultDomain.startsWith(targetDomain)) {
          return item.rank_absolute || 101;
        }
      }

      return 101;
    } catch (error) {
      console.error(`Error in DataForSeoSerpProvider for "${keyword}":`, error);
      return 101; // Fallback
    }
  }

  private getLocationCode(countryCode: string): number {
    // Simple mapping for common countries. In production, use DataForSEO location endpoints.
    const map: Record<string, number> = {
      US: 2840, // United States
      GB: 2826, // United Kingdom
      CA: 2124, // Canada
      AU: 2036, // Australia
      IN: 2356  // India
    };
    return map[countryCode.toUpperCase()] || 2840;
  }
}

// Factory function resolving swappable provider
export function getSerpProvider(): SerpProvider {
  if (process.env.SERP_API_KEY) {
    console.log("Using live SerpApiProvider");
    return new SerpApiProvider(process.env.SERP_API_KEY);
  }
  
  if (process.env.DATA_FOR_SEO_API_LOGIN && process.env.DATA_FOR_SEO_API_PASSWORD) {
    console.log("Using live DataForSeoSerpProvider");
    return new DataForSeoSerpProvider(
      process.env.DATA_FOR_SEO_API_LOGIN,
      process.env.DATA_FOR_SEO_API_PASSWORD
    );
  }

  console.log("Using MockSerpProvider (no API credentials found)");
  return new MockSerpProvider();
}
