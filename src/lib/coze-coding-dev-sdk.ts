/**
 * Mock SDK for coze-coding-dev-sdk
 * This module provides empty implementations when the real SDK is not available
 */

export interface CozeCodingDevSDK {
  webSearch?: (params: any) => Promise<any>;
  imageGeneration?: (params: any) => Promise<any>;
  textToSpeech?: (params: any) => Promise<any>;
  speechToText?: (params: any) => Promise<any>;
  videoGeneration?: (params: any) => Promise<any>;
}

export const createClient = (): CozeCodingDevSDK => {
  return {};
};

export default { createClient };
