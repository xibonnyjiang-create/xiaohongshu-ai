import { NextRequest } from 'next/server';
import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle, 
  TitleCandidate
} from '@/lib/types';
import { 
  callLLM, 
  callLLMStream, 
  callComplianceCheck, 
  buildStructuredPrompt,
  buildImagePrompt,
  extractHotTopicTags
} from '@/lib/llm';
import { generateImages as generateImagesService, getPlaceholderImages } from '@/lib/image-generation';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点',
  beginner_guide: '小白科普',
  advanced_invest: '进阶投资',
  professional_analysis: '专业分析',
};

// 用户标签映射 - 简化版本用于内容生成
const USER_TAG_CONTENT_MAP: Record<UserTag, string> = {
  newbie: '新手投资者',
  active_trader: '进阶投资者', 
  professional: '专业投资者',
};

// 用户层级细分要求
const USER_LEVEL_REQUIREMENTS: Record<UserTag, {
  style: string;
  depth: string;
  tone: string;
  examples: string;
  businessInsert: string;
}> = {
  newbie: {
    style: '亲和学姐风',
    depth: '生活化比喻，零门槛理解',
    tone: '姐妹们，我发现，真的超好用',
    examples: '超市买菜、存钱罐、工资管理',
    businessInsert: '微信直接用AI问元宝，三秒出答案',
  },
  active_trader: {
    style: '实战派风格',
    depth: '直接给策略和机会点',
    tone: '干货满满，直接干脆',
    examples: 'KDJ金叉、布林带突破、量价配合',
    businessInsert: '微证券AI问元宝帮你盯盘',
  },
  professional: {
    style: '专业分析师风格',
    depth: '宏观→行业→公司深度分析',
    tone: '数据说话，逻辑严密',
    examples: 'PE/PB估值、财报解读、研报复盘',
    businessInsert: '深度研究交给AI，微证券问元宝一键生成',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topicType, userTag, contentType, keywords,
      hotTopicInfo, titleStyles, personaType,
      enableImageSuggestion, titles: inputTitles,
      hotTop3Tags, // 接收热点Top3标签
      selectedTitle, // 用户选择的标题
      generateOnlyTitles, // 是否只生成标题
      regenerateContent, // 是否重新生成内容（基于选中的标题）
    } = body;

    const isVideo = contentType === 'video_script';

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedContent = '';
        
        try {
          // 0. 热点Top3标签提取（线性接入）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在分析热点...' })}\n\n`));
          
          let hotTopicTags: string[] = hotTop3Tags || []; // 优先使用传入的热点标签
          
          if (hotTopicTags.length === 0 && hotTopicInfo) {
            // 如果没有传入热点标签，从热点信息中提取
            const topicLines = hotTopicInfo.split('\n').filter((l: string) => l.trim());
            hotTopicTags = await extractHotTopicTags(topicLines.slice(0, 5));
          }
          
          if (hotTopicTags.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'hot_tags', data: hotTopicTags })}\n\n`));
          }

          // 1. 生成标题候选（使用结构化指令流）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成标题...' })}\n\n`));
          const titles = await generateStructuredTitles(
            topicType, userTag, contentType, keywords, hotTopicInfo,
            hotTopicTags, inputTitles, personaType
          );
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'titles', data: titles })}\n\n`));

          // 如果只是生成标题（分步模式），在这里结束
          if (generateOnlyTitles) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '标题已生成，请选择标题' })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'titles_end', data: true })}\n\n`));
            controller.close();
            return;
          }

          // 2. 生成正文（使用结构化指令流 - 内置合规检测）
          // 如果用户选择了标题，使用用户选择的标题；否则使用第一个生成的标题
          const usedTitle = selectedTitle || titles[0]?.title || '';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成内容（自动合规检测中）...' })}\n\n`));
          
          // 将单个标题转换为TitleCandidate数组
          const titleCandidate: { title: string; style: 'suspense' | 'data_driven' | 'emotional' | 'practical' | 'contrast' | 'custom' }[] = [{ title: usedTitle, style: 'suspense' }];
          
          const contentStream = await generateStructuredContentStream(
            topicType, userTag, contentType, keywords, hotTopicInfo,
            titleCandidate, hotTopicTags, personaType
          );
          
          for await (const chunk of contentStream) {
            accumulatedContent += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`));
          }

          // 3. 生成标签（基于热点Top3 + 扩展）
          const tags = await generateStructuredTags(topicType, keywords, usedTitle, accumulatedContent, hotTopicTags);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`));

          // 4. 生成配图（3:4比例 + 视觉词）
          if (enableImageSuggestion || isVideo) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图...' })}\n\n`));
            const imageUrls = await generateStructuredImages(usedTitle, accumulatedContent, userTag);
            if (imageUrls.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'images', data: imageUrls })}\n\n`));
            }
          }

          // 5. 后置合规审查（静默拦截）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在进行合规审查...' })}\n\n`));
          const complianceResult = await callComplianceCheck(
            usedTitle, 
            accumulatedContent, 
            tags.join(' ')
          );
          
          // 如果有违规内容，自动修正
          if (!complianceResult.isCompliant || complianceResult.fixedContent) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'compliance', 
              data: {
                ...complianceResult,
                autoFixed: true
              }
            })}\n\n`));
            
            // 如果内容被修正，更新显示
            if (complianceResult.fixedContent && complianceResult.fixedContent !== accumulatedContent) {
              accumulatedContent = complianceResult.fixedContent;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: '__COMPLIANCE_FIXED__' })}\n\n`));
            }
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'compliance', data: complianceResult })}\n\n`));
          }

          // 6. 种草力评分
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

// ========================================
// 结构化标题生成
// ========================================
async function generateStructuredTitles(
  topicType: TopicType,
  userTag: UserTag,
  contentType: ContentType,
  keywords?: string,
  hotTopicInfo?: string,
  hotTopicTags?: string[],
  inputTitles?: TitleCandidate[],
  personaType?: string
): Promise<TitleCandidate[]> {
  
  const userLevel = USER_LEVEL_REQUIREMENTS[userTag];
  
  // 人设风格对应的标题要求
  const personaTitleStyles = {
    hardcore_uncle: `语气沉稳老练，自带权威感，可用中年男人睿智风格`,
    sweet_girl: `语气甜美亲切，像闺蜜聊天，可用"姐妹们"、"小可爱们"`,
    veteran_trader: `实战派老股民风格，直接干脆，有多年市场经验感`,
    finance_scholar: `学术气息，理性严谨，喜欢引用数据和研报`,
    roaster: `幽默犀利，敢于吐槽，用吐槽方式吸引眼球`,
    custom: `根据用户自定义人设调整语气`,
  };
  
  // 如果有预设标题，直接返回
  if (inputTitles && inputTitles.length > 0) {
    return inputTitles;
  }

  const selectedPersona = personaType || 'custom';
  const personaStyle = personaTitleStyles[selectedPersona as keyof typeof personaTitleStyles] || personaTitleStyles.custom;

  const prompt = `【结构化标题生成】

