// 选题类型
export type TopicType = 'market_hot' | 'beginner_guide' | 'advanced_invest' | 'professional_analysis';

// 目标用户
export type UserTag = 'newbie' | 'active_trader' | 'long_term_investor';

// 内容类型
export type ContentType = 'article' | 'video_script';

// 视频时长
export type VideoDuration = '15s' | '30s' | '60s' | '90s';

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

// 分析对象（市场热点/专业分析）
export type AnalysisTarget = 'asset' | 'industry' | 'company' | 'macro_policy' | 'market_event';

// 内容深度
export type ContentDepth = 'basic' | 'logical' | 'professional';

// 重点关注方向
export type FocusDirection = 'why_happen' | 'what_impact' | 'how_follow' | 'market_view';

// 内容子类型（小白科普/进阶投资）
export type ContentSubType = 'beginner_start' | 'tool_knowledge' | 'platform_compare';

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

// 种草力评分
export interface EngagementScore {
  score: number;
  reasons: string[];
  suggestions: string[];
}

// 生成参数
export interface GenerateParams {
  // 基础参数
  topicType: TopicType;
  userTag: UserTag;
  contentType: ContentType;
  keywords: string;
  
  // 动态配置
  analysisTarget?: AnalysisTarget;
  analysisTargetInput?: string;
  contentDepth?: ContentDepth;
  focusDirections?: FocusDirection[];
  contentSubType?: ContentSubType;
  platformCompare?: string;
  includeExample?: boolean;
  includeResearch?: boolean;
  
  // 内容设置
  videoDuration?: VideoDuration;
  videoStyle?: VideoStyle;
  enableImageSuggestion?: boolean;
  
  // 高级设置
  titleStyles: TitleStyle[];
  customTitleStyle: string;
  personaType: PersonaType;
  customPersona: string;
  additionalRequirements: AdditionalRequirement[];
  customRequirement: string;
}

// 历史记录
export interface HistoryRecord {
  id: string;
  createdAt: string;
  params: GenerateParams;
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string;
  imageUrls?: string[];
  engagementScore?: EngagementScore;
  isFavorite: boolean;
  name?: string;
}

// 模板
export interface Template {
  id: string;
  name: string;
  params: GenerateParams;
  createdAt: string;
}
