import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { title, content, warnings } = await request.json();
    
    if (!content || !warnings || warnings.length === 0) {
      return new Response(JSON.stringify({ error: '参数不完整' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `你是一个内容合规修正助手。请修正以下内容中的不合规部分：

标题：${title || '无标题'}

原文内容：
${content}

需要修正的问题：
${warnings.map((w: string) => `- ${w}`).join('\n')}

【修正要求】
1. 保持原文的风格和语气
2. 只修正不合规的部分，其他内容保持不变
3. 将"保证收益"、"稳赚不赔"等违规词改为合规表达，如"有望获得"、"历史上表现良好"等
4. 不要推荐具体股票代码，用行业、板块代指
5. 文末加上"以上仅为个人观点，不构成投资建议"

请直接输出修正后的完整内容：`;

    const fixedContent = await callLLM(prompt);

    return new Response(JSON.stringify({ 
      fixedContent: fixedContent.trim(),
      success: true 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Compliance fix error:', error);
    return new Response(JSON.stringify({ error: '修正失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
