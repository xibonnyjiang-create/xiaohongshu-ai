import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType, VideoDuration, VideoStyle, TitleStyle } from '@/lib/types';
import { callLLMStream } from '@/lib/llm';

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

// 视频风格映射
const VIDEO_STYLE_PROMPTS: Record<VideoStyle, string> = {
  popular_science: '科普风格：知识点密集，干货满满，逻辑清晰',
  roast: '吐槽风格：幽默风趣，犀利点评，敢说真话',
  suspense: '悬疑风格：设置悬念，引人入胜，层层递进',
  storytelling: '故事风格：案例为主，娓娓道来，有代入感',
  educational: '教学风格：步骤清晰，手把手教，可操作性强',
};

// 视频时长对应的内容量
const VIDEO_DURATION_GUIDE: Record<VideoDuration, string> = {
  '30s': '内容精简，只讲1个核心观点，字数约80-120字',
  '60s': '可以展开2-3个要点，字数约180-250字',
  '3min': '可以深度分析3-5个要点，字数约500-800字',
};

// 人设风格适配
function getPersonaPrompt(personaKeywords?: string): string {
  if (!personaKeywords) return '';
  return `
【博主人设】
风格定位：${personaKeywords}
写作要求：语气、称呼、表达方式都要贴合这个人设，让内容有辨识度。`;
}

// 视频脚本专用提示
function getVideoScriptPrompt(videoDuration: VideoDuration, videoStyle: VideoStyle): string {
  return `
【视频脚本结构要求】
时长：${videoDuration}，${VIDEO_DURATION_GUIDE[videoDuration]}
风格：${VIDEO_STYLE_PROMPTS[videoStyle]}

脚本需要包含以下部分（用明确的标记分隔）：

【开场钩子】(约${videoDuration === '30s' ? '3-5秒' : videoDuration === '60s' ? '5-8秒' : '10-15秒'})
- 用悬念、痛点或数据吸引注意力
- 口语化表达，像在和朋友聊天

【核心内容】(主体部分)
- 分点阐述，每个要点简洁有力
- 提供具体数据、案例或操作方法
- 镜头切换提示：【特写】【全景】【图表展示】

【结尾互动】(约${videoDuration === '30s' ? '3-5秒' : videoDuration === '60s' ? '5-10秒' : '15-20秒'})
- 总结核心观点
- 引导关注、点赞或评论互动`;
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
          // 构建内容生成提示
          const isVideo = contentType === 'video_script';
          
          const prompt = `你是一个资深的投资理财博主，在知乎、小红书有百万粉丝。请为以下场景生成一篇高质量的${isVideo ? '视频脚本' : '图文内容'}：

${title ? `标题：${title}` : ''}
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `实时热点信息（必须融入内容中）：\n${hotTopicInfo}` : ''}
${getPersonaPrompt(personaKeywords)}

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

${isVideo ? getVideoScriptPrompt(videoDuration, videoStyle) : `
3. 图文内容结构：
   - 开头：用数据/现象/痛点吸引眼球（1-2句话）
   - 中间：分3-5个要点深度解析，每个要点有理有据
   - 结尾：总结+行动建议+互动引导`}

4. 语言风格：
   - 真诚、接地气，像资深朋友在分享经验
   - 适当使用emoji增加可读性，但不要过度
   - 避免官方腔、广告腔，要有个人观点

5. 禁忌事项：
   - 严禁使用"保证收益"、"稳赚不赔"、"内幕消息"等违规词汇
   - 不要过度承诺投资回报
   - 要有风险提示意识

${hotTopicInfo ? '【重要】必须将上述实时热点信息自然融入内容中，让读者感受到时效性！' : ''}

请直接输出正文内容，不要其他说明：`;

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
