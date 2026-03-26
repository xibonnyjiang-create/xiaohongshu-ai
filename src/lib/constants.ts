import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle, 
  TitleStyle, AdditionalRequirement, PersonaType, HotTopicTimeRange,
  AnalysisTarget, ContentDepth, FocusDirection, ContentSubType
} from './types';

// 选题类型选项
export const TOPIC_TYPE_OPTIONS: { value: TopicType; label: string; description: string }[] = [
  { value: 'market_hot', label: '市场热点', description: '追踪AI、机器人等热点' },
  { value: 'beginner_guide', label: '小白科普', description: '基础认知和入门指南' },
  { value: 'advanced_invest', label: '进阶投资', description: '券商研报与机构评级' },
  { value: 'professional_analysis', label: '专业分析', description: '财报与期货深度解读' },
];

// 目标用户选项
export const USER_TAG_OPTIONS: { value: UserTag; label: string }[] = [
  { value: 'newbie', label: '小白投资者' },
  { value: 'active_trader', label: '进阶投资者' },
  { value: 'professional', label: '专业人士' },
];

// 内容形式选项
export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: string }[] = [
  { value: 'article', label: '图文内容', icon: '📝' },
  { value: 'video_script', label: '视频脚本', icon: '🎬' },
];

// 热点时效选项
export const HOT_TOPIC_TIME_RANGE_OPTIONS: { value: HotTopicTimeRange; label: string }[] = [
  { value: '24h', label: '今日热点' },
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
];

// 分析对象选项
export const ANALYSIS_TARGET_OPTIONS: { value: AnalysisTarget; label: string; placeholder?: string }[] = [
  { value: 'asset', label: '资产', placeholder: '如：黄金、纳指、比特币、原油' },
  { value: 'industry', label: '行业', placeholder: '如：AI、新能源、半导体' },
  { value: 'company', label: '公司', placeholder: '如：腾讯、茅台、特斯拉' },
  { value: 'macro_policy', label: '宏观/政策', placeholder: '如：降息、房地产政策' },
  { value: 'market_event', label: '市场热点事件', placeholder: '如：某股票暴涨暴跌' },
  { value: 'custom', label: '自定义', placeholder: '输入自定义分析对象' },
];

// 内容深度选项
export const CONTENT_DEPTH_OPTIONS: { value: ContentDepth; label: string; description: string }[] = [
  { value: 'basic', label: '基础解读', description: '偏科普' },
  { value: 'logical', label: '逻辑分析', description: '有因果' },
  { value: 'professional', label: '深度观点', description: '偏专业' },
];

// 重点关注方向选项
export const FOCUS_DIRECTION_OPTIONS: { value: FocusDirection; label: string }[] = [
  { value: 'why_happen', label: '为什么发生' },
  { value: 'what_impact', label: '有什么影响' },
  { value: 'how_follow', label: '后续怎么看' },
  { value: 'market_view', label: '市场怎么看' },
];

// 内容子类型选项
export const CONTENT_SUBTYPE_OPTIONS: { value: ContentSubType; label: string; description: string }[] = [
  { value: 'beginner_start', label: '新手入门', description: '开户/基础认知' },
  { value: 'tool_knowledge', label: '工具认知', description: 'ETF/指数/规则' },
  { value: 'platform_compare', label: '平台对比', description: '券商/平台差异' },
];

// 标题风格选项
export const TITLE_STYLE_OPTIONS: { value: TitleStyle; label: string; example: string }[] = [
  { value: 'suspense', label: '悬念式', example: '「这个信号出现，我果断清仓了...」' },
  { value: 'data_driven', label: '数据式', example: '「3个数据看清市场风向」' },
  { value: 'emotional', label: '情感式', example: '「我踩过的坑，希望你不要再踩」' },
  { value: 'practical', label: '实用式', example: '「小白必看：5分钟学会选基」' },
  { value: 'contrast', label: '反差式', example: '「月薪3000也能实现财富自由？」' },
  { value: 'custom', label: '自定义', example: '输入你想要的标题风格' },
];

