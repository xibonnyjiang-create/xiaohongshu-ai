import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, count = 4, title, content } = body as { 
      prompt: string; 
      count?: number;
      title?: string;
      content?: string;
    };
    
    // 如果用户没有输入自定义prompt，则基于标题和内容生成
    let finalPrompt = prompt;
    
    if (!prompt || prompt.trim().length === 0) {
      // 基于标题和内容关键词生成图片描述
      const keywords = extractKeywords(title, content);
      finalPrompt = generateImagePrompt(keywords);
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 生成多张不同风格的图片
    const imagePrompts = generateMultipleStylePrompts(finalPrompt);
    
    const imageUrls: string[] = [];
    
    for (let i = 0; i < Math.min(count, imagePrompts.length); i++) {
      try {
        // 添加延迟避免请求过快
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        const response = await client.generate({
          prompt: imagePrompts[i],
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

// 从标题和内容中提取关键词
function extractKeywords(title?: string, content?: string): string {
  const text = `${title || ''} ${content?.substring(0, 300) || ''}`;
  
  // 简单的关键词提取（实际项目中可以用NLP）
  const keywords: string[] = [];
  
  // 检测主题相关词汇
  if (text.includes('股票') || text.includes('股价') || text.includes('投资')) {
    keywords.push('investment', 'stock market', 'finance');
  }
  if (text.includes('财报') || text.includes('营收') || text.includes('利润')) {
    keywords.push('financial report', 'business growth', 'profit');
  }
  if (text.includes('黄金') || text.includes('石油') || text.includes('期货')) {
    keywords.push('commodities', 'trading', 'market analysis');
  }
  if (text.includes('AI') || text.includes('人工智能') || text.includes('科技')) {
    keywords.push('technology', 'AI', 'innovation');
  }
  if (text.includes('基金') || text.includes('理财')) {
    keywords.push('wealth management', 'savings', 'financial planning');
  }
  
  return keywords.length > 0 ? keywords.join(', ') : 'finance, investment, growth';
}

// 基于关键词生成图片描述
function generateImagePrompt(keywords: string): string {
  return `Professional financial illustration about ${keywords}, modern clean design, suitable for social media cover`;
}

// 生成多种风格的图片提示词
function generateMultipleStylePrompts(basePrompt: string): string[] {
  return [
    // 风格1：财经数据可视化
    `Professional financial infographic style, clean data visualization with upward trending charts and graphs, business growth concept, blue and white professional color scheme, modern minimalist design, NO TEXT, NO WORDS, NO LETTERS, corporate aesthetic, suitable for financial article cover`,
    
    // 风格2：温馨投资场景
    `Modern investment planning scene, laptop with financial charts on wooden desk, coffee cup, notebook with investment notes, warm natural lighting through window, professional yet approachable atmosphere, NO TEXT, NO WORDS, NO LETTERS, lifestyle photography style`,
    
    // 风格3：抽象经济增长
    `Abstract upward growth visualization, geometric shapes flowing upward representing market prosperity, gradient from blue to green, clean modern composition, NO TEXT, NO WORDS, NO LETTERS, professional business aesthetic`,
    
    // 风格4：治愈系理财风格
    `Warm and inviting illustration about smart money management, soft pastel colors with pink and cream tones, friendly and educational atmosphere, simple clean design, NO TEXT, NO WORDS, NO LETTERS, suitable for personal finance content`,
  ];
}
