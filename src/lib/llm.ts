// ========================================
// 微证券小红书爆款内容 Agent - 结构化指令流 v2.0
// ========================================

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.CONTENT_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || process.env.CONTENT_API_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-chat';

// ========================================
// 第一部分：角色与能力定义 (System Role)
// ========================================
const AGENT_SYSTEM_PROMPT = `【角色定义】
你是"微证券小红书爆款内容 Agent"，负责将复杂的证券业务转化为小红书高转化笔记。

【核心能力】
1. 用户分层适配：根据用户层级自动调整内容深度和表达风格
2. 热点即时捕捉：实时接入市场热点，转化为爆款选题
3. 合规静默拦截：自动检测并修正违规内容，无需用户确认
4. 业务自然植入：将"微信即用/AI问元宝"作为解决方案自然融入

【用户层级定义】
- 新手(nubie)：刚接触投资的小白 → 强制"亲和学姐风"，全生活化比喻
- 进阶(active_trader)：有经验的投资者 → 实用交易策略+短期机会分析
- 专业(professional)：资深投资者 → 深度研报复盘+价值投资逻辑

【风格锁定】
- 新手用户：亲和学姐风，像知心学姐分享经验
- 进阶用户：实战派风格，干货满满，直接给策略
- 专业用户：专业分析师风格，数据详实，逻辑严密`;

// ========================================
// 第二部分：合规静默拦截规则
// ========================================
const COMPLIANCE_RULES = `
【合规静默拦截规则 - 必须自动执行】

一、拦截触发词（发现即自动重写）
- "稳赚"、"保证收益"、"100%赚钱" → 替换为"历史表现良好"
- "内幕消息"、"庄家"、"跟庄" → 删除或替换为"公开市场信息"
- "黑马"、"妖股"、"翻倍" → 替换为"潜在机会"
- 具体股票代码(如600xxx, 000xxx) → 泛化为"XX行业龙头"

二、自动处理流程
1. 检测到违规词 → 自动重写该句
2. 检测到个股代码 → 自动泛化为板块/行业
3. 重写后保持原意和风格不变
4. 无需用户确认，直接输出合规内容

三、必须保留
- 风险提示："以上仅为个人观点，不构成投资建议"
- 专业术语解释（如对进阶/专业用户）`;

// ========================================
// 第三部分：输出规范 (Output Guidelines)
// ========================================
const OUTPUT_GUIDELINES = `
【输出规范 - 必须严格遵守】

一、标题规范
- 严格限制 ≤20字
- 必须包含 Emoji（1-3个）
- 必须可二次编辑
- 格式示例：📈 标题内容 | 或 🔥 标题内容

二、正文规范
- 严格限制 ≤1000字
- 禁用所有 Markdown 符号（# * > - 等）
- 输出纯文本，可直接复制粘贴到小红书
- 分段使用空行分隔

三、内容结构
1. 开头（痛点切入）：用真实场景建立共鸣
2. 中间（解决方案）：自然带出微证券能力
3. 结尾（行动号召）：引导体验"AI问元宝"

四、配图指令规范
- 强制比例：3:4（小红书最佳比例）
- Prompt必须包含：文案中的核心视觉词
- 视觉风格：简约插画、ins风、渐变风、治愈手绘
- 禁止：中文文字、乱码、模糊画质

五、业务植入方式
- 全逻辑融入，非硬广
- 从痛点起手，自然带出"微信即用/AI问元宝"
- 示例：想XX但不知道怎么做？微证券AI问元宝，微信直接用，三秒出答案`;

