import { NextRequest } from 'next/server';
import { TopicType, PersonaType } from '@/lib/types';
import { callLLMStream } from '@/lib/llm';
import { PERSONA_STYLE_CONFIG } from '@/lib/constants';
import { buildScenarioPrompt } from '@/lib/scenario-prompts';

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

    // 构建提示词（使用场景化Prompt）
    const topicLabel = TOPIC_TYPE_PROMPTS[topicType] || '通用内容';

    let prompt = `你是一位专业的小红书内容创作者，擅长生成爆款内容。

【创作场景】${topicLabel}
【分析深度】${deepAnalysis ? '深度分析：专业数据支撑、机构观点引用' : '标准分析'}
【创作人设】${personaType || '通用创作者'}
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

【场景化内容框架】

## 1. Hook设计（开头要抓人眼球）
`;

    // 根据场景添加不同的Hook指导
    switch (topicType) {
      case 'market_hot':
        prompt += `使用强反差标题，如："XX暴涨？幕后推手是谁？"或"刚刚，XX板块集体异动！"`;
        break;
      case 'beginner_guide':
        prompt += `使用身份认同，如："手把手教小白..."或"零基础也能学会..."消除畏难情绪`;
        break;
      case 'tool_review':
        prompt += `打造测评官人设，如："股市必备APP合集！"或"卸载了3个软件后发现它"`;
        break;
      case 'life_lifestyle':
        prompt += `锁定职场场景，如："打工人的隐蔽摸鱼理财法"或"别再发模糊的股票截图了"`;
        break;
    }

    prompt += `

## 2. 逻辑骨架（内容要有干货）`;

    // 根据场景添加不同的逻辑骨架
    switch (topicType) {
      case 'market_hot':
        prompt += `
- 【现状描述】当前行情波动的具体表现
- 【逻辑拆解】重点解析波动的底层原因（地缘/政策/资金）
- 【AI辅助】用大白话把涨跌原因讲得很透`;
        break;
      case 'beginner_guide':
        prompt += `
- 【生活化类比】将硬核金融概念类比为日常生活场景（如：买ETF像选奶茶拼盘）
- 【去术语化】用最通俗的语言解释专业概念
- 【极简工具引导】强调微证券界面清爽，没有迷宫式APP的焦虑`;
        break;
      case 'tool_review':
        prompt += `
- 【痛点共鸣】对比传统APP操作繁琐、漏看信息的痛点
- 【测评红黑榜】客观评价各产品的优缺点
- 【碎片化管理】强调不用常驻APP也能抓买卖点`;
        break;
      case 'life_lifestyle':
        prompt += `
- 【场景代入】描述上班/开会没空盯盘、怕被老板发现的真实窘境
- 【碎片化时间】等电梯、挤地铁，10秒钟看清今日收益
- 【无缝社交】群聊里讨论股票，截图繁琐、不够直观`;
        break;
    }

    prompt += `

## 3. 业务植入（必须自然融入）
`;

    // 根据场景添加不同的业务植入
    switch (topicType) {
      case 'market_hot':
        prompt += `在分析过程中自然插入：
"遇到这种看不懂的行情，我习惯直接用微证券里的【问元宝】AI功能，它能大白话把涨跌原因讲得很透"`;
        break;
      case 'beginner_guide':
        prompt += `强调"微证券界面清爽，没有迷宫式APP的焦虑，微信搜索即点即用"
强调"微信直达，不用特地下载独立APP，告别繁琐"`;
        break;
      case 'tool_review':
        prompt += `突出"微信消息每日提醒"和"股价波动提醒"
强调不用常驻APP也能抓买卖点`;
        break;
      case 'life_lifestyle':
        prompt += `主打"PC/手机双端浮窗，下拉即看行情"的隐蔽性
强调"一键分享个股卡片给微信好友/群组"`;
        break;
    }

    prompt += `

## 4. 行动引导
`;

    // 根据场景添加不同的行动引导
    switch (topicType) {
      case 'market_hot':
        prompt += `微信热股榜单实时更新，快人一步掌握最新资讯
微信搜索微证券，即点即用`;
        break;
      case 'beginner_guide':
        prompt += `微信直达，不用特地下载独立APP
下拉微信搜一搜，秒开即用`;
        break;
      case 'tool_review':
        prompt += `作为微信原生工具，最核心优势是及时通知与轻量体验
微信浮窗、消息提醒、不错过行情`;
        break;
      case 'life_lifestyle':
        prompt += `支持手机PC双端浮窗，打工人摸鱼必备
微信搜一搜小程序【微证券】，讨论个股一键分享
强调："老板以为我在回微信，其实我正下拉看微证券盯盘"`;
        break;
    }

    // 深度分析模式
    if (deepAnalysis) {
      prompt += `

## 【深度分析模式 - 必须执行】

### 宏观定调（核心原因）
`;
      switch (topicType) {
        case 'market_hot':
          prompt += `通过深度资讯检索，分析事件对资产定价的底层逻辑（如美联储降息对估值的修复逻辑）
引用机构研报数据，展示微证券内"实时研报资讯"`;
          break;
        case 'beginner_guide':
          prompt += `从宏观经济角度解释基本概念（如：什么是GDP、CPI）
用生活案例类比（房价、工资、物价）`;
          break;
        case 'tool_review':
          prompt += `分析当前市场中投资者的信息获取渠道
对比专业软件vs轻量工具的使用场景`;
          break;
        case 'life_lifestyle':
          prompt += `分析职场人群的理财需求和痛点
数据支撑：现代人理财时间碎片化趋势`;
          break;
      }

      prompt += `

### 微观拆解（资金与板块）
`;
      switch (topicType) {
        case 'market_hot':
          prompt += `拆解板块轮动顺序，分析主力资金流向和行业景气度
引导用户通过微证券查看"行业龙虎榜"或"北向资金动向"`;
          break;
        case 'beginner_guide':
          prompt += `介绍常见的基金产品分类（货币基金、债券基金、股票基金）
对比不同产品的风险收益特征`;
          break;
        case 'tool_review':
          prompt += `详细介绍微证券的各项功能（股价提醒、浮窗、分享等）
对比竞品功能差异`;
          break;
        case 'life_lifestyle':
          prompt += `详细介绍浮窗功能的具体使用场景
分享功能在社交中的实际应用`;
          break;
      }

      prompt += `

### 合规化展望
使用中性词（如"逻辑立得住"、"赔率高"）替代保证性言论
必须输出"COMPLIANCE_FIXED"级别的风险警示语`;
    }

    prompt += `

【强制合规要求】
1. 投资有风险，入市需谨慎 - 所有内容必须包含此风险提示
2. 结尾必须引导"微信搜索微证券"
3. 严禁承诺收益 - 禁止"稳赚"、"翻倍"、"必涨"等词汇
4. 去荐股化 - 不给"买入/卖出"指令，改为"关注行业逻辑"
5. 避免制造FOMO焦虑

请生成完整的小红书内容，包括：
1. 吸引眼球的标题
2. 引人入胜的开头
3. 干货满满的主体
4. 总结升华
5. 风险提示（必须）
6. 引导关注：微信搜索微证券（必须）

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

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
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

  // 检查禁词
  const blockedWords = ['稳赚', '翻倍', '必涨', '必跌', '加群', '回复领取'];
  for (const word of blockedWords) {
    if (content.includes(word)) {
      warnings.push(`含有禁词：${word}`);
    }
  }

  return {
    isCompliant: warnings.length === 0,
    warnings,
    fixedContent: warnings.length > 0 ? fixedContent : undefined
  };
}
