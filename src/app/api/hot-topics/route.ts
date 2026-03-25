import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function GET(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    // 搜索今日财经热点
    const response = await client.advancedSearch('今日财经新闻 A股市场热点 经济动态', {
      count: 10,
      needSummary: true,
      timeRange: '1d', // 最近一天
    });

    // 格式化热点数据
    const hotTopics = response.web_items?.map((item, index) => ({
      id: index + 1,
      title: item.title,
      source: item.site_name,
      snippet: item.snippet?.substring(0, 100) || '',
      url: item.url,
      publishTime: item.publish_time,
    })) || [];

    return NextResponse.json({
      topics: hotTopics,
      summary: response.summary || '',
      updateTime: new Date().toLocaleString('zh-CN', { 
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit' 
      }),
    });
  } catch (error) {
    console.error('Hot topics fetch error:', error);
    return NextResponse.json(
      { error: '获取热点失败', topics: [], summary: '' },
      { status: 500 }
    );
  }
}
