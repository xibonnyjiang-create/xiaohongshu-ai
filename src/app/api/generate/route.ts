import { NextRequest } from 'next/server';
import { TopicType, PersonaType, TitleCandidate, OutputFormat, VideoDuration } from '@/lib/types';
import { callLLM, callLLMStream, callComplianceCheck } from '@/lib/llm';
import { PERSONA_STYLE_CONFIG, WEIXIN_SECURITY_MAPPING, MARKET_HOT_SENSITIVE_WORDS, containsSensitiveWords, PERSONA_OPTIONS } from '@/lib/constants';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪',
  beginner_guide: '小白科普',
  life_lifestyle: '生活化种草',
  tool_review: '工具测评',
};

// 视频时长配置
const VIDEO_DURATION_CONFIG: Record<VideoDuration, { totalSeconds: number; segmentCount: number; description: string }> = {
  '30s': { totalSeconds: 30, segmentCount: 2, description: '短平快，干货精炼' },
  '60s': { totalSeconds: 60, segmentCount: 3, description: '适中长度，内容丰富' },
  '90s': { totalSeconds: 90, segmentCount: 4, description: '较长时间，深入讲解' },
  '2min': { totalSeconds: 120, segmentCount: 5, description: '深度内容，完整叙事' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topicType,
      keywords,
      deepAnalysis,
      outputFormat,
      videoDuration,
      personaType,
      hotTopicInfo,
      hotTop3Tags,
      selectedTitle,
      generateOnlyTitles,
    } = body as {
      topicType: TopicType;
      keywords?: string;
      deepAnalysis?: boolean;
      outputFormat?: OutputFormat;
      videoDuration?: VideoDuration;
      personaType?: string;
      hotTopicInfo?: string;
      hotTop3Tags?: string[];
      selectedTitle?: string;
      generateOnlyTitles?: boolean;
    };

    const isVideo = outputFormat === 'video';
    const durationConfig = VIDEO_DURATION_CONFIG[videoDuration || '60s'];
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

          // 1. 生成标题
          safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成标题...' })}\n\n`);
          const titles = await generateTitles(
            topicType, keywords, hotTop3Tags, hotTopicInfo, personaType, styleConfig
          );
          safeEnqueue(`data: ${JSON.stringify({ type: 'titles', data: titles })}\n\n`);

          // 如果只是生成标题
          if (generateOnlyTitles) {
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '标题已生成，请选择标题' })}\n\n`);
            closeStream();
            return;
          }

          // 2. 根据输出形式生成内容
          const usedTitle = selectedTitle || titles[0]?.title || '';
          const weixinMapping = WEIXIN_SECURITY_MAPPING[topicType] || [];

          if (isVideo) {
            // 视频脚本模式
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成视频脚本...' })}\n\n`);
            const videoScript = await generateVideoScript(
              topicType, keywords, usedTitle, personaType, styleConfig, weixinMapping, durationConfig
            );
            safeEnqueue(`data: ${JSON.stringify({ type: 'video_script', data: videoScript })}\n\n`);

            // 视频脚本的标签
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成标签...' })}\n\n`);
            const tags = await generateTags(topicType, keywords, usedTitle, videoScript.hook);
            safeEnqueue(`data: ${JSON.stringify({ type: 'tags', data: tags })}\n\n`);

            // 配图
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图建议...' })}\n\n`);
            const imageUrls = await generateImages(usedTitle, videoScript.hook);
            if (imageUrls.length > 0) {
              safeEnqueue(`data: ${JSON.stringify({ type: 'images', data: imageUrls })}\n\n`);
            }

            // 合规审查
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在进行合规审查...' })}\n\n`);
            const scriptText = `${videoScript.hook}\n${videoScript.segments.map(s => s.voiceover).join('\n')}\n${videoScript.cta}`;
            const complianceResult = await callComplianceCheck(usedTitle, scriptText, tags.join(' '));

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

            // 种草力评分
            const engagementScore = await calculateEngagementScore(usedTitle, scriptText, tags);
            safeEnqueue(`data: ${JSON.stringify({ type: 'engagement_score', data: engagementScore })}\n\n`);

          } else {
            // 图文模式
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成内容...' })}\n\n`);

            const MAX_CONTENT_LENGTH = 1000; // 最大字数限制（1000字以内）

            const contentStream = await generateContentStream(
              topicType, keywords, deepAnalysis, hotTopicInfo, hotTop3Tags, usedTitle, personaType, styleConfig, weixinMapping
            );

            for await (const chunk of contentStream) {
              if (isClosed) break;
              // 检查是否超过字数限制
              if (accumulatedContent.length >= MAX_CONTENT_LENGTH) {
                break; // 停止接收新内容
              }
              // 计算剩余可接收字数
              const remaining = MAX_CONTENT_LENGTH - accumulatedContent.length;
              const chunkToSend = chunk.length > remaining ? chunk.substring(0, remaining) : chunk;
              accumulatedContent += chunkToSend;
              if (chunkToSend && !safeEnqueue(`data: ${JSON.stringify({ type: 'content', data: chunkToSend })}\n\n`)) {
                break;
              }
            }

            if (isClosed) {
              closeStream();
              return;
            }

            // 3. 并行生成：标签 + 生图口令
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成标签和配图...' })}\n\n`);
            
            // 并行执行标签和生图口令生成
            const [tags, imagePrompt] = await Promise.all([
              generateTags(topicType, keywords, usedTitle, accumulatedContent),
              generateImagePrompt(usedTitle, accumulatedContent, keywords),
            ]);
            
            // 发送标签（限制10个以内）
            const limitedTags = tags.slice(0, 10);
            safeEnqueue(`data: ${JSON.stringify({ type: 'tags', data: limitedTags })}\n\n`);
            
            // 发送生图口令
            safeEnqueue(`data: ${JSON.stringify({ type: 'image_prompt', data: imagePrompt })}\n\n`);

            // 4. 生成配图（使用3:4比例）
            safeEnqueue(`data: ${JSON.stringify({ type: 'status', data: '正在生成配图建议...' })}\n\n`);
            const imageUrls = await generateImages(usedTitle, accumulatedContent, '3:4');
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
            const engagementScore = await calculateEngagementScore(usedTitle, accumulatedContent, tags);
            safeEnqueue(`data: ${JSON.stringify({ type: 'engagement_score', data: engagementScore })}\n\n`);
          }

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
  styleConfig?: { titleStyle: string; tone: string; emojiDensity: string; personaPrompt?: string }
): Promise<TitleCandidate[]> {
  const topicLabel = TOPIC_TYPE_PROMPTS[topicType] || '通用内容';
  const persona = personaType || 'custom';
  const config = styleConfig || PERSONA_STYLE_CONFIG.custom;
  const personaInfo = PERSONA_OPTIONS.find(p => p.value === persona);
  const personaDesc = config.personaPrompt || (personaInfo ? `${personaInfo.emoji}${personaInfo.label}：${personaInfo.description}` : '');
  const isMarketHot = topicType === 'market_hot';

  // 市场热点场景添加敏感词过滤说明
  const sensitiveWordWarning = isMarketHot 
    ? `\n\n【重要】市场热点场景禁止提及以下内容：
- 虚拟货币相关：数字货币、加密货币、虚拟币、比特币、以太坊、狗狗币、NFT、元宇宙、区块链虚拟货币、炒币、币圈等
- 高风险衍生品：期货、外汇杠杆、保证金交易、杠杆交易等
- 非法集资相关：原始股、原始股投资、资金盘、传销币、ICO等
请确保生成的标题不包含上述任何敏感词汇！`
    : '';

  // 主题发散：根据场景提供多样化话题方向
  const topicDivergenceMap: Record<TopicType, string> = {
    market_hot: '基金定投、消费趋势、新能源、AI应用、医疗健康、利率变化、人民币汇率、养老规划、房产政策、年轻人理财、通胀应对、港股通、可转债、ETF投资、REITs、分红险、银行理财',
    beginner_guide: '零花钱理财、第一份工资怎么花、基金入门、保险怎么选、信用卡技巧、存款方式、记账方法、理财APP推荐、定投策略、应急资金、五险一金、公积金使用',
    life_lifestyle: '下班后理财、周末学投资、省钱妙招、消费降级、副业收入、工资分配、旅行基金、装修预算、养宠花费、奶茶自由、通勤时间理财、早餐经济学',
    tool_review: '记账APP测评、基金平台对比、券商APP推荐、理财工具箱、AI理财助手、银行APP对比、保险平台评测、港股通工具、可转债工具',
  };
  const topicPool = topicDivergenceMap[topicType] || topicDivergenceMap.beginner_guide;

  const prompt = `【标题生成】
请为小红书生成3个爆款标题，主题要多元有趣！

【场景信息】
- 选题类型：${topicLabel}
- 人设：${persona}${personaDesc ? `\n- 人设定义：${personaDesc}` : ''}
- 用户输入的关键词：${keywords || '未指定'}
${hotTop3Tags?.length ? `- 热门标签：${hotTop3Tags.join('、')}` : ''}
${hotTopicInfo ? `- 热点背景：\n${hotTopicInfo.substring(0, 300)}` : ''}

【话题参考池】（从以下方向发散，不要只盯着半导体/黄金）
${topicPool}

【重要】如果用户没有指定关键词或关键词很笼统，请从话题参考池中随机选择3个不同方向的话题来生成标题，确保3个标题的话题各不相同！如果用户指定了具体关键词，则围绕该关键词展开。

${sensitiveWordWarning}

【标题要求】严格遵守！
1. 总长度：≤20字（emoji+符号+汉字全部算在内）
2. 必须包含：1-2个Emoji
3. 标题风格：${config.titleStyle}
4. 语气：${config.tone}，要有小红书网感（可以用"绝了/救命/离谱/搞钱/必看/打工人"等口语化表达）
5. 不要使用任何Markdown格式
6. 3个标题的话题方向必须各不相同！
${isMarketHot ? '7. 严禁包含任何敏感词汇！' : ''}

【输出格式】
直接输出3个标题，每行一个，格式为"emoji 标题内容"，不要编号，不要加引号：

`;

  const response = await callLLM(prompt);
  const lines = response.split('\n').filter(l => l.trim() && !l.match(/^\d+[.、：:]/));
  const titles: TitleCandidate[] = [];

  for (const line of lines) {
    const cleaned = line.trim();
    if (cleaned && cleaned.length > 0) {
      // 市场热点场景进行敏感词检查
      if (isMarketHot) {
        const check = containsSensitiveWords(cleaned);
        if (check.hasSensitive) {
          console.log(`[敏感词过滤] 标题 "${cleaned}" 包含敏感词: ${check.foundWords.join(', ')}，跳过`);
          continue;
        }
      }
      titles.push({
        title: cleaned,
        style: config.titleStyle as TitleCandidate['style'],
      });
    }
    if (titles.length >= 3) break;
  }

  // 如果过滤后标题不足3个，补充默认标题（从话题池随机选方向）
  const fallbackTopics = isMarketHot
    ? ['理财入门必看', '年轻人搞钱攻略', '基金定投怎么选', '零基础理财', '月薪3000也能理财']
    : ['省钱小妙招', '理财小技巧', '搞钱必看攻略', '新手理财入门', '上班族理财法'];
  while (titles.length < 3) {
    const randomTopic = fallbackTopics[titles.length % fallbackTopics.length];
    const fallbackTitle = `💡 ${randomTopic}`;
    if (!isMarketHot || !containsSensitiveWords(fallbackTitle).hasSensitive) {
      titles.push({
        title: fallbackTitle,
        style: config.titleStyle as TitleCandidate['style'],
      });
    }
  }

  return titles.slice(0, 3);
}