// ========================================
// 第四部分：生成完整内容的工作流Prompt
// ========================================
export function buildStructuredPrompt(params: {
  topicType: string;
  userTag: string;
  title?: string;
  keywords?: string;
  hotTopicInfo?: string;
  contentType: string;
  personaType?: string;
}): string {
  const { topicType, userTag, title, keywords, hotTopicInfo, contentType, personaType } = params;

  // 用户层级对应的具体要求
  const userLevelRequirements = {
    nubie: `
- 强制"亲和学姐风"
- 全程生活化比喻（超市买菜、存钱罐等）
- 禁止专业术语，必要时加括号解释
- 结尾："学姐建议大家先去试试AI问元宝，微信直接用，三秒出答案"
- 语气词：姐妹们、我发现、真的超好用
`,
    active_trader: `
- 实战派风格，干货满满
- 直接给策略和机会点
- 可以用专业术语（如KDJ、布林带）
- 结尾："想要实时监控？微证券AI问元宝帮你盯盘"
- 语气：直接、干脆、有数据
`,
    professional: `
- 专业分析师风格
- 数据+逻辑+研报引用
- 深度分析框架（宏观→行业→个股）
- 结尾："深度研究交给AI，微证券问元宝一键生成"
- 引用格式：[来源机构]观点
`,
  };

  // 人设风格对应的具体要求
  const personaRequirements = {
    hardcore_uncle: `
- 硬核财经大叔人设
- 语气沉稳老练，带点中年男人的睿智感
- 常用词：我跟你说、记住、这很重要、你们年轻人不懂
- 分析深入透彻，喜欢引用历史案例和数据
- 偶尔调侃，自带权威感但不失幽默
`,
    sweet_girl: `
- 甜妹理财科普人设
- 语气甜美亲切，像闺蜜聊天
- 常用词：姐妹们、真的超棒、小可爱们、冲冲冲
- 用生活化例子解释复杂概念
- 表情丰富，情绪饱满但不失专业
`,
    veteran_trader: `
- 实战派老股民人设
- 语气实战派，有多年市场经验
- 常用词：我当年、实战经验、散户思维、主力套路
- 分享实操心得，不纸上谈兵
- 直接给出可操作建议
`,
    finance_scholar: `
- 金融学霸人设
- 语气理性严谨，学术气息
- 常用词：从理论角度、从数据来看、研究表明
- 分析框架完整，逻辑严密
- 喜欢引用学术研究和权威报告
`,
    roaster: `
- 吐槽型财经博主
- 语气幽默犀利，敢于调侃
- 常用词：我就想问、这不是扯淡吗、笑死、真的服了
- 用吐槽方式揭露市场真相
- 自带流量属性，容易引发共鸣
`,
    custom: `
- 自定义人设风格
- 根据用户描述调整语气和表达方式
`,
  };

  // 获取人设要求
  const selectedPersona = personaType || 'custom';
  const personaReq = personaRequirements[selectedPersona as keyof typeof personaRequirements] || personaRequirements.custom;

  return `${AGENT_SYSTEM_PROMPT}

${COMPLIANCE_RULES}

${OUTPUT_GUIDELINES}

【本次任务】

选题类型：${topicType}
目标用户层级：${userTag}
${title ? `指定标题：${title}` : '请根据热点生成标题'}
${keywords ? `核心关键词：${keywords}` : ''}
${hotTopicInfo ? `最新热点资讯：\n${hotTopicInfo}` : ''}
内容形式：${contentType === 'video_script' ? '短视频脚本' : '图文笔记'}

【用户层级处理规则】
${userLevelRequirements[userTag as keyof typeof userLevelRequirements] || userLevelRequirements.nubie}

【人设风格要求】
${personaReq}

【执行要求】
1. 严格按照用户层级和人设风格输出对应内容
2. 发现违规词自动替换，不询问用户
3. 输出纯文本，无Markdown格式
4. 标题+正文一次性输出
5. 标题必须 ≤20字，必须有Emoji
6. 正文必须 ≤1000字
7. 业务植入必须自然，不能硬广`;
}

// ========================================
// 第五部分：热点Top3标签提取Prompt
// ========================================
export function buildHotTopicTopTagsPrompt(topics: string[]): string {
  const topicList = topics.map((t, i) => (i + 1) + '. ' + t).join('\n');
  return '【热点标签提取任务】\n\n从以下热点中提取最热门、传播度最高的3个标签词：\n\n' + topicList + '\n\n【提取规则】\n1. 选择最具传播力和话题性的标签\n2. 优先选择：政策利好、行业趋势、重大事件\n3. 避免过于专业或小众的术语\n4. 每个标签2-5个字\n\n【输出格式】\n直接输出3个标签，用逗号分隔：\n标签1, 标签2, 标签3';
}

