import { NextRequest } from 'next/server';
import { TopicType, PersonaType, TitleCandidate, ContentType } from '@/lib/types';
import { callLLM, callLLMStream, callComplianceCheck } from '@/lib/llm';
import { PERSONA_STYLE_CONFIG } from '@/lib/constants';
import { buildScenarioPrompt, buildToolReviewContent, SCENARIO_PROMPTS } from '@/lib/scenario-prompts';
import { toXiaoHongShuFormat } from '@/lib/format-adapter';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪',
  beginner_guide: '小白科普',
  life_lifestyle: '生活化种草',
  tool_review: '工具测评',
};

// 内容类型映射
const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  article: '图文内容',
  video_script: '视频脚本',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topicType,
      contentType,
      keywords,
      deepAnalysis,
      personaType,
      hotTopicInfo,
      hotTop3Tags,
      selectedTitle,
      generateOnlyTitles,
    } = body as {
      topicType: TopicType;
      contentType?: ContentType;
      keywords?: string;
      deepAnalysis?: boolean;
      personaType?: string;
      hotTopicInfo?: string;
      hotTop3Tags?: string[];
      selectedTitle?: string;
      generateOnlyTitles?: boolean;
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedContent = '';
        let isClosed = false;

        const safeEnqueue = (data: string) => {
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(data));
              return true;
            } catch (e) {
              isClosed = true;
              return false;
            }
          }
          return false;
        };

        const closeStream = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (e) {}
          }
        };

        try {
          // 获取人设风格配置
          const styleConfig = PERSONA_STYLE_CONFIG[personaType as keyof typeof PERSONA_STYLE_CONFIG] || PERSONA_STYLE_CONFIG.custom;
          const scenario = SCENARIO_PROMPTS[topicType];

          // 1. 生成标题
          safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成标题...' })}\n\n`);
          const titles = await generateTitles(
            topicType, keywords, hotTop3Tags, hotTopicInfo, personaType, styleConfig, scenario
          );
          safeEnqueue(`data: ${JSON.stringify({ type: 'titles', data: titles })}\n\n`);

          // 如果只是生成标题
          if (generateOnlyTitles) {
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '标题已生成，请选择标题' })}\n\n`);
            closeStream();
            return;
          }

          // 2. 生成正文
          const usedTitle = selectedTitle || titles[0]?.title || '';
          const effectiveContentType = contentType || 'article';
          safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成内容...' })}\n\n`);

          const contentStream = await generateContentStream(
            topicType, effectiveContentType, keywords, deepAnalysis, hotTopicInfo, hotTop3Tags, usedTitle, personaType, styleConfig
          );

          for await (const chunk of contentStream) {
            if (isClosed) break;
            // 应用小红书格式过滤（去除 Markdown 符号）
            const filteredChunk = toXiaoHongShuFormat(chunk);
            accumulatedContent += filteredChunk;
            if (!safeEnqueue(`data: ${JSON.stringify({ type: 'content', data: filteredChunk })}\n\n`)) {
              break;
            }
          }

          if (isClosed) {
            closeStream();
            return;
          }

          // 3. 生成标签
          safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成标签...' })}\n\n`);
          const tags = await generateTags(topicType, keywords, usedTitle, accumulatedContent);
          safeEnqueue(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`);

          // 4. 生成配图
          safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图建议...' })}\n\n`);
          const imageUrls = await generateImages(usedTitle, accumulatedContent);
          if (imageUrls.length > 0) {
            safeEnqueue(`data: ${JSON.stringify({ type: 'images', data: imageUrls })}\n\n`);
          }

          // 5. 合规审查
          safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在进行合规审查...' })}\n\n`);
          const complianceResult = await callComplianceCheck(usedTitle, accumulatedContent, tags.join(' '));

          if (complianceResult.fixedContent) {
            safeEnqueue(`data: ${JSON.stringify({
              type: 'compliance',
              data: {
                ...complianceResult,
                autoFixed: true
              }
            })}\n\n`);
          } else {
            safeEnqueue(`data: ${JSON.stringify({ type: 'compliance', data: complianceResult })}\n\n`);
          }

          // 6. 种草力评分
          const engagementScore = await calculateEngagementScore(titles[0]?.title || '', accumulatedContent, tags);
          safeEnqueue(`data: ${JSON.stringify({ type: 'engagement_score', data: engagementScore })}\n\n`);

          closeStream();
        } catch (error) {
          console.error('Stream error:', error);
          closeStream();
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
    return Response.json({ error: '生成失败' }, { status: 500 });
  }
}