// 生成内容（流式）
async function generateContentStream(
  topicType: TopicType,
  keywords?: string,
  deepAnalysis?: boolean,
  hotTopicInfo?: string,
  hotTop3Tags?: string[],
  selectedTitle?: string,
  personaType?: string,
  styleConfig?: { tone: string; emojiDensity: string; titleStyle: string; personaPrompt?: string },
  weixinMapping?: { feature: string; highlight: string }[]
): Promise<AsyncGenerator<string>> {
  const topicLabel = TOPIC_TYPE_PROMPTS[topicType] || '通用内容';
  const analysisLevel = deepAnalysis ? '深度分析：专业数据支撑、机构观点引用' : '标准分析：简洁易懂';
  const config = styleConfig || PERSONA_STYLE_CONFIG.custom;
  const personaInfo = PERSONA_OPTIONS.find(p => p.value === personaType);
  const personaDesc = config.personaPrompt || (personaInfo ? `${personaInfo.emoji}${personaInfo.label}：${personaInfo.description}` : '');
  const mappingStr = weixinMapping?.length ? weixinMapping.map(m => `- ${m.feature}：${m.highlight}`).join('\n') : '';
  const isMarketHot = topicType === 'market_hot';

  // 市场热点场景添加敏感词过滤说明
  const sensitiveWordWarning = isMarketHot 
    ? `\n\n【重要】市场热点场景禁止提及以下内容：
- 虚拟货币相关：数字货币、加密货币、虚拟币、比特币、以太坊、狗狗币、NFT、元宇宙、区块链虚拟货币、炒币、币圈等
- 高风险衍生品：期货、外汇杠杆、保证金交易、杠杆交易等
- 非法集资相关：原始股、原始股投资、资金盘、传销币、ICO等
- 绝对禁止荐股、承诺收益、夸大宣传
请确保生成的内容不包含上述任何敏感词汇！`
    : '';

  // 话题发散池
  const topicDivergenceMap: Record<TopicType, string> = {
    market_hot: '基金定投、消费趋势、新能源、AI应用、医疗健康、利率变化、人民币汇率、养老规划、房产政策、年轻人理财、通胀应对、港股通、可转债、ETF投资、REITs、分红险、银行理财',
    beginner_guide: '零花钱理财、第一份工资怎么花、基金入门、保险怎么选、信用卡技巧、存款方式、记账方法、理财APP推荐、定投策略、应急资金、五险一金、公积金使用',
    life_lifestyle: '下班后理财、周末学投资、省钱妙招、消费降级、副业收入、工资分配、旅行基金、装修预算、养宠花费、奶茶自由、通勤时间理财、早餐经济学',
    tool_review: '记账APP测评、基金平台对比、券商APP推荐、理财工具箱、AI理财助手、银行APP对比、保险平台评测、港股通工具、可转债工具',
  };
  const topicPool = topicDivergenceMap[topicType] || topicDivergenceMap.beginner_guide;

  let prompt = `你是一个小红书理财博主，请根据以下信息写一篇小红书笔记。${sensitiveWordWarning}

【创作信息】
标题：${selectedTitle || '待定'}
关键词：${keywords || ''}
${hotTop3Tags?.length ? `热门标签：${hotTop3Tags.join('、')}` : ''}
${personaDesc ? `\n【人设定义】${personaDesc}\n请严格用这个人设的口吻写！想象你就是这个角色本人，在跟闺蜜/兄弟聊天，语气要自然真实有代入感。\n` : ''}
${mappingStr}
${hotTopicInfo ? `\n【热点背景】${hotTopicInfo.substring(0, 400)}` : ''}

【话题参考】${topicPool}
注意：不要总是写半导体和黄金！请根据标题话题方向来写，覆盖多元化的理财话题。

【写作风格】
- ${config.tone}，${config.emojiDensity}
- 小红书网感：口语化、接地气、像朋友在分享
- 适当使用"绝了/救命/真的/姐妹/宝子/搞钱/打工人"等小红书常用词
- 每段用emoji开头增加视觉节奏感
- 纯文本格式，不要任何Markdown（不要**加粗**、不要#标题）

【字数】400-500字（含emoji）

【必须包含】
- 投资风险提示（自然融入，不要太生硬）
- 微信搜索微证券
${isMarketHot ? '- 严禁提及任何虚拟货币或高风险投资内容' : ''}

【结构参考】
💰 开头1-2句：制造共鸣/抛出痛点/分享经历
⭐ 要点1（3-4句）：核心干货，用具体数字或案例
⭐ 要点2（3-4句）：实用建议，接地气的操作方法
✨ 总结1句：鼓励或提醒
⚠️ 风险提示
👉 微信搜索微证券

现在开始写，像在跟朋友聊天一样自然：`;

  const stream = await callLLMStream(prompt);
  return stream;
}

