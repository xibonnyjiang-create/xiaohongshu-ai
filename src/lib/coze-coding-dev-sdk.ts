/**
 * Mock SDK for Vercel environment
 * 在 Vercel 构建时替代 coze-coding-dev-sdk
 */

export class SearchClient {
  constructor() {}
}

export class Config {
  constructor() {}
}

export const HeaderUtils = {
  extractForwardHeaders: () => ({}),
};
