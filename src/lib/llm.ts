// LLM调用工具函数

// 调用LLM（非流式）
export async function callLLM(prompt: string, systemPrompt?: string): Promise<string> {
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
          content: systemPrompt || '你是一位资深的投资理财内容专家，在小红书、知乎等平台拥有百万粉丝。你的内容专业、深入、有洞见，同时又通俗易懂、接地气。你擅长将复杂的金融知识用生动的案例和通俗的语言讲清楚，深受用户信赖。',
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
export async function* callLLMStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
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
          content: systemPrompt || '你是一位资深的投资理财内容专家，在小红书、知乎等平台拥有百万粉丝。你的内容专业、深入、有洞见，同时又通俗易懂、接地气。你擅长将复杂的金融知识用生动的案例和通俗的语言讲清楚，深受用户信赖。',
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
