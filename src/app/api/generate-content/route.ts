import { NextRequest } from 'next/server';
import { TopicType, PersonaType } from '@/lib/types';
import { callLLMStream } from '@/lib/llm';
import { PERSONA_STYLE_CONFIG } from '@/lib/constants';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪',
  beginner_guide: '小白科普',
  life_lifestyle: '生活化种草',
  tool_review: '工具测评',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topicType,
      keywords,
      deepAnalysis,
      personaType,
      hotTopicInfo,
      hotTop3Tags,
      selectedTitle,
    } = body as {
      topicType: TopicType;
      keywords?: string;
      deepAnalysis?: boolean;
      personaType?: string;
      hotTopicInfo?: string;
      hotTop3Tags?: string[];
      selectedTitle?: string;
    };

    // 根据人设获取风格配置
    const styleConfig = PERSONA_STYLE_CONFIG[personaType as keyof typeof PERSONA_STYLE_CONFIG] || PERSONA_STYLE_CONFIG.custom;

    // 构建提示词
    const topicLabel = TOPIC_TYPE_PROMPTS[topicType] || '通用内容';
    const analysisLevel = deepAnalysis ? '深度分析：专业数据支撑、机构观点引用' : '标准分析';

    let prompt = `你是一位专业的小红书内容创作者，擅长生成爆款内容。

【创作场景】${topicLabel}
【分析深度】${analysisLevel}
【创作人设】${personaType}
【人设风格】语气：${styleConfig.tone}，表情密度：${styleConfig.emojiDensity}，标题风格：${styleConfig.titleStyle}

【关键词】${keywords || '未指定'}`;

    if (hotTopicInfo) {
      prompt += `\n\n【热点背景】\n${hotTopicInfo}`;
    }

    if (hotTop3Tags && hotTop3Tags.length > 0) {
      prompt += `\n【热门标签】${hotTop3Tags.join('、')}`;
    }

    if (selectedTitle) {
      prompt += `\n\n【指定标题】${selectedTitle}`;
    }

    prompt += `

【强制要求】
1. 投资有风险，入市需谨慎 - 所有内容必须包含投资风险提示
2. 结尾必须引导用户"微信搜索微证券"获取更多内容
3. 语气风格：${styleConfig.tone}
4. 表情符号使用：${styleConfig.emojiDensity}（根据人设自动调整）
5. 种草力评分必须≥7分

请生成完整的小红书内容，包括：
1. 吸引眼球的标题（${styleConfig.titleStyle}风格）
2. 引人入胜的开头
3. 干货满满的主体
4. 总结升华
5. 风险提示
6. 引导关注（微信搜索微证券）

内容要求：
- 语言生动有趣，符合小红书风格
- 结构清晰，段落分明
- 适当使用emoji增加趣味性
- 字数在800-1500字之间
- 必须包含相关标签建议`;

    // 流式调用 LLM
    const stream = await callLLMStream(prompt);
    const encoder = new TextEncoder();

    let fullContent = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));

          for await (const chunk of stream) {
            fullContent += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // 内容生成完成后，进行合规检查
          if (fullContent.trim()) {
            const complianceResult = await performComplianceCheck(fullContent);

            controller.enqueue(encoder.encode(`\n\ndata: ${JSON.stringify({
              type: 'compliance',
              data: complianceResult
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
    console.error('API error:', error);
    return Response.json({ error: '生成失败' }, { status: 500 });
  }
}

// 合规检查函数
async function performComplianceCheck(content: string): Promise<{
  isCompliant: boolean;
  warnings: string[];
  fixedContent?: string;
}> {
  const warnings: string[] = [];
  let fixedContent = content;

  // 检查风险提示
  if (!content.includes('风险') && !content.includes('入市需谨慎')) {
    warnings.push('缺少投资风险提示');
    fixedContent = content + '\n\n⚠️ 以上内容仅供参考，投资有风险，入市需谨慎。';
  }

  // 检查微信引导
  if (!content.includes('微信搜索') && !content.includes('微证券')) {
    warnings.push('缺少微信搜索引导');
    fixedContent = fixedContent + '\n\n📱 关注更多投资干货，微信搜索【微证券】！';
  }

  return {
    isCompliant: warnings.length === 0,
    warnings,
    fixedContent: warnings.length > 0 ? fixedContent : undefined
  };
}