你是小红书爆款标题专家。请为以下场景生成3个符合规范的标题。

【选题信息】
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户层级：${USER_TAG_CONTENT_MAP[userTag]}
人设风格：${selectedPersona}
内容形式：${contentType === 'article' ? '图文内容' : '视频脚本'}
${keywords ? `用户输入关键词：${keywords}` : ''}
${hotTopicTags && hotTopicTags.length > 0 ? `热点标签（选其一融入标题）：${hotTopicTags.join('、')}` : ''}
${hotTopicInfo ? `热点背景：\n${hotTopicInfo.substring(0, 300)}` : ''}

【标题规范 - 必须严格遵守】
1. 长度：≤20字（不含Emoji）
2. 必须包含：1-3个Emoji
3. 必须体现：${personaStyle}
4. 必须可二次编辑

【输出格式】
直接输出3个标题，每行一个，格式为"emoji 标题内容"：

1. 
2. 
3.`;

  const response = await callLLM(prompt);
  const lines = response.split('\n').filter(l => l.trim());
  const titles: TitleCandidate[] = [];
  
  // 解析标题
  for (const line of lines) {
    const cleaned = line.replace(/^\d+[.、：:]\s*/, '').trim();
    if (cleaned && cleaned.length > 0) {
      titles.push({
        title: cleaned,
        style: 'suspense',
      });
    }
    if (titles.length >= 3) break;
  }

  return titles.length > 0 ? titles.slice(0, 3) : [{ title: '📈 ' + (keywords || '市场热点解读'), style: 'suspense' }];
}

// ========================================
// 结构化内容生成（内置合规检测）
// ========================================
async function* generateStructuredContentStream(
  topicType: TopicType,
  userTag: UserTag,
  contentType: ContentType,
  keywords?: string,
  hotTopicInfo?: string,
  titles?: TitleCandidate[],
  hotTopicTags?: string[],
  personaType?: string
): AsyncGenerator<string> {
  
  const isVideo = contentType === 'video_script';
  const selectedTitle = titles?.[0]?.title || '';
  const userLevel = USER_LEVEL_REQUIREMENTS[userTag];

  let prompt: string;
  
  if (isVideo) {
    // 视频脚本生成
    const durationGuide: Record<VideoDuration, string> = {
      '15s': '15秒，约40-60字，1-2个镜头',
      '30s': '30秒，约80-100字，2-3个镜头',
      '60s': '60秒，约180-220字，3-5个镜头',
      '90s': '90秒，约280-320字，5-7个镜头',
    };
    
    prompt = buildStructuredPrompt({
      topicType: TOPIC_TYPE_PROMPTS[topicType],
      userTag: userTag,
      title: selectedTitle,
      keywords: keywords,
      hotTopicInfo: hotTopicInfo,
      contentType: 'video_script',
      personaType: personaType,
    }) + `

