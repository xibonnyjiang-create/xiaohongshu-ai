import { NextRequest, NextResponse } from 'next/server';

// 动态导入 SDK - 避免预渲染问题
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ImageGenerationClient: any;
let Config: any;
let HeaderUtils: any;

// 延迟加载 SDK
async function loadSDK() {
  if (!ImageGenerationClient) {
    const sdk: Record<string, any> = await import('coze-coding-dev-sdk');
    ImageGenerationClient = sdk.ImageGenerationClient;
    Config = sdk.Config;
    HeaderUtils = sdk.HeaderUtils;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '2K' } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    await loadSDK();

    // 提取请求头用于追踪
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const response = await client.generate({
      prompt,
      size,
      model: 'doubao-seedream-5-0-260128',
      responseFormat: 'url',
    });

    const helper = client.getResponseHelper(response);

    if (helper.success) {
      return NextResponse.json({
        success: true,
        imageUrls: helper.imageUrls,
      });
    } else {
      return NextResponse.json({
        success: false,
        errors: helper.errorMessages,
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
