import { NextRequest } from 'next/server';
import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle, 
  TitleStyle, HotTopicTimeRange, AdditionalRequirement, PersonaType,
  TitleCandidate
} from '@/lib/types';
import { SearchClient, ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { callLLM, callLLMStream, callComplianceCheck } from '@/lib/llm';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪',
  beginner_guide: '小白科普',
  advanced_invest: '进阶投资',
  professional_analysis: '专业分析',
};

// 用户标签映射
const USER_TAG_PROMPTS: Record<UserTag, string> = {
  beginner: '小白投资者，刚入市的新手，需要通俗易懂的解释',
  intermediate: '进阶投资者，有一定经验的投资者，需要实用的策略',
  professional: '专业玩家，经验丰富的专业投资者，需要深度分析',
};

// 标题风格映射
const TITLE_STYLE_PROMPTS: Record<TitleStyle, string> = {
  suspense: '悬念式：设置悬念，引发读者好奇心',
  data_driven: '数据式：用数据说话，有理有据',
  emotional: '情感式：触动情感共鸣',
  practical: '实用式：强调实用价值',
  contrast: '反差式：制造反差吸引眼球',
  custom: '自定义风格',
};

// 视频风格映射
const VIDEO_STYLE_PROMPTS: Record<VideoStyle, string> = {
  popular_science: '科普风格：知识点密集，干货满满',
  fast_cut: '快节奏剪辑：节奏紧凑，信息量大',
  deep_dive: '深度解读：抽丝剥茧，层层深入',
  funny_roast: '轻松吐槽：幽默风趣，犀利点评',
  demo: '实战演示：手把手教，实操性强',
};

// 补充要求映射
const ADDITIONAL_REQUIREMENT_PROMPTS: Record<AdditionalRequirement, string> = {
  short_300: '正文控制在300字左右，简洁精炼',
  short_term: '侧重短期投资机会和风险分析',
  examples: '多举例说明，用具体案例解释概念',
  risk_warning: '结尾必须包含投资风险提示语',
  recommend_wzq: '结尾自然融入微证券推荐',
  custom: '自定义要求',
};

// 博主人设映射
function getPersonaPrompt(personaType: PersonaType, customPersona?: string): string {
  const personas: Record<PersonaType, string> = {
    hardcore_uncle: '硬核财经大叔：专业、理性、数据说话、深度分析、犀利点评',
    sweet_girl: '甜妹理财科普：可爱、亲切、通俗易懂、闺蜜感、温暖治愈',
    veteran_trader: '实战派老股民：经验丰富、接地气、实战案例、避坑指南、真诚分享',
    finance_scholar: '金融学霸人设：专业术语、逻辑清晰、学术派、数据支撑、严谨分析',
    roaster: '吐槽型财经博主：幽默、犀利、一针见血、敢说真话、接地气',
    custom: customPersona || '专业理财博主',
  };
  return `博主人设：${personas[personaType]}。语气、称呼、表达方式都要贴合这个人设。`;
}

// 时间范围映射
const TIME_RANGE_MAP: Record<HotTopicTimeRange, string> = {
  '24h': '1d',
  '7d': '7d',
  '30d': '30d',
};

// 支持热点的选题类型
const HOT_TOPIC_SUPPORTED: TopicType[] = ['market_hot', 'advanced_invest', 'professional_analysis'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topicType, userTag, contentType, keywords, hotTopicTimeRange,
      titleStyles, customTitleStyle, personaType, customPersona, 
      additionalRequirements, customRequirement,
      videoDuration, videoStyle, hotTopicInfo: passedHotTopicInfo,
    } = body as {
      topicType: TopicType;
      userTag: UserTag;
      contentType: ContentType;
      keywords?: string;
      hotTopicTimeRange?: HotTopicTimeRange;
      titleStyles?: TitleStyle[];
      customTitleStyle?: string;
      personaType?: PersonaType;
      customPersona?: string;
      additionalRequirements?: AdditionalRequirement[];
      customRequirement?: string;
      videoDuration?: VideoDuration;
      videoStyle?: VideoStyle;
      hotTopicInfo?: string;
    };

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const isVideo = contentType === 'video_script';
    const timeRange = hotTopicTimeRange || '7d';

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedContent = '';
        
        try {
          // 1. 搜索热点（如果传入了热点信息则使用传入的）
          let hotTopicInfo = passedHotTopicInfo || '';
          if (!hotTopicInfo && HOT_TOPIC_SUPPORTED.includes(topicType)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在搜索热点资讯...' })}\n\n`));
            const result = await searchHotTopics(topicType, keywords, TIME_RANGE_MAP[timeRange], customHeaders);
            hotTopicInfo = result.info;
          }

          // 2. 生成标题候选
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成标题...' })}\n\n`));
          const titles = await generateTitles(topicType, userTag, contentType, keywords, hotTopicInfo, titleStyles, customTitleStyle, personaType, customPersona);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'titles', data: titles })}\n\n`));

          // 3. 生成正文/脚本
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成内容...' })}\n\n`));
          
          const requirements = additionalRequirements || [];
          const contentStream = await generateContentStream(
            topicType, userTag, contentType, keywords, hotTopicInfo,
            titles, requirements, customRequirement, videoDuration, videoStyle, personaType, customPersona
          );
          
          for await (const chunk of contentStream) {
            accumulatedContent += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`));
          }

          // 4. 生成标签
          const tags = await generateTags(topicType, keywords, titles[0]?.title || '', accumulatedContent);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`));

          // 5. 生成配图（直接调用模型生成图片）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图...' })}\n\n`));
          const imageUrls = await generateImages(titles[0]?.title || '', accumulatedContent, customHeaders);
          if (imageUrls.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'images', data: imageUrls })}\n\n`));
          }

          // 6. 合规审查
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在进行合规审查...' })}\n\n`));
          const complianceResult = await callComplianceCheck(titles[0]?.title || '', accumulatedContent, tags.join(' '));
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

