/**
 * 网络搜索服务
 * 优先使用 coze-coding-dev-sdk（沙箱环境）
 * 备用使用外部搜索API
 */

import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  publishTime?: string;
}

// 搜索配置（备用外部API）
const SEARCH_CONFIG = {
  serpApi: {
    apiKey: process.env.SERP_API_KEY || '',
  },
  bing: {
    apiKey: process.env.BING_API_KEY || '',
  },
};

/**
 * 执行网络搜索
 */
export async function searchWeb(query: string, options?: {
  count?: number;
  timeRange?: 'day' | 'week' | 'month';
  headers?: Record<string, string>;
}): Promise<SearchResult[]> {
  const { count = 10, timeRange = 'day', headers } = options || {};
  
  // 优先使用 coze-coding-dev-sdk（沙箱环境内置）
  try {
    return await searchWithSDK(query, count, timeRange, headers);
  } catch (error) {
    console.warn('SDK搜索失败，尝试备用方案:', error);
  }
  
  // 备用：SerpAPI
  if (SEARCH_CONFIG.serpApi.apiKey) {
    return searchWithSerpApi(query, count, timeRange);
  }
  
  // 备用：Bing
  if (SEARCH_CONFIG.bing.apiKey) {
    return searchWithBing(query, count);
  }
  
  // 最终备用：模拟数据
  console.warn('未配置搜索API，返回模拟数据');
  return getMockSearchResults(query);
}

/**
 * 使用 coze-coding-dev-sdk 搜索（沙箱环境）
 */
async function searchWithSDK(
  query: string, 
  count: number, 
  timeRange: string,
  customHeaders?: Record<string, string>
): Promise<SearchResult[]> {
  const config = new Config();
  const client = new SearchClient(config, customHeaders);
  
  const timeRangeMap: Record<string, string> = {
    'day': '1d',
    'week': '1w',
    'month': '1m',
  };
  
  const response = await client.advancedSearch(query, {
    searchType: 'web',
    count: count,
    timeRange: timeRangeMap[timeRange] || '1d',
    needSummary: false,
  });
  
  if (response.web_items && response.web_items.length > 0) {
    return response.web_items.map((item) => ({
      title: item.title,
      link: item.url || '',
      snippet: item.snippet || '',
      source: item.site_name || '',
      publishTime: item.publish_time,
    }));
  }
  
  return [];
}

/**
 * SerpAPI搜索（备用）
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
 * 模拟搜索结果（最终备用）
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
 * 提取请求头用于SDK（用于API路由）
 */
export function extractHeaders(headers: Headers): Record<string, string> {
  return HeaderUtils.extractForwardHeaders(headers);
}
