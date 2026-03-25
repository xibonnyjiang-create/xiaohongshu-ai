import { NextRequest } from 'next/server';
import { TopicType } from '@/lib/types';
import { callLLM } from '@/lib/llm';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪，关注AI、机器人、新能源等热门行业的技术更新，以及国家宏观政策对市场的影响',
  beginner_guide: '小白科普，基础投资知识和入门指南，帮助新手理解市场运作',
  advanced_invest: '进阶投资，分享国内外知名券商机构的研报评级，提供专业的投资策略',
  professional_analysis: '专业分析，基于公司财报分析股价变化，解读黄金石油外汇等期货价格变动原因',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topicType, 
      keywords, 
      title,
      content,
      previousTags, // 用于重新生成时避免重复
    } = body as {
      topicType: TopicType;
      keywords?: string;
      title?: string;
      content?: string;
      previousTags?: string[];
    };

    // 构建标签生成提示
    const prompt = `你是一个小红书SEO专家，请为以下内容生成6-8个高流量标签：

选题类型：${TOPIC_TYPE_PROMPTS[topicType]}
${title ? `标题：${title}` : ''}
${keywords ? `关键词：${keywords}` : ''}
${content ? `内容摘要：${content.substring(0, 200)}...` : ''}
${previousTags && previousTags.length > 0 ? `之前的标签：${previousTags.join('、')}，请生成不同的标签` : ''}

要求：
1. 标签要热门、有流量，是用户真实搜索的词
2. 标签要与内容高度相关
3. 混合使用大类标签和精准标签
4. 大类标签如：投资理财、基金、股票、理财知识
5. 精准标签如：基金定投、价值投资、新手理财
6. 标签格式：去掉#号，只输出标签文本

请直接输出标签，用逗号分隔，不要其他说明。`;

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
