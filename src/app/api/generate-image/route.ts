import { NextRequest, NextResponse } from 'next/server';
import { generateMultipleImages } from '@/lib/image-generation';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: '请输入图片描述' }, { status: 400 });
    }

    const result = await generateMultipleImages(prompt, 4, request.headers);
    if (result.success) {
      return NextResponse.json({ imageUrls: result.imageUrls });
    }
    return NextResponse.json({ error: result.error || '图片生成失败' }, { status: 500 });
  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json({ error: '图片生成失败' }, { status: 500 });
  }
}