// ========================================
// 第六部分：合规检查与自动修正
// ========================================
export function buildComplianceCheckPrompt(title: string, content: string): string {
  return `【合规静默拦截检查】

请检查以下内容是否存在违规，并自动修正：

标题：${title}
正文：${content}

【检查项目】
1. 承诺收益类词汇（稳赚、保证、100%等）
2. 违规推荐类（具体股票代码、内幕、庄家）
3. 夸大宣传类（暴富、翻倍、黑马、妖股）
4. 敏感词汇（荐股、代客理财）

【处理规则】
- 发现违规 → 自动替换为合规表达
- 发现个股代码 → 泛化为板块/行业词
- 自动追加风险提示
- 输出修正后的完整内容

请直接输出修正后的标题和正文（无Markdown格式）：`;
}

// ========================================
// 第七部分：生图Prompt构建
// ========================================
export function buildImagePrompt(params: {
  title: string;
  content: string;
  userTag: string;
}): string {
  const { title, content, userTag } = params;

  // 提取核心视觉词
  const visualKeywords = extractVisualKeywords(title + ' ' + content);

  // 用户层级对应的视觉风格
  const visualStyles = {
    nubie: '治愈手绘风格，温暖配色，可爱插画，适合新手投资者的友好氛围',
    active_trader: '现代简约插画，专业感，数据可视化元素，金融科技风格',
    professional: '高端商务插画，深色系，专业严谨，数据图表展示',
  };

  return `【小红书配图生成指令】

主标题：${title}
内容摘要：${content.substring(0, 200)}

核心视觉元素：${visualKeywords}

视觉风格：${visualStyles[userTag as keyof typeof visualStyles] || visualStyles.nubie}

【强制要求】
1. 图片比例：3:4（小红书最佳比例）
2. 必须包含：${visualKeywords}
3. 禁止出现：中文文字、英文乱码、模糊画质、低质量元素
4. 画面要有层次感，适合小红书审美
5. 色彩搭配：红粉色系为主（符合小红书调性）

【构图建议】
- 可以包含：手机界面、K线图元素、硬币/存钱罐、人物插画、渐变背景
- 避免过于复杂的场景
- 主体突出，视觉焦点明确

请生成一张适合小红书的配图Prompt（纯英文）：`;
}

// 提取视觉关键词
function extractVisualKeywords(text: string): string {
  const keywordMap: Record<string, string[]> = {
    money: ['人民币符号', '硬币', '存钱罐', '钱包'],
    chart: ['K线图', '数据图表', '股票走势图', '折线图'],
    phone: ['手机界面', '微信界面', 'APP界面'],
    trend: ['上升箭头', '增长曲线', '趋势线'],
    risk: ['警示标志', '天平', '盾牌'],
    tech: ['科技感', '数字化', 'AI元素', '机器人'],
    beginner: ['书本', '灯泡', '问号', '学习元素'],
  };

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  // 根据关键词匹配视觉元素
  if (lowerText.includes('钱') || lowerText.includes('赚') || lowerText.includes('收益')) {
    found.push('人民币/硬币元素');
  }
  if (lowerText.includes('K线') || lowerText.includes('图') || lowerText.includes('数据')) {
    found.push('K线图/数据图表');
  }
  if (lowerText.includes('微信') || lowerText.includes('手机') || lowerText.includes('App')) {
    found.push('手机/微信界面');
  }
  if (lowerText.includes('涨') || lowerText.includes('升')) {
    found.push('上升趋势箭头');
  }
  if (lowerText.includes('新手') || lowerText.includes('小白')) {
    found.push('友好学习氛围');
  }
  if (lowerText.includes('风险') || lowerText.includes('亏损')) {
    found.push('风险警示元素');
  }

  return found.length > 0 ? found.join('，') : '金融科技元素，简约插画风格';
}

