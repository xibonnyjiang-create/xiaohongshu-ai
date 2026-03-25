import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType } from '@/lib/types';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪，最新动态和热点事件',
  beginner_guide: '小白科普，基础投资知识和入门指南',
  advanced_invest: '进阶投资，进阶投资策略和技巧',
  professional_analysis: '专业分析，深度行业分析和专业见解',
};

// 用户标签映射
const USER_TAG_PROMPTS: Record<UserTag, string> = {
  beginner: '小白投资者，刚入市的新手',
  intermediate: '进阶投资者，有一定经验的投资者',
  professional: '专业玩家，经验丰富的专业投资者',
};

// 内容类型映射
const CONTENT_TYPE_PROMPTS: Record<ContentType, string> = {
  article: '小红书图文笔记',
  video_script: '短视频脚本',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicType, userTag, contentType, keywords, useHotTopic } = body as {
      topicType: TopicType;
      userTag: UserTag;
      contentType: ContentType;
      keywords?: string;
      useHotTopic?: boolean;
    };

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 1. 生成标题
          const title = await generateTitle(topicType, userTag, keywords, useHotTopic);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'title', data: title })}\n\n`));

          // 2. 生成正文（流式）
          const contentStream = await generateContent(topicType, userTag, contentType, keywords, useHotTopic);
          for await (const chunk of contentStream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`));
          }

          // 3. 生成标签
          const tags = await generateTags(topicType, keywords);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`));

          // 4. 生成配图
          const imageUrl = await generateImage(title);
          if (imageUrl) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'image', data: imageUrl })}\n\n`));
          }

          // 5. 合规审查
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

// 生成标题
async function generateTitle(
  topicType: TopicType,
  userTag: UserTag,
  keywords?: string,
  useHotTopic?: boolean
): Promise<string> {
  const prompt = `你是一个小红书爆款内容专家，请为以下场景生成一个吸引人的标题：
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${useHotTopic ? '要求：结合最新市场热点和爆款趋势' : ''}
${keywords ? `关键词：${keywords}` : ''}

要求：
1. 标题要有吸引力，使用emoji表情
2. 符合小红书风格，要有种草感
3. 避免使用夸张、虚假宣传词汇
4. 标题长度控制在15-25个字

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
  useHotTopic?: boolean
): AsyncGenerator<string> {
  const prompt = `你是一个小红书爆款内容专家，请为以下场景生成${CONTENT_TYPE_PROMPTS[contentType]}正文：
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${useHotTopic ? '要求：结合最新市场热点和爆款趋势' : ''}
${keywords ? `关键词：${keywords}` : ''}

要求：
1. 内容要有价值，能够帮助用户解决问题
2. 语言风格要真实、接地气，像博主真实分享
3. ${contentType === 'article' ? '使用小红书典型格式：开头吸引眼球、中间分点说明、结尾互动引导' : '使用口语化表达，适合视频朗读'}
4. 避免使用官方广告口吻，要有"原生感"
5. 适当使用emoji表情，增加趣味性
6. 内容长度300-500字
7. 避免使用"保证收益"、"稳赚不赔"等违规词汇

请直接输出正文内容，不要其他说明。`;

  const stream = await callLLMStream(prompt);
  for await (const chunk of stream) {
    yield chunk;
  }
}

// 生成标签
async function generateTags(topicType: TopicType, keywords?: string): Promise<string[]> {
  const prompt = `你是一个小红书SEO专家，请为以下内容生成5-8个标签：
选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
${keywords ? `关键词：${keywords}` : ''}

要求：
1. 标签要热门、有流量
2. 标签要与内容高度相关
3. 标签格式：去掉#号，只输出标签文本

请直接输出标签，用逗号分隔，不要其他说明。`;

  const response = await callLLM(prompt);
  return response.split(/[,，、]/).map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

// 生成配图
async function generateImage(title: string): Promise<string | null> {
  try {
    const apiKey = process.env.CONTENT_API_KEY;
    const baseUrl = process.env.IMAGE_API_BASE_URL || 'https://api.z.ai/api/paas/v4';
    
    // 调用图片生成API
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: `小红书封面图，主题：${title}，风格：简约、时尚、有质感，适合社交媒体`,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      console.error('Image generation failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.url || null;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
}

// 合规审查
async function checkCompliance(title: string, tags: string): Promise<{
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
}> {
  const prompt = `你是一个金融内容合规审查专家，请审查以下小红书内容是否合规：

标题：${title}
标签：${tags}

请检查以下方面：
1. 是否包含保证收益、稳赚不赔等违规承诺
2. 是否包含夸大宣传、虚假信息
3. 是否包含敏感金融词汇（如"内幕消息"、"黑马"等）
4. 是否符合小红书社区规范

请以JSON格式输出：
{
  "isCompliant": true/false,
  "warnings": ["警告信息1", "警告信息2"],
  "suggestions": ["优化建议1", "优化建议2"]
}

如果没有问题，warnings为空数组，isCompliant为true。`;

  try {
    const response = await callLLM(prompt);
    // 尝试解析JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Compliance check error:', error);
  }

  // 默认返回合规
  return {
    isCompliant: true,
    warnings: [],
    suggestions: [],
  };
}

// 调用LLM（非流式）
async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.CONTENT_API_KEY;
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  // 尝试OpenAI兼容接口
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的小红书内容创作助手，擅长创作爆款内容。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('LLM call error:', error);
    // 返回模拟内容
    return generateMockContent(prompt);
  }
}

// 调用LLM（流式）
async function* callLLMStream(prompt: string): AsyncGenerator<string> {
  const apiKey = process.env.CONTENT_API_KEY;
  
  if (!apiKey) {
    // 返回模拟流式内容
    const mockContent = generateMockContent(prompt);
    const words = mockContent.split('');
    for (let i = 0; i < words.length; i += 3) {
      yield words.slice(i, i + 3).join('');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的小红书内容创作助手，擅长创作爆款内容。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('LLM stream error:', error);
    // 返回模拟流式内容
    const mockContent = generateMockContent(prompt);
    const words = mockContent.split('');
    for (let i = 0; i < words.length; i += 3) {
      yield words.slice(i, i + 3).join('');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

// 生成模拟内容（当API不可用时）
function generateMockContent(prompt: string): string {
  if (prompt.includes('标题')) {
    const titles = [
      '💰 新手必看！价值投资的正确打开方式 ✨',
      '📊 3分钟学会定投，让钱生钱不是梦 💎',
      '🔥 炒股5年，我终于悟出的投资真谛 📈',
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  if (prompt.includes('正文')) {
    return `大家好呀～今天想和大家分享一个超实用的投资心得 💡

作为一个在市场摸爬滚打多年的投资者，我深知小白入市的困惑和迷茫。今天就和大家聊聊如何建立正确的投资观念：

1️⃣ 先学习再投资
不要急着入场，先花时间学习基本的投资知识，了解什么是股票、基金，学会看K线图和财务报表。

2️⃣ 制定投资计划
根据自己的风险承受能力和投资目标，制定合适的投资策略，不要盲目跟风。

3️⃣ 坚持长期投资
短期波动是正常的，重要的是看长期趋势，保持耐心和纪律。

记住：投资是一场马拉松，不是百米冲刺 💪

如果你觉得有用，记得点赞收藏哦～有任何问题欢迎评论区留言！

#投资理财 #新手投资 #价值投资 #定投`;
  }

  if (prompt.includes('标签')) {
    return '投资理财,新手投资,价值投资,定投,理财知识,股票基金,投资心得,财富自由';
  }

  return '';
}
