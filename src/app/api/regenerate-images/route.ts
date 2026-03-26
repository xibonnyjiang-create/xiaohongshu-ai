import { NextRequest, NextResponse } from 'next/server';
import { generateImages, getPlaceholderImages } from '@/lib/image-generation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, count = 4, title, content } = body as { 
      prompt: string; 
      count?: number; 
      title?: string;
      content?: string;
    };

    if (!prompt) {
      return NextResponse.json({ error: '请输入图片描述' }, { status: 400 });
    }

    try {
      // 使用通用图片生成服务
      const imageUrls = await generateImages({ prompt, count });
      return NextResponse.json({ imageUrls });
    } catch (apiError) {
      // 如果API调用失败，使用占位图
      console.warn('图片生成API调用失败，使用占位图:', apiError);
      const imageUrls = getPlaceholderImages(count);
      return NextResponse.json({ 
        imageUrls,
        warning: '使用占位图，请配置图片生成API' 
      });
    }
  } catch (error) {
    console.error('Regenerate images error:', error);
    return NextResponse.json({ error: '图片生成失败' }, { status: 500 });
  }
}
