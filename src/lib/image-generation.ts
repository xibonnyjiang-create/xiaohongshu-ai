/**
 * 通用图片生成服务
 * 支持多种图片生成后端
 */

// 图片生成配置
const IMAGE_CONFIG = {
  // 腾讯混元配置
  tencent: {
    apiUrl: process.env.TENCENT_HUNYUAN_API_URL || 'https://hunyuan.tencentcloudapi.com',
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',
  },
  // 备用：使用其他图片生成API
  fallback: {
    apiUrl: process.env.IMAGE_API_URL || '',
    apiKey: process.env.IMAGE_API_KEY || '',
  }
};

/**
 * 生成图片 - 使用腾讯混元API
 */
export async function generateImages(options: {
  prompt: string;
  count?: number;
  size?: string;
}): Promise<string[]> {
  const { prompt, count = 4, size = '1024x1024' } = options;
  
  // 添加无文字约束
  const finalPrompt = `${prompt}, NO TEXT, NO WORDS, NO CHARACTERS, clean illustration without any text elements`;
  
  // 优先使用腾讯混元
  if (IMAGE_CONFIG.tencent.secretId && IMAGE_CONFIG.tencent.secretKey) {
    return generateWithTencentHunyuan(finalPrompt, count);
  }
  
  // 备用方案：使用其他API
  if (IMAGE_CONFIG.fallback.apiUrl && IMAGE_CONFIG.fallback.apiKey) {
    return generateWithFallback(finalPrompt, count);
  }
  
  throw new Error('未配置图片生成API，请设置环境变量 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY');
}

/**
 * 腾讯混元图片生成
 */
async function generateWithTencentHunyuan(prompt: string, count: number): Promise<string[]> {
  const { secretId, secretKey } = IMAGE_CONFIG.tencent;
  
  // 腾讯云API签名（简化版）
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(Math.random() * 100000);
  
  try {
    const response = await fetch('https://hunyuan.tencentcloudapi.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretId}`, // 实际需要签名
        'X-TC-Action': 'TextToImage',
        'X-TC-Version': '2023-09-01',
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Nonce': nonce.toString(),
      },
      body: JSON.stringify({
        Prompt: prompt,
        NegativePrompt: 'text, words, characters, letters, watermark',
        BatchSize: count,
        ResultConfig: {
          Resolution: '1024:1024',
        },
      }),
    });
    
    const data = await response.json();
    
    if (data.Response?.Results) {
      return data.Response.Results.map((r: any) => r.ResultUrl);
    }
    
    throw new Error(data.Response?.Error?.Message || '图片生成失败');
  } catch (error) {
    console.error('腾讯混元图片生成错误:', error);
    throw error;
  }
}

/**
 * 备用图片生成API
 */
async function generateWithFallback(prompt: string, count: number): Promise<string[]> {
  const { apiUrl, apiKey } = IMAGE_CONFIG.fallback;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      n: count,
      size: '1024x1024',
    }),
  });
  
  const data = await response.json();
  
  if (data.data) {
    return data.data.map((img: any) => img.url || img.b64_json);
  }
  
  throw new Error('备用图片生成失败');
}

/**
 * 使用占位图（开发测试用）
 */
export function getPlaceholderImages(count: number = 4): string[] {
  return Array.from({ length: count }, (_, i) => 
    `https://picsum.photos/seed/${Date.now() + i}/1024/1024`
  );
}
