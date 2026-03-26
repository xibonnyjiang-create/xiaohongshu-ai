// 选题类型
export type TopicType = 'market_hot' | 'beginner_guide' | 'advanced_invest' | 'professional_analysis';

// 用户标签（调整后更符合微证券业务）
export type UserTag = 'new_investor' | 'active_trader' | 'value_investor';

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
export type AdditionalRequirement = 'short_300' | 'short_term' | 'examples' | 'risk_warning' | 'recommend_wzq' | 'custom';

// 博主人设类型
export type PersonaType = 'hardcore_uncle' | 'sweet_girl' | 'veteran_trader' | 'finance_scholar' | 'roaster' | 'custom';

// 生成参数
export interface GenerateParams {
  topicType: TopicType;
  userTag: UserTag;
  contentType: ContentType;
  keywords: string;
  hotTopicTimeRange: HotTopicTimeRange;
  titleStyles: TitleStyle[];
  personaType: PersonaType;
  customPersona: string;
  additionalRequirements: AdditionalRequirement[];
  // 视频专用
  videoDuration?: VideoDuration;
  videoStyle?: VideoStyle;
}

// 标题候选
export interface TitleCandidate {
  title: string;
  style: TitleStyle;
}

// 配图建议
export interface ImageSuggestion {
  type: 'cover' | 'inline';
  description: string;
  imageUrl?: string;
}

// 视频脚本分段
export interface ScriptSegment {
  visual: string;
  script: string;
  duration: string;
}

// 生成结果
export interface GenerateResult {
  titles: TitleCandidate[];
  content: string;
  imageSuggestions?: ImageSuggestion[];
  scriptSegments?: ScriptSegment[];
  tags: string[];
  riskWarning?: string;
  complianceCheck: ComplianceResult;
  imageUrls?: string[];
}

// 合规审查结果
export interface ComplianceResult {
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
}

// 历史记录
export interface HistoryRecord {
  id: string;
  createdAt: string;
  params: GenerateParams;
  result: GenerateResult;
  isFavorite: boolean;
}

// 导出格式
export type ExportFormat = 'txt' | 'json' | 'csv' | 'script';

// 热点数据
export interface HotTopic {
  id: number;
  title: string;
  source: string;
  snippet: string;
  url?: string;
  publishTime?: string;
}

// 内容草稿（整合视图）
export interface ContentDraft {
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string;
  complianceWarnings: string[];
}

// 用户画像与选题类型的兼容性映射
export type UserTopicCompatibility = {
  [key in UserTag]: TopicType[];
};
