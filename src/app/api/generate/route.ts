import { NextRequest } from 'next/server';
import { TopicType, UserTag, ContentType } from '@/lib/types';
import { SearchClient, ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

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

    // 提取请求头用于SDK
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 0. 如果启用了热点推荐，先搜索实时热点
          let hotTopicInfo = '';
          if (useHotTopic) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在搜索实时热点...' })}\n\n`));
            hotTopicInfo = await searchHotTopics(topicType, keywords, customHeaders);
          }

          // 1. 生成标题
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成标题...' })}\n\n`));
          const title = await generateTitle(topicType, userTag, keywords, hotTopicInfo);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'title', data: title })}\n\n`));

          // 2. 生成正文（流式）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成正文...' })}\n\n`));
          const contentStream = await generateContent(topicType, userTag, contentType, keywords, hotTopicInfo);
          for await (const chunk of contentStream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`));
          }

          // 3. 生成标签
          const tags = await generateTags(topicType, keywords);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`));

          // 4. 生成配图
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图...' })}\n\n`));
          const imageUrl = await generateImage(title, customHeaders);
          if (imageUrl) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'image', data: imageUrl })}\n\n`));
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

// 搜索实时热点
async function searchHotTopics(
  topicType: TopicType, 
  keywords?: string,
  customHeaders?: Record<string, string>
): Promise<string> {
  try {
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    // 根据选题类型构建搜索查询
    const searchQueries: Record<TopicType, string> = {
      market_hot: `A股市场最新热点 2024年 投资机会`,
      beginner_guide: `投资理财入门知识 新手指南 2024`,
      advanced_invest: `价值投资策略 股票分析技巧 最新`,
      professional_analysis: `宏观经济分析 行业研究报告 最新`,
    };

    let query = searchQueries[topicType];
    if (keywords) {
      query = `${keywords} ${query}`;
    }

    // 执行搜索
    const response = await client.webSearch(query, 5, true);

    if (response.web_items && response.web_items.length > 0) {
      // 提取搜索结果的关键信息
      const hotInfo = response.web_items
        .slice(0, 3)
        .map(item => `【${item.title}】${item.snippet?.substring(0, 100) || ''}`)
        .join('\n');
      
      // 如果有AI摘要，也包含进去
      if (response.summary) {
        return `${hotInfo}\n\n热点摘要：${response.summary}`;
      }
      return hotInfo;
    }

    return '';
  } catch (error) {
    console.error('Search hot topics error:', error);
    return '';
  }
}

// 生成标题
async function generateTitle(
  topicType: TopicType,
  userTag: UserTag,
  keywords?: string,
  hotTopicInfo?: string
): Promise<string> {
  const prompt = `你是一个小红书爆款内容专家，请为以下场景生成一个吸引人的标题：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `实时热点信息：\n${hotTopicInfo}` : ''}

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
  hotTopicInfo?: string
): AsyncGenerator<string> {
  const prompt = `你是一个资深的投资理财博主，在知乎、小红书有百万粉丝。请为以下场景生成一篇高质量的${CONTENT_TYPE_PROMPTS[contentType]}：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
目标用户：${USER_TAG_PROMPTS[userTag]}
${keywords ? `关键词：${keywords}` : ''}
${hotTopicInfo ? `实时热点信息（必须融入内容中）：\n${hotTopicInfo}` : ''}

【核心要求】：
1. 内容深度要求：
   - 不要浮于表面，要有独到见解和深度分析
   - 提供具体的操作方法、数据支撑或案例说明
   - 解释"为什么"而不只是"是什么"

2. 专业性要求：
   - 使用准确的专业术语，但要通俗解释
   - 引用具体的市场数据或趋势分析
   - 提供可操作的建议，而非空泛的口号

3. 内容结构：
   ${contentType === 'article' ? `
   - 开头：用数据/现象/痛点吸引眼球
   - 中间：分3-5个要点深度解析，每个要点有理有据
   - 结尾：总结+行动建议+互动引导` : `
   - 开场：简短有力，抛出核心观点
   - 正文：口语化表达，像在和朋友聊天
   - 结尾：金句总结，引导关注`}

4. 语言风格：
   - 真诚、接地气，像资深朋友在分享经验
   - 适当使用emoji增加可读性，但不要过度
   - 避免官方腔、广告腔，要有个人观点

5. 禁忌事项：
   - 严禁使用"保证收益"、"稳赚不赔"、"内幕消息"等违规词汇
   - 不要过度承诺投资回报
   - 要有风险提示意识

6. 内容长度：500-800字，确保信息密度高、干货多

${hotTopicInfo ? '【重要】必须将上述实时热点信息自然融入内容中，让读者感受到时效性！' : ''}

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

// 生成配图
async function generateImage(title: string, customHeaders?: Record<string, string>): Promise<string | null> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 构建图片描述
    const imagePrompt = `小红书封面图，主题：${title}，风格要求：
- 简约现代，有质感
- 适合社交媒体传播
- 色彩明亮温暖，有吸引力
- 可以包含简单的金融元素（如图表、上升箭头、金币等抽象元素）
- 文字简洁，突出重点`;

    const response = await client.generate({
      prompt: imagePrompt,
      size: '2K',
      watermark: false,
    });

    const helper = client.getResponseHelper(response);
    
    if (helper.success && helper.imageUrls.length > 0) {
      return helper.imageUrls[0];
    }
    
    console.log('Image generation result:', helper.errorMessages);
    return null;
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

// 调用LLM（非流式）
async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.CONTENT_API_KEY;
  const baseUrl = process.env.CONTENT_API_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1';
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'hunyuan-lite',
      messages: [
        {
          role: 'system',
          content: '你是一位资深的投资理财内容专家，在小红书、知乎等平台拥有百万粉丝。你的内容专业、深入、有洞见，同时又通俗易懂、接地气。你擅长将复杂的金融知识用生动的案例和通俗的语言讲清楚，深受用户信赖。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.85,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 调用LLM（流式）
async function* callLLMStream(prompt: string): AsyncGenerator<string> {
  const apiKey = process.env.CONTENT_API_KEY;
  const baseUrl = process.env.CONTENT_API_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1';
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'hunyuan-lite',
      messages: [
        {
          role: 'system',
          content: '你是一位资深的投资理财内容专家，在小红书、知乎等平台拥有百万粉丝。你的内容专业、深入、有洞见，同时又通俗易懂、接地气。你擅长将复杂的金融知识用生动的案例和通俗的语言讲清楚，深受用户信赖。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.85,
      max_tokens: 2000,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM Stream API error: ${response.status}`);
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
}
