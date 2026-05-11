import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { title, content, keywords } = await request.json();
    
    const prompt = `根据以下小红书内容生成一张高质量封面配图的AI生图口令：

标题：${title || ''}
内容摘要：${content?.substring(0, 300) || ''}
关键词：${keywords || ''}

要求：
1. 图片中必须包含文章标题"${title || ''}"，标题文字要醒目且居中显示，字体大而清晰
2. 风格：小红书爆款封面风格，设计感强，吸引眼球
3. 色调：明亮高级，配色和谐，符合内容主题
4. 排版：标题居中大字排版，搭配装饰元素（如色块、几何图形、渐变背景等）
5. 比例：3:4竖版，适合手机浏览
6. 设计细节：标题文字需要有设计感（如加粗、描边、阴影、渐变填充等效果），背景要有层次感
7. 整体效果：一眼就能被吸引，有强烈的信息传达感
8. 每次生成时要在配色方案、装饰元素、排版布局上有所变化，避免千篇一律

直接输出生图口令，中文描述即可，重点突出画面的设计感和标题的视觉冲击力。`;

    const response = await callLLM(prompt);
    
    return NextResponse.json({
      prompt: response.trim(),
    });
  } catch (error) {
    console.error('Regenerate image prompt error:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