// 生成视频脚本
async function generateVideoScript(
  topicType: TopicType,
  keywords?: string,
  selectedTitle?: string,
  personaType?: string,
  styleConfig?: { tone: string; emojiDensity: string; titleStyle: string; personaPrompt?: string },
  weixinMapping?: { feature: string; highlight: string }[],
  durationConfig?: { totalSeconds: number; segmentCount: number; description: string }
): Promise<{ hook: string; segments: { visual: string; voiceover: string; duration: string; action?: string }[]; cta: string; bgm?: { name: string; reason: string } }> {
  const config = styleConfig || PERSONA_STYLE_CONFIG.custom;
  const personaInfo = PERSONA_OPTIONS.find(p => p.value === personaType);
  const personaDesc = config.personaPrompt || (personaInfo ? `${personaInfo.emoji}${personaInfo.label}：${personaInfo.description}` : '');
  const mappingStr = weixinMapping?.length ? weixinMapping.map(m => `- ${m.feature}：${m.highlight}`).join('\n') : '';
  const duration = durationConfig || VIDEO_DURATION_CONFIG['60s'];
  const avgSegmentDuration = Math.floor(duration.totalSeconds / duration.segmentCount);

  // 根据场景确定BGM风格
  const bgmStyleMap: Record<string, { style: string; reason: string }> = {
    market_hot: { style: '节奏感强的电子音乐/赛博朋克风', reason: '配合热点话题的紧迫感和信息密度' },
    beginner_guide: { style: '亲和力强的钢琴曲/轻爵士', reason: '营造轻松学习氛围，降低理财焦虑感' },
    life_lifestyle: { style: '轻快的Lo-fi/流行背景音乐', reason: '配合生活化场景，增加亲切感和代入感' },
    tool_review: { style: '沉稳的科技感背景音/轻电子', reason: '体现专业性，增强工具测评的可信度' },
  };
  const bgmInfo = bgmStyleMap[topicType] || { style: '轻快背景音乐', reason: '营造轻松氛围' };
  const isMarketHot = topicType === 'market_hot';

  // 市场热点场景添加敏感词过滤说明
  const sensitiveWordWarning = isMarketHot 
    ? `\n\n【重要-市场热点专项】严禁提及：虚拟货币/加密货币/比特币/以太坊/NFT/元宇宙/炒币/币圈、期货/杠杆/保证金、原始股/资金盘/ICO等！`
    : '';

  // 话题发散池
  const topicDivergenceMap: Record<TopicType, string> = {
    market_hot: '基金定投、消费趋势、新能源、AI应用、医疗健康、利率变化、人民币汇率、养老规划、房产政策、年轻人理财、通胀应对、港股通、可转债、ETF投资',
    beginner_guide: '零花钱理财、第一份工资怎么花、基金入门、保险怎么选、信用卡技巧、存款方式、记账方法、定投策略、应急资金、五险一金',
    life_lifestyle: '下班后理财、周末学投资、省钱妙招、消费降级、副业收入、工资分配、旅行基金、奶茶自由、通勤时间理财',
    tool_review: '记账APP测评、基金平台对比、券商APP推荐、理财工具箱、AI理财助手、银行APP对比',
  };
  const topicPool = topicDivergenceMap[topicType] || topicDivergenceMap.beginner_guide;

  const prompt = `你是一个小红书视频博主，请根据以下信息生成视频脚本。${sensitiveWordWarning}

【基本信息】
- 场景：${TOPIC_TYPE_PROMPTS[topicType]}
- 人设：${personaType || 'custom'}
${personaDesc ? `- 人设定义：${personaDesc}\n请严格用这个人设的口吻写口播台词！想象你就是在镜头前跟粉丝聊天，要自然真实有代入感。` : ''}
- 标题：${selectedTitle || '待定'}
- 关键词：${keywords || '未指定'}
${mappingStr ? `- 微证券功能植入点：${mappingStr}` : ''}

【话题参考】${topicPool}
注意：不要总是写半导体和黄金！请根据标题话题方向来写，覆盖多元化的理财话题。

【硬性要求】
1. 【前置合规】严禁出现：个股推荐、收益承诺、夸大宣传、绝对化用语
2. 黄金3秒钩子：用痛点/悬念/反差开头，让观众停下来
3. 分镜数量：${duration.segmentCount}个，每个${avgSegmentDuration}秒左右
4. 总时长：${duration.totalSeconds}秒
5. 口播台词要像在跟朋友聊天，不要像念稿子
6. 画面描述要具体可执行（能直接用于视频拍摄指导）

【分镜格式 - 强制使用以下格式】
【镜头1】画面：[具体画面描述，包括景别/动作/场景细节] | 口播：[对应的口播台词，3-5句，口语化] | 时长：${avgSegmentDuration}秒
【镜头2】画面：... | 口播：... | 时长：...
...（共${duration.segmentCount}个分镜）

【必须包含的元素】
1. 开头钩子：制造悬念或冲突（痛点提问、反差数据、亲身经历）
2. 内容主体：2-3个实用要点，每个要点有画面+口播
3. 风险融入：在中间自然插入风险提示
4. CTA结尾：引导微信搜索微证券

【BGM推荐】
风格：${bgmInfo.style}
理由：${bgmInfo.reason}

【输出格式】纯文本，严格按以下格式输出，不要JSON：
【黄金3秒钩子】
[钩子文案，制造悬念]

【分镜脚本】
【镜头1】画面：[描述] | 口播：[台词] | 时长：${avgSegmentDuration}秒
【镜头2】画面：[描述] | 口播：[台词] | 时长：${avgSegmentDuration}秒
...

【结尾CTA】
[行动号召]

【BGM推荐】
🎵 曲风/名称：${bgmInfo.style}
💡 推荐理由：${bgmInfo.reason}

禁止使用Markdown格式，禁止使用**加粗，禁止使用#标题符号。`;

  const response = await callLLM(prompt);

  // 解析结构化文本
  try {
    const result: { hook: string; segments: { visual: string; voiceover: string; duration: string; action?: string }[]; cta: string; bgm?: { name: string; reason: string } } = {
      hook: '',
      segments: [],
      cta: '',
      bgm: { name: bgmInfo.style, reason: bgmInfo.reason }
    };

    // 提取黄金3秒钩子
    const hookMatch = response.match(/【黄金3秒钩子】\s*([\s\S]*?)(?=\n【分镜脚本】|$)/);
    if (hookMatch) {
      result.hook = hookMatch[1].trim();
    }

    // 提取分镜
    const segmentRegex = /【镜头\d+】画面：([^|]+)\s*\|\s*口播：([^|]+)\s*\|\s*时长：(\d+秒)/g;
    let segmentMatch;
    while ((segmentMatch = segmentRegex.exec(response)) !== null) {
      result.segments.push({
        visual: segmentMatch[1].trim(),
        voiceover: segmentMatch[2].trim(),
        duration: segmentMatch[3].trim(),
      });
    }

    // 如果解析失败，使用备用方案
    if (result.segments.length === 0) {
      const lines = response.split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (line.includes('画面') && line.includes('口播')) {
          const parts = line.split('|');
          if (parts.length >= 2) {
            const visualMatch = parts[0].match(/画面[：:]\s*(.+)/);
            const voiceoverMatch = parts[1].match(/口播[：:]\s*(.+)/);
            const durationMatch = parts[2]?.match(/(\d+秒)/);
            if (visualMatch && voiceoverMatch) {
              result.segments.push({
                visual: visualMatch[1].trim(),
                voiceover: voiceoverMatch[1].trim(),
                duration: durationMatch ? durationMatch[1] : `${avgSegmentDuration}秒`,
              });
            }
          }
        }
      }
    }

    // 提取CTA
    const ctaMatch = response.match(/【结尾CTA】\s*([\s\S]*?)(?=\n【BGM|$$)/);
    if (ctaMatch) {
      result.cta = ctaMatch[1].trim();
    }

    // 提取BGM
    const bgmNameMatch = response.match(/曲风[：:]\s*([^\n]+)/);
    const bgmReasonMatch = response.match(/推荐理由[：:]\s*([^\n]+)/);
    if (bgmNameMatch) {
      result.bgm = {
        name: bgmNameMatch[1].trim(),
        reason: bgmReasonMatch ? bgmReasonMatch[1].trim() : bgmInfo.reason
      };
    }

    // 如果解析结果不完整，使用默认值
    if (!result.hook) {
      result.hook = selectedTitle || '这个理财技巧你一定要知道！';
    }
    if (result.segments.length === 0) {
      result.segments = [{
        visual: '博主近景，表情真诚',
        voiceover: '大家好，今天分享一个实用的理财方法。',
        duration: `${avgSegmentDuration}秒`
      }];
    }
    if (!result.cta) {
      result.cta = '想了解更多？微信搜索【微证券】！';
    }

    return result;
  } catch (e) {
    console.error('Video script parse error:', e);
    return {
      hook: selectedTitle || '这个理财技巧你一定要知道！',
      segments: [{
        visual: '博主近景，表情真诚',
        voiceover: '大家好，今天分享一个实用的理财方法。',
        duration: `${avgSegmentDuration}秒`
      }],
      cta: '想了解更多？微信搜索【微证券】！',
      bgm: { name: bgmInfo.style, reason: bgmInfo.reason }
    };
  }
}

