import { NextRequest } from 'next/server';
import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle, 
  TitleStyle, AdditionalRequirement, PersonaType,
  TitleCandidate, AnalysisTarget, ContentDepth, FocusDirection, ContentSubType
} from '@/lib/types';
import { SearchClient, ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { callLLM, callLLMStream, callComplianceCheck } from '@/lib/llm';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点',
  beginner_guide: '小白科普',
  advanced_invest: '进阶投资',
  professional_analysis: '专业分析',
};

// 用户标签映射
const USER_TAG_PROMPTS: Record<UserTag, string> = {
  newbie: '小白投资者，刚开户的新手，需要通俗易懂的解释和生活化的比喻',
  active_trader: '进阶投资者，有一定经验，关注短期机会和风险，需要实用的交易策略',
  professional: '专业人士，经验丰富，关注基本面和价值投资，需要深度的研究分析',
};

// 分析对象映射
const ANALYSIS_TARGET_PROMPTS: Record<AnalysisTarget, string> = {
  asset: '资产分析',
  industry: '行业分析',
  company: '公司分析',
  macro_policy: '宏观政策分析',
  market_event: '市场热点事件分析',
  custom: '自定义分析对象',
};

// 内容深度映射
const CONTENT_DEPTH_PROMPTS: Record<ContentDepth, string> = {
  basic: '基础解读，偏科普风格，适合新手理解',
  logical: '逻辑分析，有因果推演，适合有一定基础的投资者',
  professional: '深度观点，专业分析，适合经验丰富的投资者',
};

// 重点关注方向映射
const FOCUS_DIRECTION_PROMPTS: Record<FocusDirection, string> = {
  why_happen: '分析事件发生的原因',
  what_impact: '分析事件的影响（对市场/行业/投资者）',
  how_follow: '分析后续走势和应对策略',
  market_view: '整理市场各方观点和评论',
};

