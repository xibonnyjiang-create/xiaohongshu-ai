/**
 * 通用网络搜索服务
 * 支持多种搜索引擎后端
 */

// 搜索配置
const SEARCH_CONFIG = {
  // SerpAPI配置（推荐）
  serpApi: {
    apiKey: process.env.SERP_API_KEY || '',
  },
  // Bing搜索配置
  bing: {
    apiKey: process.env.BING_API_KEY || '',
  },
  // Google自定义搜索配置
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || '',
  }
};

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  publishTime?: string;
}

/**
 * 执行网络搜索
 */
export async function searchWeb(query: string, options?: {
  count?: number;
  timeRange?: 'day' | 'week' | 'month';
}): Promise<SearchResult[]> {
  const { count = 10, timeRange = 'day' } = options || {};
  
  // 优先使用SerpAPI
  if (SEARCH_CONFIG.serpApi.apiKey) {
    return searchWithSerpApi(query, count, timeRange);
  }
  
  // 备用：Bing
  if (SEARCH_CONFIG.bing.apiKey) {
    return searchWithBing(query, count);
  }
  
  // 备用：Google
  if (SEARCH_CONFIG.google.apiKey && SEARCH_CONFIG.google.searchEngineId) {
    return searchWithGoogle(query, count);
  }
  
  // 无API配置时返回模拟数据
  console.warn('未配置搜索API，返回模拟数据');
  return getMockSearchResults(query);
}

/**
 * SerpAPI搜索
 */
async function searchWithSerpApi(
  query: string, 
  count: number, 
  timeRange: string
): Promise<SearchResult[]> {
  const { apiKey } = SEARCH_CONFIG.serpApi;
  
  const params = new URLSearchParams({
    q: query,
    api_key: apiKey,
    num: count.toString(),
    tbs: timeRange === 'day' ? 'qdr:d' : timeRange === 'week' ? 'qdr:w' : 'qdr:m',
  });
  
  const response = await fetch(`https://serpapi.com/search?${params}`);
  const data = await response.json();
  
  if (data.organic_results) {
    return data.organic_results.map((r: any, i: number) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      source: new URL(r.link).hostname,
      publishTime: r.date,
    }));
  }
  
  return [];
}

/**
 * Bing搜索
 */
async function searchWithBing(query: string, count: number): Promise<SearchResult[]> {
  const { apiKey } = SEARCH_CONFIG.bing;
  
  const response = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${count}`,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    }
  );
  
  const data = await response.json();
  
  if (data.webPages?.value) {
    return data.webPages.value.map((r: any) => ({
      title: r.name,
      link: r.url,
      snippet: r.snippet,
      source: new URL(r.url).hostname,
      publishTime: r.dateLastCrawled,
    }));
  }
  
  return [];
}

/**
 * Google自定义搜索
 */
async function searchWithGoogle(query: string, count: number): Promise<SearchResult[]> {
  const { apiKey, searchEngineId } = SEARCH_CONFIG.google;
  
  const params = new URLSearchParams({
    q: query,
    key: apiKey,
    cx: searchEngineId,
    num: count.toString(),
  });
  
  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  const data = await response.json();
  
  if (data.items) {
    return data.items.map((r: any) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      source: r.displayLink,
    }));
  }
  
  return [];
}

/**
 * 模拟搜索结果（用于测试）
 */
function getMockSearchResults(query: string): SearchResult[] {
  return [
    {
      title: `${query} - 最新动态`,
      link: 'https://example.com/news/1',
      snippet: `关于${query}的最新资讯和分析`,
      source: 'example.com',
    },
    {
      title: `${query} - 深度解读`,
      link: 'https://example.com/analysis/1',
      snippet: `专业分析师对${query}的深度解读`,
      source: 'example.com',
    },
  ];
}
