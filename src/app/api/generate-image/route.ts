import { NextRequest, NextResponse } from 'next/server';
import { generateImages, getPlaceholderImages } from '@/lib/image-generation';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: '请输入图片描述' }, { status: 400 });
    }

    try {
      // 尝试使用配置的图片生成API
      const imageUrls = await generateImages({ prompt, count: 4 });
      return NextResponse.json({ imageUrls });
    } catch (apiError) {
      // 如果API调用失败，使用占位图（开发环境）
      console.warn('图片生成API调用失败，使用占位图:', apiError);
      const imageUrls = getPlaceholderImages(4);
      return NextResponse.json({ 
        imageUrls,
        warning: '使用占位图，请配置图片生成API' 
      });
    }
  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json({ error: '图片生成失败' }, { status: 500 });
  }
}