// 内容子类型映射
const CONTENT_SUBTYPE_PROMPTS: Record<ContentSubType, string> = {
  beginner_start: '新手入门，开户指南和基础认知',
  tool_knowledge: '工具认知，ETF、指数、交易规则等',
  platform_compare: '平台对比，券商和交易平台差异说明',
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
  custom: '自定义风格',
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
  const personas: Record<PersonaType, { keywords: string; tone: string; template: string }> = {
    hardcore_uncle: {
      keywords: '专业、理性、数据说话',
      tone: '像老朋友在茶馆聊投资，严肃但不刻板，可以略带批判性',
      template: '「说实话，这个数据我看了都替大家着急...」「说实话，这种走势见太多了...」',
    },
    sweet_girl: {
      keywords: '可爱、亲切、通俗易懂',
      tone: '像闺蜜在咖啡厅分享理财心得，温柔提醒',
      template: '「姐妹们！今天要跟大家分享一个超实用的小技巧...」「我觉得吧，这个真的超重要...」',
    },
    veteran_trader: {
      keywords: '经验丰富、接地气、真诚',
      tone: '像老股民在证券大厅跟你唠嗑，分享真实教训',
      template: '「我在这个市场摸爬滚打十几年，这种走势见太多了...」「说实话，当年我也踩过这个坑...」',
    },
    finance_scholar: {
      keywords: '专业术语、逻辑清晰、严谨',
      tone: '像大学教授在讲解投资课，深入浅出',
      template: '「从宏观经济的角度来看...」「这个指标的变化意味着...」',
    },
    roaster: {
      keywords: '幽默、犀利、敢说真话',
      tone: '像在饭局上吐槽行业内幕，一针见血',
      template: '「说实话，看到这个消息我第一反应是：又来割韭菜了？」「你们品，细品...」',
    },
    custom: {
      keywords: customPersona || '专业理财博主',
      tone: '真诚分享，像朋友聊天',
      template: '',
    },
  };
  
  const p = personas[personaType];
  return `博主人设：${p.keywords}
语气风格：${p.tone}
${p.template ? `参考话术：${p.template}` : ''}

【原生感要求 - 非常重要】
- 开头用真实场景切入：「最近发现...」「前几天和朋友聊到...」「我最近在研究...」
- 中间穿插个人感受：「说实话，我当时也没看懂」「我试了一下，发现...」
- 结尾自然互动：「你们怎么看？」「评论区聊聊」
- 避免官方腔调，不要说"欢迎关注""点击了解更多"
- 风险提示用自然语气：「当然投资有风险，大家还是要根据自己的情况来」`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topicType, userTag, contentType, keywords,
      analysisTarget, analysisTargetInput, contentDepth, focusDirections,
      contentSubType, platformCompare, includeExample, includeResearch,
      videoDuration, videoStyle, enableImageSuggestion,
      titleStyles, customTitleStyle, personaType, customPersona,
      additionalRequirements, customRequirement,
      hotTopicInfo,
    } = body;

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const isVideo = contentType === 'video_script';
    const isAnalysisType = topicType === 'market_hot' || topicType === 'professional_analysis';

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedContent = '';
        
        try {
          // 1. 生成标题候选
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成标题...' })}\n\n`));
          const titles = await generateTitles(
            topicType, userTag, contentType, keywords, hotTopicInfo,
            titleStyles, customTitleStyle, personaType, customPersona,
            analysisTarget, analysisTargetInput, contentSubType, platformCompare
          );
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'titles', data: titles })}\n\n`));

          // 2. 生成正文/脚本
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成内容...' })}\n\n`));
          
          const contentStream = await generateContentStream(
            topicType, userTag, contentType, keywords, hotTopicInfo,
            titles, additionalRequirements, customRequirement,
            videoDuration, videoStyle, personaType, customPersona,
            // 动态配置
            isAnalysisType, analysisTarget, analysisTargetInput, contentDepth, focusDirections,
            contentSubType, platformCompare, includeExample, includeResearch
          );
          
          for await (const chunk of contentStream) {
            accumulatedContent += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`));
          }

          // 3. 生成标签
          const tags = await generateTags(topicType, keywords, titles[0]?.title || '', accumulatedContent);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`));

          // 4. 生成配图
          if (enableImageSuggestion || isVideo) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图...' })}\n\n`));
            const imageUrls = await generateImages(titles[0]?.title || '', accumulatedContent, customHeaders);
            if (imageUrls.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'images', data: imageUrls })}\n\n`));
            }
          }

          // 5. 合规审查
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在进行合规审查...' })}\n\n`));
          const complianceResult = await callComplianceCheck(titles[0]?.title || '', accumulatedContent, tags.join(' '));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'compliance', data: complianceResult })}\n\n`));

          // 6. 音乐推荐（仅视频）
          if (isVideo) {
            const musicRecommendations = await generateMusicRecommendations(accumulatedContent, videoStyle);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'music', data: musicRecommendations })}\n\n`));
          }

          // 7. 种草力评分
          const engagementScore = await calculateEngagementScore(titles[0]?.title || '', accumulatedContent, tags);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'engagement_score', data: engagementScore })}\n\n`));

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

// 生成标题
async function generateTitles(
  topicType: TopicType, userTag: UserTag, contentType: ContentType,
  keywords?: string, hotTopicInfo?: string,
  titleStyles?: TitleStyle[], customTitleStyle?: string,
  personaType?: PersonaType, customPersona?: string,
  analysisTarget?: AnalysisTarget, analysisTargetInput?: string,
  contentSubType?: ContentSubType, platformCompare?: string
): Promise<TitleCandidate[]> {
  let styleGuides = '';
  if (titleStyles && titleStyles.length > 0) {
    const nonCustomStyles = titleStyles.filter(s => s !== 'custom');
    styleGuides = nonCustomStyles.map(s => TITLE_STYLE_PROMPTS[s]).join('；');
    if (titleStyles.includes('custom') && customTitleStyle) {
      styleGuides += `；自定义风格：${customTitleStyle}`;
    }
  }
  if (!styleGuides) styleGuides = '选择最适合的风格';

  const personaPrompt = personaType ? getPersonaPrompt(personaType, customPersona) : '';
  
  // 根据选题类型添加上下文
  let contextInfo = '';
  if (analysisTarget && analysisTargetInput) {
    contextInfo = `分析对象：${ANALYSIS_TARGET_PROMPTS[analysisTarget]} - ${analysisTargetInput}`;
  }
  if (contentSubType === 'platform_compare' && platformCompare) {
    contextInfo = `对比平台：${platformCompare}`;
  }

  const prompt = `你是小红书爆款标题专家。请为以下场景生成3个吸引人的标题：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
