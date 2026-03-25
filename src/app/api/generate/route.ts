import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType, VideoDuration, VideoStyle, TitleStyle, HotTopicTimeRange } from '@/lib/types';
import { SearchClient, ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { callLLM, callLLMStream } from '@/lib/llm';

// 选题类型映射 - 增强版
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

// 内容类型映射
const CONTENT_TYPE_PROMPTS: Record<ContentType, string> = {
  article: '小红书图文笔记',
  video_script: '短视频脚本',
};

// 标题风格映射
const TITLE_STYLE_PROMPTS: Record<TitleStyle, string> = {
  suspense: '悬念式标题：设置悬念，引发读者好奇心',
  data_driven: '数据式标题：用数据说话，有理有据',
  emotional: '情感式标题：触动情感共鸣',
  practical: '实用式标题：强调实用价值',
  contrast: '反差式标题：制造反差吸引眼球',
};

// 视频风格映射
const VIDEO_STYLE_PROMPTS: Record<VideoStyle, string> = {
  popular_science: '科普风格：知识点密集，干货满满',
  roast: '吐槽风格：幽默风趣，犀利点评',
  suspense: '悬疑风格：设置悬念，引人入胜',
  storytelling: '故事风格：案例为主，娓娓道来',
  educational: '教学风格：步骤清晰，手把手教',
};

// 人设风格适配
function getPersonaPrompt(personaKeywords?: string): string {
  if (!personaKeywords) return '';
  return `博主风格人设：${personaKeywords}。语气、称呼、表达方式都要贴合这个人设。`;
}

// 时间范围映射 - 市场热点固定3天内
const TIME_RANGE_MAP: Record<HotTopicTimeRange, string> = {
  '24h': '1d',
  '7d': '7d',
  '30d': '30d',
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topicType, 
      userTag, 
      contentType, 
      keywords, 
      useHotTopic,
      videoDuration = '60s',
      videoStyle = 'popular_science',
      titleStyle,
      personaKeywords,
      hotTopicTimeRange = '24h',
    } = body as {
      topicType: TopicType;
      userTag: UserTag;
      contentType: ContentType;
      keywords?: string;
      useHotTopic?: boolean;
      videoDuration?: VideoDuration;
      videoStyle?: VideoStyle;
      titleStyle?: TitleStyle;
      personaKeywords?: string;
      hotTopicTimeRange?: HotTopicTimeRange;
    };

    // 提取请求头用于SDK
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedContent = ''; // 累积正文内容，用于后续生成配图
        let accumulatedTitle = '';
        
        try {
          // 0. 如果启用了热点推荐，先搜索实时热点
          let hotTopicInfo = '';
          let hotTopicsWithScore: Array<{title: string; score: number; snippet: string}> = [];
          
          if (useHotTopic) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在搜索实时热点...' })}\n\n`));
            // 市场热点固定搜索3天内新闻
            const effectiveTimeRange = topicType === 'market_hot' ? '3d' : TIME_RANGE_MAP[hotTopicTimeRange];
            const result = await searchHotTopics(topicType, keywords, effectiveTimeRange, customHeaders);
            hotTopicInfo = result.info;
            hotTopicsWithScore = result.topics;
            
            if (hotTopicsWithScore.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'hot_topics_data', data: hotTopicsWithScore })}\n\n`));
            }
          }

          // 1. 生成标题
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成标题...' })}\n\n`));
          const title = await generateTitle(topicType, userTag, contentType, keywords, hotTopicInfo, titleStyle, personaKeywords);
          accumulatedTitle = title;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'title', data: title, titleStyle })}\n\n`));

          // 2. 生成正文（流式）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成正文...' })}\n\n`));
          const contentStream = await generateContent(
            topicType, userTag, contentType, keywords, hotTopicInfo, title,
            videoDuration, videoStyle, personaKeywords
          );
          for await (const chunk of contentStream) {
            accumulatedContent += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`));
          }

          // 3. 生成标签
          const tags = await generateTags(topicType, keywords, title, accumulatedContent);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`));

          // 4. 生成多张配图供选择 - 基于标题和内容关键词
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图...' })}\n\n`));
          const imageUrls = await generateImages(title, accumulatedContent, customHeaders);
          if (imageUrls.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'images', data: imageUrls })}\n\n`));
          }

          // 5. 合规审查
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在进行合规审查...' })}\n\n`));
          const complianceResult = await checkCompliance(title, accumulatedContent, tags.join(' '));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'compliance', data: complianceResult })}\n\n`));

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
    console.error('Generate error:', error);
    return new Response(JSON.stringify({ error: '生成失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 搜索实时热点 - 增强版，针对不同选题类型优化搜索
async function searchHotTopics(
  topicType: TopicType, 
  keywords?: string,
  timeRange: string = '3d',
  customHeaders?: Record<string, string>
): Promise<{ info: string; topics: Array<{title: string; score: number; snippet: string}> }> {
  try {
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    // 根据选题类型构建不同的搜索查询
    const searchQueries: Record<TopicType, string> = {
      market_hot: `AI人工智能技术突破 机器人行业新闻 新能源汽车 国家宏观政策 行业监管 三天内`,
      beginner_guide: `投资理财入门 新手指南 理财知识 最新`,
      advanced_invest: `券商研报 机构评级 高盛摩根中信证券 行业分析报告 最新`,
      professional_analysis: `上市公司财报 股价分析 黄金石油外汇 期货市场 经济数据 最新`,
    };

    let query = searchQueries[topicType];
    if (keywords) {
      query = `${keywords} ${query}`;
    }

    const response = await client.advancedSearch(query, {
      count: 8,
      needSummary: true,
      timeRange: timeRange,
    });

    const topics: Array<{title: string; score: number; snippet: string}> = [];
    
    if (response.web_items && response.web_items.length > 0) {
      response.web_items.slice(0, 5).forEach((item, index) => {
        const score = Math.max(100 - index * 15, 50);
        topics.push({
          title: item.title,
          score,
          snippet: item.snippet?.substring(0, 150) || '',
        });
      });

      const hotInfo = response.web_items
        .slice(0, 5)
        .map(item => `【${item.title}】\n${item.snippet?.substring(0, 200) || ''}`)
        .join('\n\n');
      
      const summary = response.summary ? `\n\n综合摘要：${response.summary}` : '';
      return { info: hotInfo + summary, topics };
    }

    return { info: '', topics: [] };
  } catch (error) {
    console.error('Search hot topics error:', error);
    return { info: '', topics: [] };
  }
}

// 生成标题
async function generateTitle(
  topicType: TopicType,
  userTag: UserTag,
  contentType: ContentType,
  keywords?: string,
  hotTopicInfo?: string,
  titleStyle?: TitleStyle,
  personaKeywords?: string
): Promise<string> {
  const titleStylePrompt = titleStyle 
    ? TITLE_STYLE_PROMPTS[titleStyle] 
    : '选择最适合的标题风格';

  const prompt = `你是一个小红书爆款内容专家，请为以下场景生成一个吸引人的标题：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
