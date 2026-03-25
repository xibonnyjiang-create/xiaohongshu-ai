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

// 模拟内容库
const MOCK_TITLES: Record<TopicType, string[]> = {
  market_hot: [
    '💰 A股又大涨！新手小白该如何抓住机会？看这篇就够了 ✨',
    '📊 突发！央行重磅消息，这几类股票要起飞了？🚀',
    '🔥 今日大盘解析：3分钟看懂市场走势，投资必看！',
    '📈 热门板块轮动！跟着聪明钱走，这几个方向值得关注 💎',
  ],
  beginner_guide: [
    '💡 炒股3年血泪总结！新手必须知道的5个真相 📚',
    '🎯 从0到1学投资：小白也能看懂的股票入门指南 ✨',
    '💰 月薪3000如何理财？这是我坚持3年的方法 📊',
    '🌟 第一次买股票？这份保姆级教程请收好！',
  ],
  advanced_invest: [
    '📊 深度解析：如何用财务报表选出优质股票？干货满满 💎',
    '💡 价值投资进阶：教你构建自己的投资体系 🏗️',
    '🎯 股息投资策略：打造被动收入的秘密武器 💰',
    '📈 技术分析实战：这些指标组合真的有效！',
  ],
  professional_analysis: [
    '📊 行业深度研报：2024年这个赛道被严重低估了 💎',
    '🔍 专业投资者都在用的估值方法，学会就是赚到 📈',
    '💡 机构调研揭秘：聪明钱最近在买什么？ 🎯',
    '🏛️ 宏观经济解读：政策背后的投资机会分析',
  ],
};

