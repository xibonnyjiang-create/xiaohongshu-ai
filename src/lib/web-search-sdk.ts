/**
 * 沙箱环境专用搜索SDK
 * 此文件仅在沙箱环境中被动态导入，避免Vercel构建错误
 */

import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  publishTime?: string;
}

/**
 * 使用 coze-coding-dev-sdk 搜索
 */
export async function searchWithSDK(
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
 * 提取请求头
 */
export function extractHeadersFromRequest(headers: Headers): Record<string, string> {
  return HeaderUtils.extractForwardHeaders(headers);
}
