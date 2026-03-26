import { NextRequest, NextResponse } from 'next/server';

/**
 * URL内容抓取API
 * 用于获取网页内容或PDF文档
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: '请提供URL' }, { status: 400 });
    }

    // 验证URL格式
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'URL格式无效' }, { status: 400 });
    }

    // 抓取内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: `请求失败: ${response.status}` 
      }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    let content = '';
    let type = 'text';

    if (contentType.includes('application/pdf')) {
      // PDF文件 - 返回URL让前端处理
      type = 'pdf';
      content = url;
    } else if (contentType.includes('text/html')) {
      // HTML页面 - 提取文本
      const html = await response.text();
      content = extractTextFromHtml(html);
      type = 'html';
    } else {
      // 其他文本内容
      content = await response.text();
    }

    return NextResponse.json({
      content,
      type,
      url,
      title: extractTitle(url),
    });
  } catch (error) {
    console.error('Fetch URL error:', error);
    return NextResponse.json({ 
      error: '内容抓取失败，请检查URL是否可访问' 
    }, { status: 500 });
  }
}

/**
 * 从HTML中提取文本
 */
function extractTextFromHtml(html: string): string {
  // 简单的HTML标签移除
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // 限制长度
  if (text.length > 5000) {
    text = text.substring(0, 5000) + '...';
  }
  
  return text;
}

/**
 * 从URL提取标题
 */
function extractTitle(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '未知来源';
  }
}
