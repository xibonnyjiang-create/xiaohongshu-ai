/**
 * 小红书格式适配器
 * 将 Markdown 格式转换为小红书兼容的纯文本格式
 */

/**
 * 去除 Markdown 加粗符号 **text** -> text
 */
function removeBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

/**
 * 去除 Markdown 斜体 *text* 或 _text_ -> text
 */
function removeItalic(text: string): string {
  return text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '$1')
              .replace(/(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g, '$1');
}

/**
 * 去除 Markdown 标题 ### -> 空行分隔
 */
function removeHeaders(text: string): string {
  return text.replace(/^#{1,6}\s+/gm, '');
}

/**
 * 去除 Markdown 列表符号 - * ->
 */
function removeListMarkers(text: string): string {
  return text.replace(/^[\-\*\+]\s+/gm, '• ')
             .replace(/^\d+\.\s+/gm, '');
}

/**
 * 去除 Markdown 链接 [text](url) -> text
 */
function removeLinks(text: string): string {
  return text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
}

/**
 * 去除 Markdown 代码块 ``` ``` 和 ` `
 */
function removeCodeBlocks(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '')
             .replace(/`([^`]+)`/g, '$1');
}

/**
 * 去除 Markdown 引用 > 
 */
function removeBlockquotes(text: string): string {
  return text.replace(/^>\s+/gm, '');
}

/**
 * 去除 Markdown 分割线 ---
 */
function removeHorizontalRules(text: string): string {
  return text.replace(/^[\-\*_]{3,}$/gm, '');
}

/**
 * 去除 Markdown 删除线 ~~text~~
 */
function removeStrikethrough(text: string): string {
  return text.replace(/~~(.*?)~~/g, '$1');
}

/**
 * 标准化空行（移除多余空行，保留段落分隔）
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')  // 超过2个换行符的压缩为2个
    .replace(/[ \t]+\n/g, '\n')   // 去除行尾多余空格
    .replace(/^\s+|\s+$/g, '');   // 去除首尾空白
}

/**
 * 主函数：将 Markdown 内容转换为小红书兼容格式
 */
export function toXiaoHongShuFormat(content: string): string {
  let result = content;
  
  // 按顺序执行各项转换
  result = removeBold(result);
  result = removeItalic(result);
  result = removeHeaders(result);
  result = removeListMarkers(result);
  result = removeLinks(result);
  result = removeCodeBlocks(result);
  result = removeBlockquotes(result);
  result = removeHorizontalRules(result);
  result = removeStrikethrough(result);
  result = normalizeWhitespace(result);
  
  return result;
}

/**
 * 验证内容是否为小红书兼容格式
 */
export function isXiaoHongShuCompatible(content: string): boolean {
  const markdownSymbols = /[\*\#\[\]\(\)\_\`\~]/g;
  const lines = content.split('\n');
  
  // 检查是否还有 Markdown 符号（排除 Emoji 和正常文本）
  const hasMarkdownSymbols = markdownSymbols.test(content.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''));
  
  // 检查是否有列表符号
  const hasListMarkers = /^-[\s]|^[*][\s]/.test(content);
  
  // 检查是否有标题
  const hasHeaders = /^#{1,6}\s/.test(content);
  
  return !hasMarkdownSymbols && !hasListMarkers && !hasHeaders;
}

/**
 * 为视频脚本格式优化
 * 添加语速提示和画面描述标记
 */
export function formatVideoScript(rawScript: string): string {
  // 转换为小红书格式
  let formatted = toXiaoHongShuFormat(rawScript);
  
  // 为旁白添加语速提示（如果用户需要）
  // 这里可以根据内容特点添加自然停顿提示
  
  return formatted;
}
