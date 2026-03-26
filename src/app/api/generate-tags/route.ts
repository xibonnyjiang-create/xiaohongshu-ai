import { NextRequest } from 'next/server';
import { TopicType } from '@/lib/types';
import { callLLM } from '@/lib/llm';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪',
  beginner_guide: '小白科普',
  advanced_invest: '进阶投资',
  professional_analysis: '专业分析',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topicType, 
      keywords, 
      title,
      content,
      previousTags,
    } = body as {
      topicType: TopicType;
      keywords?: string;
      title?: string;
      content?: string;
      previousTags?: string[];
    };

    const prompt = `你是小红书SEO专家。请为以下内容生成6-8个热门标签：

选题：${TOPIC_TYPE_PROMPTS[topicType]}
${title ? `标题：${title}` : ''}
${keywords ? `关键词：${keywords}` : ''}
${content ? `内容摘要：${content.substring(0, 200)}...` : ''}
${previousTags && previousTags.length > 0 ? `避免以下标签：${previousTags.join('、')}` : ''}

要求：
1. 标签要热门、有流量，是用户真实搜索的词
2. 标签要与内容高度相关
3. 混合使用大类标签和精准标签
4. 只输出标签文本，用逗号分隔`;

    const response = await callLLM(prompt);
    const tags = response
      .split(/[,，、\n]/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter((tag) => tag.length > 0 && tag.length < 20);
    
    return Response.json({ 
      success: true, 
      tags 
    });
  } catch (error) {
    console.error('Generate tags error:', error);
    return Response.json({ 
      success: false, 
      error: '标签生成失败' 
    }, { status: 500 });
  }
}