// 热点搜索
async function searchHotTopics(
  topicType: TopicType, 
  keywords?: string,
  timeRange: string = '7d',
  customHeaders?: Record<string, string>
): Promise<{ info: string }> {
  try {
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    const searchQueries: Record<TopicType, string> = {
      market_hot: `AI人工智能 机器人 新能源 财经新闻 最新 今日`,
      beginner_guide: `投资理财入门 新手指南`,
      advanced_invest: `券商研报 机构评级 行业分析 最新 今日`,
      professional_analysis: `上市公司财报 股价分析 黄金石油外汇 最新 今日`,
    };

    let query = searchQueries[topicType];
    if (keywords) {
      query = `${keywords} ${query}`;
    }

    const response = await client.advancedSearch(query, {
      count: 5,
      needSummary: true,
      timeRange,
    });

    if (response.web_items && response.web_items.length > 0) {
      const hotInfo = response.web_items
        .slice(0, 3)
        .map(item => `【${item.title}】\n${item.snippet?.substring(0, 150) || ''}`)
        .join('\n\n');
      return { info: hotInfo };
    }

    return { info: '' };
  } catch (error) {
    console.error('Search hot topics error:', error);
    return { info: '' };
  }
}

// 生成多个标题
async function generateTitles(
  topicType: TopicType,
  userTag: UserTag,
  contentType: ContentType,
  keywords?: string,
  hotTopicInfo?: string,
  titleStyles?: TitleStyle[],
  customTitleStyle?: string,
  personaType?: PersonaType,
  customPersona?: string
): Promise<TitleCandidate[]> {
  // 构建风格指南
  let styleGuides = '';
  if (titleStyles && titleStyles.length > 0) {
    const nonCustomStyles = titleStyles.filter(s => s !== 'custom');
    styleGuides = nonCustomStyles.map(s => TITLE_STYLE_PROMPTS[s]).join('；');
    if (titleStyles.includes('custom') && customTitleStyle) {
      styleGuides += `；自定义风格：${customTitleStyle}`;
    }
  }
  if (!styleGuides) {
    styleGuides = '选择最适合的风格';
  }

  const personaPrompt = personaType ? getPersonaPrompt(personaType, customPersona) : '';

  const prompt = `你是小红书爆款标题专家。请为以下场景生成3个不同风格的吸引人标题：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
内容形式：${contentType === 'article' ? '图文内容' : '视频脚本'}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo.substring(0, 500)}` : ''}

标题风格参考：${styleGuides}
${personaPrompt}

要求：
1. 生成3个不同风格的标题，用数字1/2/3标号
2. 每个标题使用1-2个emoji增加吸引力
3. 标题长度20-30字
4. 避免夸张虚假宣传
5. 体现专业度和时效性

请按以下格式输出：
1. [标题一]
2. [标题二]
3. [标题三]`;

  const response = await callLLM(prompt);
  
  // 解析标题
  const lines = response.split('\n').filter(l => l.trim());
  const titles: TitleCandidate[] = [];
  
  for (const line of lines) {
    const match = line.match(/^\d+[.、．]\s*(.+)$/);
    if (match) {
      titles.push({
        title: match[1].trim(),
        style: titleStyles?.[titles.length] || 'suspense',
      });
    }
  }

  return titles.length > 0 ? titles : [{ title: response.trim().substring(0, 30), style: 'suspense' }];
}

// 生成内容流
async function* generateContentStream(
  topicType: TopicType,
  userTag: UserTag,
  contentType: ContentType,
  keywords?: string,
  hotTopicInfo?: string,
  titles?: TitleCandidate[],
  additionalRequirements?: AdditionalRequirement[],
  customRequirement?: string,
  videoDuration?: VideoDuration,
  videoStyle?: VideoStyle,
  personaType?: PersonaType,
  customPersona?: string
): AsyncGenerator<string> {
  const isVideo = contentType === 'video_script';
  const selectedTitle = titles?.[0]?.title || '';
  const personaPrompt = personaType ? getPersonaPrompt(personaType, customPersona) : '';

  // 构建补充要求提示
  let requirementPrompts = '';
  if (additionalRequirements && additionalRequirements.length > 0) {
    const nonCustomReqs = additionalRequirements.filter(r => r !== 'custom');
    requirementPrompts = nonCustomReqs.map(r => ADDITIONAL_REQUIREMENT_PROMPTS[r]).join('\n');
    if (additionalRequirements.includes('custom') && customRequirement) {
      requirementPrompts += `\n${customRequirement}`;
    }
  }
  
  // 深度要求
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

  let prompt = '';
  
  if (isVideo) {
    // 视频脚本格式
    const durationGuide: Record<VideoDuration, string> = {
      '30s': '30秒，约80-100字',
      '60s': '60秒，约180-220字',
      '3min': '3分钟，约500-600字',
    };
    
    prompt = `你是短视频脚本专家。请为以下内容生成专业视频脚本：

