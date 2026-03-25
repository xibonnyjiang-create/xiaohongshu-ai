import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, count = 4 } = body as { prompt: string; count?: number };
    
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入图片描述' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 构建增强的prompt，确保不含文字
    const enhancedPrompt = `${prompt}, NO TEXT, NO WORDS, NO LETTERS, NO CHINESE CHARACTERS, clean visual design, suitable for social media cover image`;

    // 串行生成图片，避免频率限制
    const imageUrls: string[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        // 添加延迟避免请求过快
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const response = await client.generate({
          prompt: enhancedPrompt,
          size: '2K',
          watermark: false,
        });

        const helper = client.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          imageUrls.push(helper.imageUrls[0]);
        }
      } catch (error) {
        console.error(`Image ${i + 1} generation error:`, error);
        // 继续生成下一张，不中断
      }
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: '图片生成失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrls,
    });
  } catch (error) {
    console.error('Image regeneration error:', error);
    return NextResponse.json(
      { error: '图片生成失败' },
      { status: 500 }
    );
  }
}
