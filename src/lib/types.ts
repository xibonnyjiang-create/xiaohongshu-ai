// 选题类型
export type TopicType = 'market_hot' | 'beginner_guide' | 'advanced_invest' | 'professional_analysis';

// 用户标签
export type UserTag = 'beginner' | 'intermediate' | 'professional';

// 内容类型
export type ContentType = 'article' | 'video_script';

// 视频时长
export type VideoDuration = '30s' | '60s' | '3min';

// 视频风格
export type VideoStyle = 'popular_science' | 'roast' | 'suspense' | 'storytelling' | 'educational';

// 标题类型
export type TitleStyle = 'suspense' | 'data_driven' | 'emotional' | 'practical' | 'contrast';

// 热点时间筛选
export type HotTopicTimeRange = '24h' | '7d' | '30d';

// 生成参数
export interface GenerateParams {
  topicType: TopicType;
  userTag: UserTag;
  contentType: ContentType;
  keywords: string;
  useHotTopic: boolean;
  // 新增参数
  videoDuration?: VideoDuration;
  videoStyle?: VideoStyle;
  titleStyle?: TitleStyle;
  personaKeywords?: string;
  hotTopicTimeRange?: HotTopicTimeRange;
}

// 生成结果
export interface GenerateResult {
  title: string;
  titleStyle?: TitleStyle;
  content: string;
  tags: string[];
  imageUrls?: string[];
  selectedImageIndex?: number;
  complianceCheck: ComplianceResult;
  // 视频脚本专用
  scriptSections?: ScriptSection[];
}

// 视频脚本分段
export interface ScriptSection {
  type: 'hook' | 'main' | 'cta' | 'transition';
  title: string;
  content: string;
  duration?: string;
  notes?: string;
}

// 合规审查结果
export interface ComplianceResult {
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
}

// 流式响应
export interface StreamResponse {
  type: 'status' | 'title' | 'content' | 'tags' | 'images' | 'image' | 'compliance' | 'script_section';
  data: any;
  done: boolean;
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
