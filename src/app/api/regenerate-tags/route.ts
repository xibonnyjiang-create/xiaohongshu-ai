import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { topicType, keywords, selectedTitle, content } = await request.json();
    
    // 根据主题类型确定行业标签池
    const industryKeywords: Record<string, string[]> = {
      finance: ['理财', '投资', '基金', '股票', '基金定投', '资产配置', '收益', '复利', '储蓄', '国债', '理财知识'],
      insurance: ['保险', '重疾险', '医疗险', '寿险', '意外险', '保障', '理赔', '投保', '保险配置', '家庭保障'],
      'financial_selling': ['基金', '理财', '基金定投', '稳健收益', '资产增值', '长期投资'],
      lifestyle: ['生活', '日常', '技巧', '分享', '好物', '种草', '家居', '美食', '穿搭'],
    };
    
    const pool = industryKeywords[topicType] || industryKeywords.lifestyle;
    
    const prompt = `根据以下内容生成5-8个话题标签：

主题：${topicType}
关键词：${keywords?.join(', ') || ''}
标题：${selectedTitle || ''}
正文摘要：${content?.substring(0, 200) || ''}

要求：
1. 每个标签2-5个字
2. 要贴合内容主题
3. 包含热门话题词
4. 避免过于生僻
5. 总数控制在8个以内

请以JSON格式输出：
{
  "tags": ["标签1", "标签2", ...]
}`;

    const tagsText = await callLLM(prompt);
    
    // 解析标签
    let tags: string[] = [];
    try {
      const jsonMatch = tagsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        tags = parsed.tags || [];
      }
    } catch {
      // 如果解析失败，手动提取
      const tagMatches = tagsText.match(/["']([^"']+)["']/g);
      if (tagMatches) {
        tags = tagMatches.map(t => t.replace(/["']/g, '')).slice(0, 8);
      }
    }
    
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Regenerate tags error:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
