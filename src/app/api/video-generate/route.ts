import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageUrl } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VideoGenerationClient, Config, HeaderUtils } = require('coze-coding-dev-sdk');

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new VideoGenerationClient(config, { customHeaders });

    // 构建 content 数组
    const content: Array<{ type: string; text?: string; image_url?: { url: string }; role?: string }> = [];

    // 如果有图片，作为首帧输入
    if (imageUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: imageUrl },
        role: 'first_frame',
      });
    }

    // 文字 prompt
    content.push({
      type: 'text',
      text: prompt,
    });

    const response = await client.videoGeneration(content, {
      model: 'doubao-seedance-1-5-pro-251215',
      duration: 5,
      ratio: '9:16',
      resolution: '720p',
      generateAudio: false,
      watermark: false,
    });

    if (response.videoUrl) {
      return NextResponse.json({
        success: true,
        videoUrl: response.videoUrl,
      });
    } else {
      const taskInfo = response.response || {};
      const errorMsg = taskInfo.error_message || 'Video generation failed';
      console.error('Video generation failed:', errorMsg);
      return NextResponse.json({
        success: false,
        error: errorMsg,
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Video generation error:', error);
    const message = error instanceof Error ? error.message : 'Video generation failed';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
