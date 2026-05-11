import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '1024x1024' } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://hk.testvideo.site/v1';
    const apiKey = process.env.DEEPSEEK_API_KEY || '';

    // 使用 OpenAI 兼容的图片生成接口
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1792', // 3:4 竖版比例，适合小红书
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image generation API error:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `Image generation API error: ${response.status}`,
      }, { status: 500 });
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const imageUrls = data.data.map((item: { url?: string; b64_json?: string }) => 
        item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : '')
      ).filter((url: string) => url);
      
      return NextResponse.json({
        success: true,
        imageUrls,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No image generated',
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