内容形式：${contentType === 'article' ? '图文内容' : '视频脚本'}
${keywords ? `关键词：${keywords}` : ''}
${contextInfo ? contextInfo : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo.substring(0, 500)}` : ''}

标题风格：${styleGuides}
${personaPrompt}

【标题要求】
1. 生成3个不同风格的标题，用数字1/2/3标号
2. 每个标题使用1-2个emoji
3. 标题长度20-30字
4. 避免夸张虚假宣传
5. 要有博主个人风格，像真实分享

输出格式：
1. [标题一]
2. [标题二]
3. [标题三]`;

  const response = await callLLM(prompt);
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
  topicType: TopicType, userTag: UserTag, contentType: ContentType,
  keywords?: string, hotTopicInfo?: string, titles?: TitleCandidate[],
  additionalRequirements?: AdditionalRequirement[], customRequirement?: string,
  videoDuration?: VideoDuration, videoStyle?: VideoStyle,
  personaType?: PersonaType, customPersona?: string,
  isAnalysisType?: boolean, analysisTarget?: AnalysisTarget, analysisTargetInput?: string,
  contentDepth?: ContentDepth, focusDirections?: FocusDirection[],
  contentSubType?: ContentSubType, platformCompare?: string,
  includeExample?: boolean, includeResearch?: boolean
): AsyncGenerator<string> {
  const isVideo = contentType === 'video_script';
  const selectedTitle = titles?.[0]?.title || '';
  const personaPrompt = personaType ? getPersonaPrompt(personaType, customPersona) : '';

  // 构建补充要求
  let requirementPrompts = '';
  if (additionalRequirements && additionalRequirements.length > 0) {
    const nonCustomReqs = additionalRequirements.filter(r => r !== 'custom');
    requirementPrompts = nonCustomReqs.map(r => ADDITIONAL_REQUIREMENT_PROMPTS[r]).join('\n');
    if (additionalRequirements.includes('custom') && customRequirement) {
      requirementPrompts += `\n${customRequirement}`;
    }
  }

  // 动态配置提示
  let dynamicPrompt = '';
  if (isAnalysisType && analysisTarget) {
    dynamicPrompt = `
【分析配置】
- 分析对象：${ANALYSIS_TARGET_PROMPTS[analysisTarget]}${analysisTargetInput ? ` - ${analysisTargetInput}` : ''}
- 内容深度：${contentDepth ? CONTENT_DEPTH_PROMPTS[contentDepth] : '逻辑分析'}
- 重点关注：${focusDirections ? focusDirections.map(f => FOCUS_DIRECTION_PROMPTS[f]).join('；') : '综合分析'}`;
  } else if (contentSubType) {
    dynamicPrompt = `
【内容配置】
- 内容子类型：${CONTENT_SUBTYPE_PROMPTS[contentSubType]}
${contentSubType === 'platform_compare' && platformCompare ? `- 对比平台：${platformCompare}` : ''}
${includeExample ? '- 需要举例说明' : ''}
${includeResearch ? '- 需要引用研报' : ''}`;
  }

  let prompt = '';
  
  if (isVideo) {
    const durationGuide: Record<VideoDuration, string> = {
      '15s': '15秒，约40-60字，1-2个镜头',
      '30s': '30秒，约80-100字，2-3个镜头',
      '60s': '60秒，约180-220字，3-5个镜头',
      '90s': '90秒，约280-320字，5-7个镜头',
    };
    
    prompt = `你是短视频脚本专家。生成一个专业级的视频脚本，包含详细的画面描述：

标题：${selectedTitle}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo.substring(0, 800)}` : ''}

时长：${durationGuide[videoDuration || '60s']}
风格：${VIDEO_STYLE_PROMPTS[videoStyle || 'popular_science']}
${dynamicPrompt}
${personaPrompt}
${requirementPrompts ? `补充要求：\n${requirementPrompts}` : ''}

【脚本格式 - 每个镜头包含】
【画面】：详细的镜头描述，包括：
  - 景别：远景/全景/中景/近景/特写
  - 构图：人物位置、背景元素
  - 空镜素材：如需要穿插空镜（如城市、咖啡厅、办公场景等）
  - 动作：人物的具体动作
【文案】：口播台词（要有博主个人风格）
【时长】：X秒
【备注】：拍摄建议（可选）

【画面描述示例】
- "【近景】博主坐在书房，面前放着一杯咖啡，手拿笔记本，背景是书架，自然光线"
- "【特写】手机屏幕展示K线图，手指滑动查看走势"
- "【空镜】城市天际线延时摄影，傍晚时分，车水马龙"
- "【中景】博主站在白板前，正在画简单的示意图，表情认真"
- "【远景】咖啡厅外景，阳光透过玻璃窗，温馨氛围"

【原生感要求】
- 开头：「哈喽大家好，今天想和大家聊点实在的...」「最近好多朋友问我...」
- 中间：「说实话...」「我当时第一反应是...」
- 结尾：「以上就是今天的分享，觉得有用的话点个赞」「评论区聊聊你们的看法」

直接输出完整脚本：`;
  } else {
    prompt = `你是小红书博主，生成一篇真实、有价值的图文内容：

标题：${selectedTitle}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `最新资讯：\n${hotTopicInfo.substring(0, 800)}` : ''}

