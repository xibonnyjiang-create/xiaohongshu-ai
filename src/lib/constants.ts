import { TopicType, UserTag, ContentType, VideoDuration, VideoStyle, TitleStyle, HotTopicTimeRange } from './types';

// 选题类型选项
export const TOPIC_TYPE_OPTIONS: { value: TopicType; label: string; description: string }[] = [
  {
    value: 'market_hot',
    label: '市场热点',
    description: '追踪最新市场动态和热点事件',
  },
  {
    value: 'beginner_guide',
    label: '小白科普',
    description: '基础投资知识和入门指南',
  },
  {
    value: 'advanced_invest',
    label: '进阶投资',
    description: '进阶投资策略和技巧',
  },
  {
    value: 'professional_analysis',
    label: '专业分析',
    description: '深度行业分析和专业见解',
  },
];

// 用户标签选项
export const USER_TAG_OPTIONS: { value: UserTag; label: string; description: string }[] = [
  {
    value: 'beginner',
    label: '小白投资者',
    description: '刚入市的新手投资者',
  },
  {
    value: 'intermediate',
    label: '进阶投资者',
    description: '有一定经验的投资者',
  },
  {
    value: 'professional',
    label: '专业玩家',
    description: '经验丰富的专业投资者',
  },
];

// 内容类型选项
export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; description: string }[] = [
  {
    value: 'article',
    label: '图文内容',
    description: '适合小红书图文笔记',
  },
  {
    value: 'video_script',
    label: '视频脚本',
    description: '适合短视频内容',
  },
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
  { value: 'roast', label: '吐槽风格', description: '幽默风趣，犀利点评' },
  { value: 'suspense', label: '悬疑风格', description: '设置悬念，引人入胜' },
  { value: 'storytelling', label: '故事风格', description: '案例为主，娓娓道来' },
  { value: 'educational', label: '教学风格', description: '步骤清晰，手把手教' },
];

// 标题类型选项
export const TITLE_STYLE_OPTIONS: { value: TitleStyle; label: string; description: string; example: string }[] = [
  { 
    value: 'suspense', 
    label: '悬念式', 
    description: '设置悬念引发好奇',
    example: '这个信号出现，我果断清仓了...」'
  },
  { 
    value: 'data_driven', 
    label: '数据式', 
    description: '用数据说话，有理有据',
    example: '「3个数据看清市场风向」'
  },
  { 
    value: 'emotional', 
    label: '情感式', 
    description: '触动情感共鸣',
    example: '「我踩过的坑，希望你不要再踩」'
  },
  { 
    value: 'practical', 
    label: '实用式', 
    description: '强调实用价值',
    example: '「小白必看：5分钟学会选基」'
  },
  { 
    value: 'contrast', 
    label: '反差式', 
    description: '制造反差吸引眼球',
    example: '「月薪3000也能实现财富自由？」'
  },
];

// 热点时间筛选选项
export const HOT_TOPIC_TIME_RANGE_OPTIONS: { value: HotTopicTimeRange; label: string }[] = [
  { value: '24h', label: '24小时内' },
  { value: '7d', label: '7天内' },
  { value: '30d', label: '30天内' },
];

// 用户标签与选题类型的兼容性映射
export const USER_TAG_TOPIC_COMPATIBILITY: Record<UserTag, TopicType[]> = {
  beginner: ['market_hot', 'beginner_guide'],
  intermediate: ['market_hot', 'advanced_invest'],
  professional: ['market_hot', 'advanced_invest', 'professional_analysis'],
};

// 选题类型是否支持今日爆款推荐
export const HOT_TOPIC_SUPPORTED: TopicType[] = ['market_hot', 'advanced_invest', 'professional_analysis'];

// 博主人设预设
export const PERSONA_PRESETS = [
  { label: '硬核财经大叔', keywords: '专业、理性、数据说话、深度分析' },
  { label: '甜妹理财科普', keywords: '可爱、亲切、通俗易懂、闺蜜感' },
  { label: '实战派老股民', keywords: '经验丰富、接地气、实战案例、避坑指南' },
  { label: '金融学霸人设', keywords: '专业术语、逻辑清晰、学术派、数据支撑' },
  { label: '吐槽型财经博主', keywords: '幽默、犀利、一针见血、敢说真话' },
];

// 视频脚本结构模板
export const VIDEO_SCRIPT_STRUCTURE = {
  hook: {
    label: '开场钩子',
    duration: { '30s': '3-5秒', '60s': '5-8秒', '3min': '10-15秒' },
    tips: '用悬念、痛点或数据吸引注意力',
  },
  main: {
    label: '核心内容',
    duration: { '30s': '15-20秒', '60s': '35-45秒', '3min': '2-2.5分钟' },
    tips: '分点阐述，每个要点简洁有力',
  },
  cta: {
    label: '结尾互动',
    duration: { '30s': '3-5秒', '60s': '5-10秒', '3min': '15-20秒' },
    tips: '引导关注、点赞或评论互动',
  },
};
