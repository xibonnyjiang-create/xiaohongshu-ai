/**
 * 网络搜索服务
 * - 沙箱环境：使用 coze-coding-dev-sdk（通过单独文件导入）
 * - Vercel环境：使用外部API（SerpAPI）
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  publishTime?: string;
}

// 搜索配置
const SEARCH_CONFIG = {
  serpApi: {
    apiKey: process.env.SERP_API_KEY || '',
  },
  bing: {
    apiKey: process.env.BING_API_KEY || '',
  },
};

// 检测是否在沙箱环境
function isSandboxEnvironment(): boolean {
  // 沙箱环境会有特定的环境变量
  return !!process.env.COZE_PROJECT_ENV || !!process.env.COZE_WORKSPACE_PATH;
}

/**
 * 执行网络搜索
 */
export async function searchWeb(query: string, options?: {
  count?: number;
  timeRange?: 'day' | 'week' | 'month';
  headers?: Record<string, string>;
}): Promise<SearchResult[]> {
  const { count = 10, timeRange = 'day', headers } = options || {};
  
  // 沙箱环境：使用内置SDK（单独文件，避免Vercel构建错误）
  if (isSandboxEnvironment()) {
    try {
      const { searchWithSDK } = await import('./web-search-sdk');
      return await searchWithSDK(query, count, timeRange, headers);
    } catch (error) {
      console.warn('SDK搜索失败，尝试备用方案:', error);
    }
  }
  
  // Vercel/生产环境：使用外部API
  if (SEARCH_CONFIG.serpApi.apiKey) {
    return searchWithSerpApi(query, count, timeRange);
  }
  
  if (SEARCH_CONFIG.bing.apiKey) {
    return searchWithBing(query, count);
  }
  
  // 无配置时返回模拟数据
  console.warn('未配置搜索API，返回模拟数据');
  return getMockSearchResults(query);
}

/**
 * SerpAPI搜索（Vercel环境）
 */
async function searchWithSerpApi(
  query: string, 
  count: number, 
  timeRange: string
): Promise<SearchResult[]> {
  const { apiKey } = SEARCH_CONFIG.serpApi;
  
  try {
    const params = new URLSearchParams({
      engine: 'google_news',
      q: query,
      api_key: apiKey,
      gl: 'cn',
      hl: 'zh-cn',
    });
    
    const response = await fetch(`https://serpapi.com/search?${params}`);
    
    if (!response.ok) {
      console.error('SerpAPI请求失败:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error('SerpAPI错误:', data.error);
      return [];
    }
    
    if (data.news_results) {
      return data.news_results.slice(0, count).map((r: any) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        source: r.source,
        publishTime: r.date,
      }));
    }
    
    if (data.organic_results) {
      return data.organic_results.slice(0, count).map((r: any) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        source: r.source || new URL(r.link).hostname,
        publishTime: r.date,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('SerpAPI调用异常:', error);
    return [];
  }
}

/**
 * Bing搜索（备用）
 */
async function searchWithBing(query: string, count: number): Promise<SearchResult[]> {
  const { apiKey } = SEARCH_CONFIG.bing;
  
  try {
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
  } catch (error) {
    console.error('Bing搜索异常:', error);
    return [];
  }
}

/**
 * 模拟搜索结果
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

/**
 * 提取请求头用于SDK（沙箱环境）
 */
export async function extractHeaders(headers: Headers): Promise<Record<string, string>> {
  if (!isSandboxEnvironment()) {
    return {};
  }
  
  try {
    const { extractHeadersFromRequest } = await import('./web-search-sdk');
    return await extractHeadersFromRequest(headers);
  } catch {
    return {};
  }
}