${dynamicPrompt}
${personaPrompt}
${requirementPrompts ? `补充要求：\n${requirementPrompts}` : ''}

【结构要求】
- 开头：用真实场景切入，「最近发现...」「前几天和朋友聊到...」
- 中间：分点展开，每段不超过4行，可适当使用emoji
- 结尾：总结观点 + 自然互动，「你们怎么看？」

【合规要求】
- 避免"保证收益"、"稳赚不赔"等违规词
- 不推荐具体股票代码
- 风险提示用自然语气：「当然投资有风险，大家还是要根据自己的情况来」

直接输出正文：`;
  }

  const stream = await callLLMStream(prompt);
  for await (const chunk of stream) {
    yield chunk;
  }
}

// 生成标签
async function generateTags(topicType: TopicType, keywords?: string, title?: string, content?: string): Promise<string[]> {
  const prompt = `你是小红书SEO专家。生成6-8个热门标签：

选题：${TOPIC_TYPE_PROMPTS[topicType]}
${title ? `标题：${title}` : ''}
${keywords ? `关键词：${keywords}` : ''}

要求：
1. 热门、有流量
2. 混合大类标签和精准标签
3. 只输出标签文本，逗号分隔`;

  const response = await callLLM(prompt);
  return response.split(/[,，、\n]/).map((tag) => tag.trim().replace(/^#/, '')).filter((tag) => tag.length > 0 && tag.length < 15);
}

// 生成配图
async function generateImages(title: string, content: string, customHeaders?: Record<string, string>): Promise<string[]> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const imagePrompts = [
      `Professional financial infographic, clean data visualization, business growth, blue and white, modern minimalist, NO TEXT, NO WORDS`,
      `Modern investment scene, laptop with charts, warm lighting, professional atmosphere, lifestyle photography, NO TEXT, NO WORDS`,
      `Abstract growth visualization, geometric shapes, blue to green gradient, clean modern design, NO TEXT, NO WORDS`,
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

// 计算种草力评分
async function calculateEngagementScore(title: string, content: string, tags: string[]): Promise<{ score: number; reasons: string[]; suggestions: string[] }> {
  const prompt = `你是小红书内容专家。评估以下内容的"种草力"：

标题：${title}
正文：${content.substring(0, 500)}
标签：${tags.join('、')}

从以下维度评估（总分10分）：
1. 标题吸引力（是否有悬念、数据、情感共鸣）
2. 内容价值（是否实用、有干货）
3. 情感共鸣（是否有真实感、代入感）
4. 互动引导（是否有评论引导）

输出JSON格式：
{
  "score": 数字(1-10),
  "reasons": ["优点1", "优点2"],
  "suggestions": ["改进建议1", "改进建议2"]
}`;

  try {
    const response = await callLLM(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Engagement score error:', error);
  }
  
  return { score: 7, reasons: ['内容结构清晰'], suggestions: ['可增加更多互动引导'] };
}

// 生成音乐推荐（视频内容）
async function generateMusicRecommendations(content: string, videoStyle?: VideoStyle): Promise<string[]> {
  const styleContext = videoStyle ? `视频风格：${VIDEO_STYLE_PROMPTS[videoStyle]}` : '';
  
  const prompt = `你是短视频音乐推荐专家。根据以下视频内容推荐3-5首适合的背景音乐：

视频内容：
${content.substring(0, 500)}

${styleContext}

【推荐要求】
1. 推荐抖音/小红书热门BGM
2. 标注歌曲名和歌手
3. 简要说明推荐理由（情绪匹配度）
4. 音乐风格要与财经内容搭配，不要过于娱乐化

输出格式（每行一首）：
1. 歌曲名 - 歌手：推荐理由`;

  try {
    const response = await callLLM(prompt);
    const lines = response.split('\n').filter(l => l.trim() && /^\d+/.test(l.trim()));
    return lines.slice(0, 5);
  } catch (error) {
    console.error('Music recommendation error:', error);
    return [
      '1. 轻快商务风BGM - 适合科普讲解类内容',
      '2. 城市夜景氛围曲 - 适合深度分析类内容',
      '3. 每日财经早报曲 - 经典财经节目配乐',
    ];
  }
}
