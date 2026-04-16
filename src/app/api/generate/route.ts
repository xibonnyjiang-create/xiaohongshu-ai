import { NextRequest } from 'next/server';
import { TopicType, PersonaType, TitleCandidate, OutputFormat, VideoDuration } from '@/lib/types';
import { callLLM, callLLMStream, callComplianceCheck } from '@/lib/llm';
import { PERSONA_STYLE_CONFIG, WEIXIN_SECURITY_MAPPING, MARKET_HOT_SENSITIVE_WORDS, containsSensitiveWords } from '@/lib/constants';

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

            const MAX_CONTENT_LENGTH = 480; // 最大字数限制（留20字余量）

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
  styleConfig?: { titleStyle: string; tone: string; emojiDensity: string }
): Promise<TitleCandidate[]> {
  const topicLabel = TOPIC_TYPE_PROMPTS[topicType] || '通用内容';
  const persona = personaType || 'custom';
  const config = styleConfig || PERSONA_STYLE_CONFIG.custom;
  const isMarketHot = topicType === 'market_hot';

  // 市场热点场景添加敏感词过滤说明
  const sensitiveWordWarning = isMarketHot 
    ? `\n\n【重要】市场热点场景禁止提及以下内容：
- 虚拟货币相关：数字货币、加密货币、虚拟币、比特币、以太坊、狗狗币、NFT、元宇宙、区块链虚拟货币、炒币、币圈等
- 高风险衍生品：期货、外汇杠杆、保证金交易、杠杆交易等
- 非法集资相关：原始股、原始股投资、资金盘、传销币、ICO等
请确保生成的标题不包含上述任何敏感词汇！`
    : '';

  const prompt = `【标题生成】
请为以下场景生成3个小红书爆款标题。

【场景信息】
- 选题类型：${topicLabel}
- 人设：${persona}
- 关键词：${keywords || '未指定'}
${hotTop3Tags?.length ? `- 热门标签：${hotTop3Tags.join('、')}` : ''}
${hotTopicInfo ? `- 热点背景：\n${hotTopicInfo.substring(0, 200)}` : ''}
${sensitiveWordWarning}

【标题要求】严格遵守！
1. 总长度：≤20字（emoji+符号+汉字全部算在内）
2. 必须包含：1-2个Emoji
3. 标题风格：${config.titleStyle}
4. 语气：${config.tone}
5. 不要使用任何Markdown格式
${isMarketHot ? '6. 严禁包含任何敏感词汇！' : ''}

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

  // 如果过滤后标题不足3个，补充默认标题
  while (titles.length < 3) {
    const fallbackTitle = isMarketHot 
      ? `📈 ${keywords || '市场热点解读'}`
      : `📈 ${keywords || '内容解读'}`;
    // 再次检查
    if (!isMarketHot || !containsSensitiveWords(fallbackTitle).hasSensitive) {
      titles.push({
        title: fallbackTitle,
        style: config.titleStyle as TitleCandidate['style'],
      });
    } else {
      titles.push({
        title: `📊 ${keywords || '财经解读'}`,
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
  styleConfig?: { tone: string; emojiDensity: string; titleStyle: string },
  weixinMapping?: { feature: string; highlight: string }[]
): Promise<AsyncGenerator<string>> {
  const topicLabel = TOPIC_TYPE_PROMPTS[topicType] || '通用内容';
  const analysisLevel = deepAnalysis ? '深度分析：专业数据支撑、机构观点引用' : '标准分析：简洁易懂';
  const config = styleConfig || PERSONA_STYLE_CONFIG.custom;
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

  let prompt = `【重要】请严格控制字数：400-500字（全文含emoji总计）${sensitiveWordWarning}

标题：${selectedTitle || '待定'}
关键词：${keywords || ''}
${hotTop3Tags?.length ? `标签：${hotTop3Tags.join('、')}` : ''}
${mappingStr}

风格：${config.tone}，${config.emojiDensity}

必须包含：
- 投资风险提示
- 微信搜索微证券
- 纯文本格式，无Markdown
${isMarketHot ? '- 严禁提及任何虚拟货币或高风险投资内容' : ''}

结构（约450字）：
💰 开头1-2句
⭐ 要点1，3-4句
⭐ 要点2，3-4句
✨ 总结1句
⚠️ 风险提示
👉 微信搜索微证券

现在生成，正好400-500字：`;

  const stream = await callLLMStream(prompt);
  return stream;
}

// 生成视频脚本
async function generateVideoScript(
  topicType: TopicType,
  keywords?: string,
  selectedTitle?: string,
  personaType?: string,
  styleConfig?: { tone: string; emojiDensity: string; titleStyle: string },
  weixinMapping?: { feature: string; highlight: string }[],
  durationConfig?: { totalSeconds: number; segmentCount: number; description: string }
): Promise<{ hook: string; segments: { visual: string; voiceover: string; duration: string; action?: string }[]; cta: string; bgm?: { name: string; reason: string } }> {
  const config = styleConfig || PERSONA_STYLE_CONFIG.custom;
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

  const prompt = `【视频脚本生成 - 严格格式】${sensitiveWordWarning}
请为以下内容生成小红书视频脚本，必须严格遵守格式要求。

【基本信息】
- 场景：${TOPIC_TYPE_PROMPTS[topicType]}
- 人设：${personaType || 'custom'}
- 标题：${selectedTitle || '待定'}
- 关键词：${keywords || '未指定'}
${mappingStr ? `- 微证券功能植入点：${mappingStr}` : ''}

【硬性要求】
1. 【前置合规】严禁出现以下内容：
   - 个股推荐（如"买入XX股票"）
   - 收益承诺（如"稳赚"、"必涨"、"保证盈利"）
   - 夸大宣传（如"一夜暴富"、"躺赚"）
   - 绝对化用语（如"一定"、"肯定"、"百分百"）
2. 黄金3秒钩子：制造悬念/冲突/共鸣，吸引用户停留
3. 分镜数量：${duration.segmentCount}个，每个${avgSegmentDuration}秒左右
4. 总时长：${duration.totalSeconds}秒
5. 风险提示必须融入内容，不能只在结尾

【分镜格式 - 强制使用以下格式，每行一个分镜】
【镜头1】画面：[具体画面描述] | 口播：[对应的口播台词，3-5句] | 时长：${avgSegmentDuration}秒
【镜头2】画面：... | 口播：... | 时长：...
...（共${duration.segmentCount}个分镜）

【必须包含的元素】
1. 开头钩子：制造悬念或冲突（如痛点提问、反差数据）
2. 内容主体：2-3个实用要点，每个要点有画面+口播
3. 风险融入：在中间或结尾自然插入风险提示（如"虽然工具方便，但大家要根据自己风险偏好来定"）
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