// 生成标签（限制10个以内）
async function generateTags(
  topicType: TopicType,
  keywords?: string,
  title?: string,
  content?: string
): Promise<string[]> {
  const prompt = `根据以下内容生成小红书标签（不超过10个，不含#号）：

类型：${TOPIC_TYPE_PROMPTS[topicType]}
关键词：${keywords || ''}
标题：${title || ''}
内容摘要：${content?.substring(0, 200) || ''}

要求：简洁、有热度、符合小红书风格。直接输出6-8个标签，用逗号分隔，不要其他内容。`;

  const response = await callLLM(prompt);
  return response.split(/[,，、\n]/)
    .map(t => t.trim())
    .filter(t => t && t.length <= 10)
    .slice(0, 10); // 最多10个标签
}

// 生成生图口令
async function generateImagePrompt(title: string, content: string, keywords?: string): Promise<string> {
  const prompt = `根据以下小红书内容生成一张高质量封面配图的AI生图口令：

标题：${title || ''}
内容摘要：${content?.substring(0, 300) || ''}
关键词：${keywords || ''}

要求：
1. 图片中必须包含文章标题"${title || ''}"，标题文字要醒目且居中显示，字体大而清晰
2. 风格：小红书爆款封面风格，设计感强，吸引眼球
3. 色调：明亮高级，配色和谐，符合内容主题
4. 排版：标题居中大字排版，搭配装饰元素（如色块、几何图形、渐变背景等）
5. 比例：3:4竖版，适合手机浏览
6. 设计细节：标题文字需要有设计感（如加粗、描边、阴影、渐变填充等效果），背景要有层次感
7. 整体效果：一眼就能被吸引，有强烈的信息传达感

直接输出生图口令，中文描述即可，重点突出画面的设计感和标题的视觉冲击力。`;

  try {
    const response = await callLLM(prompt);
    return response.trim();
  } catch (error) {
    console.error('Generate image prompt error:', error);
    return `小红书风格封面，标题"${title}"醒目居中大字，高级设计感，3:4竖版，明亮配色，装饰元素丰富，吸引眼球`;
  }
}

