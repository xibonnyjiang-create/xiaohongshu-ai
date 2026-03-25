// 选题类型
export type TopicType = 'market_hot' | 'beginner_guide' | 'advanced_invest' | 'professional_analysis';

// 用户标签
export type UserTag = 'beginner' | 'intermediate' | 'professional';

// 内容类型
export type ContentType = 'article' | 'video_script';

// 生成参数
export interface GenerateParams {
  topicType: TopicType;
  userTag: UserTag;
  contentType: ContentType;
  keywords: string;
  useHotTopic: boolean;
}

// 生成结果
export interface GenerateResult {
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string;
  complianceCheck: ComplianceResult;
}

// 合规审查结果
export interface ComplianceResult {
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
}

// 流式响应
export interface StreamResponse {
  type: 'title' | 'content' | 'tags' | 'image' | 'compliance';
  data: any;
  done: boolean;
}
