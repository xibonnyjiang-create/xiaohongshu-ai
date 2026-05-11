/**
 * 通用图片生成服务
 * 使用 OpenAI 兼容接口（gpt-image-1）
 */

const IMAGE_API_CONFIG = {
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://hk.testvideo.site/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
};

/**
 * 生成图片 - 使用 OpenAI 兼容接口
 */
export async function generateImages(options: {
  prompt: string;
  count?: number;
  size?: string;
}): Promise<string[]> {
  const { prompt, count = 4 } = options;
  
  if (!IMAGE_API_CONFIG.apiKey) {
    throw new Error('未配置图片生成API密钥');
  }

  const imageUrls: string[] = [];
  
  // 逐张生成（部分API不支持批量）
  for (let i = 0; i < count; i++) {
    try {
      const response = await fetch(`${IMAGE_API_CONFIG.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${IMAGE_API_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1792', // 3:4 竖版比例
        }),
      });

      if (!response.ok) {
        console.warn(`图片生成第${i + 1}张失败:`, response.status);
        continue;
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const url = data.data[0].url || (data.data[0].b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : '');
        if (url) imageUrls.push(url);
      }
    } catch (err) {
      console.warn(`图片生成第${i + 1}张异常:`, err);
    }
  }

  if (imageUrls.length === 0) {
    throw new Error('所有图片均生成失败');
  }

  return imageUrls;
}

/**
 * 获取占位图
 */
export function getPlaceholderImages(count: number = 4): string[] {
  return Array.from({ length: count }, (_, i) => 
    `https://picsum.photos/seed/xhs${Date.now()}${i}/768/1024`
  );
}