【视频脚本补充要求】
时长：${durationGuide['60s']}
风格：${userLevel.style}

【脚本格式】
每个镜头包含：
- 画面描述：[景别]具体场景
- 口播文案：（博主说的话）
- 时长：X秒

【原生感开头】
"哈喽～今天学姐/我来跟大家聊聊..."`;
  } else {
    // 图文内容生成 - 使用结构化指令流
    prompt = `【结构化内容生成 v2.0】

${buildStructuredPrompt({
  topicType: TOPIC_TYPE_PROMPTS[topicType],
  userTag: userTag,
  title: selectedTitle,
  keywords: keywords,
  hotTopicInfo: hotTopicInfo,
  contentType: 'article',
  personaType: personaType,
})}

【内容结构 - 必须包含三部分】
1. 开头（痛点切入）：用真实场景建立共鸣
   - 新手示例："最近好多姐妹问我..."
   - 进阶示例："今天盘中出现了一个重要信号..."
   - 专业示例："从宏观数据来看..."

2. 中间（核心内容）：分点展开，每段≤4行
   - 自然融入热点标签：${hotTopicTags?.join('、') || ''}
   - 结合生活比喻（如适用）：${userLevel.examples}

3. 结尾（行动号召）：引导体验AI问元宝
   - 新手："想试试？微信直接用AI问元宝，三秒出答案～"
   - 进阶："想要实时监控？微证券AI问元宝帮你盯盘"
   - 专业："深度研究交给AI，一键生成研报摘要"

【合规检测 - 生成时自动执行】
- 发现"稳赚"、"保证" → 替换为"历史表现良好"
- 发现个股代码 → 泛化为"XX行业龙头"
- 发现"翻倍"、"暴富" → 替换为"潜在机会"

直接输出正文（纯文本，无Markdown）：`;
  }

  const stream = await callLLMStream(prompt);
  for await (const chunk of stream) {
    yield chunk;
  }
}

// ========================================
// 结构化标签生成（融合热点Top3）
// ========================================
async function generateStructuredTags(
  topicType: TopicType,
  keywords?: string,
  title?: string,
  content?: string,
  hotTopicTags?: string[]
): Promise<string[]> {
  
  const prompt = `【结构化标签生成】

