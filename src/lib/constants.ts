import { 
  TopicType, VideoDuration, VideoStyle, 
  TitleStyle, PersonaType, HotTopicTimeRange
} from './types';

// ==================== 输出形式选项 ====================
export type OutputFormat = 'image_text' | 'video';

export const OUTPUT_FORMAT_OPTIONS: { value: OutputFormat; label: string; description: string; emoji: string }[] = [
  { value: 'image_text', label: '图文内容', description: '清单式正文，Emoji视觉分段', emoji: '📝' },
  { value: 'video', label: '视频脚本', description: '黄金3秒钩子+分镜描述+口播文案', emoji: '🎬' },
];

// ==================== 敏感词过滤列表 ====================
// 市场热点场景下禁止出现的敏感词汇
export const MARKET_HOT_SENSITIVE_WORDS = [
  // 虚拟货币相关
  '数字货币', '加密货币', '虚拟货币', '虚拟币', '比特币', 'BTC', '以太坊', 'ETH',
  '狗狗币', 'SHIB', '柴犬币', '元宇宙', 'NFT', '区块链虚拟', '炒币', '币圈',
  '虚拟货币交易', '数字资产交易', '虚拟币投资', '炒虚拟币', '区块链投资',
  // 高风险金融衍生品
  '期货交易', '外汇杠杆', '保证金交易', '杠杆交易', '做空机制',
  // 非法集资相关
  '原始股', '返本销售', '资金盘', '传销币', '空气币', 'ICO', 'IEO', 'STO',
  // 其他高风险
  '配资交易', '荐股', '代客理财', '老鼠仓',
];

// 检查文本是否包含敏感词
export function containsSensitiveWords(text: string, sensitiveWords: string[] = MARKET_HOT_SENSITIVE_WORDS): { hasSensitive: boolean; foundWords: string[] } {
  const foundWords: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const word of sensitiveWords) {
    if (lowerText.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }
  
  return {
    hasSensitive: foundWords.length > 0,
    foundWords,
  };
}

// 过滤敏感词后的替换策略
export function filterSensitiveWords(text: string, replacement: string = '[合规内容]'): string {
  let filteredText = text;
  for (const word of MARKET_HOT_SENSITIVE_WORDS) {
    const regex = new RegExp(word, 'gi');
    filteredText = filteredText.replace(regex, replacement);
  }
  return filteredText;
}

// 四大场景矩阵（基于MECE原则，相互独立、完全穷尽）
export const SCENE_OPTIONS: { value: TopicType; label: string; description: string; emoji: string }[] = [
  { value: 'market_hot', label: '市场热点', description: '追踪AI、机器人等热点事件与市场动态', emoji: '🔥' },
  { value: 'beginner_guide', label: '小白科普', description: '投资入门知识与基础认知扫盲', emoji: '🌱' },
  { value: 'life_lifestyle', label: '生活化种草', description: '职场与生活种草，将投资融入日常场景', emoji: '🏠' },
  { value: 'tool_review', label: '工具测评', description: '券商APP、基金工具等产品评测', emoji: '🛠️' },
];

// 深度分析开关选项
export const DEEP_ANALYSIS_OPTIONS = [
  { value: 'standard', label: '标准分析' },
  { value: 'deep', label: '深度分析', description: '专业数据支撑、机构观点引用' },
];

// 热点时效选项
export const HOT_TOPIC_TIME_RANGE_OPTIONS: { value: HotTopicTimeRange; label: string }[] = [
  { value: '24h', label: '今日热点' },
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
];

// 标题风格选项（简化，根据人设自动匹配）
export const TITLE_STYLE_OPTIONS: { value: TitleStyle; label: string; description: string }[] = [
  { value: 'suspense', label: '悬念式', description: '引发好奇，引导点击' },
  { value: 'data_driven', label: '数据式', description: '用数据说话，增强可信度' },
  { value: 'emotional', label: '情感式', description: '情感共鸣，增强代入感' },
  { value: 'practical', label: '实用式', description: '干货满满，一看就会' },
  { value: 'contrast', label: '反差式', description: '制造反差，吸引眼球' },
];

// 博主人设选项
export const PERSONA_OPTIONS: { value: PersonaType; label: string; description: string; emoji: string }[] = [
  { value: 'hardcore_uncle', label: '硬核财经大叔', description: '沉稳老练，数据说话', emoji: '👨‍💼' },
  { value: 'sweet_girl', label: '甜妹理财科普', description: '甜美亲切，易懂易学', emoji: '👩‍💕' },
  { value: 'veteran_trader', label: '实战派老股民', description: '经验丰富，干货满满', emoji: '📈' },
  { value: 'finance_scholar', label: '金融学霸人设', description: '专业严谨，逻辑清晰', emoji: '🎓' },
  { value: 'roaster', label: '吐槽型财经博主', description: '幽默犀利，反差吸睛', emoji: '😏' },
  { value: 'custom', label: '自定义人设', description: '自定义你的专属人设', emoji: '✏️' },
];

// 视频时长选项
export const VIDEO_DURATION_OPTIONS: { value: VideoDuration; label: string; description: string }[] = [
  { value: '30s', label: '30秒', description: '短平快，干货精炼' },
  { value: '60s', label: '60秒', description: '适中长度，内容丰富' },
  { value: '90s', label: '90秒', description: '较长时间，深入讲解' },
  { value: '2min', label: '2分钟及以上', description: '深度内容，完整叙事' },
];

// 视频风格选项
export const VIDEO_STYLE_OPTIONS: { value: VideoStyle; label: string }[] = [
  { value: 'science', label: '科普风格' },
  { value: 'drama', label: '剧情风格' },
  { value: 'talk', label: '口播风格' },
  { value: 'mixed', label: '混剪风格' },
];

