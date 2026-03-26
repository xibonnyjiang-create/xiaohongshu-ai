import { NextRequest, NextResponse } from 'next/server';
import { searchWeb, extractHeaders } from '@/lib/web-search';

// 热点板块配置
const HOT_CATEGORIES = [
  { id: 'finance', name: '财经热搜', keywords: 'A股 港股 美股 基金 理财 投资 经济 最新新闻', icon: '📈' },
  { id: 'tech', name: '科技前沿', keywords: 'AI 人工智能 互联网 科技 芯片 新能源 最新动态', icon: '🚀' },
  { id: 'crypto', name: '数字货币', keywords: '比特币 以太坊 加密货币 区块链 Web3 最新行情', icon: '₿' },
  { id: 'global', name: '环球财经', keywords: '美联储 美股 国际经济 全球市场 财经新闻', icon: '🌍' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'finance';
    
    // 找到对应的板块配置
    const categoryConfig = HOT_CATEGORIES.find(c => c.id === category) || HOT_CATEGORIES[0];

    // 提取请求头（异步）
    const customHeaders = await extractHeaders(request.headers);

    try {
      // 使用通用搜索服务
      const searchResults = await searchWeb(categoryConfig.keywords, {
        count: 10,
        timeRange: 'day',
        headers: customHeaders,
      });

      // 格式化热点数据
      const hotTopics = searchResults.map((item, index) => ({
        id: index + 1,
        title: item.title,
        source: item.source,
        snippet: item.snippet?.substring(0, 100) || '',
        url: item.link,
        publishTime: item.publishTime,
        hot: Math.floor(Math.random() * 50) + 50, // 模拟热度值
      }));

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
        }),
      });
    } catch (searchError) {
      // 搜索API出错时返回模拟数据
      console.warn('搜索API调用失败，使用模拟数据:', searchError);
      return NextResponse.json({
        topics: getMockTopics(category),
        category: categoryConfig,
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
      { id: 6, title: '港股科技股集体反弹 恒生科技指数涨2%', source: '智通财经', hot: 80, snippet: '外资回流推动港股走强' },
      { id: 7, title: '基金发行回暖 权益类产品受青睐', source: '中国基金报', hot: 78, snippet: '投资者信心逐步恢复' },
      { id: 8, title: '银行股估值修复行情启动', source: '证券之星', hot: 75, snippet: '低估值板块迎来配置良机' },
    ],
    tech: [
      { id: 1, title: 'ChatGPT最新版本发布 AI能力再升级', source: '科技日报', hot: 99, snippet: '新一代大模型推理能力大幅提升' },
      { id: 2, title: '国产芯片取得重大突破 量产在即', source: '半导体行业', hot: 95, snippet: '自主可控进程加速，打破国外垄断' },
      { id: 3, title: '华为发布新款折叠屏手机 销量火爆', source: '中关村在线', hot: 90, snippet: '预约量突破百万，市场反响热烈' },
      { id: 4, title: '特斯拉FSD将进入中国市场 自动驾驶竞争加剧', source: '汽车之家', hot: 87, snippet: '智能驾驶赛道迎来新格局' },
      { id: 5, title: '苹果Vision Pro中国开售 首批秒罄', source: '威锋网', hot: 84, snippet: 'MR设备开启新时代' },
      { id: 6, title: '国产大模型性能评测报告出炉', source: '机器之心', hot: 82, snippet: '多家厂商产品表现亮眼' },
      { id: 7, title: '量子计算商业化进程加速', source: '量子位', hot: 79, snippet: '科技巨头加大研发投入' },
      { id: 8, title: '新能源电池技术突破 续航翻倍', source: '电池网', hot: 76, snippet: '固态电池量产在即' },
    ],
    crypto: [
      { id: 1, title: '比特币突破10万美元 创历史新高', source: '金色财经', hot: 99, snippet: '机构资金持续流入，市场情绪高涨' },
      { id: 2, title: '以太坊ETF获批 资金大举入场', source: '链闻', hot: 94, snippet: '传统金融与加密市场融合加速' },
      { id: 3, title: 'Web3游戏赛道爆发 多个项目融资过亿', source: '深潮', hot: 88, snippet: 'GameFi生态迎来新一轮繁荣' },
      { id: 4, title: 'Layer2生态持续扩展 Gas费大幅降低', source: '巴比特', hot: 85, snippet: '以太坊扩容解决方案日趋成熟' },
      { id: 5, title: '央行数字货币跨境支付试点扩大', source: '移动支付网', hot: 82, snippet: '数字人民币国际化进程加快' },
      { id: 6, title: 'DeFi锁仓量创新高 总量突破千亿', source: 'DeFi之道', hot: 80, snippet: '去中心化金融生态持续发展' },
      { id: 7, title: 'NFT市场回暖 蓝筹项目交易活跃', source: 'NFT中文站', hot: 77, snippet: '优质项目价值回归' },
      { id: 8, title: '多国加速制定加密货币监管框架', source: '区块链日报', hot: 74, snippet: '合规化进程稳步推进' },
    ],
    global: [
      { id: 1, title: '美联储宣布维持利率不变 市场解读偏鸽', source: '华尔街日报', hot: 97, snippet: '年内降息预期升温，全球市场反弹' },
      { id: 2, title: '欧洲央行暗示可能降息 欧元应声下跌', source: '金融时报', hot: 92, snippet: '全球经济增速放缓担忧加剧' },
      { id: 3, title: '日本央行结束负利率政策 日元大涨', source: '日经中文网', hot: 89, snippet: '货币政策转向，影响全球资金流向' },
      { id: 4, title: '中东局势紧张 国际油价飙升', source: '路透社', hot: 86, snippet: '地缘政治风险推高能源价格' },
      { id: 5, title: '东南亚市场成投资新热点 资金加速布局', source: '彭博社', hot: 83, snippet: '新兴市场吸引力上升' },
      { id: 6, title: '美股科技股财报季表现分化', source: 'CNBC', hot: 80, snippet: 'AI概念股持续受追捧' },
      { id: 7, title: '全球供应链重构 跨国企业调整布局', source: '经济学人', hot: 78, snippet: '区域化趋势明显' },
      { id: 8, title: 'IMF下调全球经济增长预期', source: '国际货币基金组织', hot: 75, snippet: '贸易摩擦影响全球经济' },
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
