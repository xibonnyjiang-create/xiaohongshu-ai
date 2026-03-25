import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType, VideoDuration, VideoStyle } from '@/lib/types';
import { callLLMStream } from '@/lib/llm';

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

// 视频风格映射
const VIDEO_STYLE_PROMPTS: Record<VideoStyle, string> = {
  popular_science: '科普风格：知识点密集，干货满满',
  roast: '吐槽风格：幽默风趣，犀利点评',
  suspense: '悬疑风格：设置悬念，引人入胜',
  storytelling: '故事风格：案例为主，娓娓道来',
  educational: '教学风格：步骤清晰，手把手教',
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
    mainTime: '8-50秒',
    ctaTime: '50-60秒',
    wordCount: '180-220字'
  },
  '3min': {
    totalTime: '3分钟',
    hookTime: '0-15秒',
    mainTime: '15-150秒',
    ctaTime: '150-180秒',
    wordCount: '500-600字'
  }
};

// 人设风格适配
function getPersonaPrompt(personaKeywords?: string): string {
  if (!personaKeywords) return '';
  return `
【博主人设】
风格定位：${personaKeywords}
写作要求：语气、称呼、表达方式都要贴合这个人设，让内容有辨识度。`;
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
      title,
      videoDuration = '60s',
      videoStyle = 'popular_science',
      personaKeywords,
    } = body as {
      topicType: TopicType;
      userTag: UserTag;
      contentType: ContentType;
      keywords?: string;
      hotTopicInfo?: string;
      title?: string;
      videoDuration?: VideoDuration;
      videoStyle?: VideoStyle;
      personaKeywords?: string;
    };

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const isVideo = contentType === 'video_script';
          
          // 根据选题类型生成不同的深度要求
          const depthRequirements: Record<TopicType, string> = {
            market_hot: `
【市场热点深度要求】
1. 必须基于最新3天内的新闻事件，说明事件背景和核心内容
2. 分析该事件对相关行业/公司的具体影响（股价波动、市场情绪等）
3. 提供数据支撑：如股价涨跌幅、成交量变化、市场规模等
4. 给出投资建议或风险提示，但避免具体荐股
5. 关联产业链上下游，分析蝴蝶效应

【合规提醒】不要预测具体股价涨跌，不要推荐具体股票代码`,

            beginner_guide: `
【小白科普深度要求】
1. 用生活中的例子类比复杂的金融概念
2. 提供2-3个实操步骤或checklist
3. 列举常见误区和避坑指南
4. 给出新手入门的具体路径建议`,

            advanced_invest: `
【进阶投资深度要求】
1. 引用国内外知名券商/机构的最新研报观点（如高盛、摩根士丹利、中信证券、中金公司等）
2. 分析机构给出评级的具体原因和逻辑
3. 对比不同机构的观点差异
4. 提供投资逻辑框架，而非简单结论
5. 说明风险因素和不确定性

【合规提醒】标明信息来源为公开研报，不构成投资建议`,

            professional_analysis: `
【专业分析深度要求】
1. 分析具体公司的最新财报数据（营收、净利润、毛利率、同比增长等关键指标）
2. 解读财报数据背后的业务逻辑和经营状况
3. 分析股价变化与财报数据的关系
4. 或者分析黄金/石油/外汇等期货价格变动的原因（宏观经济因素、供需关系、地缘政治等）
5. 给出对市场后续走势的专业判断和依据
6. 提供具体的数据支撑和时间节点

【合规提醒】声明分析基于公开数据，不构成投资建议`,
          };

          const videoPrompt = isVideo ? `
【视频脚本格式要求】
总时长：${videoDuration}
风格：${VIDEO_STYLE_PROMPTS[videoStyle]}

请严格按照以下格式输出脚本：

━━━ 开场钩子 [${VIDEO_DURATION_STRUCTURE[videoDuration].hookTime}] ━━━
【镜头】描述镜头画面（如：特写/全景/图表展示/实景拍摄）
【台词】开场白内容（用口语化表达）

━━━ 核心内容 [${VIDEO_DURATION_STRUCTURE[videoDuration].mainTime}] ━━━
【分段一】[具体时间节点]
【镜头】画面描述（建议用：数据图表、实景素材、产品特写、人物讲解等）
【字幕】关键文字/数据展示
【台词】讲解内容（口语化、有节奏感）

【分段二】[具体时间节点]
...

━━━ 结尾互动 [${VIDEO_DURATION_STRUCTURE[videoDuration].ctaTime}] ━━━
【镜头】画面描述
【台词】总结核心观点 + 引导关注点赞

总字数控制在：${VIDEO_DURATION_STRUCTURE[videoDuration].wordCount}` : '';

          const prompt = `你是一位资深的投资理财博主，在知乎、小红书有百万粉丝，同时具备CFA资格和多年投资研究经验。请为以下场景生成一篇高质量的${isVideo ? '视频脚本' : '图文内容'}：

${title ? `标题：${title}` : ''}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯（必须深度融入内容中）：\n${hotTopicInfo.substring(0, 1500)}` : ''}
${getPersonaPrompt(personaKeywords)}
${depthRequirements[topicType]}
${videoPrompt}

【通用要求】：
1. 内容必须有深度，不要泛泛而谈
2. 必须有具体的数据、案例或事件支撑
3. 专业术语要有通俗解释
4. 要有个人观点和独到见解
5. 适当使用emoji增加可读性，但不要过度
6. 严禁使用"保证收益"、"稳赚不赔"、"内幕消息"等违规词汇
7. 文末要有风险提示声明

${!isVideo ? `
【图文结构】
- 开头：用数据/现象/痛点吸引眼球（1-2句话）
- 中间：分3-5个要点深度解析，每个要点有数据/案例支撑
- 结尾：总结核心观点 + 行动建议 + 风险提示` : ''}

请直接输出正文内容：`;

          const contentStream = await callLLMStream(prompt);
          for await (const chunk of contentStream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`));
          }
          
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generate content error:', error);
    return Response.json({ 
      success: false, 
      error: '内容生成失败' 
    }, { status: 500 });
  }
}