标题：${selectedTitle}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo.substring(0, 800)}` : ''}

时长：${durationGuide[videoDuration || '60s']}
风格：${VIDEO_STYLE_PROMPTS[videoStyle || 'popular_science']}
${personaPrompt}
${requirementPrompts ? `补充要求：\n${requirementPrompts}` : ''}

【脚本格式要求】
严格按以下格式输出，每个分段包含：画面、文案、时长

【画面】：描述镜头画面
【文案】：口播台词
【时长】：X秒

示例：
【画面】：黄金K线图，箭头指向新高位置
【文案】：黄金价格又创历史新高了！
【时长】：3秒

【画面】：分屏对比 – 普通投资者 vs 机构投资者
【文案】：很多人问，现在还能买吗？
【时长】：4秒

请直接输出脚本内容：`;
  } else {
    // 图文内容格式
    prompt = `你是小红书爆款内容专家。请为以下场景生成高质量图文内容：

标题：${selectedTitle}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo.substring(0, 800)}` : ''}

${depthPrompts[topicType]}
${personaPrompt}
${requirementPrompts ? `补充要求：\n${requirementPrompts}` : ''}

【图文结构要求】
- 开头（1-2句）：用场景、痛点或热点切入，快速吸引注意力
- 中间：分点展开，每段不超过4行，可适当使用emoji
- 结尾：总结观点 + 可操作建议

【合规要求】
- 严禁使用"保证收益"、"稳赚不赔"、"内幕消息"等违规词
- 不要推荐具体股票代码
- 文末声明"不构成投资建议"

请直接输出正文内容：`;
  }

  const stream = await callLLMStream(prompt);
  for await (const chunk of stream) {
    yield chunk;
  }
}

// 生成标签
async function generateTags(topicType: TopicType, keywords?: string, title?: string, content?: string): Promise<string[]> {
  const prompt = `你是小红书SEO专家。请为以下内容生成6-8个热门标签：

选题：${TOPIC_TYPE_PROMPTS[topicType]}
${title ? `标题：${title}` : ''}
${keywords ? `关键词：${keywords}` : ''}

要求：
1. 标签要热门、有流量
2. 混合大类标签和精准标签
3. 只输出标签文本，用逗号分隔`;

  const response = await callLLM(prompt);
  return response.split(/[,，、\n]/).map((tag) => tag.trim().replace(/^#/, '')).filter((tag) => tag.length > 0 && tag.length < 15);
}

// 生成配图（直接调用模型生成图片）
async function generateImages(title: string, content: string, customHeaders?: Record<string, string>): Promise<string[]> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 根据内容生成配图prompt
    const contentPrompt = `Financial investment theme, ${title.substring(0, 50)}`;
    
    const imagePrompts = [
      `Professional financial infographic style, clean data visualization, business growth concept, blue and white color scheme, modern minimalist design, suitable for social media cover, NO TEXT, NO WORDS, NO LETTERS, NO CHARACTERS`,
      `Modern investment planning scene, laptop with stock charts, warm natural lighting, professional atmosphere, lifestyle photography, NO TEXT, NO WORDS, NO LETTERS, NO CHARACTERS`,
      `Abstract upward growth visualization, geometric shapes, gradient from blue to green, clean modern design, professional business aesthetic, NO TEXT, NO WORDS, NO LETTERS, NO CHARACTERS`,
    ];

    const imageUrls: string[] = [];
    
    for (let i = 0; i < imagePrompts.length; i++) {
      try {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 800));
        
        const response = await client.generate({
          prompt: imagePrompts[i],
          size: '2K',
          watermark: false,
        });

        const helper = client.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          imageUrls.push(helper.imageUrls[0]);
        }
      } catch (error) {
        console.error(`Image ${i + 1} error:`, error);
      }
    }

    return imageUrls;
  } catch (error) {
    console.error('Image generation error:', error);
    return [];
  }
}
