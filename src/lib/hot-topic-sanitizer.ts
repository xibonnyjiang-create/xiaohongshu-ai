// 敏感词和禁词列表
const BLOCKED_WORDS = [
  '稳赚', '翻倍', '必涨', '必跌', '涨停', '跌停',
  '加群', '回复领取', '扫码进群', '带你赚钱',
  '内幕', '庄家', '老鼠仓', '操盘', '割韭菜',
  '暴富', '一夜暴富', '财富自由', '躺赚',
  '荐股', '代客理财', '保证收益', '承诺收益',
];

// 个股/板块映射表（用于泛化具体标的）
const STOCK_MAPPINGS: Record<string, string> = {
  // 常见个股泛化
  '宁德时代': '锂电池板块',
  '比亚迪': '新能源汽车板块',
  '茅台': '白酒板块',
  '五粮液': '白酒板块',
  '泸州老窖': '白酒板块',
  '腾讯': '互联网科技板块',
  '阿里': '电商科技板块',
  '阿里巴巴': '电商科技板块',
  '美团': '本地生活板块',
  '字节跳动': '互联网内容板块',
  '抖音': '短视频社交板块',
  '特斯拉': '新能源车板块',
  '苹果': '消费电子板块',
  '英伟达': 'AI芯片板块',
  '谷歌': '科技巨头板块',
  '微软': '软件科技板块',
  '亚马逊': '电商云计算板块',
  '京东': '电商物流板块',
  '拼多多': '电商板块',
  '小米': '智能硬件板块',
  '华为': '通信科技板块',
  '百度': 'AI搜索板块',
  '蔚来': '新能源车板块',
  '理想': '新能源车板块',
  '小鹏': '新能源车板块',
  '中芯国际': '半导体板块',
  '隆基绿能': '光伏板块',
  '通威股份': '光伏板块',
  '中国平安': '金融保险板块',
  '招商银行': '银行板块',
  '工商银行': '银行板块',
  '建设银行': '银行板块',
  // 常见板块
  'A股': 'A股市场',
  '港股': '港股市场',
  '美股': '美股市场',
  '科创板': '科创板市场',
  '创业板': '创业板市场',
  '上证': '上证指数',
  '深证': '深证指数',
  '沪深': '沪深市场',
  '纳斯达克': '纳斯达克指数',
  '标普': '标普500指数',
  '道琼斯': '道琼斯指数',
  // 加密货币相关
  '比特币': '加密货币市场',
  'BTC': '加密货币市场',
  '以太坊': '以太坊生态',
  'ETH': '以太坊生态',
};

// 负面/情绪化关键词（需要引导理性视角）
const NEGATIVE_EMOTION_KEYWORDS = [
  '崩盘', '暴跌', '血洗', '踩踏', '恐慌', '闪崩',
  '爆仓', '亏损', '套牢', '割肉', '清仓',
  '牛市结束', '熊市', '泡沫', '危机',
];

// 需要检查的股票代码模式
const STOCK_CODE_PATTERNS = [
  /[SHZ]\d{6}/g, // A股代码如 SH600000
  /\d{4}\.SZ|\d{4}\.SH/g, // 如 600000.SZ
  /[A-Z]{2,5}\d{4,5}/g, // 港股代码如 00700
  /\$\w+/g, // 股票符号如 $AAPL
];

/**
 * 脱敏处理：个股名称/代码泛化
 */
