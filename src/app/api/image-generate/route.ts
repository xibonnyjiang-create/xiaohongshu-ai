import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ImageGenerationClient, Config, HeaderUtils } = require('coze-coding-dev-sdk');

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const response = await client.generate({
      prompt,
      model: 'doubao-seedream-5-0-260128',
      size: '2K',
      watermark: false,
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.imageUrls.length > 0) {
      return NextResponse.json({
        success: true,
        imageUrls: helper.imageUrls,
      });
    } else {
      console.error('Image generation failed:', helper.errorMessages);
      return NextResponse.json({
        success: false,
        error: helper.errorMessages.join('; ') || 'Image generation failed',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Image generation failed',
    }, { status: 500 });
  }
}