// 生成标题
async function generateTitles(
  topicType: TopicType,
  keywords?: string,
  hotTop3Tags?: string[],
  hotTopicInfo?: string,
  personaType?: string,
  styleConfig?: { titleStyle: string; tone: string; emojiDensity: string },
  scenario?: typeof SCENARIO_PROMPTS[keyof typeof SCENARIO_PROMPTS]
): Promise<TitleCandidate[]> {
  const topicLabel = TOPIC_TYPE_PROMPTS[topicType] || '通用内容';
  const persona = personaType || 'custom';
  const config = styleConfig || PERSONA_STYLE_CONFIG.custom;
  const scenarioConfig = scenario || SCENARIO_PROMPTS[topicType];

  // 根据场景构建标题生成的特殊指导
  const hookGuide = scenarioConfig?.hook || '吸引眼球的标题';

  const prompt = `【小红书标题生成】

请为以下场景生成3个符合要求的爆款标题。

## 场景信息
- 选题类型：${topicLabel}
- 创作者人设：${persona}
- 标题风格：${config.titleStyle}
- 语气：${config.tone}

## Hook设计指导
${hookGuide}

## 内容要素
- 关键词：${keywords || '未指定'}
${hotTop3Tags?.length ? `- 热门标签：${hotTop3Tags.join('、')}` : ''}
${hotTopicInfo ? `- 热点背景：\n${hotTopicInfo.substring(0, 200)}` : ''}

## 标题要求
1. 长度：≤20字（不含emoji）
2. 必须包含：1-3个emoji
3. 风格类型：${config.titleStyle}
4. 必须有吸引力，引发好奇或共鸣

## 输出格式
直接输出3个标题，每行一个，格式为"emoji 标题内容"，不要编号，不要其他说明：

`;

  const response = await callLLM(prompt);
  const lines = response.split('\n').filter(l => l.trim() && !l.match(/^\d+[.、：:]/));
  const titles: TitleCandidate[] = [];

  for (const line of lines) {
    const cleaned = line.trim();
    if (cleaned && cleaned.length > 0) {
      titles.push({
        title: cleaned,
        style: config.titleStyle as TitleCandidate['style'],
      });
    }
    if (titles.length >= 3) break;
  }

  // 如果没有生成足够标题，提供默认
  if (titles.length === 0) {
    titles.push({
      title: `📈 ${keywords || '市场热点解读'}`,
      style: config.titleStyle as TitleCandidate['style'],
    });
  }

  return titles.slice(0, 3);
}

// 生成内容（流式）
async function generateContentStream(
  topicType: TopicType,
  contentType: ContentType,
  keywords?: string,
  deepAnalysis?: boolean,
  hotTopicInfo?: string,
  hotTop3Tags?: string[],
  selectedTitle?: string,
  personaType?: string,
  styleConfig?: { tone: string; emojiDensity: string; titleStyle: string }
): Promise<AsyncGenerator<string>> {
  // 使用场景化Prompt，并根据内容类型调整
  const prompt = buildScenarioPrompt({
    topicType,
    contentType,
    keywords,
    deepAnalysis,
    selectedTitle,
    personaType,
    hotTopicInfo,
    hotTop3Tags,
  });

  const stream = await callLLMStream(prompt);
  return stream;
}

// 生成标签
async function generateTags(
  topicType: TopicType,
  keywords?: string,
  title?: string,
  content?: string
): Promise<string[]> {
  const prompt = `根据以下内容生成5个小红书标签（不含#号）：

类型：${TOPIC_TYPE_PROMPTS[topicType]}
关键词：${keywords || ''}
标题：${title || ''}
内容摘要：${content?.substring(0, 200) || ''}

要求：简洁、有热度、符合小红书风格。直接输出5个标签，用逗号分隔，不要其他内容。`;

  const response = await callLLM(prompt);
  return response.split(/[,，、\n]/)
    .map(t => t.trim())
    .filter(t => t && t.length <= 10)
    .slice(0, 5);
}

// 生成配图建议
async function generateImages(title: string, content: string): Promise<string[]> {
  // 返回占位图片，实际使用时可调用图片生成服务
  return [
    `https://picsum.photos/seed/${encodeURIComponent(title)}/400/300`,
    `https://picsum.photos/seed/${encodeURIComponent(title + '2')}/400/300`,
  ];
}

// 种草力评分
async function calculateEngagementScore(
  title: string,
  content: string,
  tags: string[]
): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 7; // 默认7分

  // 标题评估
  if (title.length <= 20) {
    reasons.push('标题长度适中');
    score += 0.5;
  }
  if (/[\u{1F300}-\u{1F9FF}]/u.test(title)) {
    reasons.push('标题包含emoji');
    score += 0.5;
  }

  // 内容评估
  if (content.length >= 800) {
    reasons.push('内容字数充足');
    score += 0.5;
  }
  if (content.includes('风险')) {
    reasons.push('包含风险提示');
  }
  if (content.includes('微信搜索') || content.includes('微证券')) {
    reasons.push('包含引导关注');
  }

  // 标签评估
  if (tags.length >= 3) {
    reasons.push('标签丰富');
    score += 0.5;
  }

  // 确保分数在10以内
  score = Math.min(10, Math.max(1, score));

  return { score: parseFloat(score.toFixed(1)), reasons };
}
