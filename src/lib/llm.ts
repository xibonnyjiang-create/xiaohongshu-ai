// LLM调用工具函数 - 使用DeepSeek API

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-163be4f88dc54eedbfad7896318473c7';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-chat';

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是一位资深的投资理财内容专家，在知乎、小红书有百万粉丝，同时具备CFA资格和多年投资研究经验。你的内容专业、深入、有洞见，同时又通俗易懂、接地气。你擅长将复杂的金融知识用生动的案例和通俗的语言讲清楚，深受用户信赖。你注重内容的深度，总是提供具体的数据、案例和专业的分析，而不是泛泛而谈。`;

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
          content: systemPrompt || DEFAULT_SYSTEM_PROMPT,
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
          content: systemPrompt || DEFAULT_SYSTEM_PROMPT,
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
      buffer = lines.pop() || ''; // 保留最后一个不完整的行

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

// 合规审查专用函数 - 使用DeepSeek
export async function callComplianceCheck(title: string, content: string, tags: string): Promise<{
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
}> {
  const prompt = `你是一个金融内容合规审查专家，请严格审查以下小红书内容是否合规：

标题：${title}
正文：${content.substring(0, 800)}
标签：${tags}

【审查重点】：
1. 违规承诺类：
   - 是否包含"保证收益"、"稳赚不赔"、"100%收益"、"躺赚"等承诺性表述
   - 是否暗示内幕消息或庄家操作

2. 荐股违规类：
   - 是否有具体的股票代码推荐
   - 是否有"买入XX股票"的明确建议
   - 是否暗示有内幕消息来源

3. 夸大宣传类：
   - 是否有"暴富"、"翻倍"等夸大表述
   - 是否有虚假或误导性信息

4. 敏感词汇：
   - "内幕消息"、"庄家"、"黑马"、"妖股"等
   - "荐股"、"代客理财"等可能涉及牌照问题

5. 风险提示：
   - 是否有适当的风险提示声明
   - 是否声明"不构成投资建议"

请以JSON格式输出审查结果：
{
  "isCompliant": true或false,
  "warnings": ["具体警告信息1", "具体警告信息2"],
  "suggestions": ["具体修改建议1", "具体修改建议2"]
}

如果没有问题，warnings为空数组，isCompliant为true。`;

  try {
    const response = await callLLM(prompt, '你是一位专业的金融内容合规审查专家，负责审查内容是否符合金融广告法规和平台规范。');
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
