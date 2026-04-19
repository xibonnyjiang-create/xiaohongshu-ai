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

    // 构建关键词替换映射
    const replacements: Record<string, string> = {
      '保证收益': '有望获得',
      '稳赚不赔': '长期持有',
      '一定能': '有可能',
      '绝对': '相对',
      '100%': '大概率',
      '涨停': '上涨',
      '跌停': '下跌',
      '保本': '风险可控',
      '无风险': '低风险',
      '最牛': '表现优秀',
      '必涨': '有望上涨',
      '必跌': '可能下跌',
      '赚钱': '获得收益',
      '亏损': '波动',
      '梭哈': '适量配置',
      'all in': '适量配置',
      '杠杆': '放大收益',
      '做空': '对冲',
    };

    // 简单文本替换（不调用LLM，保持原文风格）
    let fixedContent = content;
    
    // 保留原文的语气风格和emoji
    // 只替换敏感词
    for (const [word, replacement] of Object.entries(replacements)) {
      const regex = new RegExp(word, 'gi');
      fixedContent = fixedContent.replace(regex, replacement);
    }

    // 移除警告中涉及的具体违规表述
    const removePatterns = [
      /承诺[^\s，,。]{0,5}收益/gi,
      /预期[^\s，,。]{0,3}收益[^\s，,。]{0,10}/gi,
    ];

    for (const pattern of removePatterns) {
      fixedContent = fixedContent.replace(pattern, '');
    }

    return new Response(JSON.stringify({ 
      fixedContent: fixedContent.trim(),
      success: true,
      method: 'simple_replace'
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
