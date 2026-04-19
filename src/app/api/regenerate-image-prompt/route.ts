import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { title, content, keywords } = await request.json();
    
    // 随机选择不同的风格视角，增加变化性
    const styles = [
      '温暖治愈系插画风格，手绘感强，柔和线条',
      '现代简约插画风格，几何图形，扁平设计',
      '杂志封面风格，高级感，大留白',
      '生活场景插画风格，贴近日常，温馨氛围',
      '抽象艺术风格，渐变色块，现代感',
      '可爱治愈风格，卡通形象，梦幻色调',
      '商务简约风格，低饱和度，专业感',
    ];
    
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomAngle = ['俯视', '平视', '侧光', '逆光', '特写', '远景', '仰视'][Math.floor(Math.random() * 7)];
    const randomMood = ['活力', '宁静', '清新', '温暖', '商务', '轻松'][Math.floor(Math.random() * 6)];
    const randomElement = ['绿植点缀', '光影效果', '几何装饰', '波点元素', '渐变色块', '手绘边框'][Math.floor(Math.random() * 6)];
    
    const prompt = `根据以下小红书内容生成一张高质量配图的AI生图口令：

标题：${title || ''}
内容：${content?.substring(0, 300) || ''}
关键词：${keywords || ''}

要求：
1. 风格：${randomStyle}，温暖治愈
2. 色调：明亮柔和，${randomMood}氛围，符合理财/生活主题
3. 视角：${randomAngle}视角
4. 装饰：${randomElement}
5. 构图：简洁大方，留白充足
6. 比例：3:4竖版
7. 不要包含文字和中文
8. 画面要独特有创意，避免千篇一律

直接输出生图口令，中文描述即可。`;

    const response = await callLLM(prompt);
    
    return NextResponse.json({
      prompt: response.trim(),
    });
  } catch (error) {
    console.error('Regenerate image prompt error:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
