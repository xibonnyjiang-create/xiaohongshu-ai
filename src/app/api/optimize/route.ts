import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { PersonaType } from '@/lib/types';

// 博主人设映射
function getPersonaPrompt(personaType?: PersonaType, customPersona?: string): string {
  if (!personaType) return '';
  
  const personas: Record<PersonaType, string> = {
    hardcore_uncle: '硬核财经大叔：专业、理性、数据说话、深度分析、犀利点评',
    sweet_girl: '甜妹理财科普：可爱、亲切、通俗易懂、闺蜜感、温暖治愈',
    veteran_trader: '实战派老股民：经验丰富、接地气、实战案例、避坑指南、真诚分享',
    finance_scholar: '金融学霸人设：专业术语、逻辑清晰、学术派、数据支撑、严谨分析',
    roaster: '吐槽型财经博主：幽默、犀利、一针见血、敢说真话、接地气',
    custom: customPersona || '专业理财博主',
  };
  return `博主人设：${personas[personaType]}。`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, title, tags, personaType, customPersona } = body as {
      type: 'content' | 'title' | 'tags';
      content?: string;
      title?: string;
      tags?: string[];
      personaType?: PersonaType;
      customPersona?: string;
    };

    const personaPrompt = getPersonaPrompt(personaType, customPersona);
    let result: string | string[] = '';

    switch (type) {
      case 'content':
        result = await optimizeContent(content || '', personaPrompt);
        break;
      case 'title':
        result = await optimizeTitle(title || '', personaPrompt);
        break;
      case 'tags':
        result = await optimizeTags(tags || []);
        break;
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Optimize error:', error);
    return NextResponse.json({ success: false, error: '优化失败' }, { status: 500 });
  }
}

async function optimizeContent(content: string, personaPrompt: string): Promise<string> {
  const prompt = `你是一个小红书内容优化专家。请优化以下内容，让它更加吸引人、更有原生感：

${personaPrompt}

【原文】
${content}

【优化要求】
1. 保持核心观点不变
2. 增加口语化表达，让内容更接地气
3. 适当增加个人感受和观点
4. 让段落更易读，可以增加emoji
5. 增加互动感，引导读者评论
6. 确保内容不违反合规要求

请直接输出优化后的内容：`;

  return await callLLM(prompt);
}

async function optimizeTitle(title: string, personaPrompt: string): Promise<string> {
  const prompt = `你是一个小红书标题优化专家。请优化以下标题，让它更吸引人、更有点击欲：

${personaPrompt}

【原标题】
${title}

【优化要求】
1. 保持核心信息不变
2. 增加悬念或好奇心
3. 使用更口语化的表达
4. 适当增加emoji
5. 标题长度20-30字
6. 避免过度夸张

请直接输出优化后的标题：`;

  return await callLLM(prompt);
}

async function optimizeTags(tags: string[]): Promise<string[]> {
  const prompt = `你是一个小红书SEO专家。请优化以下标签，让内容更容易被发现：

【原标签】
${tags.map(t => '#' + t).join(' ')}

【优化要求】
1. 保留核心标签
2. 增加相关热门标签
3. 标签总数控制在6-8个
4. 只输出标签文本，用逗号分隔

请直接输出优化后的标签：`;

  const response = await callLLM(prompt);
  return response.split(/[,，、\n]/).map((tag) => tag.trim().replace(/^#/, '')).filter((tag) => tag.length > 0 && tag.length < 15);
}
