import { NextRequest, NextResponse } from 'next/server';
import { searchWeb, extractHeaders } from '@/lib/web-search';
import { extractHotTopicTags } from '@/lib/llm';
import { 
  sanitizeHotTopic, 
  getCategorySafetyLevel, 
  getDefaultTags 
} from '@/lib/hot-topic-sanitizer';

// 热点板块配置
const HOT_CATEGORIES = [
  { id: 'finance', name: '财经热搜', keywords: 'A股 港股 美股 基金 理财 投资 经济 最新新闻', icon: '📈', sensitive: false },
  { id: 'tech', name: '科技前沿', keywords: 'AI 人工智能 互联网 科技 芯片 新能源 最新动态', icon: '🚀', sensitive: false },
  { id: 'crypto', name: '数字货币', keywords: '比特币 以太坊 加密货币 区块链 Web3 最新行情', icon: '₿', sensitive: true },
  { id: 'global', name: '环球财经', keywords: '美联储 美股 国际经济 全球市场 财经新闻', icon: '🌍', sensitive: false },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'finance';
    
    // 找到对应的板块配置
    const categoryConfig = HOT_CATEGORIES.find(c => c.id === category) || HOT_CATEGORIES[0];
    
    // 获取分类安全等级
    const safetyLevel = getCategorySafetyLevel(category);

    // 提取请求头（异步）
    const customHeaders = await extractHeaders(request.headers);

    try {
      // 使用通用搜索服务
      const searchResults = await searchWeb(categoryConfig.keywords, {
        count: 10,
        timeRange: 'day',
        headers: customHeaders,
      });

      // 格式化热点数据并脱敏处理
      const rawTopics = searchResults.map((item, index) => ({
        id: index + 1,
        title: item.title,
        source: item.source,
        snippet: item.snippet?.substring(0, 100) || '',
        url: item.link,
        publishTime: item.publishTime,
        hot: Math.floor(Math.random() * 50) + 50,
      }));

      // 对热点进行脱敏处理
      const sanitizedTopics = rawTopics.map(topic => sanitizeHotTopic(
        topic.title,
        topic.snippet,
        topic.source,
        topic.url
      ));

      // 转换为API返回格式
      const hotTopics = sanitizedTopics.map((topic, index) => ({
        id: index + 1,
        title: topic.title,
        source: topic.source,
        snippet: topic.snippet,
        url: topic.url,
        publishTime: rawTopics[index].publishTime,
        hot: rawTopics[index].hot,
        isSensitive: topic.isSensitive,
        sensitivityReason: topic.sensitivityReason,
      }));

      const finalTopics = hotTopics.length > 0 ? hotTopics : getMockTopics(category);

      // 提取Top3标签（线性接入）
      let top3Tags: string[] = [];
      try {
        top3Tags = await extractHotTopicTags(finalTopics.slice(0, 5).map(t => t.title));
      } catch (tagError) {
        console.warn('Top3标签提取失败:', tagError);
        top3Tags = getDefaultTags(category);
      }

      return NextResponse.json({
        topics: finalTopics,
        top3Tags: top3Tags,
        category: {
          ...categoryConfig,
          safetyLevel: safetyLevel,
        },
        safetyWarning: categoryConfig.sensitive ? '数字货币波动较大，请理性投资，注意风险。' : null,
        updateTime: new Date().toLocaleString('zh-CN', { 
          timeZone: 'Asia/Shanghai',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } catch (searchError) {
      // 搜索API出错时返回模拟数据
      console.warn('搜索API调用失败，使用模拟数据:', searchError);
      const mockTopics = getMockTopics(category);
      
      // 对模拟数据也进行脱敏
      const sanitizedMock = mockTopics.map(topic => sanitizeHotTopic(
        topic.title,
        topic.snippet,
        topic.source,
        topic.url
      ));
      
      const finalMockTopics = sanitizedMock.map((topic, index) => ({
        id: index + 1,
        title: topic.title,
        source: topic.source,
        snippet: topic.snippet,
        url: mockTopics[index].url,
        publishTime: mockTopics[index].publishTime,
        hot: mockTopics[index].hot,
        isSensitive: topic.isSensitive,
        sensitivityReason: topic.sensitivityReason,
      }));

      // 模拟数据也提取Top3标签
      let top3Tags: string[] = [];
      try {
        top3Tags = await extractHotTopicTags(finalMockTopics.slice(0, 5).map(t => t.title));
      } catch (tagError) {
        top3Tags = getDefaultTags(category);
      }

      return NextResponse.json({
        topics: finalMockTopics,
        top3Tags: top3Tags,
        category: {
          ...categoryConfig,
          safetyLevel: safetyLevel,
        },
        safetyWarning: categoryConfig.sensitive ? '数字货币波动较大，请理性投资，注意风险。' : null,
        updateTime: new Date().toLocaleString('zh-CN', { 
          timeZone: 'Asia/Shanghai',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }
  } catch (error) {
    console.error('Hot topics fetch error:', error);
    
    const category = new URL(request.url).searchParams.get('category') || 'finance';
    const mockTopics = getMockTopics(category);
    
    // 对错误情况下的数据也进行脱敏
    const sanitizedMock = mockTopics.map(topic => sanitizeHotTopic(
      topic.title,
      topic.snippet,
      topic.source,
      topic.url
    ));
    
    const finalMockTopics = sanitizedMock.map((topic, index) => ({
      id: index + 1,
      title: topic.title,
      source: topic.source,
      snippet: topic.snippet,
      url: mockTopics[index].url,
      publishTime: mockTopics[index].publishTime,
      hot: mockTopics[index].hot,
      isSensitive: topic.isSensitive,
      sensitivityReason: topic.sensitivityReason,
    }));
    
    return NextResponse.json({
      topics: finalMockTopics,
      top3Tags: getDefaultTags(category),
      updateTime: new Date().toLocaleString('zh-CN', { 
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  }
}

// 模拟热点数据（作为备用）
function getMockTopics(category: string): any[] {
  const mockData: Record<string, any[]> = {
    finance: [
      { id: 1, title: '锂电池板块强势反弹', snippet: '宁德时代、比亚迪等龙头股带动板块上涨', source: '财经网', url: '#', hot: 95 },
      { id: 2, title: '央行宣布降准0.25个百分点', snippet: '释放长期资金约5000亿元', source: '央行官网', url: '#', hot: 92 },
      { id: 3, title: '白酒板块震荡调整', snippet: '茅台、五粮液等一线白酒股小幅回落', source: '证券日报', url: '#', hot: 88 },
      { id: 4, title: '科创板做市业务正式上线', snippet: '提升科创板流动性与定价效率', source: '上交所', url: '#', hot: 85 },
      { id: 5, title: 'A股三大指数集体收涨', snippet: '沪指重回3200点', source: 'Wind', url: '#', hot: 82 },
    ],
    tech: [
      { id: 1, title: 'AI芯片板块持续活跃', snippet: '英伟达概念股集体走强', source: '科技日报', url: '#', hot: 96 },
      { id: 2, title: '国产大模型取得新突破', snippet: '多模态能力显著提升', source: '36氪', url: '#', hot: 93 },
      { id: 3, title: '互联网科技板块反弹', snippet: '腾讯、阿里等科技股普遍上涨', source: '财经网', url: '#', hot: 89 },
      { id: 4, title: '新能源汽车销量创新高', snippet: '渗透率持续提升', source: '汽车工业协会', url: '#', hot: 86 },
      { id: 5, title: '半导体行业周期拐点渐近', snippet: '机构看好设备材料板块', source: '半导体行业观察', url: '#', hot: 83 },
    ],
    crypto: [
      { id: 1, title: '比特币价格剧烈波动', snippet: '投资者需注意风险，理性看待', source: '币圈资讯', url: '#', hot: 98, isCrypto: true },
      { id: 2, title: '以太坊网络升级完成', snippet: '关注技术应用而非价格波动', source: '以太坊基金会', url: '#', hot: 90, isCrypto: true },
      { id: 3, title: '加密货币市场情绪分化', snippet: '建议投资者做好风险管理', source: '加密货币分析', url: '#', hot: 85, isCrypto: true },
      { id: 4, title: '区块链技术应用持续落地', snippet: '关注实体经济赋能', source: '区块链日报', url: '#', hot: 80, isCrypto: true },
      { id: 5, title: '数字资产监管趋严', snippet: '合规发展成行业主旋律', source: '金融时报', url: '#', hot: 78, isCrypto: true },
    ],
    global: [
      { id: 1, title: '美联储加息预期降温', snippet: '全球流动性边际改善', source: '华尔街见闻', url: '#', hot: 94 },
      { id: 2, title: '纳斯达克指数小幅上涨', snippet: '科技股估值有所修复', source: '彭博社', url: '#', hot: 88 },
      { id: 3, title: '欧洲经济数据分化', snippet: '通胀压力仍存', source: '路透社', url: '#', hot: 82 },
      { id: 4, title: '标普500指数震荡整理', snippet: '投资者保持观望', source: 'MarketWatch', url: '#', hot: 78 },
      { id: 5, title: '日元汇率波动加剧', snippet: '避险情绪有所升温', source: '外汇资讯', url: '#', hot: 75 },
    ],
  };
  
  return mockData[category] || mockData.finance;
}