export function sanitizeStockNames(text: string): string {
  let result = text;
  
  // 替换具体个股名称
  for (const [stock, sector] of Object.entries(STOCK_MAPPINGS)) {
    result = result.replace(new RegExp(stock, 'gi'), sector);
  }
  
  // 移除股票代码
  for (const pattern of STOCK_CODE_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  return result;
}

/**
 * 禁词检测与替换
 */
export function filterBlockedWords(text: string): { cleaned: string; hasBlocked: boolean } {
  let cleaned = text;
  let hasBlocked = false;
  
  for (const word of BLOCKED_WORDS) {
    if (cleaned.includes(word)) {
      hasBlocked = true;
      // 将禁词替换为中性表述
      cleaned = cleaned.replace(new RegExp(word, 'gi'), '***');
    }
  }
  
  return { cleaned, hasBlocked };
}

/**
 * 情绪引导：负面/焦虑内容引导至理性视角
 */
export function guideEmotion(text: string): string {
  let result = text;
  
  for (const keyword of NEGATIVE_EMOTION_KEYWORDS) {
    if (result.includes(keyword)) {
      // 在标题/描述前添加理性引导
      if (result.indexOf(keyword) < 20) {
        result = result.replace(keyword, `[理性分析] ${keyword.replace('崩盘', '调整').replace('暴跌', '回落').replace('血洗', '波动').replace('恐慌', '观望')}`);
      }
    }
  }
  
  return result;
}

/**
 * 检测是否为荐股类内容
 */
export function isRecommendationContent(text: string): boolean {
  const recommendPatterns = [
    /建议买入|建议卖出|可以买入|可以卖出|推荐.*股|买入.*股|卖出.*股/,
    /\d+元以下买入|\d+元目标价|看到\d+元/,
    /这只股|那只好|买.*这只|卖.*那只/,
  ];
  
  return recommendPatterns.some(pattern => pattern.test(text));
}

/**
 * 完整的热点内容脱敏处理
 */
export interface SanitizedHotTopic {
  title: string;
  snippet: string;
  source: string | undefined;
  url: string;
  isSensitive: boolean;
  sensitivityReason?: string;
}

export function sanitizeHotTopic(rawTitle: string, rawSnippet: string, source?: string, url?: string): SanitizedHotTopic {
  let title = rawTitle;
  let snippet = rawSnippet;
  const sensitivityReasons: string[] = [];
  
  // 1. 个股名称脱敏
  title = sanitizeStockNames(title);
  snippet = sanitizeStockNames(snippet);
  
  // 2. 禁词过滤
  const titleBlocked = filterBlockedWords(title);
  if (titleBlocked.hasBlocked) {
    title = titleBlocked.cleaned;
    sensitivityReasons.push('标题含禁词');
  }
  
  const snippetBlocked = filterBlockedWords(snippet);
  if (snippetBlocked.hasBlocked) {
    snippet = snippetBlocked.cleaned;
    sensitivityReasons.push('摘要含禁词');
  }
  
  // 3. 情绪引导
  if (NEGATIVE_EMOTION_KEYWORDS.some(k => title.includes(k))) {
    title = guideEmotion(title);
    sensitivityReasons.push('含情绪化表述');
  }
  
  // 4. 荐股检测
  if (isRecommendationContent(title) || isRecommendationContent(snippet)) {
    title = title.replace(/建议买入|建议卖出|推荐|买入|卖出/g, match => {
      const map: Record<string, string> = {
        '建议买入': '关注',
        '建议卖出': '留意',
        '推荐': '探讨',
        '买入': '关注',
        '卖出': '留意',
      };
      return map[match] || match;
    });
    sensitivityReasons.push('含荐股倾向');
  }
  
  // 5. 数字货币特殊处理（增强风险提示）
  const isCrypto = /比特币|以太坊|加密货币|BTC|ETH|数字货币/i.test(title + snippet);
  
  return {
    title,
    snippet,
    source: isCrypto ? '⚠️' : source,
    url: url || '',
    isSensitive: sensitivityReasons.length > 0 || isCrypto,
    sensitivityReason: sensitivityReasons.length > 0 ? sensitivityReasons.join('; ') : undefined,
  };
}

/**
 * 热点分类的安全等级
 */
export function getCategorySafetyLevel(categoryId: string): {
  level: 'safe' | 'caution' | 'warning';
  reason: string;
} {
  switch (categoryId) {
    case 'finance':
      return { level: 'safe', reason: '主流财经资讯' };
    case 'tech':
      return { level: 'safe', reason: '科技前沿动态' };
    case 'global':
      return { level: 'caution', reason: '国际经济信息，需理性看待' };
    case 'crypto':
      return { level: 'warning', reason: '高风险资产类别，请理性投资' };
    default:
      return { level: 'safe', reason: '' };
  }
}

/**
 * 默认标签（分类提取失败时使用）
 */
export function getDefaultTags(categoryId: string): string[] {
  switch (categoryId) {
    case 'finance':
      return ['A股', '市场分析', '投资策略'];
    case 'tech':
      return ['AI', '科技', '行业动态'];
    case 'crypto':
      return ['数字货币', '市场波动', '理性投资'];
    case 'global':
      return ['全球经济', '美联储', '市场情绪'];
    default:
      return ['财经', '投资', '市场'];
  }
}
