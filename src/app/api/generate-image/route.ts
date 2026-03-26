import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return new Response(JSON.stringify({ error: '请输入图片描述' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 添加无文字约束
    const finalPrompt = `${prompt}, NO TEXT, NO WORDS, NO CHARACTERS, clean illustration without any text elements`;

    const response = await client.generate({
      prompt: finalPrompt,
      size: '2K',
      watermark: false,
    });

    const helper = client.getResponseHelper(response);
    const imageUrls: string[] = [];
    
    if (helper.success && helper.imageUrls.length > 0) {
      imageUrls.push(...helper.imageUrls);
    }

    return new Response(JSON.stringify({ imageUrls }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Generate image error:', error);
    return new Response(JSON.stringify({ error: '图片生成失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