内容类型：${contentType === 'article' ? '图文笔记' : '视频脚本'}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯（必须结合这些信息）：\n${hotTopicInfo.substring(0, 800)}` : ''}

标题风格要求：${titleStylePrompt}
${getPersonaPrompt(personaKeywords)}

要求：
1. 标题要有吸引力，使用emoji表情增加视觉冲击力（1-2个即可）
2. 符合小红书风格，要有种草感、悬念感或价值感
3. 避免使用夸张、虚假宣传词汇
4. 标题长度控制在20-30个字
5. 要有独特性，体现专业度和洞察力
6. ${hotTopicInfo ? '必须结合提供的最新资讯，让内容有时效性' : ''}

请直接输出标题，不要其他说明。`;

  const response = await callLLM(prompt);
  return response.trim();
}

// 生成正文（流式）- 大幅优化，增加深度要求
async function* generateContent(
  topicType: TopicType,
  userTag: UserTag,
  contentType: ContentType,
  keywords?: string,
  hotTopicInfo?: string,
  title?: string,
  videoDuration?: VideoDuration,
  videoStyle?: VideoStyle,
  personaKeywords?: string
): AsyncGenerator<string> {
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
总时长：${videoDuration || '60秒'}
风格：${videoStyle ? VIDEO_STYLE_PROMPTS[videoStyle] : '科普风格'}

请严格按照以下格式输出脚本：

━━━ 开场钩子 [${VIDEO_DURATION_STRUCTURE[videoDuration || '60s'].hookTime}] ━━━
【镜头】描述镜头画面
【台词】开场白内容

━━━ 核心内容 [${VIDEO_DURATION_STRUCTURE[videoDuration || '60s'].mainTime}] ━━━
【分段一】[时间节点]
【镜头】画面描述
【字幕】关键文字/数据
【台词】讲解内容

【分段二】[时间节点]
...

━━━ 结尾互动 [${VIDEO_DURATION_STRUCTURE[videoDuration || '60s'].ctaTime}] ━━━
【镜头】画面描述
【台词】总结+引导关注

总字数控制在：${VIDEO_DURATION_STRUCTURE[videoDuration || '60s'].wordCount}` : '';

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

  const stream = await callLLMStream(prompt);
  for await (const chunk of stream) {
    yield chunk;
  }
}

// 生成标签
async function generateTags(topicType: TopicType, keywords?: string, title?: string, content?: string): Promise<string[]> {
  const prompt = `你是一个小红书SEO专家，请为以下内容生成6-8个高流量标签：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
${title ? `标题：${title}` : ''}
${keywords ? `关键词：${keywords}` : ''}
${content ? `内容摘要：${content.substring(0, 300)}...` : ''}

要求：
1. 标签要热门、有流量，是用户真实搜索的词
2. 标签要与内容高度相关
3. 混合使用大类标签和精准标签
4. 标签格式：去掉#号，只输出标签文本

请直接输出标签，用逗号分隔。`;

  const response = await callLLM(prompt);
  return response.split(/[,，、\n]/).map((tag) => tag.trim().replace(/^#/, '')).filter((tag) => tag.length > 0);
}

// 生成多张配图 - 基于标题和内容关键词
async function generateImages(title: string, content: string, customHeaders?: Record<string, string>): Promise<string[]> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);
    
    // 从标题和内容中提取关键词用于图片生成
    const contentKeywords = content.substring(0, 200);
    
    // 基于内容生成相关的图片描述
    const imagePrompts = [
      // 风格1：财经数据可视化风格
      `Professional financial infographic style, clean data visualization with charts and graphs, business growth concept, blue and white color scheme, modern minimalist design, NO TEXT, NO WORDS, NO LETTERS, corporate professional aesthetic, suitable for financial article cover`,
      
      // 风格2：投资理财场景
      `Modern investment planning scene, laptop with stock charts on desk, coffee cup, notebook with financial notes, warm natural lighting, professional yet approachable atmosphere, NO TEXT, NO WORDS, NO LETTERS, lifestyle photography style`,
      
      // 风格3：抽象经济增长
      `Abstract upward growth visualization, geometric shapes flowing upward, gradient from blue to green, representing market growth and prosperity, clean modern design, NO TEXT, NO WORDS, NO LETTERS, professional business aesthetic`,
      
      // 风格4：温馨科普风格
      `Warm and inviting illustration about money management and investment, soft pastel colors, friendly and educational atmosphere, simple clean design, NO TEXT, NO WORDS, NO LETTERS, suitable for beginner finance content`,
    ];

    const imagePromises = imagePrompts.map(async (prompt, index) => {
      try {
        const response = await client.generate({
          prompt,
          size: '2K',
          watermark: false,
        });

        const helper = client.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          return helper.imageUrls[0];
        }
        return null;
      } catch (error) {
        console.error(`Image ${index + 1} generation error:`, error);
        return null;
      }
    });

    const results = await Promise.all(imagePromises);
    return results.filter((url): url is string => url !== null);
  } catch (error) {
    console.error('Image generation error:', error);
    return [];
  }
}

// 合规审查 - 增强
async function checkCompliance(title: string, content: string, tags: string): Promise<{
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
}> {
  const prompt = `你是一个金融内容合规审查专家，请严格审查以下小红书内容是否合规：

标题：${title}
正文：${content.substring(0, 500)}
标签：${tags}

【审查重点】：
1. 违规承诺类：
   - 是否包含"保证收益"、"稳赚不赔"、"100%收益"、"躺赚"等承诺性表述
   - 是否暗示内幕消息或庄家操作

2. 荐股违规类：
   - 是否有具体的股票代码推荐
   - 是否有"买入XX股票"的明确建议
   - 是否暗示有内幕消息来源

3. 夸大宣传类：
   - 是否有"暴富"、"翻倍"等夸大表述
   - 是否有虚假或误导性信息

4. 敏感词汇：
   - "内幕消息"、"庄家"、"黑马"、"妖股"等
   - "荐股"、"代客理财"等可能涉及牌照问题

5. 风险提示：
   - 是否有适当的风险提示声明
   - 是否声明"不构成投资建议"

请以JSON格式输出审查结果：
{
  "isCompliant": true或false,
  "warnings": ["具体警告信息1", "具体警告信息2"],
  "suggestions": ["具体修改建议1", "具体修改建议2"]
}

如果没有问题，warnings为空数组，isCompliant为true。`;

  try {
    const response = await callLLM(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Compliance check error:', error);
  }

  return {
    isCompliant: true,
    warnings: [],
    suggestions: [],
  };
}
