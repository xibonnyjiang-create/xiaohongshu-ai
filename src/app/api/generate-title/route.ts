import { NextRequest } from 'next/server';
import { TopicType, PersonaType, TitleCandidate, ContentType } from '@/lib/types';
import { callLLM } from '@/lib/llm';
import { PERSONA_STYLE_CONFIG, SCENE_OPTIONS } from '@/lib/constants';
import { SCENARIO_PROMPTS } from '@/lib/scenario-prompts';

// 选题类型映射
const TOPIC_TYPE_PROMPTS: Record<TopicType, string> = {
  market_hot: '市场热点追踪',
  beginner_guide: '小白科普',
  life_lifestyle: '生活化种草',
  tool_review: '工具测评',
};

// 内容类型映射
const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  article: '图文内容',
  video_script: '视频脚本',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topicType,
      contentType,
      keywords,
      personaType,
      hotTopicInfo,
      hotTop3Tags,
      previousTitle,
    } = body as {
      topicType: TopicType;
      contentType?: ContentType;
      keywords?: string;
      personaType?: string;
      hotTopicInfo?: string;
      hotTop3Tags?: string[];
      previousTitle?: string;
    };

    const styleConfig = PERSONA_STYLE_CONFIG[personaType as keyof typeof PERSONA_STYLE_CONFIG] || PERSONA_STYLE_CONFIG.custom;
    const topicLabel = TOPIC_TYPE_PROMPTS[topicType] || '通用内容';
    const contentTypeLabel = CONTENT_TYPE_LABELS[contentType as ContentType] || '图文内容';
    const scenario = SCENARIO_PROMPTS[topicType];

    // 获取场景的Hook设计指导
    const hookGuide = scenario?.hook || '吸引眼球的标题';

    // 根据内容类型调整标题要求
    const titleSuffix = contentType === 'video_script' 
      ? '\n6. 视频脚本标题特点：强视觉冲击、前3秒必看、适合口播开头'
      : '';

    const prompt = `【小红书标题生成】

请生成3个符合以下场景的小红书爆款标题。

## 场景信息
- 选题类型：${topicLabel}
- 内容类型：${contentTypeLabel}
- 创作者人设：${personaType || '通用'}
- 风格配置：${styleConfig.tone}，${styleConfig.emojiDensity}表情
- 标题风格：${styleConfig.titleStyle}

## Hook设计指导
${hookGuide}

## 内容要素
- 关键词：${keywords || '未指定'}
${hotTop3Tags?.length ? `- 热门标签：${hotTop3Tags.join('、')}` : ''}
${hotTopicInfo ? `- 热点背景：\n${hotTopicInfo.substring(0, 200)}` : ''}
${previousTitle ? `- 避免重复的标题风格：${previousTitle}` : ''}

## 标题要求
1. 长度：≤20字（不含emoji）
2. 必须包含：1-3个emoji
3. 语气风格：${styleConfig.tone}
4. 风格类型：${styleConfig.titleStyle}
5. 必须有吸引力，引发好奇或共鸣${titleSuffix}

## 输出格式
直接输出3个标题，每行一个，格式为"emoji 标题内容"，不要编号，不要其他说明：

`;

    const response = await callLLM(prompt);
    const lines = response.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^\d+[.、：:]/) && line.length > 0);

    const titles: TitleCandidate[] = lines.slice(0, 3).map(title => ({
      title,
      style: styleConfig.titleStyle as TitleCandidate['style'],
    }));

    // 如果没有生成足够标题，提供默认
    while (titles.length < 3) {
      titles.push({
        title: `📈 ${keywords || '内容推荐'}`,
        style: styleConfig.titleStyle as TitleCandidate['style'],
      });
    }

    return Response.json({ titles });
  } catch (error) {
    console.error('Title generation error:', error);
    return Response.json({ error: '标题生成失败', titles: [] }, { status: 500 });
  }
}
