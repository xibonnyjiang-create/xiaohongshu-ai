// Image generation utilities using coze-coding-dev-sdk (Seedream 5.0)

export async function generateSingleImage(
  prompt: string,
  requestHeaders?: Headers
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ImageGenerationClient, Config, HeaderUtils } = require('coze-coding-dev-sdk');

    const customHeaders = requestHeaders 
      ? HeaderUtils.extractForwardHeaders(requestHeaders) 
      : undefined;
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
      return { success: true, imageUrl: helper.imageUrls[0] };
    } else {
      return { success: false, error: helper.errorMessages.join('; ') || 'Image generation failed' };
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return { success: false, error: 'Image generation failed' };
  }
}

export async function generateMultipleImages(
  prompt: string,
  count: number = 4,
  requestHeaders?: Headers
): Promise<{ success: boolean; imageUrls: string[]; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ImageGenerationClient, Config, HeaderUtils } = require('coze-coding-dev-sdk');

    const customHeaders = requestHeaders 
      ? HeaderUtils.extractForwardHeaders(requestHeaders) 
      : undefined;
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

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
      return { success: true, imageUrls };
    } else {
      return { success: false, imageUrls: [], error: 'All images failed to generate' };
    }
  } catch (error) {
    console.error('Multiple image generation error:', error);
    return { success: false, imageUrls: [], error: 'Image generation failed' };
  }
}