// 生成配图（使用AI生图模型）
async function generateImages(title: string, content: string, ratio: string = '3:4'): Promise<string[]> {
  try {
    // 生成小红书风格的封面图prompt
    const imagePrompt = `小红书爆款封面风格，标题"${title}"醒目居中大字显示，设计感强，3:4竖版，明亮高级配色，装饰元素丰富（色块、几何图形、渐变背景），标题文字有视觉冲击力（加粗描边阴影效果），背景有层次感，吸引眼球`;
    
    // 动态导入SDK
    const sdk: Record<string, any> = await import('coze-coding-dev-sdk');
    const ImageGenerationClient = sdk.ImageGenerationClient;
    const Config = sdk.Config;
    const HeaderUtils = sdk.HeaderUtils;
    
    const config = new Config();
    const client = new ImageGenerationClient(config, {});
    
    const response = await client.generate({
      prompt: imagePrompt,
      size: '2K',
      model: 'doubao-seedream-5-0-260128',
      responseFormat: 'url',
    });
    
    const helper = client.getResponseHelper(response);
    if (helper.success && helper.imageUrls?.length > 0) {
      return helper.imageUrls;
    }
    
    console.error('Image generation helper failed:', helper.errorMessages);
    return [];
  } catch (error) {
    console.error('AI image generation error:', error);
    return [];
  }
}

// 种草力评分
async function calculateEngagementScore(
  title: string,
  content: string,
  tags: string[]
): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 7; // 默认7分，符合要求

  // 标题评估
  if (title.length <= 20) {
    reasons.push('标题长度适中');
    score += 0.5;
  }
  if (title.includes('#') || /[\u{1F300}-\u{1F9FF}]/u.test(title)) {
    reasons.push('标题包含emoji/标签');
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
