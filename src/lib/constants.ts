import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle, 
  TitleStyle, HotTopicTimeRange, AdditionalRequirement, PersonaType 
} from './types';

// 选题类型选项
export const TOPIC_TYPE_OPTIONS: { value: TopicType; label: string; description: string; icon: string }[] = [
  { value: 'market_hot', label: '市场热点', description: '最新市场动态和热点事件', icon: '🔥' },
  { value: 'beginner_guide', label: '小白科普', description: '基础投资知识和入门指南', icon: '📚' },
  { value: 'advanced_invest', label: '进阶投资', description: '券商研报解读与机构评级', icon: '📊' },
  { value: 'professional_analysis', label: '专业分析', description: '财报分析与期货深度解读', icon: '💹' },
];

// 目标用户选项（根据微证券业务调整）
export const USER_TAG_OPTIONS: { value: UserTag; label: string; description: string; icon: string }[] = [
  { value: 'newbie', label: '新手投资者', description: '刚开户，需要入门指导', icon: '🌱' },
  { value: 'active_trader', label: '活跃交易者', description: '经常交易，关注市场机会', icon: '📈' },
  { value: 'long_term_investor', label: '长线投资者', description: '关注基本面，做价值投资', icon: '🎯' },
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
export const PERSONA_OPTIONS: { value: PersonaType; label: string; keywords: string; tone: string }[] = [
  { value: 'hardcore_uncle', label: '硬核财经大叔', keywords: '专业、理性、数据说话、深度分析、犀利点评', tone: '严肃但不刻板，像在跟朋友喝茶聊投资' },
  { value: 'sweet_girl', label: '甜妹理财科普', keywords: '可爱、亲切、通俗易懂、闺蜜感、温暖治愈', tone: '像闺蜜在咖啡厅分享理财心得' },
  { value: 'veteran_trader', label: '实战派老股民', keywords: '经验丰富、接地气、实战案例、避坑指南、真诚分享', tone: '像老股民在证券大厅跟你唠嗑' },
  { value: 'finance_scholar', label: '金融学霸人设', keywords: '专业术语、逻辑清晰、学术派、数据支撑、严谨分析', tone: '像大学教授在讲解投资课' },
  { value: 'roaster', label: '吐槽型财经博主', keywords: '幽默、犀利、一针见血、敢说真话、接地气', tone: '像在饭局上吐槽行业内幕' },
  { value: 'custom', label: '自定义人设', keywords: '', tone: '' },
];

// 补充要求选项
export const ADDITIONAL_REQUIREMENT_OPTIONS: { value: AdditionalRequirement; label: string; description: string }[] = [
  { value: 'short_300', label: '控制在300字', description: '简洁精炼，适合快节奏阅读' },
  { value: 'short_term', label: '侧重短期', description: '关注短期机会和风险' },
  { value: 'long_term', label: '侧重长期', description: '关注长期投资价值' },
  { value: 'examples', label: '举例说明', description: '用具体案例解释概念' },
  { value: 'story_telling', label: '故事化表达', description: '用故事形式增强代入感' },
  { value: 'risk_warning', label: '加投资风险提示', description: '文末添加风险提示' },
  { value: 'recommend_wzq', label: '结尾推荐微证券', description: '自然融入产品推荐' },
  { value: 'custom', label: '自定义', description: '输入自定义要求' },
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

// 用户标签与选题类型的兼容性映射
export const USER_TAG_TOPIC_COMPATIBILITY: Record<UserTag, TopicType[]> = {
  newbie: ['beginner_guide', 'market_hot'],
  active_trader: ['market_hot', 'advanced_invest'],
  long_term_investor: ['market_hot', 'advanced_invest', 'professional_analysis'],
};

// 选题类型是否显示热榜
export const SHOW_HOT_TOPICS: TopicType[] = ['market_hot'];

// 选题类型与用户标签的推荐文案
export const TOPIC_USER_RECOMMENDATION: Record<TopicType, Record<UserTag, string>> = {
  market_hot: {
    newbie: '用通俗易懂的语言解读热点，帮助新手快速理解',
    active_trader: '分析热点对短期交易的影响和机会',
    long_term_investor: '从长期视角解读热点对行业的影响',
  },
  beginner_guide: {
    newbie: '最适合的选题，用生活化比喻解释投资概念',
    active_trader: '可以了解基础概念，但可能不够深入',
    long_term_investor: '可以了解基础概念，但可能不够深入',
  },
  advanced_invest: {
    newbie: '内容较专业，建议先学习基础知识',
    active_trader: '非常适合，提供券商研报和机构观点',
    long_term_investor: '非常适合，提供深度投资逻辑',
  },
  professional_analysis: {
    newbie: '内容较专业，建议先学习基础知识',
    active_trader: '内容较专业，适合有一定经验的投资者',
    long_term_investor: '非常适合，提供财报分析和深度研究',
  },
};
