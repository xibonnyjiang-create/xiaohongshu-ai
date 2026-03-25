import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType, VideoDuration, VideoStyle, TitleStyle, HotTopicTimeRange } from '@/lib/types';
import { SearchClient, ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { callLLM, callLLMStream } from '@/lib/llm';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪，最新动态和热点事件',
  beginner_guide: '小白科普，基础投资知识和入门指南',
  advanced_invest: '进阶投资，进阶投资策略和技巧',
  professional_analysis: '专业分析，深度行业分析和专业见解',
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

// 时间范围映射
const TIME_RANGE_MAP: Record<HotTopicTimeRange, string> = {
  '24h': '1d',
  '7d': '7d',
  '30d': '30d',
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
        try {
          // 0. 如果启用了热点推荐，先搜索实时热点
          let hotTopicInfo = '';
          let hotTopicsWithScore: Array<{title: string; score: number; snippet: string}> = [];
          
          if (useHotTopic) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在搜索实时热点...' })}\n\n`));
            const result = await searchHotTopics(topicType, keywords, hotTopicTimeRange, customHeaders);
            hotTopicInfo = result.info;
            hotTopicsWithScore = result.topics;
            
            // 发送热点数据（带热度值）
            if (hotTopicsWithScore.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'hot_topics_data', data: hotTopicsWithScore })}\n\n`));
            }
          }

          // 1. 生成标题
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成标题...' })}\n\n`));
          const title = await generateTitle(topicType, userTag, contentType, keywords, hotTopicInfo, titleStyle, personaKeywords);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'title', data: title, titleStyle })}\n\n`));

          // 2. 生成正文（流式）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成正文...' })}\n\n`));
          const contentStream = await generateContent(
            topicType, userTag, contentType, keywords, hotTopicInfo, title,
            videoDuration, videoStyle, personaKeywords
          );
          for await (const chunk of contentStream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`));
          }

          // 3. 生成标签
          const tags = await generateTags(topicType, keywords);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`));

          // 4. 生成多张配图供选择
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图...' })}\n\n`));
          const imageUrls = await generateImages(title, customHeaders);
          if (imageUrls.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'images', data: imageUrls })}\n\n`));
          }

          // 5. 合规审查
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在进行合规审查...' })}\n\n`));
          const complianceResult = await checkCompliance(title, tags.join(' '));
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