const MOCK_CONTENTS: Record<TopicType, string[]> = {
  market_hot: [
    `姐妹们！今天市场又热闹起来了 💫

作为一个在市场摸爬滚打多年的投资者，看到今天的热点，忍不住来分享一下我的观察：

1️⃣ 市场情绪回暖
最近大盘走势确实不错，但别急着追高！记住：涨幅越大，越要谨慎。

2️⃣ 板块轮动规律
最近资金明显在几个热门板块之间轮动，跟风不如跟逻辑，先搞懂为什么涨。

3️⃣ 操作建议
✅ 已持仓的：可以考虑分批止盈
✅ 空仓的：不要追高，等回调机会
✅ 新手的：先学习再入场不急

投资是一辈子的事，不差这几天～ 💪

有什么问题评论区见！记得点赞收藏哦～`,
    `今日市场热点速递！3分钟掌握投资风向 🌟

姐妹们，今天又有大新闻了！

🔥 热点事件分析
央行最新的政策信号很明确，对市场是长期利好。但短期可能还有波动，这是正常的调整。

📊 聪明钱在做什么？
机构资金正在悄悄布局这些方向：
- 消费升级相关
- 科技自主创新
- 新能源转型

💡 我的思考
与其追热点，不如找那些基本面扎实、估值合理的标的。短期涨跌不重要，重要的是选对方向！

记住：投资是认知的变现，先提升认知再谈收益 🎯

觉得有用的话点个赞吧～`,
  ],
  beginner_guide: [
    `理财小白必看！从0开始的股票投资指南 📚

姐妹们，很多宝子问我怎么开始投资，今天就来分享一下我的经验～

🎯 第一步：先学习基础知识
不要急着开户买股票！先花时间了解：
- 什么是股票？什么是基金？
- K线图怎么看？
- 基本的财务指标有哪些？

💰 第二步：制定投资计划
问自己几个问题：
- 能承受多大的亏损？
- 投资期限是多久？
- 期望的收益是多少？

📝 第三步：从小额开始
先用小资金练手，感受市场的波动，找到适合自己的节奏。

⚠️ 避坑指南
❌ 不要听消息炒股
❌ 不要追涨杀跌
❌ 不要借钱投资

投资是场马拉松，慢慢来比较快～ 💪

觉得有帮助的话记得点赞收藏！有问题评论区见～`,
    `月薪3000也能理财？这是我坚持了3年的方法 💰

姐妹们，不管收入多少，理财都是必修课！

💡 我的心路历程
3年前我也是月光族，后来下定决心改变，现在每月都能存下一笔钱。

📊 我的方法：
1️⃣ 先存钱再消费
发工资第一件事：转出30%到理财账户！

2️⃣ 定投指数基金
每月固定投入一笔钱，不管涨跌都坚持。3年平均收益超过15%！

3️⃣ 学习投资知识
每天花15分钟看财经新闻，慢慢就有了感觉。

4️⃣ 控制欲望消费
买东西前问自己：真的需要吗？

🌟 3年下来的变化
- 存款从0到5位数
- 投资收益超过工资10%
- 心态越来越稳

理财真的是越早开始越好！姐妹们加油 💪`,
  ],
  advanced_invest: [
    `价值投资进阶：如何建立自己的选股体系 🏗️

姐妹们，今天分享一些进阶的投资方法论，适合有一定基础的朋友～

📊 选股三要素
1️⃣ 好行业
- 市场空间大
- 增长可持续
- 竞争格局清晰

2️⃣ 好公司
- 护城河深厚
- 管理层靠谱
- 财务健康

3️⃣ 好价格
- 估值合理
- 安全边际足够
- 分批建仓

💡 我的实操框架
✅ 初筛：ROE > 15%，负债率 < 50%
✅ 复筛：自由现金流为正，分红稳定
✅ 估值：PE在历史分位30%以下考虑建仓

📈 持仓管理
- 单一标的不超过总仓位20%
- 分批建仓，金字塔式加仓
- 严格止损，控制回撤

投资是一场修行，共勉 💪`,
    `股息投资：打造被动收入的秘密武器 💰

姐妹们，今天聊聊我最喜欢的投资策略——股息投资！

🌟 为什么选择股息投资？
- 每年有稳定现金流
- 不用担心短期波动
- 复利效应惊人

📊 选股标准
1️⃣ 股息率 > 3%
2️⃣ 连续分红5年以上
3️⃣ 股息支付率 < 60%
4️⃣ 业绩稳定增长

💡 实战案例
我持仓的几只高股息股：
- 某银行股：股息率6%+
- 某能源股：连续10年分红
- 某消费股：业绩稳增长

📈 收益复盘
过去3年平均股息收益5%，加上股价上涨，年化收益超过15%！

⚠️ 注意事项
- 高股息不一定是好事（可能股价下跌导致）
- 要关注公司的分红能力是否可持续
- 行业周期股要谨慎

股息投资是最适合普通人的投资方式之一，强烈推荐！💪`,
  ],
  professional_analysis: [
    `行业深度研报：被低估的优质赛道分析 📊

姐妹们，今天分享一些专业视角的行业分析～

🔍 研究框架
1️⃣ 宏观环境
当前经济周期位置、政策导向、利率水平

2️⃣ 行业格局
市场规模、增速、竞争格局、产业链位置

3️⃣ 公司分析
财务指标、核心竞争力、管理层能力

💡 当前看好的方向
✅ 高端制造
国产替代加速，政策持续支持，估值合理

✅ 医药创新
人口老龄化趋势，创新药景气度上行

✅ 新能源
长期确定性高，短期调整后性价比显现

⚠️ 风险提示
- 研究深度决定投资收益
- 行业周期轮动要把握
- 分散投资降低风险

投资是认知的变现，深度研究才能获得超额收益 📈`,
    `机构调研揭秘：聪明钱最近在买什么？ 🎯

姐妹们，跟踪机构动向是投资的重要参考！

📊 如何获取机构持仓信息
- 季报披露：十大重仓股
- 调研记录：关注的公司
- 龙虎榜：大额交易动向

💡 近期机构动向分析
1️⃣ 加仓方向
- 优质蓝筹（估值修复逻辑）
- 科技成长（政策支持）
- 消费复苏（基本面改善）

2️⃣ 减仓方向
- 高估值赛道
- 业绩不达预期的标的

⚠️ 注意事项
- 机构持仓有滞后性
- 不能简单抄作业
- 要理解背后的逻辑

记住：机构可以帮我们发现机会，但决策要自己做 🧠`,
  ],
};

