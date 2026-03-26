/**
 * 沙箱环境专用搜索SDK
 * 在 Vercel 环境中，此文件不应被导入
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  publishTime?: string;
}

// 动态导入 SDK，避免在非沙箱环境中报错
async function getSDK() {
  try {
    // 使用动态导入，webpack alias 会替换这个路径
    const sdk = await import('coze-coding-dev-sdk');
    return sdk;
  } catch (error) {
    console.error('Failed to load coze-coding-dev-sdk:', error);
    return null;
  }
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
  const sdk = await getSDK();
  if (!sdk) {
    console.warn('SDK not available');
    return [];
  }

  const { SearchClient, Config, HeaderUtils } = sdk;
  const config = new Config();
  const client = new SearchClient(config, customHeaders);
  
  const timeRangeMap: Record<string, string> = {
    'day': '1d',
    'week': '1w',
    'month': '1m',
  };
  
  try {
    const response = await client.advancedSearch(query, {
      searchType: 'web',
      count: count,
      timeRange: timeRangeMap[timeRange] || '1d',
      needSummary: false,
    });
    
    if (response.web_items && response.web_items.length > 0) {
      return response.web_items.map((item: any) => ({
        title: item.title,
        link: item.url || '',
        snippet: item.snippet || '',
        source: item.site_name || '',
        publishTime: item.publish_time,
      }));
    }
  } catch (error) {
    console.error('SDK搜索失败:', error);
  }
  
  return [];
}

/**
 * 提取请求头
 */
export async function extractHeadersFromRequest(headers: Headers): Promise<Record<string, string>> {
  const sdk = await getSDK();
  if (!sdk) {
    return {};
  }
  
  const { HeaderUtils } = sdk;
  return HeaderUtils.extractForwardHeaders(headers);
}
