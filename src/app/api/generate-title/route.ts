import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType, TitleStyle } from '@/lib/types';
import { callLLM } from '@/lib/llm';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪，关注AI、机器人、新能源等热门行业的技术更新，以及国家宏观政策对市场的影响',
  beginner_guide: '小白科普，基础投资知识和入门指南，帮助新手理解市场运作',
  advanced_invest: '进阶投资，分享国内外知名券商机构的研报评级，提供专业的投资策略',
  professional_analysis: '专业分析，基于公司财报分析股价变化，解读黄金石油外汇等期货价格变动原因',
};

// 用户标签映射
const USER_TAG_PROMPTS: Record<UserTag, string> = {
  beginner: '小白投资者，刚入市的新手，需要通俗易懂的解释',
  intermediate: '进阶投资者，有一定经验的投资者，需要实用的策略',
  professional: '专业玩家，经验丰富的专业投资者，需要深度分析',
};

// 标题风格映射
const TITLE_STYLE_PROMPTS: Record<TitleStyle, string> = {
  suspense: '悬念式标题：设置悬念，引发读者好奇心，如"这个信号出现，我果断清仓了..."',
  data_driven: '数据式标题：用数据说话，有理有据，如"3个数据看清市场风向"',
  emotional: '情感式标题：触动情感共鸣，如"我踩过的坑，希望你不要再踩"',
  practical: '实用式标题：强调实用价值，如"小白必看：5分钟学会选基"',
  contrast: '反差式标题：制造反差吸引眼球，如"月薪3000也能实现财富自由？"',
};

// 人设风格适配
function getPersonaPrompt(personaKeywords?: string): string {
  if (!personaKeywords) return '';
  return `博主风格人设：${personaKeywords}。标题语气和表达方式要贴合这个人设。`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topicType, 
      userTag, 
      contentType, 
      keywords, 
      hotTopicInfo,
      titleStyle,
      personaKeywords,
      previousTitle, // 用于重新生成时避免重复
    } = body as {
      topicType: TopicType;
      userTag: UserTag;
      contentType: ContentType;
      keywords?: string;
      hotTopicInfo?: string;
      titleStyle?: TitleStyle;
      personaKeywords?: string;
      previousTitle?: string;
    };

    // 构建标题生成提示
    const titleStylePrompt = titleStyle 
      ? TITLE_STYLE_PROMPTS[titleStyle] 
      : '选择最适合的标题风格';

    const prompt = `你是一个小红书爆款内容专家，请为以下场景生成${previousTitle ? '一个新的' : '一个'}吸引人的标题：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
内容类型：${contentType === 'article' ? '图文笔记' : '视频脚本'}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `实时热点信息：\n${hotTopicInfo}` : ''}

标题风格要求：${titleStylePrompt}
${getPersonaPrompt(personaKeywords)}

${previousTitle ? `之前的标题是："${previousTitle}"，请生成一个完全不同风格的标题。` : ''}

要求：
1. 标题要有吸引力，使用emoji表情增加视觉冲击力（1-2个即可）
2. 符合小红书风格，要有种草感、悬念感或价值感
3. 避免使用夸张、虚假宣传词汇
4. 标题长度控制在20-30个字
5. 要有独特性，体现专业度和洞察力
6. ${hotTopicInfo ? '必须结合提供的实时热点信息，让内容有时效性' : ''}

请直接输出标题，不要其他说明。`;

    const title = await callLLM(prompt);
    
    return Response.json({ 
      success: true, 
      title: title.trim(),
      titleStyle 
    });
  } catch (error) {
    console.error('Generate title error:', error);
    return Response.json({ 
      success: false, 
      error: '标题生成失败' 
    }, { status: 500 });
  }
}
