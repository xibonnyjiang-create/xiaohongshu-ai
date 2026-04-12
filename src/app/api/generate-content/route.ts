import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType, VideoDuration, VideoStyle } from '@/lib/types';
import { callLLMStream, buildStructuredPrompt, callComplianceFix } from '@/lib/llm';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪',
  beginner_guide: '小白科普',
  advanced_invest: '进阶投资',
  professional_analysis: '专业分析',
};

// 用户层级映射
const USER_TAG_DISPLAY: Record<UserTag, string> = {
  nubie: '投资新手',
  active_trader: '进阶交易者',
  professional: '专业投资者',
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

    // 构建结构化提示词
    const structuredPrompt = buildStructuredPrompt({
      topicType: TOPIC_TYPE_PROMPTS[topicType],
      userTag: USER_TAG_DISPLAY[userTag],
      title,
      keywords,
      hotTopicInfo,
      contentType: isVideo ? 'video_script' : 'article',
    });

    // 添加额外要求
    let finalPrompt = structuredPrompt;
    if (additionalRequirements && additionalRequirements.length > 0) {
      finalPrompt += `\n\n【用户额外要求】\n${additionalRequirements.join('\n')}`;
    }

    // 流式调用 LLM
    const stream = await callLLMStream(finalPrompt);
    const encoder = new TextEncoder();
    
    // 用于收集完整内容进行合规检查
    let fullContent = '';
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // 首先发送开始信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));
          
          for await (const chunk of stream) {
            fullContent += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          
          // 流式结束后进行合规静默拦截
          if (fullContent.trim()) {
            const { fixedTitle, fixedContent, wasModified } = await performComplianceFix(fullContent, title);
            
            // 发送合规修正结果
            controller.enqueue(encoder.encode(`\n\ndata: ${JSON.stringify({ 
              type: 'compliance_check',
              wasModified,
              fixedTitle,
              fixedContent: fixedContent.substring(0, 500) // 只发送前500字预览
            })}\n\n`));
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
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

// 合规静默拦截处理
async function performComplianceFix(
  rawContent: string,
  originalTitle?: string
): Promise<{ fixedTitle: string; fixedContent: string; wasModified: boolean }> {
  try {
    // 解析原始输出
    let title = originalTitle || '';
    let content = rawContent;

    // 尝试从内容中提取标题（如果原始内容包含）
    const titleMatch = rawContent.match(/^[^\n]{1,20}$/);
    if (titleMatch && !originalTitle) {
      // 使用第一行作为标题
      title = titleMatch[0].trim();
      content = rawContent.substring(title.length).trim();
    }

    // 执行合规检查与修正
    const result = await callComplianceFix(title, content);

    return {
      fixedTitle: result.fixedTitle || title,
      fixedContent: result.fixedContent || content,
      wasModified: result.wasModified,
    };
  } catch (error) {
    console.error('Compliance fix error:', error);
    return {
      fixedTitle: originalTitle || '',
      fixedContent: rawContent,
      wasModified: false,
    };
  }
}