// 博主人设选项（简化描述）
export const PERSONA_OPTIONS: { value: PersonaType; label: string }[] = [
  { value: 'hardcore_uncle', label: '硬核财经大叔' },
  { value: 'sweet_girl', label: '甜妹理财科普' },
  { value: 'veteran_trader', label: '实战派老股民' },
  { value: 'finance_scholar', label: '金融学霸人设' },
  { value: 'roaster', label: '吐槽型财经博主' },
  { value: 'custom', label: '自定义人设' },
];

// 补充要求选项
export const ADDITIONAL_REQUIREMENT_OPTIONS: { value: AdditionalRequirement; label: string }[] = [
  { value: 'short_300', label: '控制在300字' },
  { value: 'short_term', label: '侧重短期分析' },
  { value: 'long_term', label: '侧重长期价值' },
  { value: 'examples', label: '举例说明' },
  { value: 'story_telling', label: '故事化表达' },
  { value: 'risk_warning', label: '加投资风险提示' },
  { value: 'recommend_wzq', label: '结尾推荐微证券' },
  { value: 'custom', label: '自定义' },
];

// 视频时长选项
export const VIDEO_DURATION_OPTIONS: { value: VideoDuration; label: string }[] = [
  { value: '15s', label: '15秒' },
  { value: '30s', label: '30秒' },
  { value: '60s', label: '60秒' },
  { value: '90s', label: '90秒' },
];

// 视频风格选项
export const VIDEO_STYLE_OPTIONS: { value: VideoStyle; label: string }[] = [
  { value: 'popular_science', label: '科普风格' },
  { value: 'fast_cut', label: '快节奏剪辑' },
  { value: 'deep_dive', label: '深度解读' },
  { value: 'funny_roast', label: '轻松吐槽' },
  { value: 'demo', label: '实战演示' },
  { value: 'custom', label: '自定义风格' },
];

// 用户标签与选题类型的兼容性映射（互斥关系）
// 小白投资者：只能选 市场热点、小白科普
// 进阶投资者：只能选 市场热点、进阶投资
// 专业人士：只能选 市场热点、进阶投资、专业分析
export const USER_TAG_TOPIC_COMPATIBILITY: Record<UserTag, TopicType[]> = {
  newbie: ['market_hot', 'beginner_guide'],
  active_trader: ['market_hot', 'advanced_invest'],
  professional: ['market_hot', 'advanced_invest', 'professional_analysis'],
};

// 选题类型是否显示热榜（只有市场热点显示）
export const SHOW_HOT_TOPICS_TOPIC: TopicType[] = ['market_hot'];

// 各选题类型的推荐主题
export const TOPIC_RECOMMENDATIONS: Record<TopicType, { id: number; title: string; category: string }[]> = {
  market_hot: [], // 热榜由API获取
  beginner_guide: [
    { id: 1, title: '新手必须懂的3个指标', category: '入门' },
    { id: 2, title: 'ETF和基金有什么区别', category: '工具' },
    { id: 3, title: '如何看懂K线图', category: '入门' },
    { id: 4, title: '打新债真的稳赚吗', category: '工具' },
    { id: 5, title: '定投到底怎么选', category: '策略' },
    { id: 6, title: '股票开户避坑指南', category: '入门' },
  ],
  advanced_invest: [
    { id: 1, title: '如何读懂券商研报', category: '研报' },
    { id: 2, title: '机构评级怎么看', category: '评级' },
    { id: 3, title: '主力资金流向分析', category: '资金' },
    { id: 4, title: '北向资金意味着什么', category: '资金' },
    { id: 5, title: '行业景气度如何判断', category: '行业' },
    { id: 6, title: '龙头股的选择逻辑', category: '选股' },
  ],
  professional_analysis: [
    { id: 1, title: '财报数据深度解读', category: '财报' },
    { id: 2, title: 'PE/PB估值方法', category: '估值' },
    { id: 3, title: '黄金价格走势分析', category: '期货' },
    { id: 4, title: '原油期货投资逻辑', category: '期货' },
    { id: 5, title: '外汇市场影响因素', category: '外汇' },
    { id: 6, title: '宏观经济指标解读', category: '宏观' },
  ],
};
