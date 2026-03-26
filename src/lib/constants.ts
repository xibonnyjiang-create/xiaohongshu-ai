import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle, 
  TitleStyle, HotTopicTimeRange, AdditionalRequirement, PersonaType,
  UserTopicCompatibility
} from './types';

// 选题类型选项
export const TOPIC_TYPE_OPTIONS: { value: TopicType; label: string; description: string; needsHotTopic: boolean }[] = [
  { value: 'market_hot', label: '市场热点', description: '最新市场动态和热点事件', needsHotTopic: true },
  { value: 'beginner_guide', label: '小白科普', description: '基础投资知识和入门指南', needsHotTopic: false },
  { value: 'advanced_invest', label: '进阶投资', description: '券商研报解读与机构评级', needsHotTopic: true },
  { value: 'professional_analysis', label: '专业分析', description: '财报分析与期货深度解读', needsHotTopic: true },
];

// 用户标签选项（调整后更符合微证券业务）
export const USER_TAG_OPTIONS: { value: UserTag; label: string; description: string }[] = [
  { value: 'new_investor', label: '理财新手', description: '刚入市，关注基础知识和稳健理财' },
  { value: 'active_trader', label: '活跃交易者', description: '频繁交易，关注短期机会和热点' },
  { value: 'value_investor', label: '价值投资者', description: '长期持有，关注基本面和深度分析' },
];

// 内容形式选项
export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: string }[] = [
  { value: 'article', label: '图文内容', icon: '📝' },
  { value: 'video_script', label: '视频脚本', icon: '🎬' },
];

// 热点时效选项
export const HOT_TOPIC_TIME_RANGE_OPTIONS: { value: HotTopicTimeRange; label: string }[] = [
  { value: '24h', label: '24小时内' },
  { value: '7d', label: '7天内' },
  { value: '30d', label: '30天内' },
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

// 博主人设选项
export const PERSONA_OPTIONS: { value: PersonaType; label: string; keywords: string }[] = [
  { value: 'hardcore_uncle', label: '硬核财经大叔', keywords: '专业、理性、数据说话、深度分析、犀利点评' },
  { value: 'sweet_girl', label: '甜妹理财科普', keywords: '可爱、亲切、通俗易懂、闺蜜感、温暖治愈' },
  { value: 'veteran_trader', label: '实战派老股民', keywords: '经验丰富、接地气、实战案例、避坑指南、真诚分享' },
  { value: 'finance_scholar', label: '金融学霸人设', keywords: '专业术语、逻辑清晰、学术派、数据支撑、严谨分析' },
  { value: 'roaster', label: '吐槽型财经博主', keywords: '幽默、犀利、一针见血、敢说真话、接地气' },
  { value: 'custom', label: '自定义人设', keywords: '' },
];

// 补充要求选项
export const ADDITIONAL_REQUIREMENT_OPTIONS: { value: AdditionalRequirement; label: string }[] = [
  { value: 'short_300', label: '控制在300字' },
  { value: 'short_term', label: '更偏短期' },
  { value: 'examples', label: '举例说明' },
  { value: 'risk_warning', label: '加投资风险提示' },
  { value: 'recommend_wzq', label: '结尾推荐微证券' },
  { value: 'custom', label: '自定义' },
];

// 视频时长选项
export const VIDEO_DURATION_OPTIONS: { value: VideoDuration; label: string; description: string }[] = [
  { value: '30s', label: '30秒', description: '快节奏短视频' },
  { value: '60s', label: '1分钟', description: '标准短视频' },
  { value: '3min', label: '3分钟', description: '深度内容视频' },
];

// 视频风格选项
export const VIDEO_STYLE_OPTIONS: { value: VideoStyle; label: string; description: string }[] = [
  { value: 'popular_science', label: '科普风格', description: '知识点密集，干货满满' },
  { value: 'fast_cut', label: '快节奏剪辑', description: '节奏紧凑，信息量大' },
  { value: 'deep_dive', label: '深度解读', description: '抽丝剥茧，层层深入' },
  { value: 'funny_roast', label: '轻松吐槽', description: '幽默风趣，犀利点评' },
  { value: 'demo', label: '实战演示', description: '手把手教，实操性强' },
];

// 用户标签与选题类型的兼容性映射（优化后）
// 理财新手：适合市场热点（了解动态）和小白科普
// 活跃交易者：适合市场热点和进阶投资
// 价值投资者：适合进阶投资和专业分析
export const USER_TAG_TOPIC_COMPATIBILITY: UserTopicCompatibility = {
  new_investor: ['market_hot', 'beginner_guide'],
  active_trader: ['market_hot', 'advanced_invest'],
  value_investor: ['advanced_invest', 'professional_analysis'],
};

// 需要热榜的选题类型
export const TOPIC_NEEDS_HOT_BOARD: TopicType[] = ['market_hot', 'advanced_invest', 'professional_analysis'];
