import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, count = 4 } = body as { 
      prompt: string; 
      count?: number; 
    };

    if (!prompt) {
      return NextResponse.json({ error: '请输入图片描述' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ImageGenerationClient, Config, HeaderUtils } = require('coze-coding-dev-sdk');

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 生成多张图片
    const requests = Array.from({ length: Math.min(count, 4) }, () => ({
      prompt,
      model: 'doubao-seedream-5-0-260128',
      size: '2K',
      watermark: false,
    }));

    const responses = await client.batchGenerate(requests);
    const imageUrls: string[] = [];

    for (const response of responses) {
      const helper = client.getResponseHelper(response);
      if (helper.success) {
        imageUrls.push(...helper.imageUrls);
      }
    }

    if (imageUrls.length > 0) {
      return NextResponse.json({ imageUrls });
    } else {
      return NextResponse.json({ 
        imageUrls: [],
        warning: '图片生成失败，请重试' 
      });
    }
  } catch (error) {
    console.error('Regenerate images error:', error);
    return NextResponse.json({ error: '图片生成失败' }, { status: 500 });
  }
}
