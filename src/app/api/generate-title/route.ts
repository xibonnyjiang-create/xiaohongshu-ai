import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType, TitleStyle } from '@/lib/types';
import { callLLM } from '@/lib/llm';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪',
  beginner_guide: '小白科普',
  advanced_invest: '进阶投资',
  professional_analysis: '专业分析',
};

// 用户标签映射（根据微证券业务调整）
const USER_TAG_PROMPTS: Record<UserTag, string> = {
  newbie: '新手投资者，刚开户的新手，需要通俗易懂的解释和生活化的比喻',
  active_trader: '活跃交易者，经常交易，关注短期机会和风险，需要实用的交易策略',
  long_term_investor: '长线投资者，关注基本面和价值投资，需要深度的研究分析',
};

// 标题风格映射
const TITLE_STYLE_PROMPTS: Record<TitleStyle, string> = {
  suspense: '悬念式标题：设置悬念，引发读者好奇心，如"这个信号出现，我果断清仓了..."',
  data_driven: '数据式标题：用数据说话，有理有据，如"3个数据看清市场风向"',
  emotional: '情感式标题：触动情感共鸣，如"我踩过的坑，希望你不要再踩"',
  practical: '实用式标题：强调实用价值，如"小白必看：5分钟学会选基"',
  contrast: '反差式标题：制造反差吸引眼球，如"月薪3000也能实现财富自由？"',
  custom: '自定义标题风格',
};

// 人设风格适配
function getPersonaPrompt(personaKeywords?: string): string {
  if (!personaKeywords) return '';
  return `博主风格人设：${personaKeywords}。标题语气和表达方式要贴合这个人设，要有原生感，不要像官方账号。`;
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
      previousTitle,
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

    const styleGuide = titleStyle ? TITLE_STYLE_PROMPTS[titleStyle] : '选择最适合的风格';
    const personaPrompt = getPersonaPrompt(personaKeywords);

    const prompt = `你是小红书爆款标题专家。请为以下场景生成一个吸引人的标题：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
内容形式：${contentType === 'article' ? '图文内容' : '视频脚本'}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo.substring(0, 500)}` : ''}

标题风格：${styleGuide}
${personaPrompt}
${previousTitle ? `避免与以下标题重复：${previousTitle}` : ''}

【标题要求】
1. 使用1-2个emoji增加吸引力
2. 标题长度20-30字
3. 避免夸张虚假宣传，不要用"必看"、"震惊"等低质标题党
4. 体现专业度和时效性
5. 要有博主个人风格，不要像官方账号

只输出标题文本，不要其他内容：`;

    const title = await callLLM(prompt);
    
    return new Response(JSON.stringify({ title: title.trim() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Generate title error:', error);
    return new Response(JSON.stringify({ error: '生成失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
