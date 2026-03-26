/**
 * coze-coding-dev-sdk 类型声明
 */

declare module 'coze-coding-dev-sdk' {
  export class SearchClient {
    constructor(config?: Config, customHeaders?: Record<string, string>);
    advancedSearch(query: string, options?: {
      searchType?: 'web' | 'web_summary' | 'image';
      count?: number;
      timeRange?: string;
      needSummary?: boolean;
    }): Promise<{
      web_items?: Array<{
        title: string;
        url?: string;
        snippet?: string;
        site_name?: string;
        publish_time?: string;
      }>;
    }>;
  }

  export class Config {
    constructor(options?: { apiKey?: string; timeout?: number });
  }

  export const HeaderUtils: {
    extractForwardHeaders: (headers: Headers | Record<string, string>) => Record<string, string>;
  };
}
