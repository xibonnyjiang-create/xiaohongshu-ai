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

// 用户标签映射（调整后）
const USER_TAG_PROMPTS: Record<UserTag, string> = {
  new_investor: '理财新手，刚入市，关注基础知识和稳健理财，需要通俗易懂的解释',
  active_trader: '活跃交易者，频繁交易，关注短期机会和热点，需要实用的策略',
  value_investor: '价值投资者，长期持有，关注基本面和深度分析，需要专业深度',
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
const VIDEO_DURATION_STRUCTURE: Record<VideoDuration, {totalTime: string, hookTime: string, mainTime: string, ctaTime: string, wordCount: string}> = {
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
  '3min': {
    totalTime: '3分钟',
    hookTime: '0-15秒',
    mainTime: '15-165秒',
    ctaTime: '165-180秒',
    wordCount: '500-600字'
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

  return `你是短视频脚本专家。请根据以下要求生成专业的视频脚本：

标题：${title}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo}` : ''}

视频时长：${durationInfo.totalTime}，约${durationInfo.wordCount}
视频风格：${styleGuide}

【脚本格式要求】
严格按以下格式输出，每个分段包含：画面、文案、时长

【画面】：描述镜头画面（具体到场景、人物动作、表情）
【文案】：口播台词（口语化、有节奏感）
【时长】：X秒

示例：
【画面】：黄金K线图，箭头指向新高位置
【文案】：黄金价格又创历史新高了！
【时长】：3秒

【画面】：分屏对比 – 普通投资者 vs 机构投资者
【文案】：很多人问，现在还能买吗？
【时长】：4秒

【内容结构】
- 开头（${durationInfo.hookTime}）：用悬念或热点切入
- 主体（${durationInfo.mainTime}）：层层递进，关键信息
- 结尾（${durationInfo.ctaTime}）：行动号召

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
  const depthPrompts: Record<TopicType, string> = {
    market_hot: `
【市场热点内容要求】
- 按"事件背景 → 原因分析 → 市场影响 → 后续展望"结构展开
- 提供具体数据支撑（股价涨跌、成交量、市场规模等）
- 分析对产业链上下游的影响`,
    
    beginner_guide: `
【小白科普内容要求】
- 用生活例子类比复杂概念
- 分点说明，每点用小标题或emoji标识
- 列举常见误区和避坑指南`,

    advanced_invest: `
【进阶投资内容要求】
- 引用券商/机构研报观点
- 分析机构评级原因和逻辑
- 提供投资逻辑框架`,
    
    professional_analysis: `
【专业分析内容要求】
- 分析财报关键指标（营收、净利润、毛利率等）
- 解读股价变化与财报的关系
- 或分析期货价格变动原因（宏观因素、供需关系等）`,
  };

  return `你是小红书爆款内容专家。请根据以下要求生成高质量的图文内容：

标题：${title}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo}` : ''}

${depthPrompts[topicType]}

【图文结构要求】
- 开头（1-2句）：用场景、痛点或热点切入，快速吸引注意力
- 中间：分点展开，每段不超过4行，可适当使用emoji
- 结尾：总结观点 + 可操作建议

【合规要求】
- 严禁使用"保证收益"、"稳赚不赔"、"内幕消息"等违规词
- 不要推荐具体股票代码
- 文末声明"不构成投资建议"

${additionalRequirements && additionalRequirements.length > 0 ? `补充要求：\n${additionalRequirements.join('\n')}` : ''}

请直接输出正文内容：`;
}
