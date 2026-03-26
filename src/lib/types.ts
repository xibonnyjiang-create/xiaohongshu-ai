// 选题类型
export type TopicType = 'market_hot' | 'beginner_guide' | 'advanced_invest' | 'professional_analysis';

// 用户标签（根据微证券业务调整）
export type UserTag = 'newbie' | 'active_trader' | 'long_term_investor';

// 内容类型
export type ContentType = 'article' | 'video_script';

// 视频时长
export type VideoDuration = '30s' | '60s' | '3min';

// 视频风格
export type VideoStyle = 'popular_science' | 'fast_cut' | 'deep_dive' | 'funny_roast' | 'demo';

// 标题风格
export type TitleStyle = 'suspense' | 'data_driven' | 'emotional' | 'practical' | 'contrast' | 'custom';

// 热点时间筛选
export type HotTopicTimeRange = '24h' | '7d' | '30d';

// 补充要求
export type AdditionalRequirement = 'short_300' | 'short_term' | 'long_term' | 'examples' | 'risk_warning' | 'recommend_wzq' | 'story_telling' | 'custom';

// 博主人设类型
export type PersonaType = 'hardcore_uncle' | 'sweet_girl' | 'veteran_trader' | 'finance_scholar' | 'roaster' | 'custom';

// 热点数据
export interface HotTopic {
  id: number;
  title: string;
  source: string;
  snippet: string;
  url?: string;
  publishTime?: string;
}

// 标题候选
export interface TitleCandidate {
  title: string;
  style: TitleStyle;
}

// 视频脚本分段
export interface ScriptSegment {
  visual: string;
  script: string;
  duration: string;
}

// 合规审查结果
export interface ComplianceResult {
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
}

// 导出格式
export type ExportFormat = 'txt' | 'json' | 'image';

// 内容保存记录
export interface SavedDraft {
  id: string;
  createdAt: string;
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string;
  topicType: TopicType;
  userTag: UserTag;
}
