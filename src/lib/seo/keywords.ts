export interface KeywordSuggestion {
  phrase: string;
  volume: number;
  difficulty: number;
  cpc: number;
}

export interface KeywordProvider {
  getSuggestions(seed: string): Promise<KeywordSuggestion[]>;
  getQuestions(seed: string): Promise<string[]>;
}

// Deterministic mock provider that creates keyword variations of the search phrase
export class MockKeywordProvider implements KeywordProvider {
  async getSuggestions(seed: string): Promise<KeywordSuggestion[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cleanSeed = seed.trim().toLowerCase();
    const modifiers = [
      "best", "free", "top", "online", "software", "for beginners",
      "agency", "comparison", "reviews", "alternative", "tutorial", "guide",
      "checklist", "for small business", "strategy"
    ];

    const suggestions: KeywordSuggestion[] = [];

    // Include the original phrase
    suggestions.push({
      phrase: cleanSeed,
      volume: this.hashToMetric(cleanSeed, 1000, 50000),
      difficulty: this.hashToMetric(cleanSeed, 10, 85),
      cpc: Number((this.hashToMetric(cleanSeed, 50, 1500) / 100).toFixed(2))
    });

    // Generate modified variations
    modifiers.forEach((modifier) => {
      const phrase = modifier.startsWith("for") || modifier.startsWith("comparison")
        ? `${cleanSeed} ${modifier}`
        : `${modifier} ${cleanSeed}`;

      suggestions.push({
        phrase,
        volume: this.hashToMetric(phrase, 20, 9500),
        difficulty: this.hashToMetric(phrase, 5, 75),
        cpc: Number((this.hashToMetric(phrase, 10, 850) / 100).toFixed(2))
      });
    });

    return suggestions.sort((a, b) => b.volume - a.volume);
  }

  async getQuestions(seed: string): Promise<string[]> {
    const cleanSeed = seed.trim().toLowerCase();
    const questionTemplates = [
      `what is ${cleanSeed}?`,
      `how to use ${cleanSeed}?`,
      `why is ${cleanSeed} important?`,
      `how does ${cleanSeed} work?`,
      `which ${cleanSeed} is best for seo?`,
      `is there a free ${cleanSeed}?`
    ];
    return questionTemplates;
  }

  private hashToMetric(str: string, min: number, max: number): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % (max - min + 1)) + min;
  }
}

// DataForSEO Labs Keyword Ideas Provider
export class DataForSeoKeywordProvider implements KeywordProvider {
  private apiLogin: string;
  private apiPassword: string;

  constructor(apiLogin: string, apiPassword: string) {
    this.apiLogin = apiLogin;
    this.apiPassword = apiPassword;
  }

  async getSuggestions(seed: string): Promise<KeywordSuggestion[]> {
    const authString = Buffer.from(`${this.apiLogin}:${this.apiPassword}`).toString("base64");
    const url = "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live";
    const postData = [
      {
        keywords: [seed],
        language_code: "en",
        location_code: 2840, // US
        limit: 20
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
        throw new Error(`DataForSEO Keyword Ideas failed with status ${response.status}`);
      }

      const data = await response.json();
      const items = data.tasks?.[0]?.result?.[0]?.items;
      if (!items || !Array.isArray(items)) {
        return new MockKeywordProvider().getSuggestions(seed); // fallback
      }

      return items.map((item) => ({
        phrase: item.keyword || "",
        volume: item.keyword_info?.search_volume || 0,
        difficulty: item.keyword_properties?.keyword_difficulty || 0,
        cpc: item.keyword_info?.cpc || 0
      }));
    } catch (error) {
      console.error(`Error in DataForSeoKeywordProvider for "${seed}":`, error);
      return new MockKeywordProvider().getSuggestions(seed);
    }
  }

  async getQuestions(seed: string): Promise<string[]> {
    // Falls back to mock question generation for stability
    return new MockKeywordProvider().getQuestions(seed);
  }
}

// Factory function resolving active provider
export function getKeywordProvider(): KeywordProvider {
  if (process.env.DATA_FOR_SEO_API_LOGIN && process.env.DATA_FOR_SEO_API_PASSWORD) {
    console.log("Using live DataForSeoKeywordProvider");
    return new DataForSeoKeywordProvider(
      process.env.DATA_FOR_SEO_API_LOGIN,
      process.env.DATA_FOR_SEO_API_PASSWORD
    );
  }

  console.log("Using MockKeywordProvider (no DataForSEO credentials found)");
  return new MockKeywordProvider();
}
