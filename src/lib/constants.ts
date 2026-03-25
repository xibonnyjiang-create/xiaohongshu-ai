import { TopicType, UserTag, ContentType } from './types';

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

// 用户标签与选题类型的兼容性映射
export const USER_TAG_TOPIC_COMPATIBILITY: Record<UserTag, TopicType[]> = {
  beginner: ['market_hot', 'beginner_guide'],
  intermediate: ['market_hot', 'advanced_invest'],
  professional: ['market_hot', 'advanced_invest', 'professional_analysis'],
};

// 选题类型是否支持今日爆款推荐
export const HOT_TOPIC_SUPPORTED: TopicType[] = ['market_hot', 'advanced_invest', 'professional_analysis'];