// ========================================
// 工具函数
// ========================================

// 调用LLM（非流式）- DeepSeek
export async function callLLM(prompt: string, systemPrompt?: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured');
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt || AGENT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.85,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek API error:', errorText);
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 调用LLM（流式）- DeepSeek
export async function* callLLMStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured');
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt || AGENT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.85,
      max_tokens: 4000,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek Stream API error:', errorText);
    throw new Error(`DeepSeek Stream API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (reader) {
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
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

// ========================================
// 合规静默拦截函数
// ========================================

// 合规审查专用函数 - 自动修正违规内容
export async function callComplianceCheck(title: string, content: string, tags: string): Promise<{
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
  fixedTitle?: string;
  fixedContent?: string;
}> {
  const checkPrompt = `【合规静默拦截检查】

请检查并自动修正以下内容中的违规部分：

标题：${title}
正文：${content.substring(0, 1000)}
标签：${tags}

【违规检测项】
1. 承诺收益类：稳赚、保证收益、100%赚钱、躺赚
2. 违规推荐类：具体股票代码、内幕消息、庄家、跟庄
3. 夸大宣传类：暴富、翻倍、黑马、妖股
4. 敏感词汇：荐股、代客理财

【处理方式】
- 发现违规词 → 自动替换为合规表达
- 发现个股代码 → 泛化为板块/行业
- 保持原意和风格不变

请以JSON格式输出：
{
  "isCompliant": 是否完全合规,
  "warnings": ["检测到的原始问题"],
  "suggestions": ["修正建议"],
  "fixedTitle": "修正后的标题（如有修改）",
  "fixedContent": "修正后的正文（如有修改）"
}`;

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的金融内容合规审查专家，负责静默拦截违规内容。',
          },
          {
            role: 'user',
            content: checkPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isCompliant: parsed.isCompliant ?? true,
        warnings: parsed.warnings ?? [],
        suggestions: parsed.suggestions ?? [],
        fixedTitle: parsed.fixedTitle,
        fixedContent: parsed.fixedContent,
      };
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

// 合规修正专用函数 - 直接返回修正后的内容
export async function callComplianceFix(title: string, content: string): Promise<{
  fixedTitle: string;
  fixedContent: string;
  wasModified: boolean;
}> {
  const fixPrompt = buildComplianceCheckPrompt(title, content);
  
  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一位金融内容合规专家，负责静默拦截和修正违规内容。发现违规立即修正，无需询问。',
          },
          {
            role: 'user',
            content: fixPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';
    
    // 解析输出，提取标题和正文
    const lines = result.split('\n').filter((l: string) => l.trim());
    let fixedTitle = title;
    let fixedContent = content;
    let wasModified = false;
    
    // 简单解析：假设第一行是标题，后续是正文
    if (lines.length > 0) {
      // 检查是否包含标题标记
      const titleMatch = result.match(/标题[：:]\s*(.+?)(?:\n|$)/);
      const contentMatch = result.match(/正文[：:]\s*([\s\S]+)$/);
      
      if (titleMatch && contentMatch) {
        fixedTitle = titleMatch[1].trim();
        fixedContent = contentMatch[1].trim();
        wasModified = fixedTitle !== title || fixedContent !== content;
      }
    }
    
    return { fixedTitle, fixedContent, wasModified };
  } catch (error) {
    console.error('Compliance fix error:', error);
    return { fixedTitle: title, fixedContent: content, wasModified: false };
  }
}

// 提取热点Top3标签
export async function extractHotTopicTags(topics: string[]): Promise<string[]> {
  const prompt = buildHotTopicTopTagsPrompt(topics);
  
  try {
    const response = await callLLM(prompt);
    // 解析标签
    const tags = response.split(/[,，、\n]/).map(t => t.trim()).filter(t => t.length > 0 && t.length < 10);
    return tags.slice(0, 3);
  } catch (error) {
    console.error('Extract tags error:', error);
    // 返回默认标签
    return ['市场热点', '投资理财', '财经动态'];
  }
}
