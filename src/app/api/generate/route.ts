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

// 用户标签映射（根据微证券业务调整）
const USER_TAG_PROMPTS: Record<UserTag, string> = {
  newbie: '新手投资者，刚开户的新手，需要通俗易懂的解释和生活化的比喻',
  active_trader: '活跃交易者，经常交易，关注短期机会和风险，需要实用的交易策略',
  long_term_investor: '长线投资者，关注基本面和价值投资，需要深度的研究分析',
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
  long_term: '侧重长期投资价值和基本面分析',
  examples: '多举例说明，用具体案例解释概念',
  story_telling: '用故事形式展开，增强代入感和真实感',
  risk_warning: '结尾必须包含投资风险提示语',
  recommend_wzq: '结尾自然融入微证券推荐',
  custom: '自定义要求',
};

// 博主人设映射（增强原生感）
function getPersonaPrompt(personaType: PersonaType, customPersona?: string): string {
  const personas: Record<PersonaType, { keywords: string; tone: string; example: string }> = {
    hardcore_uncle: {
      keywords: '专业、理性、数据说话',
      tone: '像老朋友在茶馆聊投资，严肃但不刻板',
      example: '「说实话，这个数据我看了都替大家着急...」',
    },
    sweet_girl: {
      keywords: '可爱、亲切、通俗易懂',
      tone: '像闺蜜在咖啡厅分享理财心得',
      example: '「姐妹们！今天要跟大家分享一个超实用的小技巧...」',
    },
    veteran_trader: {
      keywords: '经验丰富、接地气、真诚',
      tone: '像老股民在证券大厅跟你唠嗑',
      example: '「我在这个市场摸爬滚打十几年，这种走势见太多了...」',
    },
    finance_scholar: {
      keywords: '专业术语、逻辑清晰、严谨',
      tone: '像大学教授在讲解投资课',
      example: '「从宏观经济的角度来看，这个指标的变化意味着...」',
    },
    roaster: {
      keywords: '幽默、犀利、敢说真话',
      tone: '像在饭局上吐槽行业内幕',
      example: '「说实话，看到这个消息我第一反应是：又来割韭菜了？」',
    },
    custom: {
      keywords: customPersona || '专业理财博主',
      tone: '真诚分享，像朋友聊天',
      example: '',
    },
  };
  
  const p = personas[personaType];
  return `博主人设：${p.keywords}。
语气风格：${p.tone}。
${p.example ? `参考话术：${p.example}` : ''}

【原生感要求】
- 不要像官方账号说话，要像真实博主分享
- 可以适当使用口语化表达，如"说实话"、"跟大家说"、"我觉得"等
- 避免过于正式的宣传腔，要有个人观点和情感
- 可以适当表达个人立场，比如"我个人倾向于..."、"如果是我的话..."`;
}

// 时间范围映射
const TIME_RANGE_MAP: Record<HotTopicTimeRange, string> = {
  '24h': '1d',
  '7d': '7d',
  '30d': '30d',
};

// 支持热点的选题类型
const HOT_TOPIC_SUPPORTED: TopicType[] = ['market_hot'];

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
    const timeRange = hotTopicTimeRange || '24h';

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedContent = '';
        
        try {
          // 1. 搜索热点（只有市场热点选题才搜索）
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

          // 5. 生成配图
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
  timeRange: string = '1d',
  customHeaders?: Record<string, string>
): Promise<{ info: string }> {
  try {
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    const searchQueries: Record<TopicType, string> = {
      market_hot: `A股 股市 财经新闻 最新 今日 热点`,
      beginner_guide: `投资理财入门 新手指南`,
      advanced_invest: `券商研报 机构评级 行业分析`,
      professional_analysis: `上市公司财报 股价分析`,
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

【标题要求】
1. 生成3个不同风格的标题，用数字1/2/3标号
2. 每个标题使用1-2个emoji增加吸引力
3. 标题长度20-30字
4. 避免夸张虚假宣传，不要用"必看"、"震惊"等低质标题党
5. 体现专业度和时效性
6. 要有博主个人风格，不要像官方账号

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
      long_term_investor: `
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
      long_term_investor: `
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
      long_term_investor: `
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
      long_term_investor: `
【专业分析内容要求】
- 深度分析财报数据
- 评估公司长期价值
- 分析行业竞争格局`,
    },
  };

  let prompt = '';
  
  if (isVideo) {
    // 视频脚本格式 - 增强原生感
    const durationGuide: Record<VideoDuration, string> = {
      '30s': '30秒，约80-100字',
      '60s': '60秒，约180-220字',
      '3min': '3分钟，约500-600字',
    };
    
    prompt = `你是短视频脚本专家。请为以下内容生成一个真实博主风格的视频脚本：

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

示例风格：
【画面】：博主对着镜头，表情认真
【文案】：说实话，看到这个数据的时候，我第一反应是...这也太离谱了吧？
【时长】：5秒

请直接输出脚本内容：`;
  } else {
    // 图文内容格式 - 增强原生感
    prompt = `你是小红书博主，请为以下场景生成一篇真实、有价值的图文内容：

标题：${selectedTitle}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo.substring(0, 800)}` : ''}

${depthPrompts[topicType][userTag]}
${personaPrompt}
${requirementPrompts ? `补充要求：\n${requirementPrompts}` : ''}

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

// 生成配图
async function generateImages(title: string, content: string, customHeaders?: Record<string, string>): Promise<string[]> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

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