// 搜索实时热点（返回带热度值的数据）
async function searchHotTopics(
  topicType: TopicType, 
  keywords?: string,
  hotTopicTimeRange: HotTopicTimeRange = '24h',
  customHeaders?: Record<string, string>
): Promise<{ info: string; topics: Array<{title: string; score: number; snippet: string}> }> {
  try {
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    // 根据选题类型构建搜索查询
    const searchQueries: Record<TopicType, string> = {
      market_hot: `A股市场最新热点 今日财经新闻 投资机会`,
      beginner_guide: `投资理财入门知识 新手指南 今日`,
      advanced_invest: `价值投资策略 股票分析 最新市场动态`,
      professional_analysis: `宏观经济分析 行业研究报告 今日财经`,
    };

    let query = searchQueries[topicType];
    if (keywords) {
      query = `${keywords} ${query}`;
    }

    // 执行搜索
    const response = await client.advancedSearch(query, {
      count: 5,
      needSummary: true,
      timeRange: TIME_RANGE_MAP[hotTopicTimeRange],
    });

    const topics: Array<{title: string; score: number; snippet: string}> = [];
    
    if (response.web_items && response.web_items.length > 0) {
      response.web_items.slice(0, 5).forEach((item, index) => {
        // 模拟热度值（基于排序位置）
        const score = Math.max(100 - index * 15, 50);
        topics.push({
          title: item.title,
          score,
          snippet: item.snippet?.substring(0, 100) || '',
        });
      });

      const hotInfo = response.web_items
        .slice(0, 3)
        .map(item => `【${item.title}】${item.snippet?.substring(0, 100) || ''}`)
        .join('\n');
      
      const summary = response.summary ? `\n\n热点摘要：${response.summary}` : '';
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
${hotTopicInfo ? `实时热点信息：\n${hotTopicInfo}` : ''}

标题风格要求：${titleStylePrompt}
${getPersonaPrompt(personaKeywords)}

要求：
1. 标题要有吸引力，使用emoji表情增加视觉冲击力
2. 符合小红书风格，要有种草感、悬念感或价值感
3. 避免使用夸张、虚假宣传词汇
4. 标题长度控制在20-30个字
5. 要有独特性，体现专业度和洞察力
6. ${hotTopicInfo ? '必须结合提供的实时热点信息，让内容有时效性' : ''}

请直接输出标题，不要其他说明。`;

  const response = await callLLM(prompt);
  return response.trim();
}

// 生成正文（流式）
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
  
  const videoPrompt = isVideo ? `
【视频脚本结构要求】
时长：${videoDuration || '60s'}
风格：${videoStyle ? VIDEO_STYLE_PROMPTS[videoStyle] : '科普风格'}

脚本需要包含以下部分：
【开场钩子】- 用悬念、痛点或数据吸引注意力
【核心内容】- 分点阐述，提供具体数据或案例
【结尾互动】- 总结+引导关注互动` : '';

  const prompt = `你是一个资深的投资理财博主，在知乎、小红书有百万粉丝。请为以下场景生成一篇高质量的${isVideo ? '视频脚本' : '图文内容'}：

${title ? `标题：${title}` : ''}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `实时热点信息（必须融入内容中）：\n${hotTopicInfo}` : ''}
${getPersonaPrompt(personaKeywords)}
${videoPrompt}

【核心要求】：
1. 内容深度要求：
   - 不要浮于表面，要有独到见解和深度分析
   - 提供具体的操作方法、数据支撑或案例说明
   - 解释"为什么"而不只是"是什么"
   - 关联相关的背景知识或同类案例

2. 专业性要求：
   - 使用准确的专业术语，但要通俗解释
   - 引用具体的市场数据或趋势分析
   - 提供可操作的建议，而非空泛的口号

${!isVideo ? `
3. 图文内容结构：
   - 开头：用数据/现象/痛点吸引眼球
   - 中间：分3-5个要点深度解析
   - 结尾：总结+行动建议+互动引导` : ''}

4. 语言风格：
   - 真诚、接地气，像资深朋友在分享经验
   - 适当使用emoji增加可读性，但不要过度
   - 避免官方腔、广告腔，要有个人观点

5. 禁忌事项：
   - 严禁使用"保证收益"、"稳赚不赔"、"内幕消息"等违规词汇
   - 不要过度承诺投资回报
   - 要有风险提示意识

${hotTopicInfo ? '【重要】必须将上述实时热点信息自然融入内容中！' : ''}

请直接输出正文内容，不要其他说明：`;

  const stream = await callLLMStream(prompt);
  for await (const chunk of stream) {
    yield chunk;
  }
}

// 生成标签
async function generateTags(topicType: TopicType, keywords?: string): Promise<string[]> {
  const prompt = `你是一个小红书SEO专家，请为以下内容生成5-8个高流量标签：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
${keywords ? `关键词：${keywords}` : ''}

要求：
1. 标签要热门、有流量，是用户真实搜索的词
2. 标签要与内容高度相关
3. 混合使用大类标签和精准标签
4. 标签格式：去掉#号，只输出标签文本

请直接输出标签，用逗号分隔，不要其他说明。`;

  const response = await callLLM(prompt);
  return response.split(/[,，、\n]/).map((tag) => tag.trim().replace(/^#/, '')).filter((tag) => tag.length > 0);
}

// 生成多张配图供用户选择
async function generateImages(title: string, customHeaders?: Record<string, string>): Promise<string[]> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);
    
    // 小红书风格的图片提示词（不含文字要求）
    const imagePrompts = [
      `A clean, minimalist illustration about investment and finance, soft pastel colors with pink and cream tones, flat design style, geometric shapes representing growth and prosperity, warm and inviting atmosphere, NO TEXT, NO WORDS, NO LETTERS, modern aesthetic, suitable for social media cover`,
      `A cozy lifestyle photo about financial planning, natural sunlight, wooden desk with plants and notebook, warm tones, aesthetic composition, Instagram style, NO TEXT, NO WORDS, NO LETTERS, clean and organized, professional yet approachable`,
      `Abstract modern design with gradient colors, soft curves flowing upward representing growth, pink to orange gradient, clean minimalist composition, NO TEXT, NO WORDS, NO LETTERS, professional business aesthetic, suitable for social media`,
      `Cute hand-drawn illustration about saving money, soft watercolor style, pastel colors, gentle brushstrokes, warm and healing atmosphere, NO TEXT, NO WORDS, NO LETTERS, kawaii elements, suitable for lifestyle blog`,
    ];

    // 并行生成4张不同风格的图片
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

// 合规审查
async function checkCompliance(title: string, tags: string): Promise<{
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
}> {
  const prompt = `你是一个金融内容合规审查专家，请严格审查以下小红书内容是否合规：

标题：${title}
标签：${tags}

【审查重点】：
1. 违规承诺类：
   - 是否包含"保证收益"、"稳赚不赔"、"100%收益"等承诺性表述
   - 是否暗示内幕消息或庄家操作

2. 夸大宣传类：
   - 是否有"暴富"、"翻倍"、"躺赚"等夸大表述
   - 是否有虚假或误导性信息

3. 敏感词汇：
   - "内幕消息"、"庄家"、"黑马"、"妖股"等
   - "荐股"、"代客理财"等可能涉及牌照问题

4. 社区规范：
   - 是否符合小红书社区内容规范
   - 是否有引导站外交易等违规行为

请以JSON格式输出审查结果：
{
  "isCompliant": true或false,
  "warnings": ["具体警告信息1", "具体警告信息2"],
  "suggestions": ["具体修改建议1", "具体修改建议2"]
}

如果没有问题，warnings为空数组，isCompliant为true。
警告信息要具体指出哪个词或哪句话有问题。`;

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
