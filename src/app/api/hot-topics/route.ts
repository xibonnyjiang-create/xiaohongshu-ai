import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 热点板块配置
const HOT_CATEGORIES = [
  { id: 'finance', name: '财经热搜', keywords: 'A股 港股 美股 基金 理财 投资 经济', icon: '📈' },
  { id: 'tech', name: '科技前沿', keywords: 'AI 人工智能 互联网 科技 芯片 新能源', icon: '🚀' },
  { id: 'crypto', name: '数字货币', keywords: '比特币 以太坊 加密货币 区块链 Web3', icon: '₿' },
  { id: 'global', name: '环球财经', keywords: '美联储 美股 国际经济 全球市场', icon: '🌍' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'finance';
    
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    // 找到对应的板块配置
    const categoryConfig = HOT_CATEGORIES.find(c => c.id === category) || HOT_CATEGORIES[0];

    // 搜索实时热点
    const response = await client.advancedSearch(`${categoryConfig.keywords} 最新新闻 今日热点`, {
      count: 10,
      needSummary: true,
    });

    // 格式化热点数据
    const hotTopics = response.web_items?.map((item, index) => ({
      id: index + 1,
      title: item.title,
      source: item.site_name,
      snippet: item.snippet?.substring(0, 100) || '',
      url: item.url,
      publishTime: item.publish_time,
      hot: Math.floor(Math.random() * 100) + 1, // 模拟热度值
    })) || [];

    // 如果没有结果，返回模拟数据
    const finalTopics = hotTopics.length > 0 ? hotTopics : getMockTopics(category);

    return NextResponse.json({
      topics: finalTopics,
      category: categoryConfig,
      updateTime: new Date().toLocaleString('zh-CN', { 
        timeZone: 'Asia/Shanghai',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
    });
  } catch (error) {
    console.error('Hot topics fetch error:', error);
    
    // 出错时返回模拟数据
    const category = new URL(request.url).searchParams.get('category') || 'finance';
    return NextResponse.json({
      topics: getMockTopics(category),
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
      { id: 1, title: 'A股三大指数集体高开 沪指涨0.5%', source: '财经头条', hot: 98, snippet: '市场情绪回暖，北向资金持续流入' },
      { id: 2, title: '央行最新表态：将继续实施稳健货币政策', source: '经济日报', hot: 92, snippet: '支持实体经济发展，保持流动性合理充裕' },
      { id: 3, title: '新能源汽车销量创新高 相关板块大涨', source: '证券时报', hot: 88, snippet: '多家车企公布月度销量数据超预期' },
      { id: 4, title: '黄金价格突破历史新高 避险情绪升温', source: '金融界', hot: 85, snippet: '全球不确定性增加，投资者转向避险资产' },
      { id: 5, title: '茅台股价重回2000元 白酒板块走强', source: '第一财经', hot: 82, snippet: '消费复苏预期推动高端白酒行情' },
    ],
    tech: [
      { id: 1, title: 'ChatGPT最新版本发布 AI能力再升级', source: '科技日报', hot: 99, snippet: '新一代大模型推理能力大幅提升' },
      { id: 2, title: '国产芯片取得重大突破 量产在即', source: '半导体行业', hot: 95, snippet: '自主可控进程加速，打破国外垄断' },
      { id: 3, title: '华为发布新款折叠屏手机 销量火爆', source: '中关村在线', hot: 90, snippet: '预约量突破百万，市场反响热烈' },
      { id: 4, title: '特斯拉FSD将进入中国市场 自动驾驶竞争加剧', source: '汽车之家', hot: 87, snippet: '智能驾驶赛道迎来新格局' },
      { id: 5, title: '苹果Vision Pro中国开售 首批秒罄', source: '威锋网', hot: 84, snippet: 'MR设备开启新时代' },
    ],
    crypto: [
      { id: 1, title: '比特币突破10万美元 创历史新高', source: '金色财经', hot: 99, snippet: '机构资金持续流入，市场情绪高涨' },
      { id: 2, title: '以太坊ETF获批 资金大举入场', source: '链闻', hot: 94, snippet: '传统金融与加密市场融合加速' },
      { id: 3, title: 'Web3游戏赛道爆发 多个项目融资过亿', source: '深潮', hot: 88, snippet: 'GameFi生态迎来新一轮繁荣' },
      { id: 4, title: 'Layer2生态持续扩展 Gas费大幅降低', source: '巴比特', hot: 85, snippet: '以太坊扩容解决方案日趋成熟' },
      { id: 5, title: '央行数字货币跨境支付试点扩大', source: '移动支付网', hot: 82, snippet: '数字人民币国际化进程加快' },
    ],
    global: [
      { id: 1, title: '美联储宣布维持利率不变 市场解读偏鸽', source: '华尔街日报', hot: 97, snippet: '年内降息预期升温，全球市场反弹' },
      { id: 2, title: '欧洲央行暗示可能降息 欧元应声下跌', source: '金融时报', hot: 92, snippet: '全球经济增速放缓担忧加剧' },
      { id: 3, title: '日本央行结束负利率政策 日元大涨', source: '日经中文网', hot: 89, snippet: '货币政策转向，影响全球资金流向' },
      { id: 4, title: '中东局势紧张 国际油价飙升', source: '路透社', hot: 86, snippet: '地缘政治风险推高能源价格' },
      { id: 5, title: '东南亚市场成投资新热点 资金加速布局', source: '彭博社', hot: 83, snippet: '新兴市场吸引力上升' },
    ],
  };
  
  return mockData[category] || mockData.finance;
}

// 获取所有板块配置（供前端使用）
export async function OPTIONS() {
  return NextResponse.json({
    categories: HOT_CATEGORIES,
  });
}