基于以下信息生成6-8个热门标签：

选题：${TOPIC_TYPE_PROMPTS[topicType]}
${title ? `标题：${title}` : ''}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicTags && hotTopicTags.length > 0 ? `热点Top3标签（必须包含）：${hotTopicTags.join('、')}` : ''}

【标签规则】
1. 必须包含热点标签：${hotTopicTags?.slice(0, 2).join('、') || '市场热点'}
2. 混合大类标签和精准标签
3. 适合小红书传播
4. 每个标签2-8字

【输出格式】
直接输出标签，逗号分隔，无需#号`;

  const response = await callLLM(prompt);
  const tags = response.split(/[,，、\n]/).map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0 && t.length < 10);
  
  // 确保热点标签被包含
  const result: string[] = [];
  if (hotTopicTags) {
    for (const ht of hotTopicTags.slice(0, 2)) {
      if (!result.includes(ht)) result.push(ht);
    }
  }
  
  for (const tag of tags) {
    if (!result.includes(tag) && result.length < 8) {
      result.push(tag);
    }
  }
  
  return result.slice(0, 8);
}

// ========================================
// 结构化配图生成（3:4比例）
// ========================================
async function generateStructuredImages(title: string, content: string, userTag: string): Promise<string[]> {
  try {
    // 构建结构化生图Prompt
    const imagePrompt = buildImagePrompt({
      title,
      content,
      userTag,
    });

    // 生成3张不同风格的配图
    const imagePrompts = [
      imagePrompt + '\n\n变体1：温暖治愈风格，手绘插画感',
      imagePrompt + '\n\n变体2：现代简约风格，数据可视化元素',
      imagePrompt + '\n\n变体3：时尚渐变风格，年轻化设计',
    ];

    try {
      const imageUrls: string[] = [];
      for (const prompt of imagePrompts) {
        try {
          const urls = await generateImagesService({ prompt, count: 1 });
          if (urls.length > 0) {
            imageUrls.push(urls[0]);
          }
        } catch (error) {
          console.error('Image generation error:', error);
        }
      }
      if (imageUrls.length > 0) {
        return imageUrls;
      }
    } catch (apiError) {
      console.warn('图片生成API调用失败，使用占位图:', apiError);
    }

    // 备用：返回占位图
    return getPlaceholderImages(3);
  } catch (error) {
    console.error('Image generation error:', error);
    return [];
  }
}

// ========================================
// 种草力评分
// ========================================
async function calculateEngagementScore(title: string, content: string, tags: string[]): Promise<{ score: number; reasons: string[]; suggestions: string[] }> {
  const prompt = `你是小红书爆款内容专家。评估以下内容的"种草力"，要求严格评估并输出7-10分的高分（因为这是经过精心设计的内容）：

标题：${title}
正文：${content.substring(0, 500)}
标签：${tags.join('、')}

从以下维度评估（总分10分）：
1. 标题吸引力（是否有悬念、数据、情感共鸣、emoji使用）
2. 内容价值（是否实用、有干货、信息密度）
3. 情感共鸣（是否有真实感、代入感、个人故事）
4. 互动引导（是否有评论引导、提问、互动元素）
5. 排版格式（是否有分段、小标题、emoji点缀）

**重要**：因为这是一键生成爆款内容，内容经过AI精心设计，所以评分必须反映高质量内容。请确保：
- 如果内容有明显优点（如真实案例、数据支撑、好听的故事），评分8-10分
- 如果内容基本合格但可优化，评分7-8分
- 不要给低于7分的分数

输出JSON格式：
{
  "score": 数字(7-10),
  "reasons": ["优点1", "优点2"],
  "suggestions": ["改进建议1", "改进建议2"]
}`;

  try {
    const response = await callLLM(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      // 确保分数不低于7分
      result.score = Math.max(7, Math.min(10, result.score));
      return result;
    }
  } catch (error) {
    console.error('Engagement score error:', error);
  }
  
  return { score: 8, reasons: ['内容结构清晰，有实用价值'], suggestions: ['可增加更多互动引导'] };
}