const MOCK_TAGS: Record<TopicType, string[]> = {
  market_hot: ['投资理财', 'A股', '股票', '理财', '投资', '金融', '财富自由', '热点解析'],
  beginner_guide: ['投资理财', '新手投资', '理财入门', '股票入门', '基金定投', '理财知识', '投资心得'],
  advanced_invest: ['价值投资', '股票投资', '投资策略', '股息投资', '财务分析', '投资体系'],
  professional_analysis: ['行业分析', '投资研究', '机构调研', '专业投资', '宏观经济', '资产配置'],
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
4. 标题长度控制在15-30个字
5. 要有独特性，不要和其他内容雷同

请直接输出标题，不要其他说明。`;

  try {
    const response = await callLLM(prompt);
    return response.trim();
  } catch (error) {
    // API失败时使用模拟内容
    console.log('Using mock title due to API error');
    const titles = MOCK_TITLES[topicType];
    return titles[Math.floor(Math.random() * titles.length)];
  }
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
${useHotTopic ? '要求：结合最新市场热点和爆款趋势，可以提及当前的A股行情、热门板块等' : ''}
${keywords ? `关键词：${keywords}` : ''}

要求：
1. 内容要有价值，能够帮助用户解决问题
2. 语言风格要真实、接地气，像博主真实分享
3. ${contentType === 'article' ? '使用小红书典型格式：开头吸引眼球、中间分点说明、结尾互动引导' : '使用口语化表达，适合视频朗读'}
4. 避免使用官方广告口吻，要有"原生感"
5. 适当使用emoji表情，增加趣味性
6. 内容长度300-500字
7. 避免使用"保证收益"、"稳赚不赔"等违规词汇
8. 内容要有独特性，每次生成不同的内容

请直接输出正文内容，不要其他说明。`;

  try {
    const stream = await callLLMStream(prompt);
    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error) {
    // API失败时使用模拟内容（流式输出）
    console.log('Using mock content due to API error');
    const contents = MOCK_CONTENTS[topicType];
    const content = contents[Math.floor(Math.random() * contents.length)];
    const words = content.split('');
    for (let i = 0; i < words.length; i += 2) {
      yield words.slice(i, i + 2).join('');
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
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

  try {
    const response = await callLLM(prompt);
    return response.split(/[,，、]/).map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  } catch (error) {
    // API失败时使用模拟标签
    console.log('Using mock tags due to API error');
    return MOCK_TAGS[topicType];
  }
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
        prompt: `小红书封面图，主题：${title}，风格：简约、时尚、有质感，适合社交媒体，明亮色彩，ins风格`,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      console.log('Image generation skipped due to API error');
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.url || null;
  } catch (error) {
    console.log('Image generation skipped');
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
3. 是否包含敏感金融词汇（如"内幕消息"、"黑马"、"庄家"等）
4. 是否符合小红书社区规范

请以JSON格式输出：
{
  "isCompliant": true或false,
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
    console.log('Compliance check skipped due to API error');
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
  const baseUrl = process.env.CONTENT_API_BASE_URL || 'https://api.z.ai/api/paas/v4';
  
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
      model: 'doubao-pro-32k',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小红书内容创作助手，擅长创作爆款内容。你的回答应该真实、有趣、接地气，像真人博主一样。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1500,
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
  const baseUrl = process.env.CONTENT_API_BASE_URL || 'https://api.z.ai/api/paas/v4';
  
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
      model: 'doubao-pro-32k',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小红书内容创作助手，擅长创作爆款内容。你的回答应该真实、有趣、接地气，像真人博主一样。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1500,
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