// 场景与人设的自动匹配规则
export const SCENE_PERSONA_COMPATIBILITY: Record<TopicType, PersonaType[]> = {
  'market_hot': ['hardcore_uncle', 'veteran_trader', 'finance_scholar', 'roaster'],
  'beginner_guide': ['sweet_girl', 'veteran_trader', 'hardcore_uncle'],
  'life_lifestyle': ['sweet_girl', 'roaster', 'veteran_trader'],
  'tool_review': ['hardcore_uncle', 'finance_scholar', 'veteran_trader'],
};

// 人设自动匹配的风格配置
export const PERSONA_STYLE_CONFIG: Record<PersonaType, { tone: string; emojiDensity: string; titleStyle: TitleStyle }> = {
  'hardcore_uncle': { tone: '严肃专业', emojiDensity: '极简', titleStyle: 'data_driven' },
  'sweet_girl': { tone: '亲切甜美', emojiDensity: '高频', titleStyle: 'emotional' },
  'veteran_trader': { tone: '实战经验', emojiDensity: '适中', titleStyle: 'practical' },
  'finance_scholar': { tone: '学术严谨', emojiDensity: '极简', titleStyle: 'data_driven' },
  'roaster': { tone: '幽默犀利', emojiDensity: '高频', titleStyle: 'contrast' },
  'custom': { tone: '自定义', emojiDensity: '适中', titleStyle: 'suspense' },
};

// 内容子类型选项（简化）
export const CONTENT_SUBTYPE_OPTIONS = [
  { value: 'beginner_start', label: '新手入门', keywords: ['开户', '第一步', '基础'] },
  { value: 'tool_knowledge', label: '工具认知', keywords: ['ETF', '指数', '规则'] },
  { value: 'platform_compare', label: '平台对比', keywords: ['券商', '对比', '差异'] },
];

// 补充要求预设选项
export const CONTENT_REQUIREMENT_OPTIONS: { value: string; label: string; emoji: string; description: string }[] = [
  { value: '300_words', label: '控制在300字', emoji: '📄', description: '字数限制' },
  { value: 'short_term', label: '侧重短期分析', emoji: '⚡', description: '分析方向' },
  { value: 'long_term', label: '侧重长期价值', emoji: '🏆', description: '分析方向' },
  { value: 'examples', label: '举例说明', emoji: '📓', description: '呈现形式' },
  { value: 'story_style', label: '故事化表达', emoji: '📚', description: '呈现形式' },
];

// 关键词推荐（按场景分类）
export const KEYWORD_RECOMMENDATIONS: Record<TopicType, string[]> = {
  'market_hot': ['AI概念', '机器人', '半导体', '新能源', '政策利好'],
  'beginner_guide': ['ETF基金', '理财认知', '基金定投', '国债', '货币基金'],
  'life_lifestyle': ['存钱', '副业', '消费观', '极简生活', '财务自由'],
  'tool_review': ['券商APP', '基金筛选器', '智能投顾', '记账软件'],
};

// ==================== 生活化种草专属词库（PRD要求）====================
export const LIFE_STYLE_KEYWORDS: string[] = [
  '办公室摸鱼', '开会间隙', '排队等餐', '一键转发姐妹',
  '摸鱼必备', '微信直接看', '姐妹讨论', '告别焦虑',
  '通勤路上', '午休理财', '碎片时间', '偷偷变富',
];

// ==================== 微证券功能场景映射表（PRD要求）====================
export const WEIXIN_SECURITY_MAPPING: Record<TopicType, { feature: string; highlight: string }[]> = {
  'market_hot': [
    { feature: '问元宝AI', highlight: '大白话拆解复杂行情' },
    { feature: '实时行情', highlight: '上班也能盯盘' },
  ],
  'beginner_guide': [
    { feature: '极简UI', highlight: '像刷朋友圈一样开户' },
    { feature: '微信直达', highlight: '免下载，开户3分钟' },
  ],
  'life_lifestyle': [
    { feature: '波动提醒', highlight: '微信弹窗通知，上班忙也不漏行情' },
    { feature: '双端浮窗', highlight: '摸鱼隐蔽、社交分享无缝' },
    { feature: '一键分享', highlight: '转发姐妹一起看' },
  ],
  'tool_review': [
    { feature: '基金筛选器', highlight: '智能推荐适合的产品' },
    { feature: '收益看板', highlight: '一键查看持仓收益' },
  ],
};

// 推荐切入点
export const TOPIC_RECOMMENDATIONS: Record<TopicType, { label: string; keywords: string[] }[]> = {
  'market_hot': [
    { label: '事件解读', keywords: ['为什么涨', '背后逻辑', '深度分析'] },
    { label: '机会分析', keywords: ['还能买吗', '如何参与', '风险提示'] },
  ],
  'beginner_guide': [
    { label: '入门指南', keywords: ['第一步', '从小白开始', '避坑指南'] },
    { label: '工具推荐', keywords: ['用什么', '哪个好', '新手必备'] },
  ],
  'life_lifestyle': [
    { label: '生活智慧', keywords: ['攒钱', '省钱', '副业'] },
    { label: '消费观', keywords: ['理性消费', '极简生活', '存钱技巧'] },
  ],
  'tool_review': [
    { label: '功能对比', keywords: ['哪个好', '区别', '推荐'] },
    { label: '使用教程', keywords: ['怎么用', '技巧', '进阶'] },
  ],
};

// 显示热点话题的场景
export const SHOW_HOT_TOPICS_TOPIC: TopicType[] = ['market_hot', 'beginner_guide'];
