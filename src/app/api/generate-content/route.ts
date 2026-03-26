import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType, VideoDuration, VideoStyle } from '@/lib/types';
import { callLLMStream } from '@/lib/llm';

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
  active_trader: '进阶投资者，有一定经验，关注短期机会和风险，需要实用的交易策略',
  professional: '专业人士，经验丰富，关注基本面和价值投资，需要深度的研究分析',
};

// 视频风格映射
const VIDEO_STYLE_PROMPTS: Record<VideoStyle, string> = {
  popular_science: '科普风格：知识点密集，干货满满',
  fast_cut: '快节奏剪辑：节奏紧凑，信息量大',
  deep_dive: '深度解读：抽丝剥茧，层层深入',
  funny_roast: '轻松吐槽：幽默风趣，犀利点评',
  demo: '实战演示：手把手教，实操性强',
};

// 视频时长对应的内容结构
const VIDEO_DURATION_STRUCTURE: Record<VideoDuration, {totalTime: string; hookTime: string; mainTime: string; ctaTime: string; wordCount: string}> = {
  '15s': {
    totalTime: '15秒',
    hookTime: '0-3秒',
    mainTime: '3-12秒',
    ctaTime: '12-15秒',
    wordCount: '40-60字'
  },
  '30s': {
    totalTime: '30秒',
    hookTime: '0-5秒',
    mainTime: '5-25秒',
    ctaTime: '25-30秒',
    wordCount: '80-100字'
  },
  '60s': {
    totalTime: '60秒',
    hookTime: '0-8秒',
    mainTime: '8-52秒',
    ctaTime: '52-60秒',
    wordCount: '180-220字'
  },
  '90s': {
    totalTime: '90秒',
    hookTime: '0-10秒',
    mainTime: '10-80秒',
    ctaTime: '80-90秒',
    wordCount: '280-320字'
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topicType,
      userTag,
      contentType,
      keywords,
      hotTopicInfo,
      title,
      videoDuration,
      videoStyle,
      additionalRequirements,
    } = body as {
      topicType: TopicType;
      userTag: UserTag;
      contentType: ContentType;
      keywords?: string;
      hotTopicInfo?: string;
      title?: string;
      videoDuration?: VideoDuration;
      videoStyle?: VideoStyle;
      additionalRequirements?: string[];
    };

    const isVideo = contentType === 'video_script';
    const duration = videoDuration || '60s';
    const style = videoStyle || 'popular_science';

    // 生成内容
    let prompt = '';
    
    if (isVideo) {
      prompt = generateVideoPrompt(
        topicType, userTag, title || '', keywords, hotTopicInfo, duration, style, additionalRequirements
      );
    } else {
      prompt = generateArticlePrompt(
        topicType, userTag, title || '', keywords, hotTopicInfo, additionalRequirements
      );
    }

    const stream = await callLLMStream(prompt);
    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generate content error:', error);
    return new Response(JSON.stringify({ error: '生成失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function generateVideoPrompt(
  topicType: TopicType,
  userTag: UserTag,
  title: string,
  keywords?: string,
  hotTopicInfo?: string,
  videoDuration?: VideoDuration,
  videoStyle?: VideoStyle,
  additionalRequirements?: string[]
): string {
  const durationInfo = VIDEO_DURATION_STRUCTURE[videoDuration || '60s'];
  const styleGuide = VIDEO_STYLE_PROMPTS[videoStyle || 'popular_science'];

  return `你是短视频脚本专家。请为以下内容生成一个真实博主风格的视频脚本：

标题：${title}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo}` : ''}

视频时长：${durationInfo.totalTime}，约${durationInfo.wordCount}
视频风格：${styleGuide}

【脚本格式要求】
严格按以下格式输出，每个分段包含：画面、文案、时长

【画面】：描述镜头画面（要具体，比如博主出镜、手机屏幕展示、数据图表等）
【文案】：口播台词（要有博主个人风格，不要像官方广告）
【时长】：X秒

【原生感要求 - 非常重要】
- 文案要像真实博主在跟朋友聊天，不要像官方宣传
- 可以用口语化表达："说实话"、"我觉得"、"跟大家说"
- 可以适当表达个人观点和情感
- 避免"欢迎关注XX"、"点击了解更多"等官方话术
- 结尾要自然，比如"以上就是今天的分享，希望对大家有帮助"
- 不要有明显的营销感，要让观众觉得是在分享真实经验

${additionalRequirements && additionalRequirements.length > 0 ? `补充要求：\n${additionalRequirements.join('\n')}` : ''}

请直接输出脚本内容：`;
}

function generateArticlePrompt(
  topicType: TopicType,
  userTag: UserTag,
  title: string,
  keywords?: string,
  hotTopicInfo?: string,
  additionalRequirements?: string[]
): string {
  // 根据选题类型和用户标签定制内容要求
  const depthPrompts: Record<TopicType, Record<UserTag, string>> = {
    market_hot: {
      newbie: `
【市场热点内容要求 - 新手版】
- 用最通俗的语言解释热点事件是什么
- 举例说明这个热点对普通人的影响
- 告诉新手应该关注什么、注意什么
- 不要堆砌专业术语，用生活化的比喻`,
      active_trader: `
【市场热点内容要求 - 交易者版】
- 分析热点对相关板块/个股的影响
- 提供短期交易机会的参考逻辑
- 风险提示要具体，不要泛泛而谈
- 可以适当分享个人判断逻辑`,
      professional: `
【市场热点内容要求 - 投资者版】
- 从长期视角分析热点对行业格局的影响
- 关注基本面变化和长期趋势
- 分析对投资组合的影响`,
    },
    beginner_guide: {
      newbie: `
【小白科普内容要求】
- 用生活例子类比复杂概念，比如把股票比作什么
- 分点说明，每点用小标题或emoji标识
- 列举常见误区和避坑指南
- 语气要亲切，像朋友聊天`,
      active_trader: `
【科普内容要求】
- 解释概念时结合实际交易场景
- 提供实用的操作建议
- 可以分享一些小技巧`,
      professional: `
【科普内容要求】
- 从长期投资的角度解释概念
- 关注对长期投资决策的影响`,
    },
    advanced_invest: {
      newbie: `
【进阶投资内容要求 - 简化版】
- 用通俗语言解读券商研报的核心观点
- 解释专业术语，帮助新手理解
- 提供简单的行动建议`,
      active_trader: `
【进阶投资内容要求】
- 引用券商/机构研报观点
- 分析机构评级原因和逻辑
- 提供投资逻辑框架
- 可以适当加入个人观点和判断`,
      professional: `
【进阶投资内容要求】
- 深度解读券商研报
- 分析长期投资价值
- 关注基本面和行业趋势`,
    },
    professional_analysis: {
      newbie: `
【专业分析内容要求 - 简化版】
- 用通俗语言解读财报关键数据
- 解释数据背后的含义
- 给出简单易懂的结论`,
      active_trader: `
【专业分析内容要求】
- 分析财报关键指标变化
- 解读股价变化与财报的关系
- 提供短期交易参考`,
      professional: `
【专业分析内容要求】
- 深度分析财报数据
- 评估公司长期价值
- 分析行业竞争格局`,
    },
  };

  return `你是小红书博主，请为以下场景生成一篇真实、有价值的图文内容：

标题：${title}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo}` : ''}

${depthPrompts[topicType][userTag]}

【图文结构要求】
- 开头（1-2句）：用场景、痛点或个人经历切入，快速建立共鸣
- 中间：分点展开，每段不超过4行，可适当使用emoji
- 结尾：总结观点 + 个人建议或行动号召

【原生感要求 - 非常重要】
- 要像真实博主分享，不要像官方账号发文
- 可以用口语化表达："说实话"、"我觉得"、"我的建议是"
- 可以分享个人经历或观点，增强真实感
- 避免过于正式的宣传腔
- 要让读者觉得这是一个真人在分享经验

【合规要求】
- 严禁使用"保证收益"、"稳赚不赔"、"内幕消息"等违规词
- 不要推荐具体股票代码（可以用行业、板块代指）
- 文末可以加上"以上仅为个人观点，不构成投资建议"

${additionalRequirements && additionalRequirements.length > 0 ? `补充要求：\n${additionalRequirements.join('\n')}` : ''}

请直接输出正文内容：`;
}
